/**
 * Weekly Plan Engine — منطق خالص لا يعرف Convex أو React.
 * يولّد خطة قابلة للتعديل، ويحوّل مواقيت الصلاة إلى anchors بدل تثبيت مواعيد صلوات وهمية.
 */
import { type PersonalLifeModel } from "./life-model";
import { addMinutes, diffMinutes, toMinutes, weekStartOfDateKey } from "./time";

const DAY_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const WEEK_LENGTH = 7;
export const MAX_PLAN_ITEMS = 140;

export type PrayerAnchor = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";
export type PlanItemKind =
  | "prayer"
  | "dhikr"
  | "quran"
  | "work"
  | "sleep"
  | "habit"
  | "goal"
  | "focus"
  | "rest"
  | "commitment";
export type PlanImportance = "foundation" | "core" | "supporting" | "optional";
export type PlanOrigin = "prayer-times" | "profile" | "system";

export type WeeklyPlanItem = {
  id: string;
  date: string;
  day: number;
  kind: PlanItemKind;
  title: string;
  importance: PlanImportance;
  recurrence: "daily" | "weekly";
  origin: PlanOrigin;
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  durationMinutes?: number;
  prayerAnchor?: PrayerAnchor;
};

export type WeeklyPlan = {
  weekStart: string;
  timezone: string;
  weeklyFocus: string;
  items: WeeklyPlanItem[];
};

export type WeeklyPlanItemPatch = {
  title?: string;
  startTime?: string | null;
  endTime?: string | null;
  durationMinutes?: number | null;
  enabled?: boolean;
};

const PRAYERS: readonly { key: PrayerAnchor; name: string }[] = [
  { key: "fajr", name: "الفجر" },
  { key: "dhuhr", name: "الظهر" },
  { key: "asr", name: "العصر" },
  { key: "maghrib", name: "المغرب" },
  { key: "isha", name: "العشاء" },
];

const PRAYER_ORDER: Record<PrayerAnchor, number> = {
  fajr: 0,
  dhuhr: 1,
  asr: 2,
  maghrib: 3,
  isha: 4,
};

const MOVEMENT_TITLES: Record<string, string> = {
  walk: "مشي خفيف",
  sport: "رياضة أو تمرين",
  active: "حركة داخل الدراسة أو العمل",
  rest: "راحة متدرجة",
};

const RITUAL_TITLES: Record<string, string> = {
  wird: "ورد القرآن",
  adhkar: "أذكار الصباح",
  dua: "دعاء الصباح",
  tasbih: "ذكر الصباح",
};

const RESET_TITLES: Record<string, string> = {
  quran: "قراءة خفيفة",
  adhkar: "أذكار المساء",
  reflection: "مراجعة اليوم",
  calm: "هدوء قبل النوم",
};

const WEEKLY_FOCUS_TITLES: Record<string, string> = {
  prayer: "الصلاة في وقتها",
  adhkar: "أذكار الصباح والمساء",
  consistency: "الاستمرارية دون يوم فارغ من الذكر",
};

const WORK_TITLES: Record<string, string> = {
  study: "الدراسة",
  work: "العمل",
  both: "الدراسة والعمل",
  open: "مسؤولية اليوم",
};

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function item(
  weekStart: string,
  day: number,
  suffix: string,
  value: Omit<WeeklyPlanItem, "id" | "date" | "day">,
): WeeklyPlanItem {
  const date = addDays(weekStart, day);
  return { ...value, id: `${date}:${suffix}`, date, day };
}

function durationBetween(start: string, end: string): number {
  return Math.max(15, diffMinutes(start, end));
}

/** ترتيب واضح: أولًا داخل اليوم، ثم الوقت/الـanchor، ثم أهمية العنصر. */
export function sortWeeklyPlanItems(items: readonly WeeklyPlanItem[]): WeeklyPlanItem[] {
  const importance: Record<PlanImportance, number> = {
    foundation: 0,
    core: 1,
    supporting: 2,
    optional: 3,
  };
  return [...items].sort((a, b) => {
    if (a.day !== b.day) return a.day - b.day;
    const aTime = a.startTime
      ? toMinutes(a.startTime)
      : a.prayerAnchor
        ? PRAYER_ORDER[a.prayerAnchor]
        : Number.MAX_SAFE_INTEGER;
    const bTime = b.startTime
      ? toMinutes(b.startTime)
      : b.prayerAnchor
        ? PRAYER_ORDER[b.prayerAnchor]
        : Number.MAX_SAFE_INTEGER;
    if (aTime !== bTime) return aTime - bTime;
    if (importance[a.importance] !== importance[b.importance]) {
      return importance[a.importance] - importance[b.importance];
    }
    return a.id.localeCompare(b.id);
  });
}

export function generateWeeklyPlan(input: {
  model: PersonalLifeModel;
  weekStart: string;
  timezone?: string;
}): WeeklyPlan {
  const { model } = input;
  const items: WeeklyPlanItem[] = [];

  for (let day = 0; day < WEEK_LENGTH; day += 1) {
    for (const prayer of PRAYERS) {
      items.push(
        item(input.weekStart, day, `prayer:${prayer.key}`, {
          kind: "prayer",
          title: `صلاة ${prayer.name}`,
          importance: "foundation",
          recurrence: "daily",
          origin: "prayer-times",
          enabled: true,
          prayerAnchor: prayer.key,
        }),
      );
    }

    items.push(
      item(input.weekStart, day, "morning-ritual", {
        kind: "dhikr",
        title: RITUAL_TITLES[model.habits.morningRitual] ?? "ذكر الصباح",
        importance: "supporting",
        recurrence: "daily",
        origin: "profile",
        enabled: true,
        startTime: addMinutes(model.sleepWindow.start, 30),
        durationMinutes: 15,
      }),
      item(input.weekStart, day, "quran", {
        kind: "quran",
        title: "ورد القرآن اليومي",
        importance: model.goals.primary === "quran" ? "core" : "supporting",
        recurrence: "daily",
        origin: "profile",
        enabled: true,
        startTime: addMinutes(model.sleepWindow.start, 45),
        durationMinutes: model.habits.quranAmount === "juz" ? 60 : 20,
      }),
    );

    const focusStart = model.focus.preferredStart;
    if (focusStart) {
      items.push(
        item(input.weekStart, day, "focus", {
          kind: "focus",
          title: "حماية أول مساحة مهمة",
          importance: "core",
          recurrence: "daily",
          origin: "profile",
          enabled: true,
          startTime: focusStart,
          durationMinutes: 50,
        }),
      );
    }

    const workWindow = model.primaryResponsibility.workWindow;
    if (workWindow) {
      items.push(
        item(input.weekStart, day, "work", {
          kind: "work",
          title: WORK_TITLES[model.primaryResponsibility.rhythm] ?? "مسؤولية اليوم",
          importance: "core",
          recurrence: "daily",
          origin: "profile",
          enabled: true,
          startTime: workWindow.start,
          endTime: workWindow.end,
          durationMinutes: durationBetween(workWindow.start, workWindow.end),
        }),
      );
    }

    if (model.rest.preferredTime) {
      items.push(
        item(input.weekStart, day, "rest", {
          kind: "rest",
          title: "راحة قصيرة",
          importance: "supporting",
          recurrence: "daily",
          origin: "profile",
          enabled: true,
          startTime: model.rest.preferredTime,
          durationMinutes: model.rest.suggestedDurationMinutes,
        }),
      );
    }

    items.push(
      item(input.weekStart, day, "evening-reset", {
        kind: "habit",
        title: RESET_TITLES[model.habits.eveningReset] ?? "تهدئة قبل النوم",
        importance: "supporting",
        recurrence: "daily",
        origin: "profile",
        enabled: true,
        startTime: addMinutes(model.sleepWindow.end, -60),
        durationMinutes: 20,
      }),
      item(input.weekStart, day, "movement", {
        kind: "habit",
        title: MOVEMENT_TITLES[model.habits.movement] ?? "حركة خفيفة",
        importance: "optional",
        recurrence: "daily",
        origin: "profile",
        enabled: true,
      }),
      item(input.weekStart, day, "sleep", {
        kind: "sleep",
        title: "الاستعداد للنوم",
        importance: "foundation",
        recurrence: "daily",
        origin: "profile",
        enabled: true,
        startTime: model.sleepWindow.end,
        durationMinutes: 30,
      }),
    );
  }

  const weeklyFocus = WEEKLY_FOCUS_TITLES[model.goals.weekly] ?? "الثبات على الخطة";
  for (let day = 0; day < WEEK_LENGTH; day += 1) {
    items.push(
      item(input.weekStart, day, "weekly-goal", {
        kind: "goal",
        title: `هدف الأسبوع: ${weeklyFocus}`,
        importance: "core",
        recurrence: "daily",
        origin: "profile",
        enabled: true,
      }),
    );
    for (const [index, commitment] of model.commitments.entries()) {
      items.push(
        item(input.weekStart, day, `commitment:${index + 1}`, {
          kind: "commitment",
          title: commitment,
          importance: "core",
          recurrence: "daily",
          origin: "profile",
          enabled: true,
        }),
      );
    }
  }

  if (items.length > MAX_PLAN_ITEMS) {
    throw new Error("الخطة المولدة تتجاوز الحد الآمن");
  }

  return {
    weekStart: input.weekStart,
    timezone: input.timezone?.trim() || "local",
    weeklyFocus: model.goals.weekly,
    items: sortWeeklyPlanItems(items),
  };
}

/** تعديل immutable/idempotent: تكرار نفس Patch لا يضاعف العنصر ولا يغير النسخة. */
export function updateWeeklyPlanItems(
  items: readonly WeeklyPlanItem[],
  itemId: string,
  patch: WeeklyPlanItemPatch,
): { items: WeeklyPlanItem[]; changed: boolean } {
  let changed = false;
  const next = items.map((current) => {
    if (current.id !== itemId) return current;
    const updated: WeeklyPlanItem = {
      ...current,
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.startTime !== undefined
        ? patch.startTime === null
          ? { startTime: undefined }
          : { startTime: patch.startTime }
        : {}),
      ...(patch.endTime !== undefined
        ? patch.endTime === null
          ? { endTime: undefined }
          : { endTime: patch.endTime }
        : {}),
      ...(patch.durationMinutes !== undefined
        ? patch.durationMinutes === null
          ? { durationMinutes: undefined }
          : { durationMinutes: patch.durationMinutes }
        : {}),
      ...(patch.enabled !== undefined ? { enabled: patch.enabled } : {}),
    };
    const normalizedCurrent = { ...current, startTime: current.startTime ?? null, endTime: current.endTime ?? null, durationMinutes: current.durationMinutes ?? null };
    const normalizedUpdated = { ...updated, startTime: updated.startTime ?? null, endTime: updated.endTime ?? null, durationMinutes: updated.durationMinutes ?? null };
    changed = JSON.stringify(normalizedCurrent) !== JSON.stringify(normalizedUpdated);
    return changed ? updated : current;
  });
  return { items: next, changed };
}


/**
 * الأسبوع الذي ينتمي إليه عنصر الخطة، مشتقًا من مُعرّف العنصر نفسه.
 *
 * العناوين في العناصر تحمل تاريخ اليوم داخلها، فارسال أسبوعٍ آخر (أسبوع تصفّح مثلًا)
 * مع العنصر يجعل الخادم يرفض العملية. الاشتقاق من العنصر يجعل ذلك مستحيلًا بنيويًا.
 */
export function planItemWeekStart(itemId: string): string | undefined {
  const date = itemId.slice(0, 10);
  return DAY_KEY_PATTERN.test(date) ? weekStartOfDateKey(date) : undefined;
}
