/**
 * Weekly Review — يجمع PLAN/ACTUAL/REVIEW إلى ملخص قابل للاعتماد،
 * ثم emits suggestions only؛ لا يطبّق تغييرًا على خطة المستخدم من تلقاء نفسه.
 */
import type { PlanItemOutcome } from "./accountability";
import type { PlanImportance, WeeklyPlan } from "./weekly-plan";

export type ReviewPrayerLog = { date: string; prayer: string; status: string };
export type ReviewAdhkarLog = { date: string; kind: string };
export type ReviewDay = { date: string; mood: string; blocker: string; note: string };

export type PlanAdjustment = {
  id: string;
  kind: "move" | "reduce" | "protect" | "keep";
  target: string;
  reason: string;
  requiresApproval: true;
};

export type WeeklyReview = {
  weekStart: string;
  planned: number;
  completed: number;
  partial: number;
  postponed: number;
  skipped: number;
  adherence: number;
  reviewedDays: number;
  mostConsistentHabit: { kind: string; count: number } | null;
  mostPostponed: { kind: string; count: number } | null;
  successfulPeriods: string[];
  difficultPeriods: string[];
  prayerContext: {
    loggedDays: number;
    onTime: number;
    late: number;
    missed: number;
    note: string;
  };
  weeklyFocus: string;
  suggestedAdjustments: PlanAdjustment[];
};

const WEIGHTS: Record<PlanImportance, number> = {
  foundation: 4,
  core: 3,
  supporting: 2,
  optional: 1,
};

function percent(value: number, total: number) {
  return total <= 0 ? 0 : Math.round((value / total) * 100);
}

function unique<T>(values: readonly T[]) {
  return [...new Set(values)];
}

export function buildWeeklyReview(input: {
  plan: WeeklyPlan;
  outcomes: readonly PlanItemOutcome[];
  prayerLogs?: readonly ReviewPrayerLog[];
  adhkarLogs?: readonly ReviewAdhkarLog[];
  reviews?: readonly ReviewDay[];
}): WeeklyReview {
  const outcomeById = new Map(input.outcomes.map((outcome) => [outcome.itemId, outcome]));
  const items = input.plan.items.filter((item) => item.enabled);
  let possible = 0;
  let earned = 0;
  const completedKinds = new Map<string, number>();
  const postponedKinds = new Map<string, number>();
  const periodStats = new Map<string, { earned: number; possible: number }>();
  let completed = 0;
  let partial = 0;
  let postponed = 0;
  let skipped = 0;

  for (const item of items) {
    const weight = WEIGHTS[item.importance];
    possible += weight;
    const outcome = outcomeById.get(item.id);
    const period = item.startTime ?? "بدون وقت";
    const bucket = periodStats.get(period) ?? { earned: 0, possible: 0 };
    bucket.possible += weight;
    if (outcome) {
      const credit = outcome.status === "completed"
        ? 1
        : outcome.status === "partial"
          ? 0.5
          : outcome.status === "postponed"
            ? 0.25
            : 0;
      earned += credit * weight;
      bucket.earned += credit * weight;
      if (outcome.status === "completed") {
        completed += 1;
        completedKinds.set(item.kind, (completedKinds.get(item.kind) ?? 0) + 1);
      } else if (outcome.status === "partial") {
        partial += 1;
      } else if (outcome.status === "postponed") {
        postponed += 1;
        postponedKinds.set(item.kind, (postponedKinds.get(item.kind) ?? 0) + 1);
      } else {
        skipped += 1;
      }
    }
    periodStats.set(period, bucket);
  }

  const rankedHabits = [...completedKinds.entries()]
    .filter(([kind]) => ["habit", "dhikr", "quran"].includes(kind))
    .sort((a, b) => b[1] - a[1]);
  const rankedPostponed = [...postponedKinds.entries()].sort((a, b) => b[1] - a[1]);
  const successfulPeriods = [...periodStats.entries()]
    .filter(([, value]) => value.possible >= 4 && value.earned / value.possible >= 0.6)
    .map(([period]) => period);
  const difficultPeriods = [...periodStats.entries()]
    .filter(([, value]) => value.possible >= 4 && value.earned / value.possible < 0.35)
    .map(([period]) => period);

  const prayerLogs = input.prayerLogs ?? [];
  const onTime = prayerLogs.filter((log) => log.status === "ontime" || log.status === "jamaah").length;
  const late = prayerLogs.filter((log) => log.status === "late").length;
  const missed = prayerLogs.filter((log) => log.status === "missed").length;
  const loggedDays = new Set(prayerLogs.map((log) => log.date)).size;
  const adhkarDays = new Set((input.adhkarLogs ?? []).map((log) => log.date)).size;
  const reviews = input.reviews ?? [];

  const suggestedAdjustments: PlanAdjustment[] = [];
  if (items.length > 0 && earned / possible < 0.55) {
    suggestedAdjustments.push({
      id: "reduce-load",
      kind: "reduce",
      target: "daily-plan",
      reason: "الالتزام العام أقل من نصف الحمل المختار؛ نقترح تقليل الضغط قبل زيادة المهام.",
      requiresApproval: true,
    });
  }
  if (rankedPostponed[0] && rankedPostponed[0][1] >= 2) {
    suggestedAdjustments.push({
      id: `move-${rankedPostponed[0][0]}`,
      kind: "move",
      target: rankedPostponed[0][0],
      reason: "هذا العنصر يتأجل غالبًا؛ يمكن اقتراح نافذة مختلفة بعد موافقتك.",
      requiresApproval: true,
    });
  }
  if (successfulPeriods[0]) {
    suggestedAdjustments.push({
      id: `protect-${successfulPeriods[0]}`,
      kind: "protect",
      target: successfulPeriods[0],
      reason: "هذه الفترة كانت أكثر التزامًا؛ حمايتها في الخطة مفيدة، ولا تُطبَّق تلقائيًا.",
      requiresApproval: true,
    });
  }
  if (suggestedAdjustments.length === 0) {
    suggestedAdjustments.push({
      id: "keep-current",
      kind: "keep",
      target: "current-plan",
      reason: "لا توجد بيانات كافية لاقتراح تغيير؛ نُبقي الخطة كما اخترتها.",
      requiresApproval: true,
    });
  }

  return {
    weekStart: input.plan.weekStart,
    planned: items.length,
    completed,
    partial,
    postponed,
    skipped,
    adherence: percent(earned, possible),
    reviewedDays: reviews.length,
    mostConsistentHabit: rankedHabits[0]
      ? { kind: rankedHabits[0][0], count: rankedHabits[0][1] }
      : null,
    mostPostponed: rankedPostponed[0]
      ? { kind: rankedPostponed[0][0], count: rankedPostponed[0][1] }
      : null,
    successfulPeriods: unique(successfulPeriods),
    difficultPeriods: unique(difficultPeriods),
    prayerContext: {
      loggedDays,
      onTime,
      late,
      missed,
      note: adhkarDays > 0 ? "الصلاة والأذكار جزء من الصورة، لا درجة مستقلة عنهما." : "الصلاة جزء من الصورة؛ لم يُسجل أذكار في هذا الأسبوع بعد.",
    },
    weeklyFocus: input.plan.weeklyFocus,
    suggestedAdjustments,
  };
}
