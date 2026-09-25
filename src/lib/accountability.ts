/**
 * Daily Accountability + Score — منطق خالص.
 * يقيس تقدم اليوم مقابل الخطة فقط، ولا يحوّل النتيجة إلى حكم على قيمة المستخدم.
 */
import type { DailyBand, DailyPlanItem } from "./daily-plan";
import { weekStartOfDateKey } from "./time";
import type { PlanImportance, WeeklyPlanItem } from "./weekly-plan";

export type PlanItemStatus = "completed" | "partial" | "postponed" | "skipped";

export type PlanItemOutcome = {
  date: string;
  itemId: string;
  weekStart: string;
  status: PlanItemStatus;
  postponedTo: string | null;
  reason: string;
  createdAt: number;
  updatedAt: number;
};

export type OutcomeInput = {
  status: PlanItemStatus;
  postponedTo?: string | null;
  reason?: string;
};

export type ScoreBreakdown = {
  band: DailyBand;
  title: string;
  earned: number;
  possible: number;
  percent: number | null;
};

export type DailyScore = {
  score: number;
  earnedPoints: number;
  possiblePoints: number;
  completed: number;
  partial: number;
  postponed: number;
  skipped: number;
  missing: number;
  comparison: "above-baseline" | "near-baseline" | "below-baseline" | "no-baseline";
  comparisonDelta: number | null;
  breakdown: ScoreBreakdown[];
  explanation: string[];
  meaning: "daily-progress-only";
};

const IMPORTANCE_WEIGHT: Record<PlanImportance, number> = {
  foundation: 4,
  core: 3,
  supporting: 2,
  optional: 1,
};

const STATUS_CREDIT: Record<PlanItemStatus, number> = {
  completed: 1,
  partial: 0.5,
  postponed: 0.25,
  skipped: 0,
};

const BAND_TITLES: Record<DailyBand, string> = {
  foundation: "الصلاة والأساس",
  primary: "المهم اليوم",
  habits: "العادات",
  work: "الدراسة أو العمل",
  goals: "هدف الأسبوع",
  secondary: "الأشياء الثانوية",
};

function normalizeReason(reason: string | undefined) {
  return (reason ?? "").replace(/\s+/g, " ").trim().slice(0, 160);
}

export function isValidPostponedDate(date: string, postponedTo: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{4}-\d{2}-\d{2}$/.test(postponedTo) &&
    postponedTo > date;
}

export function upsertPlanOutcome(
  existing: PlanItemOutcome | null,
  input: OutcomeInput & { date: string; itemId: string; weekStart: string; now: number },
): { outcome: PlanItemOutcome; changed: boolean } {
  const postponedTo = input.status === "postponed" ? (input.postponedTo ?? null) : null;
  const reason = normalizeReason(input.reason);
  if (existing) {
    const unchanged =
      existing.status === input.status &&
      existing.postponedTo === postponedTo &&
      existing.reason === reason;
    if (unchanged) return { outcome: existing, changed: false };
    return {
      outcome: {
        ...existing,
        status: input.status,
        postponedTo,
        reason,
        updatedAt: input.now,
      },
      changed: true,
    };
  }
  return {
    outcome: {
      date: input.date,
      itemId: input.itemId,
      weekStart: input.weekStart,
      status: input.status,
      postponedTo,
      reason,
      createdAt: input.now,
      updatedAt: input.now,
    },
    changed: true,
  };
}

export type PrayerOutcomeLog = {
  date: string;
  prayer: string;
  status: string;
  updatedAt?: number;
};

function prayerStatusToPlanStatus(status: string): PlanItemStatus | null {
  if (status === "jamaah" || status === "ontime") return "completed";
  if (status === "late") return "partial";
  if (status === "missed") return "skipped";
  return null;
}

/**
 * يوحّد سجل صلاة مع عنصر الصلاة في الخطة، فتُقاس الصلاة بمصدر واحد.
 *
 * القواعد: سجل الصلاة أضبط من تعليم عنصر الخطة (يروي جماعة/وقت/تأخر/فاتت)،
 * فيحكم حيث يوجد. لكن «مؤجّل» قرار خاص بالخطة لا تعبّر عنه سجل الصلاة،
 * فيبقى كما كتبه المستخدم.
 *
 * تُستدعى من العميل ومن الخادم بنفسها، وإلا اختلفت نتيجة اليوم المعروضة
 * عن النتيجة التي يبني عليها المراجعة والتكييف.
 */
export function mergePrayerLogsIntoOutcomes(input: {
  items: readonly Pick<WeeklyPlanItem, "id" | "date" | "kind" | "enabled" | "prayerAnchor">[];
  outcomes: readonly PlanItemOutcome[];
  prayerLogs: readonly PrayerOutcomeLog[];
}): PlanItemOutcome[] {
  const byItem = new Map(input.outcomes.map((outcome) => [outcome.itemId, outcome]));
  const latestByKey = new Map<string, PrayerOutcomeLog>();
  for (const log of input.prayerLogs) {
    const key = `${log.date}:${log.prayer}`;
    const current = latestByKey.get(key);
    if (!current || (log.updatedAt ?? 0) >= (current.updatedAt ?? 0)) latestByKey.set(key, log);
  }

  for (const item of input.items) {
    if (!item.enabled || item.kind !== "prayer" || !item.prayerAnchor) continue;
    const log = latestByKey.get(`${item.date}:${item.prayerAnchor}`);
    if (!log) continue;
    const mapped = prayerStatusToPlanStatus(log.status);
    if (!mapped) continue;
    const current = byItem.get(item.id);
    if (current?.status === "postponed") continue;
    const now = log.updatedAt ?? current?.updatedAt ?? 0;
    byItem.set(item.id, {
      date: item.date,
      itemId: item.id,
      weekStart: current?.weekStart || weekStartOfDateKey(item.date),
      status: mapped,
      postponedTo: null,
      reason: current?.reason ?? "",
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
    });
  }
  return [...byItem.values()];
}

/** واجهة العميل: حالة اليوم تأتي كخريطة صلاة واحدة بدل سجل كامل. */
export function mergePrayerOutcomes(
  planItems: readonly DailyPlanItem[],
  outcomes: readonly PlanItemOutcome[],
  prayerStatuses: Readonly<Record<string, string>>,
): PlanItemOutcome[] {
  const prayerLogs: PrayerOutcomeLog[] = [];
  for (const entry of planItems) {
    const anchor = entry.item.prayerAnchor;
    const status = anchor ? prayerStatuses[anchor] : undefined;
    if (!anchor || !status) continue;
    prayerLogs.push({ date: entry.item.date, prayer: anchor, status });
  }
  return mergePrayerLogsIntoOutcomes({
    items: planItems.map((entry) => entry.item),
    outcomes,
    prayerLogs,
  });
}

function percent(earned: number, possible: number) {
  if (possible <= 0) return 0;
  return Math.round((earned / possible) * 100);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** score محايد للvalued user: يعرض النسبة وشرحها، ولا يدعي أنها درجة قيمة الإنسان. */
export function calculateDailyScore(input: {
  items: readonly DailyPlanItem[];
  outcomes: readonly PlanItemOutcome[];
  closed: boolean;
  previousAverage?: number;
}): DailyScore {
  const outcomes = new Map(input.outcomes.map((outcome) => [outcome.itemId, outcome]));
  const counts = { completed: 0, partial: 0, postponed: 0, skipped: 0, missing: 0 };
  const points = new Map<DailyBand, { earned: number; possible: number }>();
  let earnedPoints = 0;
  let possiblePoints = 0;

  for (const entry of input.items) {
    const outcome = outcomes.get(entry.item.id);
    if (!input.closed && !outcome) continue;
    const weight = IMPORTANCE_WEIGHT[entry.item.importance];
    const bucket = points.get(entry.band) ?? { earned: 0, possible: 0 };
    bucket.possible += weight;
    if (outcome) {
      counts[outcome.status] += 1;
      const credit = STATUS_CREDIT[outcome.status] * weight;
      bucket.earned += credit;
      earnedPoints += credit;
    } else {
      counts.missing += 1;
    }
    possiblePoints += weight;
    points.set(entry.band, bucket);
  }

  const rawPercent = possiblePoints > 0 ? (earnedPoints / possiblePoints) * 100 : 0;
  const baseline =
    typeof input.previousAverage === "number" &&
    Number.isFinite(input.previousAverage) &&
    input.previousAverage >= 0 &&
    input.previousAverage <= 100
      ? input.previousAverage
      : null;
  const comparisonDelta = baseline === null ? null : Math.round(rawPercent - baseline);
  const adjustment =
    comparisonDelta === null ? 0 : clamp(Math.round(comparisonDelta * 0.05), -3, 3);
  const score = possiblePoints > 0 ? clamp(Math.round(rawPercent + adjustment), 0, 100) : 0;

  const breakdown: ScoreBreakdown[] = [...points.entries()].map(([band, value]) => ({
    band,
    title: BAND_TITLES[band],
    earned: Math.round(value.earned * 10) / 10,
    possible: value.possible,
    percent: value.possible > 0 ? percent(value.earned, value.possible) : null,
  }));
  const comparison =
    comparisonDelta === null
      ? "no-baseline"
      : comparisonDelta >= 5
        ? "above-baseline"
        : comparisonDelta <= -5
          ? "below-baseline"
          : "near-baseline";
  const explanation = [
    input.closed
      ? `اكتمل ${counts.completed} عنصرًا، و${counts.partial} جزئيًا، و${counts.postponed} مؤجلًا مشروعًا.`
      : `حتى الآن: ${counts.completed} مكتمل و${counts.partial} جزئي؛ لم تُحتسب خطوات لم تحن بعد.`,
    `النتيجة ${score} من 100 تقيس تقدم اليوم مقابل الخطة المختارة، وليست تقييمًا لقيمتك كإنسان.`,
  ];
  if (comparison === "above-baseline") {
    explanation.push(`تقدمك اليوم أعلى من متوسط أيامك السابقة بـ${comparisonDelta} نقطة.`);
  } else if (comparison === "below-baseline") {
    explanation.push(`اليوم أقل من متوسطك السابق بـ${Math.abs(comparisonDelta ?? 0)} نقطة؛ ساقتراح قابل للتعديل.`);
  } else if (comparison === "near-baseline") {
    explanation.push("تقدمك قريب من متوسطك السابق؛ لا تقارن نفسك بأحد آخر.");
  }

  return {
    score,
    earnedPoints: Math.round(earnedPoints * 10) / 10,
    possiblePoints,
    completed: counts.completed,
    partial: counts.partial,
    postponed: counts.postponed,
    skipped: counts.skipped,
    missing: counts.missing,
    comparison,
    comparisonDelta,
    breakdown,
    explanation,
    meaning: "daily-progress-only",
  };
}
