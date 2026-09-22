/**
 * محرّك التنبيهات المنبثقة: يفتح نافذة بنفسه إذا لم يدخل المستخدم القسم المعني،
 * أو فات وقت عبادة (صلاة، أذكار، ورد، سحور). يظهر تنبيه واحد في كل مرة،
 * ويُسجّل أن المستخدم رآه فلا يُكرَّر في اليوم نفسه.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { hijriProgressLabel, isFriday, isLastTenNights, isRamadan } from "@/lib/hijri";
import { PRAYERS, type Timings } from "@/lib/prayers";
import { needsGentlePrayerReminders } from "@/data/questions";
import { dateKey, formatArabicTime, toMinutes } from "@/lib/time";

export type NudgeId =
  | "notifications"
  | "iftar"
  | "adhkar_morning"
  | "adhkar_evening"
  | "prayer_log"
  | "adhkar_sleep"
  | "wird"
  | "kahf"
  | "unvisited";

export type Nudge = {
  id: NudgeId;
  priority: number;
  eyebrow: string;
  title: string;
  body: string;
  primary: string;
  secondary?: string;
  view?: string;
  payload?: Record<string, unknown>;
};

const DISMISS_KEY = "sakinah:nudges:v1";
const SEEN_KEY = "sakinah:seen:v1";

type DismissState = {
  today: Record<string, string>;
  forever: NudgeId[];
  permanent: boolean;
};

const EMPTY_STATE: DismissState = { today: {}, forever: [], permanent: false };

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* لا شيء */
  }
}

export function readNudgeState(): DismissState {
  const state = readJson<DismissState>(DISMISS_KEY, EMPTY_STATE);
  return {
    today: state.today ?? {},
    forever: Array.isArray(state.forever) ? state.forever : [],
    permanent: state.permanent === true,
  };
}

export function dismissNudge(id: NudgeId, options?: { forever?: boolean; foreverAll?: boolean }) {
  const state = readNudgeState();
  if (options?.foreverAll) {
    writeJson(DISMISS_KEY, { today: {}, forever: [], permanent: true });
    return;
  }
  if (options?.forever) {
    writeJson(DISMISS_KEY, {
      ...state,
      forever: [...new Set([...state.forever, id])],
    });
    return;
  }
  writeJson(DISMISS_KEY, {
    ...state,
    today: { ...state.today, [id]: dateKey() },
  });
}

export function resetNudges() {
  try {
    window.localStorage.removeItem(DISMISS_KEY);
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    /* لا شيء */
  }
}

export function readSeenViews(): Record<string, number> {
  return readJson<Record<string, number>>(SEEN_KEY, {});
}

export function markViewSeen(view: string) {
  if (!view) return;
  const seen = readSeenViews();
  seen[view] = Date.now();
  writeJson(SEEN_KEY, seen);
}

export const VIEW_LABELS: Record<string, string> = {
  today: "الرئيسية",
  prayers: "صلاتي",
  hadith: "الأحاديث",
  quran: "المصحف",
  duas: "الأدعية",
  tasbih: "المسبحة",
  poetry: "الأبيات",
  occasions: "المناسبات",
  settings: "الإعدادات",
};

const UNVISITED_VIEWS = ["quran", "hadith", "duas", "poetry", "occasions", "prayers"];
const THREE_DAYS = 3 * 24 * 60 * 60 * 1000;

export type NudgeInput = {
  adhkarDone: string[];
  prayers: Record<string, string>;
  timings: Timings;
  sleepTime?: string;
  /** أكثر صلاة تفوت المستخدم — نرفع أولوية تذكيرها. */
  mostMissedPrayer?: string;
  /** من يبدأ الالتزام يحتاج تنبيهًا أوضح. */
  prayerCommitment?: string;
  permissionState: NotificationPermission | "unsupported";
  seenViews: Record<string, number>;
  now: Date;
};

/** يختار التنبيه الأنسب الآن حسب وقت اليوم وحالة المستخدم. */
export function pickNudges(input: NudgeInput): Nudge[] {
  const {
    adhkarDone,
    prayers,
    timings,
    sleepTime,
    mostMissedPrayer,
    prayerCommitment,
    permissionState,
    seenViews,
    now,
  } = input;
  const gentle = prayerCommitment ? needsGentlePrayerReminders(prayerCommitment) : false;
  const hour = now.getHours();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const candidates: Nudge[] = [];

  if (permissionState === "default") {
    candidates.push({
      id: "notifications",
      priority: 100,
      eyebrow: "تنبيه واحد يكفي",
      title: "هل تسمح لي أن أنبّهك في وقت الصلاة؟",
      body: "أرسل إشعارًا عند دخول الوقت، وقبل وردك، وقبل النوم. بلا إذنك لن يصل شيء.",
      primary: "اسمح بالإشعارات",
      secondary: "سأفعّلها لاحقًا",
      view: "settings",
    });
  }

  if (isRamadan(now)) {
    const maghrib = toMinutes(timings.maghrib);
    const toIftar = maghrib - minutes;
    if (toIftar > 0 && toIftar <= 60) {
      candidates.push({
        id: "iftar",
        priority: 98,
        eyebrow: hijriProgressLabel(now),
        title: `باقٍ ${toIftar} دقيقة على الإفطار`,
        body: "أجّل الدعاء إلى آخر لحظة؛ فللصائم عند فطره دعوة لا تُردّ.",
        primary: "فتح مناسبات رمضان",
        view: "occasions",
      });
    }
    if (isLastTenNights(now) && hour >= 21) {
      candidates.push({
        id: "iftar",
        priority: 97,
        eyebrow: "العشر الأواخر",
        title: "قم هذه الليلة ولو بعشر دقائق",
        body: "«اللهم إنك عفو تحب العفو فاعف عني» — واطلب حاجتك بلسانك.",
        primary: "ليلة القدر وقيامها",
        view: "occasions",
      });
    }
  }

  if (hour >= 4 && hour < 11 && !adhkarDone.includes("morning")) {
    candidates.push({
      id: "adhkar_morning",
      priority: 92,
      eyebrow: "بداية يومك",
      title: "أذكار الصباح لم تُقرأ بعد",
      body: "ابدأ بآية الكرسي وسيد الاستغفار؛ ثم أتمّ الباقي وأنت في الطريق.",
      primary: "افتح أذكار الصباح",
      secondary: "سأقرؤها بعد قليل",
      payload: { adhkar: "morning" },
    });
  }

  if (hour >= 16 && hour < 23 && !adhkarDone.includes("evening")) {
    candidates.push({
      id: "adhkar_evening",
      priority: 90,
      eyebrow: "قبل أن ينتهي النهار",
      title: "أذكار المساء في انتظارك",
      body: "المعوذات وسيد الاستغفار والرضا بالإسلام؛ لا تنم عليها بعد اليوم.",
      primary: "افتح أذكار المساء",
      secondary: "لاحقًا",
      payload: { adhkar: "evening" },
    });
  }

  const lastPassed = [...PRAYERS]
    .reverse()
    .find((prayer) => toMinutes(timings[prayer.key]) <= minutes);
  if (lastPassed) {
    const passedMinutes = minutes - toMinutes(timings[lastPassed.key]);
    if (passedMinutes >= 5 && passedMinutes <= 240 && !prayers[lastPassed.key]) {
      const isMissedOne = mostMissedPrayer === lastPassed.key;
      candidates.push({
        id: "prayer_log",
        priority: isMissedOne ? 96 : gentle ? 91 : 88,
        eyebrow: `${formatArabicTime(timings[lastPassed.key])} • اليوم`,
        title: isMissedOne
          ? `${lastPassed.name} — أكثر ما تفوتك؛ سجّلها الآن`
          : `هل صلّيت ${lastPassed.name}؟`,
        body: isMissedOne
          ? "ابدأ بها اليوم ولا تؤجّلها؛ وسجّلها بصدق لترى أثرك."
          : "سجّل صلاتك بنقرة؛ يبقى سجلّ أسبوعك صادقًا وتعرف أثرك.",
        primary: "نعم، سجّلها",
        secondary: "ليست الآن",
        payload: { prayer: lastPassed.key },
      });
    }
  }

  const sleepMinutes = sleepTime ? toMinutes(sleepTime) : 22 * 60 + 30;
  if (!adhkarDone.includes("sleep") && minutes >= sleepMinutes - 45 && hour >= 19) {
    candidates.push({
      id: "adhkar_sleep",
      priority: 78,
      eyebrow: "آخر عشرة دقائق من يومك",
      title: "أذكار النوم قبل أن تُطفئ الضوء",
      body: "آية الكرسي، ثم المعوذات في كفيك، ثم سبحان الله ٣٣ والحمد لله ٣٣ والله أكبر ٣٤.",
      primary: "افتح أذكار النوم",
      secondary: "نم بلا أذكار",
      payload: { adhkar: "sleep" },
    });
  }

  const quranSeenToday = seenViews.quran && dateKey(new Date(seenViews.quran)) === dateKey(now);
  if (!quranSeenToday && hour >= 6) {
    candidates.push({
      id: "wird",
      priority: 72,
      eyebrow: "وردك اليومي",
      title: "لم تفتح وردك اليوم",
      body: "صفحة واحدة بحضور قلب تكفي. خمس دقائق الآن أفضل من وعد الغد.",
      primary: "افتح المصحف",
      secondary: "بعد قليل",
      view: "quran",
    });
  }

  if (isFriday(now) && hour >= 9) {
    const kahfSeen = seenViews.quran && dateKey(new Date(seenViews.quran)) === dateKey(now);
    if (!kahfSeen) {
      candidates.push({
        id: "kahf",
        priority: 66,
        eyebrow: "يوم الجمعة",
        title: "سورة الكهف ونور ما بين الجمعتين",
        body: "اقرأها في عشر دقائق، وأكثِر الصلاة على النبي ﷺ قبل المغرب.",
        primary: "اذهب إلى المناسبات",
        view: "occasions",
      });
    }
  }

  const stalest = UNVISITED_VIEWS.map((view) => ({
    view,
    seenAt: seenViews[view] ?? 0,
  }))
    .filter((item) => Date.now() - item.seenAt > THREE_DAYS)
    .sort((a, b) => a.seenAt - b.seenAt)[0];

  if (stalest) {
    candidates.push({
      id: "unvisited",
      priority: 45,
      eyebrow: "قسم لم تدخله بعد",
      title: `${VIEW_LABELS[stalest.view] ?? "قسم"} في انتظارك`,
      body:
        stalest.view === "poetry"
          ? "أبيات من الشعر الجاهلي في الشجاعة والعزيمة؛ افتحها وستجد بيتًا يشبه يومك."
          : stalest.view === "hadith"
            ? "أحاديث مبوّبة: مغفرة الذنوب، استجابة الدعاء، فكّ الكرب… لكل همّ باب."
            : stalest.view === "occasions"
              ? "رمضان والأعياد وعرفة وأيام البيض، مع عدّاد لكل مناسبة."
              : stalest.view === "quran"
                ? "المصحف بصفحات كالمصحف الورقي، ويعمل دون إنترنت بعد التنزيل."
                : "افتح قسمًا واحدًا اليوم وستجد شيئًا يساعدك فعليًا.",
      primary: `افتح ${VIEW_LABELS[stalest.view] ?? "القسم"}`,
      secondary: "لا أريد هذا التنبيه",
      view: stalest.view,
    });
  }

  return candidates.sort((a, b) => b.priority - a.priority);
}

/**
 * يدير ظهور التنبيهات: تنبيه واحد كل مرة، بفاصل زمني، ولا يُعيد ما رآه المستخدم.
 */
export function useNudgeEngine(enabled: boolean, input: NudgeInput) {
  const [current, setCurrent] = useState<Nudge | null>(null);
  const [dismissState, setDismissState] = useState<DismissState>(() => readNudgeState());
  const timerRef = useRef<number | null>(null);
  const shownRef = useRef<Set<string>>(new Set());
  const sessionShownRef = useRef(false);

  const candidates = useMemo(() => pickNudges(input), [input]);

  /* مفتاح ثابت للتنبيهات المتاحة: يمنع إعادة ضبط المؤقّت مع كل تحديث للساعة. */
  const candidatesKey = candidates.map((candidate) => candidate.id).join("|");

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled || dismissState.permanent) {
      clearTimer();
      setCurrent(null);
      return;
    }
    if (current) return;

    const day = dateKey();
    const next = candidates.find((candidate) => {
      if (dismissState.forever.includes(candidate.id)) return false;
      if (dismissState.today[candidate.id] === day) return false;
      if (shownRef.current.has(`${day}:${candidate.id}`)) return false;
      return true;
    });
    if (!next) return;

    const alreadyShownThisSession = sessionShownRef.current;
    const delay = alreadyShownThisSession ? 25_000 : 8_000;
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      shownRef.current.add(`${day}:${next.id}`);
      sessionShownRef.current = true;
      setCurrent(next);
      timerRef.current = null;
    }, delay);

    return clearTimer;
    // نعتمد على المفتاح (المعرّفات) لا على المصفوفة، حتى لا يُعاد المؤقّت كل دقيقة.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [candidatesKey, current, dismissState, enabled, clearTimer]);

  const dismiss = useCallback(
    (options?: { forever?: boolean; foreverAll?: boolean }) => {
      if (current) {
        if (options?.foreverAll) dismissNudge(current.id, { foreverAll: true });
        else if (options?.forever) dismissNudge(current.id, { forever: true });
        else dismissNudge(current.id);
      }
      setDismissState(readNudgeState());
      setCurrent(null);
    },
    [current],
  );

  return { nudge: current, dismiss, dismissState, reset: resetNudges };
}
