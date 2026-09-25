/**
 * منطق «المدرب» الخالص — بلا React وبلا شبكة:
 * فترة اليوم، استحقاق المراجعة، المؤشر الأسبوعي العادل، واقتراح الغد المبني على عائق اليوم.
 * كل القيم مغلقة والنتائج يمكن توقّعها — ولهذا تُختبر باختبارات وحدة.
 */
import { formatArabicTime, toMinutes } from "./time";

export type DayPeriod = "morning" | "midday" | "evening" | "night";
export type WeeklyFocus = "prayer" | "adhkar" | "consistency";
export type ReviewMood = "bad" | "ok" | "good" | "great";
export type ReviewBlocker = "none" | "busy" | "tired" | "forgot" | "mood";


export const MOOD_LABELS: Record<ReviewMood, string> = {
  bad: "يوم صعب",
  ok: "مقبول",
  good: "جيد",
  great: "ممتاز",
};

export const BLOCKER_LABELS: Record<ReviewBlocker, string> = {
  none: "لا عائق، الحمد لله",
  busy: "انشغال",
  tired: "إرهاق أو قلة نوم",
  forgot: "نسيان أو تأجيل",
  mood: "حالة نفسية",
};

/** اقتراح واحد صغير للغد — مبنيًا على عائق اليوم، لا على لوم. */
export const REVIEW_TIPS: Record<ReviewBlocker, string> = {
  none: "لا نغيّر شيئًا — كرّر هذا اليوم غدًا كما هو.",
  busy: "غدًا نجعل الورد أصغر: دقيقتان بعد الفجر مباشرة، قبل أن يزدحم اليوم.",
  tired: "غدًا نُقدّم أذكار المساء ساعة، ونترك أذكار النوم لعشر دقائق قبل الفراش.",
  forgot: "غدًا نضع التذكير ملتصقًا ببداية اليوم (بعد الفجر مباشرة) لا في وسطه.",
  mood: "غدًا خطوة واحدة فقط: أذكار الصباح — ثم نكمل بعدها إن شئت.",
};

export const RHYTHM_LABELS: Record<string, string> = {
  study: "دراسة",
  work: "عمل",
  both: "دراسة وعمل",
  open: "يوم مرن",
};

export const MOVEMENT_LABELS: Record<string, string> = {
  walk: "مشي خفيف",
  sport: "رياضة أو تمرين",
  active: "حركة داخل الدراسة أو العمل",
  rest: "راحة متدرجة",
};


export const EVENING_RESET_LABELS: Record<string, string> = {
  quran: "قراءة خفيفة",
  adhkar: "أذكار المساء والنوم",
  reflection: "مراجعة اليوم",
  calm: "هدوء ودون شاشة",
};


/** فترة اليوم من وقت الجهاز + إجابات المستخدم (استيقاظ/نوم). */
export function dayPeriod(
  now: Date,
  input: { wakeTime?: string; sleepTime?: string } = {},
): DayPeriod {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const wake = input.wakeTime ? toMinutes(input.wakeTime) : 6 * 60;
  const sleep = input.sleepTime ? toMinutes(input.sleepTime) : 23 * 60;

  if (minutes < wake || minutes >= sleep) return "night";
  if (minutes < 11 * 60) return "morning";
  if (minutes < 16 * 60) return "midday";
  return "evening";
}

/** هل حان وقت مراجعة اليوم؟ (بعد انتهاء التزامك اليومي أو من 16:00، أيهما أبعد). */
export function reviewDue(now: Date, input: { dayEnd?: string } = {}): boolean {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const dueFrom = Math.max(16 * 60, toMinutes(input.dayEnd ?? "17:00"));
  return minutes >= dueFrom;
}

/** سطر خطة اليوم — بلغة بشرية قصيرة، بلا أرقام وهمية. */
export function planLine(input: {
  dayRhythm?: string;
  dayEnd?: string;
  focusTime?: string;
  movement?: string;
  eveningReset?: string;
  startingRitual?: string;
}): string {
  const rhythm = RHYTHM_LABELS[input.dayRhythm ?? "open"] ?? RHYTHM_LABELS.open;
  const focus = formatArabicTime(input.focusTime ?? "08:00");
  const movement = MOVEMENT_LABELS[input.movement ?? "walk"] ?? MOVEMENT_LABELS.walk;
  const reset = EVENING_RESET_LABELS[input.eveningReset ?? "adhkar"] ?? EVENING_RESET_LABELS.adhkar;
  const ritual =
    input.startingRitual === "wird"
      ? "ابدأ بالورد"
      : input.startingRitual === "adhkar"
        ? "ابدأ بأذكار الصباح"
        : input.startingRitual === "dua"
          ? "ابدأ بدعاء الصباح"
          : "ابدأ بذكر قصير";
  return `${rhythm} • ${ritual} • مسؤوليتك ${focus} • ${movement} • قبل النوم: ${reset}.`;
}

export type DailyRow = {
  date: string;
  done: number;
  logged: number;
  adhkar: number;
  reviewed: boolean;
};

export type FocusMetric = {
  /** ما أنجزه في آخر ٧ أيام بأرقام حقيقية من سجلك. */
  done: number;
  total: number;
  pct: number;
  /** سطر النص المعروض مع الرقم. */
  unit: string;
};

/** مؤشر أسبوعي عادل: يقيس تركيزك ضد نفسك، من سجل الأيام الأخيرة فقط. */
export function focusMetric(focus: WeeklyFocus, daily: readonly DailyRow[]): FocusMetric {
  const week = daily.slice(-7);
  if (focus === "adhkar") {
    const days = week.filter((day) => day.adhkar > 0).length;
    return {
      done: days,
      total: week.length || 7,
      pct: pct(days, week.length || 7),
      unit: "أيام فيها ذكر",
    };
  }
  if (focus === "consistency") {
    const days = week.filter((day) => day.done > 0 || day.adhkar > 0 || day.reviewed).length;
    return {
      done: days,
      total: week.length || 7,
      pct: pct(days, week.length || 7),
      unit: "أيام فيها عبادة مسجّلة",
    };
  }
  const done = week.reduce((sum, day) => sum + day.done, 0);
  const total = (week.length || 7) * 5;
  return { done, total, pct: pct(done, total), unit: "صلوات في وقتها" };
}

function pct(done: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((done / total) * 100));
}

/** وصف لحظي للمراجعة: عرض ما سُجّل فعلًا اليوم دون تجميل ولا لوم. */
export function reviewSummaryLine(prayedToday: number): string {
  if (prayedToday <= 0) return "اليوم لم يُسجَّل أي عبادة بعد — وأمامك بقية اليوم.";
  if (prayedToday >= 5) return "سجّلت الصلوات الخمس اليوم — هذا يوم كامل.";
  return `سجّلت ${prayedToday} من ٥ صلوات اليوم.`;
}
