/**
 * Daily Plan — يحوّل Weekly Plan إلى يوم واحد واضح باستخدام مواقيت الصلاة الفعلية.
 * لا يضيف وقتًا مصطنعًا: prayer فقط ما لم يغيّره المستخدم، وبقية العناصر تراعي وقتها الأصلي.
 */
import type { Timings } from "./prayers";
import { toMinutes } from "./time";
import type { PrayerAnchor, WeeklyPlan, WeeklyPlanItem } from "./weekly-plan";

export type DailyBand =
  | "foundation"
  | "primary"
  | "habits"
  | "work"
  | "goals"
  | "secondary";

export type PrayerPhase = {
  key: PrayerAnchor;
  time: string;
  title: string;
  prompt: string;
};

export type DailyPlanItem = {
  item: WeeklyPlanItem;
  band: DailyBand;
  scheduledTime?: string;
};

export type DailyPlanSection = {
  key: DailyBand;
  title: string;
  items: DailyPlanItem[];
};

export type DailyPlan = {
  date: string;
  weekStart: string;
  timezone: string;
  primaryAction: DailyPlanItem | null;
  sections: DailyPlanSection[];
  prayerAnchors: PrayerPhase[];
  currentAnchor: PrayerPhase;
  nextAnchor: PrayerPhase;
};

const SECTION_ORDER: readonly DailyBand[] = [
  "foundation",
  "primary",
  "habits",
  "work",
  "goals",
  "secondary",
];

const SECTION_TITLES: Record<DailyBand, string> = {
  foundation: "الصلاة والأساس",
  primary: "المهم اليوم",
  habits: "العادات",
  work: "الدراسة أو العمل",
  goals: "هدف الأسبوع",
  secondary: "الأشياء الثانوية",
};

const PRAYER_PHASES: Record<PrayerAnchor, { title: string; prompt: string }> = {
  fajr: { title: "فتح اليوم", prompt: "بعد الفجر: ابدأ أول فترة مهمة." },
  dhuhr: { title: "إعادة الترتيب", prompt: "بعد الظهر: راجع أول نصف يوم وما بقي." },
  asr: { title: "مراجعة التقدم", prompt: "بعد العصر: راجع ما أنجزته وما يحتاج تأجيلًا." },
  maghrib: { title: "الانتقال للمساء", prompt: "بعد المغرب: انقل أولويتك إلى ما بقي من اليوم." },
  isha: { title: "إغلاق اليوم", prompt: "بعد العشاء: أكمل المراجعة والاستعداد للنوم." },
};

const PRAYER_KEYS: readonly PrayerAnchor[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];

function isTime(value: string | undefined): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function bandFor(item: WeeklyPlanItem): DailyBand {
  if (item.kind === "prayer" || item.kind === "sleep") return "foundation";
  if (item.kind === "commitment" || item.kind === "focus") return "primary";
  if (item.kind === "dhikr" || item.kind === "quran" || item.kind === "habit") {
    return "habits";
  }
  if (item.kind === "work") return "work";
  if (item.kind === "goal") return "goals";
  return "secondary";
}

function itemTime(item: WeeklyPlanItem, timings: Timings): string | undefined {
  if (isTime(item.startTime)) return item.startTime;
  if (item.prayerAnchor && isTime(timings[item.prayerAnchor])) return timings[item.prayerAnchor];
  return undefined;
}

function compareDailyItems(a: DailyPlanItem, b: DailyPlanItem) {
  const aTime = a.scheduledTime ? toMinutes(a.scheduledTime) : Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduledTime ? toMinutes(b.scheduledTime) : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  if (a.item.kind === "prayer" && b.item.kind !== "prayer") return -1;
  if (b.item.kind === "prayer" && a.item.kind !== "prayer") return 1;
  return a.item.id.localeCompare(b.item.id);
}

function choosePrimary(items: readonly DailyPlanItem[]): DailyPlanItem | null {
  const priority = ["commitment", "focus", "work", "quran", "dhikr", "habit"];
  for (const kind of priority) {
    const match = items.find((entry) => entry.item.kind === kind);
    if (match) return match;
  }
  return items[0] ?? null;
}

export function buildDailyPlan(input: {
  plan: WeeklyPlan;
  date: string;
  timings: Timings;
  now?: Date;
}): DailyPlan {
  const dayItems = input.plan.items
    .filter((item) => item.date === input.date && item.enabled)
    .map((item) => {
      const scheduledTime = itemTime(item, input.timings);
      return {
        item,
        band: bandFor(item),
        ...(scheduledTime ? { scheduledTime } : {}),
      } satisfies DailyPlanItem;
    });

  const sections = SECTION_ORDER.map((key) => ({
    key,
    title: SECTION_TITLES[key],
    items: dayItems.filter((item) => item.band === key).sort(compareDailyItems),
  })).filter((section) => section.items.length > 0);

  const prayerAnchors = PRAYER_KEYS.map((key) => ({
    key,
    time: input.timings[key],
    ...PRAYER_PHASES[key],
  }));
  const nowMinutes = input.now
    ? input.now.getHours() * 60 + input.now.getMinutes()
    : Number.MAX_SAFE_INTEGER;
  const passed = prayerAnchors.filter((anchor) => toMinutes(anchor.time) <= nowMinutes);
  const currentAnchor = passed[passed.length - 1] ?? prayerAnchors[0];
  const nextAnchor =
    prayerAnchors.find((anchor) => toMinutes(anchor.time) > nowMinutes) ?? prayerAnchors[0];

  return {
    date: input.date,
    weekStart: input.plan.weekStart,
    timezone: input.plan.timezone,
    primaryAction: choosePrimary(dayItems),
    sections,
    prayerAnchors,
    currentAnchor,
    nextAnchor,
  };
}

export function dailyFocusLine(plan: DailyPlan): string {
  const action = plan.primaryAction;
  if (!action) return "لا توجد خطوات مفعّلة لهذا اليوم.";
  const time = action.scheduledTime ? ` عند ${action.scheduledTime}` : "";
  return `مهمتك اليوم: ${action.item.title}${time}.`;
}
