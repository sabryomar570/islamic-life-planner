/**
 * PHASE NEXT — التقدّم الشخصي: نقاط وشارات.
 *
 * **ما هو ليس هذا:** لا لوحة متصدّرين، ولا مقارنة بين الناس، ولا أي رقم
 * يُعرض عن مستخدم آخر. النقاط للمستخدم وحده، وفائدتها أن تُفتح بها واجهة
 * أو يُظهر بها ما أنجزه، لا أن ينافس أحدا.
 *
 * **ماذا هي النقاط؟** مقياس انتظام في التطبيق، يُحسب من أحداث **مسجّلة
 * فعلا**: صلاة سُجّلت، خطوة في خطة تمّت، أذكار تمّت، مراجعة يوم.
 * وليست أجرا ولا ثوابا ولا فضل، ولا يوحي أي نص في الواجهة بذلك.
 *
 * **الشارات** لا تُخزَّن: كل واحدة دالة على حالة حقيقية من سجل المستخدم،
 * فلا تكذب بعد مسح البيانات ولا تظل مفتوحة على حساب جديد.
 */

import { arabicNumber, dateKey } from "./time";
import type { PrayerStatus } from "./prayers";

export type XpKind =
  | "prayer-jamaah"
  | "prayer-alone"
  | "plan-completed"
  | "plan-partial"
  | "adhkar"
  | "review"
  | "comeback";

export type XpEvent = {
  /** معرّف فريد: يبقى نفسه لو تكرر التنفيذ، فلا تُحتسب مرتين. */
  id: string;
  kind: XpKind;
  at: number;
};

/** قيمة الحدث بالنقاط. قاعدة واحدة مكتوبة صراحة: الجماعة أعلى من المنفرد. */
export const XP_RULES: Record<XpKind, number> = {
  "prayer-jamaah": 2,
  "prayer-alone": 1,
  "plan-completed": 2,
  "plan-partial": 1,
  adhkar: 1,
  review: 2,
  comeback: 3,
};

export const XP_MAX_LEDGER = 400;

export function xpForStatus(status: PrayerStatus): XpKind | null {
  if (status === "jamaah") return "prayer-jamaah";
  if (status === "ontime" || status === "late") return "prayer-alone";
  return null;
}

export function pointsFor(kind: XpKind): number {
  return XP_RULES[kind] ?? 0;
}

/** يضيف حدثا بلا تكرار، ويقصّ السجلّ حتى لا ينمو بلا سقف. */
export function appendXp(ledger: readonly XpEvent[], event: XpEvent): XpEvent[] {
  if (ledger.some((item) => item.id === event.id)) return [...ledger];
  const next = [...ledger, event];
  return next.length > XP_MAX_LEDGER ? next.slice(next.length - XP_MAX_LEDGER) : next;
}

export type XpLevel = { min: number; label: string };

/**
 * السلّم. الأسماء تصف عادة لا مرتبة، فمن في الأسفل ليس أقلّ قدرة.
 * ولا اسم فيه كلمة «مبتدئ» أو «هاوي».
 */
export const XP_LEVELS: XpLevel[] = [
  { min: 0, label: "بتبدأ" },
  { min: 25, label: "بيعود عليك" },
  { min: 70, label: "ثابت" },
  { min: 140, label: "ماشي معاه" },
  { min: 240, label: "ماشي على جناحه" },
  { min: 380, label: "عرف طريقه" },
  { min: 560, label: "السكوت بيخدمه" },
];

export type XpSummary = {
  total: number;
  today: number;
  level: number;
  levelLabel: string;
  nextLevelAt: number | null;
  toNext: number;
  percent: number;
};

export function xpSummary(ledger: readonly XpEvent[], now: Date = new Date()): XpSummary {
  const total = ledger.reduce((sum, event) => sum + pointsFor(event.kind), 0);
  const todayKey = dateKey(now);
  const today = ledger
    .filter((event) => dateKey(new Date(event.at)) === todayKey)
    .reduce((sum, event) => sum + pointsFor(event.kind), 0);

  let level = 0;
  for (let index = 0; index < XP_LEVELS.length; index += 1) {
    if (total >= XP_LEVELS[index].min) level = index;
  }
  const next = XP_LEVELS[level + 1] ?? null;
  const floor = XP_LEVELS[level].min;
  const span = next ? next.min - floor : 1;
  const into = Math.max(0, total - floor);

  return {
    total,
    today,
    level,
    levelLabel: XP_LEVELS[level].label,
    nextLevelAt: next ? next.min : null,
    toNext: next ? Math.max(0, next.min - total) : 0,
    percent: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

/* ————————————————————— الإنجازات ————————————————————— */

export type AchievementId =
  | "first-prayer"
  | "first-jamaah"
  | "full-day"
  | "streak-3"
  | "streak-7"
  | "comeback"
  | "week-plan";

export type Achievement = {
  id: AchievementId;
  label: string;
  /** ماذا يقف عليه فعلا. جملة واحدة، بلا مبالغة. */
  detail: string;
};

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first-prayer", label: "أول صلاة مسجّلة", detail: "سجّلت أول صلاة في عود." },
  { id: "first-jamaah", label: "أول صلاة جماعة", detail: "سجّلت صلاة في جماعة." },
  { id: "full-day", label: "يوم كامل", detail: "سجّلت صلوات اليوم كلها." },
  { id: "streak-3", label: "ثلاثة أيام متصلة", detail: "ثلاثة أيام فيها نشاط، بلا انقطاع." },
  { id: "streak-7", label: "أسبوع متصل", detail: "سبعة أيام متصلة." },
  { id: "comeback", label: "رجعت", detail: "عدت بعد انقطاع، وبدأت من جديد." },
  { id: "week-plan", label: "أسبوع ملتزم", detail: "أنهيت خطة يومك سبعة أيام." },
];

/** أرقام صريحة من سجل المستخدم — لا تقدير ولا افتراض. */
export type AchievementInput = {
  totalPrayersLogged: number;
  totalJamaahLogged: number;
  daysWithAllPrayers: number;
  currentStreak: number;
  cameBackAfterBreak: boolean;
  daysPlanFullyCompleted: number;
};

export function unlockedAchievementIds(input: AchievementInput): AchievementId[] {
  const open = new Set<AchievementId>();
  if (input.totalPrayersLogged >= 1) open.add("first-prayer");
  if (input.totalJamaahLogged >= 1) open.add("first-jamaah");
  if (input.daysWithAllPrayers >= 1) open.add("full-day");
  if (input.currentStreak >= 3) open.add("streak-3");
  if (input.currentStreak >= 7) open.add("streak-7");
  if (input.cameBackAfterBreak) open.add("comeback");
  if (input.daysPlanFullyCompleted >= 7) open.add("week-plan");
  return ACHIEVEMENTS.filter((item) => open.has(item.id)).map((item) => item.id);
}

/** سطر الشارة بصيغة واحدة للعرض. */
export function achievementProgressLabel(id: AchievementId, input: AchievementInput): string {
  switch (id) {
    case "first-prayer":
      return input.totalPrayersLogged >= 1 ? "تم" : "لسه";
    case "first-jamaah":
      return input.totalJamaahLogged >= 1 ? "تم" : "لسه";
    case "full-day":
      return input.daysWithAllPrayers >= 1 ? "تم" : "لسه";
    case "streak-3":
      return `${arabicNumber(Math.min(input.currentStreak, 3))} من ٣`;
    case "streak-7":
      return `${arabicNumber(Math.min(input.currentStreak, 7))} من ٧`;
    case "comeback":
      return input.cameBackAfterBreak ? "تم" : "لسه";
    case "week-plan":
      return `${arabicNumber(Math.min(input.daysPlanFullyCompleted, 7))} من ٧`;
    default:
      return "";
  }
}

/* ————————————————————— التخزين على الجهاز ————————————————————— */

/**
 * السجل على جهاز المستخدم، لا على خادم.
 * السبب عملي: النقاط تقيس عادة شخصية، وتخزينها في الحساب يجعل مسح بيانات
 * الجهاز غير كامل. وهي تُمسح مع تسجيل الخروج كأي مفتاح آخر يملكه التطبيق.
 */
export const XP_LEDGER_KEY = "oud:xp:ledger:v1";
export const ACHIEVEMENTS_SEEN_KEY = "oud:achievements:seen:v1";

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

function readJson<T>(store: Store | null, key: string, fallback: T): T {
  if (!store) return fallback;
  try {
    const raw = store.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(store: Store | null, key: string, value: unknown) {
  if (!store) return;
  try {
    store.setItem(key, JSON.stringify(value));
  } catch {
    /* التخزين ممتلئ أو ممنوع: النقاط زينة، ولا يُسقط التطبيق. */
  }
}

function isXpEvent(value: unknown): value is XpEvent {
  if (!value || typeof value !== "object") return false;
  const event = value as Partial<XpEvent>;
  return (
    typeof event.id === "string" &&
    event.id.length > 0 &&
    typeof event.at === "number" &&
    typeof event.kind === "string" &&
    event.kind in XP_RULES
  );
}

export function readXpLedger(
  store: Store | null = typeof window === "undefined" ? null : window.localStorage,
): XpEvent[] {
  const parsed = readJson<unknown>(store, XP_LEDGER_KEY, []);
  if (!Array.isArray(parsed)) return [];
  return parsed.filter(isXpEvent).slice(-XP_MAX_LEDGER);
}

export function writeXpLedger(
  ledger: readonly XpEvent[],
  store: Store | null = typeof window === "undefined" ? null : window.localStorage,
): void {
  writeJson(store, XP_LEDGER_KEY, ledger.slice(-XP_MAX_LEDGER));
}

export function readSeenAchievements(
  store: Store | null = typeof window === "undefined" ? null : window.localStorage,
): AchievementId[] {
  const parsed = readJson<unknown>(store, ACHIEVEMENTS_SEEN_KEY, []);
  if (!Array.isArray(parsed)) return [];
  const known = new Set<string>(ACHIEVEMENTS.map((item) => item.id));
  return parsed.filter((id): id is AchievementId => typeof id === "string" && known.has(id));
}

export function writeSeenAchievements(
  ids: readonly AchievementId[],
  store: Store | null = typeof window === "undefined" ? null : window.localStorage,
): void {
  writeJson(store, ACHIEVEMENTS_SEEN_KEY, ids);
}
