import { AdhkarDialog } from "@/components/app/AdhkarDialog";
import { AdhkarIndex } from "@/components/app/AdhkarIndex";
import { AppHeader } from "@/components/app/AppHeader";
import type { DayReviewRecord } from "@/components/app/DailyReview";
import { DailyReview } from "@/components/app/DailyReview";
import { HomeView } from "@/components/app/HomeView";
import { isDashView, VIEW_LABELS, type DashView } from "@/components/app/Navigation";
import { NudgeCenter } from "@/components/app/NudgeCenter";
import {
  NotificationBell,
  NotificationCenter,
} from "@/components/app/NotificationCenter";
import { unlockAudio } from "@/lib/audio";
import { useNotificationCenter } from "@/hooks/use-notification-center";
import { audioPreferencesOf } from "@/hooks/use-preferences";
import { toMinutes as toMinutesOfDay } from "@/lib/time";
import { OpeningGreeting } from "@/components/app/OpeningGreeting";
import { ViewBoundary } from "@/components/app/ViewBoundary";
import { EmptyState, OfflineNote, Panel, PrimaryButton, Skeleton } from "@/components/app/Surfaces";
import { WeeklyView } from "@/components/app/WeeklyView";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { getAdhkarGroup, type AdhkarGroupId } from "@/data/adhkar";
import { pickAnswers, type ProfileAnswers } from "@/data/questions";
import { SURAH_COUNT } from "@/data/quran";
import { useFavorites } from "@/hooks/use-favorites";
import { useAuth } from "@/hooks/use-auth";
import { useGeolocation } from "@/hooks/use-location";
import { usePrayerTimes, type Coords } from "@/hooks/use-prayer-times";
import { usePreferences } from "@/hooks/use-preferences";
import { useReminderCenter } from "@/hooks/use-reminders";
import {
  markViewSeen,
  readNudgeState,
  readSeenViews,
  resetNudges,
  useNudgeEngine,
} from "@/hooks/use-nudges";
import type { PlanItemOutcome, PlanItemStatus } from "@/lib/accountability";
import type { AdaptiveSuggestion } from "@/lib/adaptive-planning";
import { buildDailyPlan, type DailyPlan } from "@/lib/daily-plan";
import { detectLocation } from "@/lib/location";
import { clearLocalData } from "@/lib/local-data";
import { calculateDailyScore, mergePrayerOutcomes } from "@/lib/accountability";
import { buildProgressSummary, type ProgressSummary } from "@/lib/progress";
import type { WeeklyPlan, WeeklyPlanItem } from "@/lib/weekly-plan";
import { planItemWeekStart } from "@/lib/weekly-plan";
import type { WeeklyReview } from "@/lib/weekly-review";
import {
  clearOfflineProfile,
  EMPTY_DAY_STATE,
  readOfflineDayState,
  readOfflineProfile,
  saveOfflineDayState,
  saveOfflineProfile,
} from "@/lib/offline-store";
import { PRAYERS, type PrayerKey, type PrayerStatus } from "@/lib/prayers";
import { applyUpdate, clearOfflineCaches, onUpdateReady, useInstallPrompt, useOnlineStatus } from "@/lib/pwa";
import { cachedSurahNumbers, clearQuranCache, downloadFullQuran } from "@/lib/quran-store";
import { addMinutes, arabicNumber, dateKey, startOfWeekKey, toMinutes } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { RefreshCw, Smartphone } from "lucide-react";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const DuasView = lazy(() =>
  import("@/components/app/DuasView").then((module) => ({ default: module.DuasView })),
);
const DeveloperView = lazy(() =>
  import("@/components/app/DeveloperView").then((module) => ({ default: module.DeveloperView })),
);
const HadithView = lazy(() =>
  import("@/components/app/HadithView").then((module) => ({ default: module.HadithView })),
);
const OccasionsView = lazy(() =>
  import("@/components/app/OccasionsView").then((module) => ({ default: module.OccasionsView })),
);
const PoetryView = lazy(() =>
  import("@/components/app/PoetryView").then((module) => ({ default: module.PoetryView })),
);
const PrayerView = lazy(() =>
  import("@/components/app/PrayerView").then((module) => ({ default: module.PrayerView })),
);
const ProphetsView = lazy(() =>
  import("@/components/app/ProphetsView").then((module) => ({ default: module.ProphetsView })),
);
const QuranView = lazy(() =>
  import("@/components/app/QuranView").then((module) => ({ default: module.QuranView })),
);
const SavedView = lazy(() =>
  import("@/components/app/SavedView").then((module) => ({ default: module.SavedView })),
);
const SettingsView = lazy(() =>
  import("@/components/app/SettingsView").then((module) => ({ default: module.SettingsView })),
);
const StatsTable = lazy(() =>
  import("@/components/app/StatsTable").then((module) => ({ default: module.StatsTable })),
);
const TasbihView = lazy(() =>
  import("@/components/app/TasbihView").then((module) => ({ default: module.TasbihView })),
);

function SectionLoading({ label }: { label: string }) {
  return (
    <div
      className="stack"
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-5 w-48" />
      </div>
      <Panel className="p-5 sm:p-6">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="mt-3 h-7 w-40" />
        <Skeleton className="mt-4 h-1.5 w-full" />
      </Panel>
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="h-32 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-4 w-32" />
        </Panel>
        <Panel className="h-32 p-5">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-4 w-32" />
        </Panel>
      </div>
      <span className="sr-only">نجهّز {label}</span>
    </div>
  );
}

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const ADHKAR_KINDS = ["morning", "evening", "sleep", "after_prayer", "distress"] as const;
const FAVORITE_KINDS = ["hadith", "poem", "dhikr", "ayah", "story"] as const;

type PlanProgressDoc = {
  records: { date: string; completed: number; planned: number; reviewed: boolean }[];
  previous: { weekStart: string; records: { date: string; completed: number; planned: number; reviewed: boolean }[] } | null;
};

/** ملخص يقرأه الشاشة لا الـUI: كم خطوة من أصل كم في الأسبوع، ومقابل الأسبوع الذي قبله. */
function weekProgressSummary(doc: PlanProgressDoc, today: string) {
  const records = doc.records;
  return {
    completed: records.reduce((sum, record) => sum + record.completed, 0),
    total: records.reduce((sum, record) => sum + record.planned, 0),
    reviewedDays: records.filter(
      (record) => record.reviewed || record.date === today,
    ).length,
  };
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const online = useOnlineStatus();
  const install = useInstallPrompt();
  // تحديث جديد بانتظار موافقة المستخدم — لا تبديل صامت تحت جلسة مفتوحة.
  const [updateReady, setUpdateReady] = useState(false);
  useEffect(() => onUpdateReady(setUpdateReady), []);
  const { prefs, setPref, reset: resetPrefs } = usePreferences();
  const geo = useGeolocation();
  const downloadRef = useRef<AbortController | null>(null);

  const initialView = searchParams.get("view");
  const [view, setView] = useState<DashView>(isDashView(initialView) ? initialView : "today");
  const [seenViews, setSeenViews] = useState<Record<string, number>>(() => readSeenViews());
  const [moreOpen, setMoreOpen] = useState(false);
  const [adhkarGroup, setAdhkarGroup] = useState<AdhkarGroupId | null>(() => {
    const param = searchParams.get("adhkar");
    return param === "morning" || param === "evening" || param === "sleep" ? param : null;
  });
  const [quranCache, setQuranCache] = useState({ cachedCount: 0, downloading: false, progress: 0 });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // الصوت لا يبدأ بلا تفاعل: نفكّ القفل عند أول نقرة كما تفعل المتصفحات.
  useEffect(() => {
    const unlock = () => unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    return () => window.removeEventListener("pointerdown", unlock);
  }, []);

  const audioPrefs = useMemo(() => audioPreferencesOf(prefs), [prefs]);

  const profileDoc = useQuery(api.planner.getProfile);
  const today = dateKey();
  const baseWeekStart = startOfWeekKey();
  const weekStart = useMemo(() => {
    if (weekOffset === 0) return baseWeekStart;
    const date = new Date(`${baseWeekStart}T00:00:00`);
    date.setDate(date.getDate() + weekOffset * 7);
    return dateKey(date);
  }, [baseWeekStart, weekOffset]);
  const activeWeekStart = useMemo(() => startOfWeekKey(), []);

  const dayState = useQuery(api.planner.getDayState, { date: today });
  // خطة الأسبوع مطلوبة في الرئيسية وفي شاشة الخطة الأسبوعية نفسها.
  const needsPlan = view === "today" || view === "weekly";
  const weeklyPlanDoc = useQuery(
    api.weeklyPlans.getWeeklyPlan,
    needsPlan && profileDoc ? { weekStart: activeWeekStart } : "skip",
  );
  const browseWeekPlan = useQuery(
    api.weeklyPlans.getWeeklyPlan,
    view === "weekly" && weekStart !== activeWeekStart ? { weekStart } : "skip",
  );
  const planItemLogs = useQuery(
    api.weeklyPlans.getPlanItemLogs,
    weeklyPlanDoc ? { date: today } : "skip",
  );
  const planProgress = useQuery(
    api.weeklyPlans.getPlanProgress,
    needsPlan && profileDoc ? { weekStart: activeWeekStart } : "skip",
  );
  /** متوسط الأسبوع الماضي: خط أساس صادق، ولا يُقارن اليوم بأحد إلا بنفسه. */
  const previousAverage = useMemo(() => {
    const scores = (planProgress?.previous?.records ?? []).map((record) => record.score);
    if (scores.length === 0) return null;
    return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
  }, [planProgress]);
  const weeklyReviewDoc = useQuery(
    api.weeklyPlans.getWeeklyReview,
    needsPlan && profileDoc ? { weekStart: activeWeekStart } : "skip",
  );
  const adaptiveSuggestions = useQuery(
    api.weeklyPlans.getAdaptiveSuggestions,
    needsPlan && profileDoc ? { weekStart: activeWeekStart } : "skip",
  );

  const lastWeek = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return dateKey(date);
      }),
    [],
  );
  // السجل والإحصاءات لا تُحسب إلا للشاشات التي تقرأهما فعلًا.
  const needsHistory = view === "prayers" || view === "stats";
  const history = useQuery(
    api.planner.getHistory,
    needsHistory ? { dates: lastWeek } : "skip",
  );
  const needsStats = view === "today" || view === "prayers" || view === "stats";
  const stats = useQuery(api.planner.getStats, needsStats ? undefined : "skip");

  const setPrayerStatusMutation = useMutation(api.planner.setPrayerStatus);
  const setAdhkarDoneMutation = useMutation(api.planner.setAdhkarDone);
  const saveDayReviewMutation = useMutation(api.planner.saveDayReview);
  const setLocationMutation = useMutation(api.planner.setLocation);
  const deleteMyDataMutation = useMutation(api.planner.deleteMyData);
  const ensureWeeklyPlanMutation = useMutation(api.weeklyPlans.ensureWeeklyPlan);
  const setPlanItemStatusMutation = useMutation(api.weeklyPlans.setPlanItemStatus);
  const resetPlanItemStatusMutation = useMutation(api.weeklyPlans.resetPlanItemStatus);
  const saveWeeklyReviewMutation = useMutation(api.weeklyPlans.saveWeeklyReview);
  const applyPlanSuggestionMutation = useMutation(api.weeklyPlans.applyPlanSuggestion);
  const updatePlanItemMutation = useMutation(api.weeklyPlans.updateWeeklyPlanItem);
  const [savingItemId, setSavingItemId] = useState<string | null>(null);
  const [applyingSuggestion, setApplyingSuggestion] = useState(false);
  const [reviewingWeek, setReviewingWeek] = useState(false);
  const planInitAttemptedRef = useRef<string | null>(null);

  /** نظام الحفظ الموحّد: حالة فورية محليًا + مزامنة الخادم. */
  const favoritesApi = useFavorites();
  const savedIds = useMemo(() => favoritesApi.ids, [favoritesApi.ids]);
  const favoriteIds = useMemo(() => favoritesApi.favorites.map((item) => item.itemId), [favoritesApi.favorites]);
  const handleToggleFavorite = useCallback(
    (itemId: string, kind: string, title: string) => {
      if (!FAVORITE_KINDS.includes(kind as (typeof FAVORITE_KINDS)[number])) return;
      favoritesApi.toggle(itemId, kind as (typeof FAVORITE_KINDS)[number], title);
    },
    [favoritesApi],
  );

  /* المكان: من إحداثياتك إن سمحت، وإلا من المنطقة الزمنية للجهاز — بلا سؤال. */
  const detected = useMemo(() => detectLocation(), []);

  /* عند انعدام الشبكة يعتمد التطبيق على آخر نسخة محفوظة من بياناتك. */
  const cachedProfile = useMemo(() => readOfflineProfile<Partial<ProfileAnswers>>(), []);
  const useCachedData = profileDoc === undefined && !online;

  const answers: ProfileAnswers | null = useMemo(() => {
    if (profileDoc) return pickAnswers(profileDoc as Partial<ProfileAnswers>);
    if (useCachedData && cachedProfile) return pickAnswers(cachedProfile);
    return null;
  }, [profileDoc, cachedProfile, useCachedData]);

  useEffect(() => {
    if (profileDoc) saveOfflineProfile(profileDoc);
    if (profileDoc === null) clearOfflineProfile();
  }, [profileDoc]);

  useEffect(() => {
    if (dayState) saveOfflineDayState(today, dayState);
  }, [dayState, today]);

  const coords: Coords | null = useMemo(() => {
    if (
      profileDoc &&
      typeof profileDoc.latitude === "number" &&
      typeof profileDoc.longitude === "number"
    ) {
      return { latitude: profileDoc.latitude, longitude: profileDoc.longitude };
    }
    return geo.coords;
  }, [profileDoc, geo.coords]);

  const city = profileDoc?.city ?? detected.city;
  const locationLabel = profileDoc?.locationLabel ?? detected.label;

  const times = usePrayerTimes({ city, coords, method: prefs.method });

  useEffect(() => {
    // useQuery uses `undefined` while loading and `null` when the plan is absent.
    // Only the latter means we need to create the first plan for this week.
    if (
      view !== "today" ||
      !online ||
      !profileDoc ||
      (weeklyPlanDoc !== undefined && weeklyPlanDoc !== null)
    ) return;
    const initKey = `${activeWeekStart}:${profileDoc._id}`;
    if (planInitAttemptedRef.current === initKey) return;
    planInitAttemptedRef.current = initKey;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "local";
    void ensureWeeklyPlanMutation({ weekStart: activeWeekStart, timezone }).catch(() => {
      planInitAttemptedRef.current = null;
      toast.error("تعذّر تجهيز خطة الأسبوع. حاول تحديث الصفحة مرة أخرى.");
    });
  }, [activeWeekStart, ensureWeeklyPlanMutation, online, profileDoc, view, weeklyPlanDoc]);

  const dailyPlan = useMemo<DailyPlan | null>(() => {
    if (!answers || !weeklyPlanDoc) return null;
    const plan: WeeklyPlan = {
      weekStart: weeklyPlanDoc.weekStart,
      timezone: weeklyPlanDoc.timezone,
      weeklyFocus: weeklyPlanDoc.weeklyFocus,
      items: weeklyPlanDoc.items as WeeklyPlanItem[],
    };
    return buildDailyPlan({ plan, date: today, timings: times.timings });
  }, [answers, today, times.timings, weeklyPlanDoc]);

  const planOutcomes = useMemo<PlanItemOutcome[]>(() => {
    const records = (planItemLogs ?? []).map((log) => ({
      date: log.date,
      itemId: log.itemId,
      weekStart: log.weekStart,
      status: log.status as PlanItemStatus,
      postponedTo: log.postponedTo ?? null,
      reason: log.reason,
      createdAt: log.createdAt,
      updatedAt: log.updatedAt,
    }));
    return dailyPlan
      ? mergePrayerOutcomes(dailyPlan.sections.flatMap((section) => section.items), records, dayState?.prayers ?? {})
      : records;
  }, [dailyPlan, dayState?.prayers, planItemLogs]);

  const prayers = useMemo(() => dayState?.prayers ?? {}, [dayState]);

  // نُخرج وقت النوم إلى متغيّر مستقرّ: ربط `useCallback` بـ`answers?.sleepTime`
  // مباشرة يُفقد المُجمِّع قدرته على حفظ الذاكرة، فيتحوّل تحذيرٌ إلى خطأ.
  const sleepTimeValue = answers?.sleepTime;
  const sleepMinutes = useMemo(
    () => (sleepTimeValue ? toMinutesOfDay(sleepTimeValue) : undefined),
    [sleepTimeValue],
  );

  // لقطة الحالة التي يقرأها محرّك الإشعارات. دالة لا قيمة: تُقرأ عند كل نبضة.
  const notificationSnapshot = useCallback(
    () => ({
      now: new Date(),
      adhkarDone: dayState?.adhkar ?? [],
      prayersLogged: Object.keys(prayers),
      prayerMinutes: Object.fromEntries(
        PRAYERS.map((prayer) => [prayer.key, toMinutesOfDay(times.timings[prayer.key])]),
      ),
      remainingSteps: dailyPlan
        ? dailyPlan.sections.reduce((total, section) => total + section.items.length, 0)
        : 0,
      reviewedToday: Boolean(dayState?.review),
      missedDays: 0,
      sleepMinutes,
    }),
    [dayState, prayers, times.timings, dailyPlan, sleepMinutes],
  );

  const notifications = useNotificationCenter({
    enabled: prefs.nudgesEnabled,
    getSnapshot: notificationSnapshot,
    audio: audioPrefs,
  });
  const adhkarDone = useMemo(() => dayState?.adhkar ?? [], [dayState]);

  const reminders = useReminderCenter({
    timings: times.timings,
    prefs,
    sleepTime: answers?.sleepTime,
    mostMissedPrayer: answers?.mostMissedPrayer,
    prayerCommitment: answers?.prayerCommitment,
    prayers,
    adhkarDone,
  });

  const dailyScore = useMemo(() => dailyPlan
    ? calculateDailyScore({
        items: dailyPlan.sections.flatMap((section) => section.items),
        outcomes: planOutcomes,
        closed: answers
          ? reminders.now.getHours() * 60 + reminders.now.getMinutes() >= toMinutes(answers.dayEnd)
          : false,
        // خط الأساس يأتي من الأسبوع الماضي بنفس دالة الاحتساب، فالمقارنة apples-to-apples.
        ...(previousAverage !== null ? { previousAverage } : {}),
      })
    : null, [answers, dailyPlan, planOutcomes, previousAverage, reminders.now]);

  const lifeProgress = useMemo<ProgressSummary | null>(() => {
    if (!planProgress) return null;
    const toDay = (record: { date: string; score: number; completed: number; partial: number; postponed: number; skipped: number; reviewed: boolean }) => ({
      date: record.date,
      score: record.date === today ? dailyScore?.score ?? record.score : record.score,
      completed: record.completed,
      partial: record.partial,
      postponed: record.postponed,
      skipped: record.skipped,
      reviewed: record.reviewed,
    });
    return buildProgressSummary(
      planProgress.records.map(toDay),
      planProgress.previous?.records.map(toDay) ?? [],
    );
  }, [dailyScore?.score, planProgress, today]);

  /* مرة واحدة: نوافق أوقات التذكير مع إجابات المستخدم عن استيقاظه ونومه. */
  useEffect(() => {
    if (!answers) return;
    const KEY = "oud:prefs:times-synced";
    try {
      if (window.localStorage.getItem(KEY)) return;
      window.localStorage.setItem(KEY, "1");
    } catch {
      return;
    }
    setPref("morningTime", addMinutes(answers.wakeTime, 30));
    setPref("eveningTime", addMinutes(answers.sleepTime, -60));
    setPref("wirdTime", addMinutes(answers.wakeTime, 15));
  }, [answers, setPref]);

  const nudgeInput = useMemo(
    () => ({
      adhkarDone,
      prayers,
      timings: times.timings,
      sleepTime: answers?.sleepTime,
      mostMissedPrayer: answers?.mostMissedPrayer,
      prayerCommitment: answers?.prayerCommitment,
      distraction: answers?.distraction,
      disciplineLevel: answers?.disciplineLevel,
      permissionState: reminders.permission,
      seenViews,
      now: reminders.now,
    }),
    [
      adhkarDone,
      prayers,
      times.timings,
      answers?.sleepTime,
      answers?.mostMissedPrayer,
      answers?.prayerCommitment,
      answers?.distraction,
      answers?.disciplineLevel,
      reminders.permission,
      reminders.now,
      seenViews,
    ],
  );
  const nudgeEngine = useNudgeEngine(Boolean(profileDoc) && prefs.nudgesEnabled, nudgeInput);

  useEffect(() => {
    if (!profileDoc) return;
    markViewSeen(view);
    setSeenViews(readSeenViews());
  }, [view, profileDoc]);

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [view]);

  useEffect(() => {
    const next = searchParams.get("view");
    if (isDashView(next) && next !== view) setView(next);
    const adhkarParam = searchParams.get("adhkar");
    if (adhkarParam === "morning" || adhkarParam === "evening" || adhkarParam === "sleep") {
      setAdhkarGroup(adhkarParam);
    }
  }, [searchParams, view]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as { type?: string; url?: string } | undefined;
      if (data?.type === "NAVIGATE" && typeof data.url === "string") navigate(data.url);
    }
    navigator.serviceWorker?.addEventListener("message", onMessage);
    return () => navigator.serviceWorker?.removeEventListener("message", onMessage);
  }, [navigate]);

  const refreshQuranCache = useCallback(() => {
    void cachedSurahNumbers().then((list) =>
      setQuranCache((current) => ({ ...current, cachedCount: list.length })),
    );
  }, []);

  useEffect(() => {
    refreshQuranCache();
  }, [refreshQuranCache]);

  const startDownload = useCallback(async () => {
    if (quranCache.downloading) return;
    const controller = new AbortController();
    downloadRef.current = controller;
    setQuranCache((current) => ({ ...current, downloading: true, progress: 0 }));
    try {
      const result = await downloadFullQuran(
        (progress) =>
          setQuranCache((current) => ({
            ...current,
            progress: Math.round((progress.done / progress.total) * 100),
          })),
        { signal: controller.signal },
      );
      refreshQuranCache();
      if (result.failed.length > 0) {
        toast.warning(`حُفظ ${result.done} سورة، وتعذّر ${result.failed.length}. أعد المحاولة.`);
      } else {
        toast.success("تم تنزيل المصحف كاملًا؛ يعمل الآن دون إنترنت.");
      }
    } catch {
      toast.error("توقّف التنزيل، تحقّق من الاتصال وأعد المحاولة.");
    } finally {
      setQuranCache((current) => ({ ...current, downloading: false, progress: 0 }));
      downloadRef.current = null;
    }
  }, [quranCache.downloading, refreshQuranCache]);

  const cancelDownload = useCallback(() => {
    downloadRef.current?.abort();
    setQuranCache((current) => ({ ...current, downloading: false, progress: 0 }));
  }, []);

  const clearQuran = useCallback(async () => {
    await clearQuranCache();
    refreshQuranCache();
    toast.success("حُذفت نسخ المصحف المحفوظة على الجهاز.");
  }, [refreshQuranCache]);

  /** تفريغ الحفظ المؤقت: القشرة والصفحات المقروءة، بلا مساس بالمصحف ولا بالحساب. */
  const clearCaches = useCallback(async () => {
    try {
      await clearOfflineCaches();
      toast.success("فُرِّغ الحفظ المؤقت. سيُعاد تنزيل ما تحتاجه عند الحاجة.");
    } catch {
      toast.error("تعذّر تفريغ الحفظ. حاول مرة أخرى.");
    }
  }, []);

  const changeView = useCallback(
    (next: string) => {
      if (!isDashView(next)) return;
      setView(next);
      setSearchParams(next === "today" ? {} : { view: next }, { replace: true });
    },
    [setSearchParams],
  );

  const handleSignOut = useCallback(async () => {
    await signOut();
    // تسجيل الخروج ينهي بيانات المستخدم على الجهاز أيضًا: ملف الإجابات، الموقع، المحفوظات.
    clearLocalData();
    navigate("/");
  }, [signOut, navigate]);

  /** وعد الخصوصية يحتاج مدخلًا في الواجهة لا mutation وحيدة. */
  const handleDeleteAllData = useCallback(() => {
    void deleteMyDataMutation()
      .then(async (removed) => {
        clearLocalData();
        clearOfflineProfile();
        resetNudges();
        setSeenViews({});
        resetPrefs();
        toast.success(`حُذفت ${arabicNumber(removed)} سجلًا من حسابك. سنبدأ من جديد.`);
        await signOut();
        navigate("/");
      })
      .catch(() => toast.error("تعذّر الحذف الآن. حاول مرة أخرى."));
  }, [deleteMyDataMutation, navigate, resetPrefs, signOut]);

  const handlePrayerStatus = useCallback(
    (prayer: string, status: PrayerStatus) => {
      const key = PRAYER_KEYS.find((item) => item === prayer);
      if (!key) return;
      void setPrayerStatusMutation({ date: today, prayer: key, status });
    },
    [setPrayerStatusMutation, today],
  );

  const handleAdhkarDone = useCallback(
    (kind: string, done: boolean) => {
      if (!ADHKAR_KINDS.includes(kind as (typeof ADHKAR_KINDS)[number])) return;
      void setAdhkarDoneMutation({
        date: today,
        kind: kind as (typeof ADHKAR_KINDS)[number],
        done,
      });
    },
    [setAdhkarDoneMutation, today],
  );

  const handleReviewSave = useCallback(
    (review: DayReviewRecord) => {
      if (!online) {
        toast.error("المراجعة تحتاج اتصالًا واحدًا للحفظ؛ لن نُظهرها كأنها حُفظت.");
        return;
      }
      setReviewSaving(true);
      void saveDayReviewMutation({
        date: today,
        mood: review.mood,
        blocker: review.blocker,
        note: review.note,
        succeeded: review.succeeded,
        failed: review.failed,
        why: review.why,
        tomorrowAdjustment: review.tomorrowAdjustment,
      })
        .then(() => toast.success("حُفظت مراجعة اليوم. هذه بياناتك، وسنقترح خطوة للغد فقط."))
        .catch(() => toast.error("تعذّر حفظ المراجعة. حاول مرة أخرى."))
        .finally(() => setReviewSaving(false));
    },
    [online, saveDayReviewMutation, today],
  );

  const handleSetPlanOutcome = useCallback(
    (itemId: string, status: PlanItemStatus) => {
      if (!weeklyPlanDoc) return;
      // الأسبوع يُشتق من العنصر نفسه: تصفّح أسبوع آخر في شاشة الخطة لا يجوز
      // أن يجعل تسجيل حالة عنصر اليوم يُرفض من الخادم.
      const itemWeek = planItemWeekStart(itemId) ?? activeWeekStart;
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setSavingItemId(itemId);
      void setPlanItemStatusMutation({
        date: today,
        weekStart: itemWeek,
        itemId,
        status,
        ...(status === "postponed" ? { postponedTo: dateKey(tomorrow), reason: "ؤجل من مراجعة اليوم" } : {}),
      })
        .catch(() => toast.error("تعذّر تسجيل الحالة. حاول مرة أخرى."))
        .finally(() => setSavingItemId(null));
    },
    [activeWeekStart, setPlanItemStatusMutation, today, weeklyPlanDoc],
  );

  const handleResetPlanOutcome = useCallback(
    (itemId: string) => {
      setSavingItemId(itemId);
      void resetPlanItemStatusMutation({ date: today, itemId })
        .catch(() => toast.error("تعذّر التراجع عن الحالة."))
        .finally(() => setSavingItemId(null));
    },
    [resetPlanItemStatusMutation, today],
  );

  const saveWeeklyReviewFor = useCallback((target: string) => {
    setReviewingWeek(true);
    void saveWeeklyReviewMutation({ weekStart: target })
      .then(() => toast.success("حُفظت مراجعة الأسبوع. لن يتغير شيء قبل موافقتك."))
      .catch(() => toast.error("تعذّر إنشاء مراجعة الأسبوع."))
      .finally(() => setReviewingWeek(false));
  }, [saveWeeklyReviewMutation]);

  // الشاشة الرئيسية تتحدث عن أسبوع اليوم دائمًا؛ شاشة الخطة تتحدث عن الأسبوع المعروض.
  const handleSaveWeeklyReview = useCallback(
    () => saveWeeklyReviewFor(activeWeekStart),
    [activeWeekStart, saveWeeklyReviewFor],
  );
  const handleSaveBrowsedWeeklyReview = useCallback(
    () => saveWeeklyReviewFor(weekStart),
    [saveWeeklyReviewFor, weekStart],
  );

  const applySuggestionFor = useCallback((target: string, doc: { version: number }, suggestion: AdaptiveSuggestion) => {
    setApplyingSuggestion(true);
    void applyPlanSuggestionMutation({
      weekStart: target,
      suggestionId: suggestion.id,
      expectedVersion: doc.version,
    })
      .then(() => toast.success("طُبّق اقتراحك على خطة الأسبوع."))
      .catch(() => toast.error("تعذّر التطبيق؛ حدّث الخطة ثم أعد المحاولة."))
      .finally(() => setApplyingSuggestion(false));
  }, [applyPlanSuggestionMutation]);

  const handleApplySuggestion = useCallback((suggestion: AdaptiveSuggestion) => {
    if (!weeklyPlanDoc) return;
    applySuggestionFor(activeWeekStart, weeklyPlanDoc, suggestion);
  }, [activeWeekStart, applySuggestionFor, weeklyPlanDoc]);

  const handleApplyBrowsedSuggestion = useCallback((suggestion: AdaptiveSuggestion) => {
    const doc = browseWeekPlan ?? weeklyPlanDoc;
    if (!doc) return;
    applySuggestionFor(browseWeekPlan ? weekStart : activeWeekStart, doc, suggestion);
  }, [activeWeekStart, applySuggestionFor, browseWeekPlan, weekStart, weeklyPlanDoc]);

  const handleGeoRequest = useCallback(async () => {
    const result = await geo.request();
    if (!result) return;
    try {
      await setLocationMutation({
        latitude: result.latitude,
        longitude: result.longitude,
      });
      toast.success("حُفظ موقعك؛ صارت المواقيت على إحداثياتك.");
    } catch {
      toast.error("تعذّر حفظ الموقع في حسابك، لكنه محفوظ على جهازك.");
    }
  }, [geo, setLocationMutation]);

  const handleSetCity = useCallback(
    async (value: string) => {
      try {
        await setLocationMutation({ city: value, locationLabel: value });
        toast.success("حُفظت المدينة؛ حُسبت المواقيت عليها.");
      } catch {
        toast.error("تعذّر حفظ المدينة.");
      }
    },
    [setLocationMutation],
  );

  const handleExportData = useCallback(() => {
    const payload = {
      exportedAt: new Date().toISOString(),
      preferences: prefs,
      bookmark: window.localStorage.getItem("sakinah:quran:bookmark"),
      lastRead: window.localStorage.getItem("sakinah:quran:last"),
      seenViews,
      nudges: readNudgeState(),
      coords: window.localStorage.getItem("sakinah:coords:v1"),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `oud-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("نُزّلت نسخة من إعداداتك.");
  }, [prefs, seenViews, today]);

  const handlePatchPlanItem = useCallback(
    (itemId: string, patch: { title?: string; enabled?: boolean }) => {
      const doc = browseWeekPlan ?? weeklyPlanDoc;
      if (!doc) return;
      setSavingItemId(itemId);
      void updatePlanItemMutation({
        weekStart: browseWeekPlan ? weekStart : activeWeekStart,
        itemId,
        expectedVersion: doc.version,
        patch,
      })
        .catch(() => toast.error("تعذّر تعديل الخطة. حدّثها ثم أعد المحاولة."))
        .finally(() => setSavingItemId(null));
    },
    [activeWeekStart, browseWeekPlan, updatePlanItemMutation, weekStart, weeklyPlanDoc],
  );

  const handleWeekChange = useCallback((nextWeekStart: string) => {
    const base = startOfWeekKey();
    if (nextWeekStart === base) {
      setWeekOffset(0);
      return;
    }
    const baseDate = new Date(`${base}T00:00:00`);
    const nextDate = new Date(`${nextWeekStart}T00:00:00`);
    const diff = Math.round((nextDate.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    setWeekOffset(Number.isFinite(diff) ? diff : 0);
  }, []);

  if (profileDoc === undefined && !useCachedData) {
    return (
      <div className="min-h-dvh pb-[calc(7rem+env(safe-area-inset-bottom))]" role="status" aria-live="polite" aria-busy="true">
        <AppHeader
          view={view}
          onViewChange={changeView}
          userName={user?.name ?? user?.email ?? undefined}
          onSignOut={() => void signOut()}
          offline={!online}
          canInstall={install.canInstall}
          onInstall={() => void install.promptInstall()}
          moreOpen={moreOpen}
          onMoreOpenChange={setMoreOpen}
        />
        <main className="page max-w-5xl pt-4">
          <div className="space-y-2">
            <span className="skeleton block h-3 w-24" />
            <span className="skeleton block h-5 w-48" />
          </div>
          <div className="surface-primary mt-4 h-44 rounded-3xl p-5">
            <span className="skeleton block h-3 w-24" />
            <span className="skeleton mt-4 block h-7 w-48" />
            <span className="skeleton mt-4 block h-1.5 w-full" />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <span className="surface-primary h-32 rounded-3xl" />
            <span className="surface-primary h-32 rounded-3xl" />
          </div>
          <span className="sr-only">نجهّز يومك</span>
        </main>
      </div>
    );
  }

  if (profileDoc === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const state =
    dayState ?? (useCachedData ? readOfflineDayState(today) : null) ?? EMPTY_DAY_STATE;

  const banner = updateReady ? (
    <div className="surface-secondary flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2">
      <span className="flex items-center gap-2 text-[11px] text-foreground/75">
        <RefreshCw className="size-3.5 text-primary" />
        يتوفّر تحديث جديد للتطبيق.
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="btn-edge h-8 rounded-full px-3 text-[11px]"
        onClick={() => void applyUpdate()}
      >
        تحديث الآن
      </Button>
    </div>
  ) : !online ? (
    <OfflineNote>
      دون إنترنت: المصحف المحفوظ والأذكار والمواقيت تعمل، وتسجيلاتك تُرسل عند عودة الاتصال.
    </OfflineNote>
  ) : install.canInstall ? (
    <div className="surface-secondary flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3 py-2">
      <span className="flex items-center gap-2 text-[11px] text-foreground/75">
        <Smartphone className="size-3.5 text-primary" />
        ثبّت عود على جهازك ليعمل كتطبيق مستقل ودون إنترنت.
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="btn-edge h-8 rounded-full px-3 text-[11px]"
        onClick={() => void install.promptInstall()}
      >
        تثبيت
      </Button>
    </div>
  ) : null;

  const postPrayerKey = reminders.postPrayerCheck;
  const postPrayer = postPrayerKey ? PRAYERS.find((item) => item.key === postPrayerKey) : null;

  return (
    // الفراغ السفلي = ارتفاع شريط التنقّل (٧rem) + شريط نظام الجوّال،
    // وإلا غطى الشريط آخر عنصر على الأجهزة ذات المؤشّر.
    <div className="min-h-screen pb-[calc(7rem+env(safe-area-inset-bottom))]">
      <AppHeader
        view={view}
        onViewChange={changeView}
        userName={user?.name ?? user?.email ?? undefined}
        onSignOut={() => void handleSignOut()}
        offline={!online}
        canInstall={install.canInstall}
        onInstall={() => void install.promptInstall()}
        banner={banner}
        notifications={
          <NotificationBell
            count={notifications.unread}
            onClick={() => setNotificationsOpen(true)}
          />
        }
        moreOpen={moreOpen}
        onMoreOpenChange={setMoreOpen}
      />

      <main className="page max-w-5xl pt-4">
        <ViewBoundary label={VIEW_LABELS[view]}>
        <Suspense fallback={<SectionLoading label={VIEW_LABELS[view]} />}>
        {view === "today" && answers ? (
          <div className="motion-swap">
            <HomeView
              userName={user?.name ?? undefined}
              profile={answers}
              locationLabel={locationLabel}
              timings={times.timings}
              hijri={times.hijri}
              dayState={state}
              stats={stats}
              onSaveReview={handleReviewSave}
              reviewSaving={reviewSaving}
              onOpenSection={changeView}
              onOpenAdhkar={setAdhkarGroup}
              onLogPrayer={handlePrayerStatus}
              dailyPlan={dailyPlan}
              planOutcomes={planOutcomes}
              dailyScore={dailyScore}
              lifeProgress={lifeProgress}
              weeklyReview={(weeklyReviewDoc?.summary as WeeklyReview | undefined) ?? null}
              adaptiveSuggestions={adaptiveSuggestions ?? []}
              savingItemId={savingItemId}
              applyingSuggestion={applyingSuggestion}
              reviewingWeek={reviewingWeek}
              onSetPlanOutcome={handleSetPlanOutcome}
              onResetPlanOutcome={handleResetPlanOutcome}
              onSaveWeeklyReview={handleSaveWeeklyReview}
              onApplySuggestion={handleApplySuggestion}
            />
          </div>
        ) : null}

        {view === "prayers" && answers ? (
          <div className="motion-swap">
            <PrayerView
              timings={times.timings}
              city={locationLabel}
              usingFallback={times.usingFallback}
              onRefreshTimes={times.refresh}
              dayState={state}
              onPrayerStatus={handlePrayerStatus}
              profile={answers}
              permission={reminders.permission}
              onRequestPermission={() => void reminders.requestPermission()}
              history={history}
              stats={stats}
            />
          </div>
        ) : null}

        {view === "adhkar" ? (
          <div className="motion-swap">
            <AdhkarIndex done={state.adhkar} onOpen={setAdhkarGroup} />
          </div>
        ) : null}

        {view === "hadith" ? (
          <HadithView
            favorites={favoriteIds.filter((id) => id.startsWith("h"))}
            isSaved={favoritesApi.isSaved}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : null}

        {view === "duas" ? (
          <DuasView
            favorites={favoriteIds.filter((id) => id.startsWith("d"))}
            isSaved={favoritesApi.isSaved}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : null}

        {view === "tasbih" ? <TasbihView /> : null}

        {view === "quran" && answers ? (
          <QuranView
            profile={answers}
            fontScale={prefs.fontScale}
            onFontScaleChange={(value) => setPref("fontScale", value)}
            offline={{
              cachedCount: quranCache.cachedCount,
              total: SURAH_COUNT,
              downloading: quranCache.downloading,
              progress: quranCache.progress,
              onDownload: () => void startDownload(),
              onCancelDownload: cancelDownload,
              onClear: () => void clearQuran(),
            }}
          />
        ) : null}

        {view === "poetry" ? (
          <PoetryView
            favorites={favoriteIds.filter((id) => id.startsWith("p"))}
            isSaved={favoritesApi.isSaved}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : null}

        {view === "prophets" ? (
          <ProphetsView
            savedIds={savedIds}
            onToggleSave={(id, title) => handleToggleFavorite(id, "story", title)}
          />
        ) : null}

        {view === "saved" ? (
          <SavedView
            favorites={favoritesApi.favorites}
            onRemove={(itemId) => favoritesApi.remove(itemId)}
            onOpenSection={changeView}
          />
        ) : null}

        {view === "occasions" ? <OccasionsView timings={times.timings} /> : null}

        {view === "stats" ? (
          stats === undefined ? (
            <SectionLoading label="الإحصاءات" />
          ) : stats === null || stats.days === 0 ? (
            <EmptyState
              title="لا يوجد سجلّ بعد"
              body="سجّل حالة صلواتك ومراجعاتك ليظهر أثرها هنا. لن نخمّن أرقامًا لم تسجّلها."
            />
          ) : (
            <div className="motion-swap">
              <StatsTable stats={stats} history={history} />
            </div>
          )
        ) : null}

        {view === "weekly" ? (
          browseWeekPlan === undefined && weeklyPlanDoc === undefined ? (
            <SectionLoading label="الخطة الأسبوعية" />
          ) : browseWeekPlan === null && weeklyPlanDoc === null ? (
            <EmptyState
              title="لا توجد خطة لهذا الأسبوع بعد"
              body="تُبنى الخطة من نموذج حياتك أول مرة تفتح «اليوم». ارجع إليه لأُنشئها، ثم عُد."
              action={
                <PrimaryButton onClick={() => changeView("today")} className="px-5">
                  الذهاب إلى «اليوم»
                </PrimaryButton>
              }
            />
          ) : (
            <div className="motion-swap">
              <WeeklyView
                plan={(browseWeekPlan ?? weeklyPlanDoc) as
                  | {
                      weekStart: string;
                      timezone: string;
                      weeklyFocus: string;
                      items: WeeklyPlanItem[];
                      version: number;
                    }
                  | null}
                weekStart={weekStart}
                today={today}
                progress={planProgress ? weekProgressSummary(planProgress, today) : null}
                weeklyReview={(weeklyReviewDoc?.summary as WeeklyReview | undefined) ?? null}
                suggestions={adaptiveSuggestions ?? []}
                applyingSuggestion={applyingSuggestion}
                reviewing={reviewingWeek}
                savingItemId={savingItemId}
                onWeekChange={handleWeekChange}
                onPatchItem={handlePatchPlanItem}
                onApplySuggestion={handleApplyBrowsedSuggestion}
                onSaveWeeklyReview={handleSaveBrowsedWeeklyReview}
              />
            </div>
          )
        ) : null}

        {view === "review" ? (
          <div className="motion-swap">
            <DailyReview
              expanded
              visible
              review={state.review as DayReviewRecord | null}
              prayedToday={PRAYERS.filter(
                (prayer) =>
                  state.prayers[prayer.key] === "jamaah" || state.prayers[prayer.key] === "ontime",
              ).length}
              saving={reviewSaving}
              onSave={handleReviewSave}
            />
          </div>
        ) : null}

        {view === "settings" && answers ? (
          <SettingsView
            prefs={prefs}
            setPref={setPref}
            resetPrefs={resetPrefs}
            permission={reminders.permission}
            supported={reminders.supported}
            onRequestPermission={() => void reminders.requestPermission()}
            onTestNotification={() => void reminders.testNotification()}
            geo={{
              status: geo.status,
              coords: geo.coords,
              label: locationLabel,
              error: geo.error,
              timezone: geo.timezone,
              request: handleGeoRequest,
              clear: geo.clear,
            }}
            install={{
              canInstall: install.canInstall,
              installed: install.installed,
              isIos: install.isIos,
              promptInstall: install.promptInstall,
            }}
            online={online}
            cachedCount={quranCache.cachedCount}
            quranTotal={SURAH_COUNT}
            downloading={quranCache.downloading}
            downloadProgress={quranCache.progress}
            onDownload={() => void startDownload()}
            onCancelDownload={cancelDownload}
            onClearQuran={() => void clearQuran()}
            onClearCaches={clearCaches}
            onResetNudges={() => {
              resetNudges();
              setSeenViews({});
              nudgeEngine.reset();
            }}
            onExportData={handleExportData}
            onSetCity={(value) => void handleSetCity(value)}
            onEditProfile={() => navigate("/onboarding?edit=1")}
            onDeleteAllData={handleDeleteAllData}
            onSignOut={() => void handleSignOut()}
            city={locationLabel}
          />
        ) : null}

        {view === "developer" ? <DeveloperView /> : null}

        {view === "today" && !answers ? (
          <EmptyState
            title="لا توجد إجابات محفوظة بعد"
            body="أكمل فهم يومك ليُبنى التطبيق عليه — دقيقة واحدة تكفي كبداية."
            action={
              <PrimaryButton onClick={() => navigate("/onboarding")} className="px-5">
                ابدأ الفهم
              </PrimaryButton>
            }
          />
        ) : null}
        </Suspense>
        </ViewBoundary>
      </main>

      <AdhkarDialog
        group={getAdhkarGroup(adhkarGroup ?? "morning")}
        open={adhkarGroup !== null}
        onOpenChange={(open) => setAdhkarGroup(open ? adhkarGroup : null)}
        isDone={adhkarGroup ? state.adhkar.includes(adhkarGroup) : false}
        onToggleDone={(done) => adhkarGroup && handleAdhkarDone(adhkarGroup, done)}
      />

      <NotificationCenter
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
        items={notifications.items}
        today={notifications.today}
        earlier={notifications.earlier}
        onRead={notifications.markRead}
        onReadAll={notifications.markAllRead}
        onClear={notifications.clear}
        onNavigate={(item) => {
          setNotificationsOpen(false);
          if (item.view) changeView(item.view as DashView);
        }}
      />

      <NudgeCenter
        nudge={nudgeEngine.nudge}
        onDismiss={(options) => nudgeEngine.dismiss(options)}
        onOpenView={changeView}
        onOpenAdhkar={(group) => setAdhkarGroup(group)}
        onLogPrayer={handlePrayerStatus}
        onRequestNotifications={() => void reminders.requestPermission()}
      />

      {/* نافذة الافتتاح الموحّدة: صلاة على النبي ﷺ + دعاء لأهل غزة — عند كل تشغيل. */}
      <OpeningGreeting
        enabled={Boolean(profileDoc)}
        onToggleFavorite={handleToggleFavorite}
      />

      {/* رسالة «هل صلّيت؟» بعد دقائق من دخول وقت الصلاة — مع سطر الصدق */}
      {postPrayer && !state.prayers[postPrayer.key] ? (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open) reminders.clearPostPrayerCheck();
          }}
        >
          <DialogContent dir="rtl" className="glass-strong max-w-sm rounded-3xl border-white/70 bg-white/94">
            <DialogHeader className="text-start">
              <DialogTitle className="text-lg">هل صلّيت {postPrayer.name}؟</DialogTitle>
              <DialogDescription className="text-start text-[13px] leading-7">
                هذا السجلّ مرآتك أمام نفسك؛ والكذب عليه يُخفي عنك ما تحتاج إصلاحه. «إنّ الصدق
                يهدي إلى البرّ» — رواه مسلم.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "jamaah", label: "في جماعة", tone: "bg-emerald-500 text-white" },
                  { value: "ontime", label: "في الوقت", tone: "bg-sky-500 text-white" },
                  { value: "late", label: "متأخرة", tone: "bg-amber-500 text-white" },
                  { value: "missed", label: "فائتة — سأقضيها", tone: "bg-rose-500 text-white" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    handlePrayerStatus(postPrayer.key, option.value);
                    reminders.clearPostPrayerCheck();
                  }}
                  className={`rounded-full px-3.5 py-2 text-xs font-medium transition-transform hover:scale-[1.03] ${option.tone}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
