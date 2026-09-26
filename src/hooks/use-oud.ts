/**
 * PHASE NEXT — جسر الشخصية بالتطبيق.
 *
 * كل ما في `oud-voice` و`oud-chat` منطق خالص. هذا الملف هو الجزء الوحيد
 * الذي **يقرأ حالة حقيقية** ويحوّلها إلى سياق: الصلاة، الأذكار، خطة اليوم،
 * سجل التأجيل، النقاط، الموقع، الغياب والرجوع.
 *
 * **القاعدة التي يمنعها هذا الملف:** لا حقل في السياق بلا مصدر في التطبيق.
 * لو لم نعرف، حُذف الحقل — لا تقدير ولا افتراض ولا قيمة ملء.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PlanItemOutcome } from "@/lib/accountability";
import type { DailyPlan } from "@/lib/daily-plan";
import type { ProgressSummary } from "@/lib/progress";
import { PRAYERS, type PrayerKey, type PrayerStatus, type Timings } from "@/lib/prayers";
import { dateKey, toMinutes } from "@/lib/time";
import {
  ACHIEVEMENTS,
  appendXp,
  pointsFor,
  readSeenAchievements,
  readXpLedger,
  unlockedAchievementIds,
  writeSeenAchievements,
  writeXpLedger,
  xpForStatus,
  xpSummary,
  type Achievement,
  type AchievementId,
  type XpEvent,
  type XpKind,
  type XpSummary,
} from "@/lib/oud-progress";
import {
  markLineShown,
  oudLine,
  shouldShowLine,
  type OudLine,
  type OudVoiceContext,
} from "@/lib/oud-voice";
import {
  EMPTY_DWELL,
  bumpDwell,
  fetchNearbyMosques,
  readMosqueCache,
  writeMosqueCache,
  type DwellState,
  type MosquePlace,
} from "@/lib/oud-mosque";

const LINE_SHOWN_KEY = "oud:voice:shown:v1";
const LAST_ACTIVE_KEY = "oud:voice:last-active:v1";
const RETURNED_KEY = "oud:voice:returned:v1";

export type MosqueState = "unknown" | "loading" | "ready" | "none" | "denied";

export type OudInput = {
  now: Date;
  timings: Timings;
  /** الصلاة المفتوحة اليوم: المفتاح إلى الحالة المسجّلة. */
  prayers: Record<string, string>;
  adhkarDone: readonly string[];
  planOutcomes: readonly PlanItemOutcome[];
  dailyPlan: DailyPlan | null;
  lifeProgress: ProgressSummary | null;
  sleepMinutes?: number;
  leadMinutes: number;
  coords: { latitude: number; longitude: number } | null;
  geoStatus: string;
  userName?: string;
  /** من الخطة الأسبوعية على الخادم: كم يوما أُنجزت خطته كاملة. */
  daysPlanFullyCompleted: number;
};

export type OudState = {
  line: OudLine | null;
  context: OudVoiceContext;
  mosque: { state: MosqueState; places: MosquePlace[]; nearest: MosquePlace | null };
  refreshMosque: () => void;
  xp: XpSummary;
  achievements: Achievement[];
  unlockedIds: AchievementId[];
  newUnlock: Achievement | null;
  dismissUnlock: () => void;
};

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? ((JSON.parse(raw) as T) ?? fallback) : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* التخزين ممتلئ: زينة، ولا يُسقط التطبيق. */
  }
}

function readDay(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeDay(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* لا شيء */
  }
}

/** فارق الأيام بين مفتاحي تاريخ محليين، بلا منطقة زمنية جديدة. */
export function daysBetweenKeys(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`);
  const b = new Date(`${to}T00:00:00`);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

/** آخر صلاة دخلت وقتها، وهل سُجّلت. مبنية على المواقيت لا على تذكّر. */
function lastPrayerOf(
  timings: Timings,
  prayers: Record<string, string>,
  now: Date,
): { name: string; minutesAgo: number; logged: boolean } | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  let found: { key: PrayerKey; name: string; at: number } | null = null;
  for (const prayer of PRAYERS) {
    const at = toMinutes(timings[prayer.key]);
    if (at <= minutes && (!found || at >= found.at)) {
      found = { key: prayer.key, name: prayer.name, at };
    }
  }
  if (!found) return null;
  return { name: found.name, minutesAgo: minutes - found.at, logged: Boolean(prayers[found.key]) };
}

function nextPrayerOf(
  timings: Timings,
  now: Date,
): { name: string; minutesLeft: number } | null {
  const minutes = now.getHours() * 60 + now.getMinutes();
  for (const prayer of PRAYERS) {
    const at = toMinutes(timings[prayer.key]);
    if (at > minutes) return { name: prayer.name, minutesLeft: at - minutes };
  }
  return null;
}

export function useOud(input: OudInput): OudState {
  const { now, timings, prayers, adhkarDone, planOutcomes, dailyPlan, lifeProgress } = input;
  const today = dateKey(now);

  const [ledger, setLedger] = useState<XpEvent[]>(() => readXpLedger());
  const [seen, setSeen] = useState<AchievementId[]>(() => readSeenAchievements());
  const [shown, setShown] = useState<Record<string, number>>(() => readJson(LINE_SHOWN_KEY, {}));
  const [newUnlock, setNewUnlock] = useState<Achievement | null>(null);
  const [mosque, setMosque] = useState<{ state: MosqueState; places: MosquePlace[] }>({
    state: "unknown",
    places: [],
  });
  const [returned, setReturned] = useState<boolean>(() => readDay(RETURNED_KEY) === "1");

  const dwellRef = useRef<DwellState>(EMPTY_DWELL);
  const shownRef = useRef(shown);
  const ledgerRef = useRef(ledger);
  useEffect(() => {
    shownRef.current = shown;
    ledgerRef.current = ledger;
  });

  /* ————— نقاط التقدّم: أحداث مسجّلة، بمعرّف لا يتكرّر مهما تكرر النقر ————— */
  const record = useCallback((kind: XpKind, id: string) => {
    if (pointsFor(kind) <= 0) return;
    const next = appendXp(ledgerRef.current, { id, kind, at: Date.now() });
    if (next.length === ledgerRef.current.length) return;
    ledgerRef.current = next;
    setLedger(next);
    writeXpLedger(next);
  }, []);

  useEffect(() => {
    for (const prayer of PRAYERS) {
      const status = prayers[prayer.key] as PrayerStatus | undefined;
      if (!status) continue;
      const kind = xpForStatus(status);
      if (kind) record(kind, `${dateKey()}:prayer:${prayer.key}`);
    }
  }, [prayers, record]);

  useEffect(() => {
    for (const group of adhkarDone) record("adhkar", `${dateKey()}:adhkar:${group}`);
  }, [adhkarDone, record]);

  useEffect(() => {
    for (const outcome of planOutcomes) {
      if (outcome.date !== today) continue;
      if (outcome.status === "completed") {
        record("plan-completed", `${today}:plan:${outcome.itemId}`);
      } else if (outcome.status === "partial") {
        record("plan-partial", `${today}:plan:${outcome.itemId}`);
      }
    }
  }, [planOutcomes, today, record]);

  /* ————— الغياب والرجوع: من تاريخ آخر نشاط **مسجّل**، لا من حدس ————— */
  const lastActive = readDay(LAST_ACTIVE_KEY);
  const quietDays = lastActive ? Math.max(0, daysBetweenKeys(lastActive, today)) : 0;
  const hasActivity =
    PRAYERS.some((prayer) => Boolean(prayers[prayer.key])) ||
    adhkarDone.length > 0 ||
    planOutcomes.some((item) => item.date === today);

  useEffect(() => {
    if (!hasActivity) return;
    if (lastActive === today) return;
    // رجع بعد انقطاع: نرفع العلم مرة واحدة ثم نمسحه، فلا يبقىindsight
    // يتكرّر كل يوم بعده.
    if (quietDays >= 2) writeDay(RETURNED_KEY, "1");
    writeDay(LAST_ACTIVE_KEY, today);
    if (quietDays >= 2) setReturned(true);
  }, [hasActivity, lastActive, today, quietDays]);

  /**
   * ما فُتح للتو، فيدخل كلام الشخصية.
   *
   * **لماذا كان ناقصا:** مجموعة `unlock` كانت مكتوبة في `oud-voice`
   * ومختبَرة، ولا يمرّ عليها شيء: `unlocked` لم يكن يُملأ أبدا، فكانت
   * صيغها ميتة في التطبيق ومحاكاة في الاختبار. فنصلها الآن بالحدث
   * الحقيقي: الاسم يأتي من `ACHIEVEMENTS` لا من نصّ مكتوب في الجسر.
   */
  const unlockName = newUnlock?.label;

  /* ————— السياق: كل حقل من حالة حقيقية، ولا حقل بلا مصدر ————— */
  const context = useMemo<OudVoiceContext>(() => {
    const last = lastPrayerOf(timings, prayers, now);
    const next = nextPrayerOf(timings, now);

    // الذاكرة الوحيدة المسموحة: مرات التأجيل **المسجّلة في نتائج الخطة**.
    // صفر يعني لا سابق، فلا تذكير بالماضي أبدا.
    const postponedById = new Map<string, number>();
    for (const item of planOutcomes) {
      if (item.date === today && item.status === "postponed") {
        postponedById.set(item.itemId, (postponedById.get(item.itemId) ?? 0) + 1);
      }
    }
    let task: OudVoiceContext["task"];
    let postponedCount = 0;
    if (dailyPlan) {
      for (const section of dailyPlan.sections) {
        for (const item of section.items) {
          const count = postponedById.get(item.item.id) ?? 0;
          if (count > postponedCount) {
            postponedCount = count;
            task = { title: item.item.title, startsInMinutes: 0 };
          }
        }
      }
    }

    const loggedCount = PRAYERS.filter((prayer) => Boolean(prayers[prayer.key])).length;
    const dayComplete = loggedCount === PRAYERS.length;
    // «يوم كامل» يعني كل الصلوات **في وقتها**، لا مسجّلة متأخرة.
    const perfectDay =
      dayComplete &&
      PRAYERS.every((prayer) => {
        const status = prayers[prayer.key];
        return status === "ontime" || status === "jamaah";
      });

    const nearest = mosque.places[0];

    return {
      now,
      leadMinutes: input.leadMinutes,
      lastPrayer: last
        ? { name: last.name, minutesAgo: last.minutesAgo, logged: last.logged }
        : undefined,
      nextPrayer: next ?? undefined,
      task,
      taskPostponedCount: postponedCount,
      quietDays,
      returnedAfterBreak: returned,
      dayComplete,
      perfectDay,
      mosque: nearest
        ? { name: nearest.name, distanceMeters: nearest.distanceMeters }
        : undefined,
      missingAdhkar: ["morning", "evening", "sleep"].filter(
        (group) => !adhkarDone.includes(group),
      ),
      sleepMinutes: input.sleepMinutes,
      unlocked: unlockName,
    };
  }, [
    now,
    today,
    timings,
    prayers,
    planOutcomes,
    dailyPlan,
    adhkarDone,
    quietDays,
    returned,
    mosque.places,
    unlockName,
    input.leadMinutes,
    input.sleepMinutes,
  ]);

  /* ————— سطر الشخصية: يظهر، ثم يهدأ حتى يثبت السبب تغيّر —————
   *
   * **لماذا الحالة لا `useMemo`:** قراءة سجلّ التهدئة وقت الرسم تعني
   * كتابة أثناء الرسم، وهي محظورة. فنحسب السطر في أثر جانبي: يُعاد
   * الحساب حين تتغير اللقطة أو الدقيقة فقط، فلا يرتجف، ولا نكتب في
   * مرآة التهدئة إلا من داخل الأثر.
   */
  const [line, setLine] = useState<OudLine | null>(null);

  useEffect(() => {
    const candidate = oudLine(context);
    if (!candidate || !shouldShowLine(candidate, shownRef.current, now)) {
      setLine(null);
      return;
    }
    setLine(candidate);
    shownRef.current = markLineShown(shownRef.current, candidate, now);
    setShown(shownRef.current);
    writeJson(LINE_SHOWN_KEY, shownRef.current);
    // نرفع «عدت» مرة واحدة ثم ننسى، فلا يتكرر الإنجاز ولا الكلام.
    if (candidate.id === "return-after-break" || returned) {
      writeDay(RETURNED_KEY, "0");
      setReturned(false);
    }
  }, [context, now, returned]);

  /* ————— المسجد: طلب واحد، مخبوز يوم، والفشل يُقال صدقًا ————— */
  const [mosqueReload, setMosqueReload] = useState(0);
  const refreshMosque = useCallback(() => setMosqueReload((value) => value + 1), []);

  useEffect(() => {
    if (!input.coords) {
      setMosque({
        state: input.geoStatus === "denied" ? "denied" : "unknown",
        places: [],
      });
      return;
    }
    const cached = readMosqueCache();
    if (cached) {
      setMosque({ state: cached.places.length > 0 ? "ready" : "none", places: cached.places });
      return;
    }
    let cancelled = false;
    setMosque({ state: "loading", places: [] });
    void fetchNearbyMosques(input.coords).then((places) => {
      if (cancelled) return;
      setMosque({ state: places.length > 0 ? "ready" : "none", places });
      if (places.length > 0) writeMosqueCache({ places, fetchedAt: Date.now() });
    });
    return () => {
      cancelled = true;
    };
  }, [input.coords, input.geoStatus, mosqueReload]);

  /* البقاء القريب: **في التطبيق المفتوح فقط**. بلا watchPosition ولا خلفية. */
  useEffect(() => {
    if (mosque.state !== "ready") return;
    const nearest = mosque.places[0];
    if (!nearest) return;
    const timer = window.setInterval(() => {
      dwellRef.current = bumpDwell(dwellRef.current, nearest.distanceMeters, Date.now());
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [mosque.state, mosque.places]);

  /* ————— الإنجازات: أرقام مسجّلة، وتُعلن مرة واحدة فقط ————— */
  const achievementInput = useMemo(() => {
    const prayerEvents = ledger.filter(
      (item) => item.kind === "prayer-jamaah" || item.kind === "prayer-alone",
    );
    const byDay = new Map<string, number>();
    for (const event of prayerEvents) {
      const key = dateKey(new Date(event.at));
      byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    return {
      totalPrayersLogged: prayerEvents.length,
      totalJamaahLogged: ledger.filter((item) => item.kind === "prayer-jamaah").length,
      daysWithAllPrayers: [...byDay.values()].filter((count) => count >= PRAYERS.length).length,
      currentStreak: lifeProgress?.currentStreak ?? 0,
      cameBackAfterBreak: returned,
      daysPlanFullyCompleted: input.daysPlanFullyCompleted,
    };
  }, [ledger, lifeProgress, returned, input.daysPlanFullyCompleted]);

  const unlockedIds = useMemo(() => unlockedAchievementIds(achievementInput), [achievementInput]);

  useEffect(() => {
    const fresh = unlockedIds.filter((id) => !seen.includes(id));
    if (fresh.length === 0) return;
    const next = [...seen, ...fresh];
    setSeen(next);
    writeSeenAchievements(next);
    setNewUnlock(ACHIEVEMENTS.find((item) => item.id === fresh[0]) ?? null);
  }, [unlockedIds, seen]);

  return {

    line,
    context,
    mosque: {
      state: mosque.state,
      places: mosque.places,
      nearest: mosque.places[0] ?? null,
    },
    refreshMosque,
    xp: xpSummary(ledger, now),
    achievements: ACHIEVEMENTS,
    unlockedIds,
    newUnlock,
    dismissUnlock: () => setNewUnlock(null),
  };
}
