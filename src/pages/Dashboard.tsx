import { AdhkarDialog } from "@/components/app/AdhkarDialog";
import { AppHeader, type DashView } from "@/components/app/AppHeader";
import { DuasView } from "@/components/app/DuasView";
import { GlassCard } from "@/components/app/GlassCard";
import { HadithView } from "@/components/app/HadithView";
import { HomeView } from "@/components/app/HomeView";
import { NudgeCenter } from "@/components/app/NudgeCenter";
import { OccasionsView } from "@/components/app/OccasionsView";
import { OpeningGreeting } from "@/components/app/OpeningGreeting";
import { PoetryView } from "@/components/app/PoetryView";
import { PrayerView } from "@/components/app/PrayerView";
import { ProphetsView } from "@/components/app/ProphetsView";
import { QuoteMarquee, type QuoteSlide } from "@/components/app/QuoteMarquee";
import { QuranView } from "@/components/app/QuranView";
import { SavedView } from "@/components/app/SavedView";
import { SettingsView } from "@/components/app/SettingsView";
import { StatsTable } from "@/components/app/StatsTable";
import { TasbihView } from "@/components/app/TasbihView";
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
import { duaOfTheDay } from "@/data/duas";
import { hadithOfTheDay } from "@/data/hadith";
import { poemOfTheDay } from "@/data/poetry";
import { PROPHET_STORIES } from "@/data/prophets";
import { ayahOfTheDay } from "@/data/quran";
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
import { detectLocation } from "@/lib/location";
import {
  clearOfflineProfile,
  EMPTY_DAY_STATE,
  readOfflineDayState,
  readOfflineProfile,
  saveOfflineDayState,
  saveOfflineProfile,
} from "@/lib/offline-store";
import { PRAYERS, type PrayerKey, type PrayerStatus } from "@/lib/prayers";
import { useInstallPrompt, useOnlineStatus } from "@/lib/pwa";
import { cachedSurahNumbers, clearQuranCache, downloadFullQuran } from "@/lib/quran-store";
import { addMinutes, dateKey } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { Loader2, Smartphone, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const VALID_VIEWS: DashView[] = [
  "today",
  "prayers",
  "quran",
  "hadith",
  "duas",
  "tasbih",
  "poetry",
  "prophets",
  "occasions",
  "saved",
  "settings",
];

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const ADHKAR_KINDS = ["morning", "evening", "sleep", "after_prayer", "distress"] as const;
const FAVORITE_KINDS = ["hadith", "poem", "dhikr", "ayah", "story"] as const;

function isDashView(value: string | null): value is DashView {
  return value !== null && (VALID_VIEWS as string[]).includes(value);
}

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const online = useOnlineStatus();
  const install = useInstallPrompt();
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

  const profileDoc = useQuery(api.planner.getProfile);
  const today = dateKey();
  const dayState = useQuery(api.planner.getDayState, { date: today });

  const lastWeek = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - index));
        return dateKey(date);
      }),
    [],
  );
  const history = useQuery(api.planner.getHistory, { dates: lastWeek });
  const stats = useQuery(api.planner.getStats);

  const setPrayerStatusMutation = useMutation(api.planner.setPrayerStatus);
  const setAdhkarDoneMutation = useMutation(api.planner.setAdhkarDone);
  const setLocationMutation = useMutation(api.planner.setLocation);

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

  /** اقتباسات الشريط المتنقل: من أقسام التطبيق، كل واحد ينقل لقسمه. */
  const quoteSlides = useMemo<QuoteSlide[]>(() => {
    const day = new Date();
    const ayah = ayahOfTheDay(day);
    const hadith = hadithOfTheDay(day.getDate() + day.getMonth() * 31);
    const dua = duaOfTheDay(day);
    const poem = poemOfTheDay(day);
    const story = PROPHET_STORIES[day.getDate() % PROPHET_STORIES.length];
    return [
      { quote: `«${hadith.text}»`, origin: hadith.source, target: "hadith" },
      { quote: ayah.text, origin: ayah.ref, target: "quran" },
      { quote: dua.text, origin: dua.reference, target: "duas" },
      { quote: poem.lines[0], origin: poem.poet, target: "poetry" },
      { quote: story.title, origin: story.prophet, target: "prophets" },
    ];
    // يُحسب مرة كل يوم — لا كل ثانية.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today]);

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

  const prayers = useMemo(() => dayState?.prayers ?? {}, [dayState]);
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
    navigate("/");
  }, [signOut, navigate]);

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

  if (profileDoc === undefined && !useCachedData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ التحميل...
        </div>
      </main>
    );
  }

  if (profileDoc === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const state =
    dayState ?? (useCachedData ? readOfflineDayState(today) : null) ?? EMPTY_DAY_STATE;

  const banner = !online ? (
    <div className="tile-edge flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2 text-[11px]">
      <span className="flex items-center gap-2">
        <WifiOff className="size-3.5 text-amber-600" />
        دون إنترنت: المصحف المحفوظ والأذكار والمواقيت المحفوظة تعمل، وتسجيلاتك تُرسل عند
        عودة الاتصال.
      </span>
    </div>
  ) : install.canInstall ? (
    <div className="tile-edge flex flex-wrap items-center justify-between gap-2 rounded-2xl px-3.5 py-2 text-[11px]">
      <span className="flex items-center gap-2">
        <Smartphone className="size-3.5 text-primary" />
        ثبّت عود على جهازك ليعمل كتطبيق مستقل ودون إنترنت.
      </span>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="btn-edge h-7 rounded-full text-[11px]"
        onClick={() => void install.promptInstall()}
      >
        تثبيت
      </Button>
    </div>
  ) : null;

  const postPrayerKey = reminders.postPrayerCheck;
  const postPrayer = postPrayerKey ? PRAYERS.find((item) => item.key === postPrayerKey) : null;

  return (
    <div className="min-h-screen pb-28">
      <AppHeader
        view={view}
        onViewChange={changeView}
        userName={user?.name ?? user?.email ?? undefined}
        onSignOut={() => void handleSignOut()}
        offline={!online}
        canInstall={install.canInstall}
        onInstall={() => void install.promptInstall()}
        banner={banner}
        moreOpen={moreOpen}
        onMoreOpenChange={setMoreOpen}
      />

      {/* الشريط المتنقل: اقتباسات من أقسام التطبيق، تنقل تلقائيًا وسحب يدوي، والضغط يفتح القسم */}
      {view === "today" ? (
        <div className="mx-auto w-full max-w-5xl px-3.5 pt-3 sm:px-6">
          <QuoteMarquee slides={quoteSlides} onSelect={changeView} />
        </div>
      ) : null}

      <main className="mx-auto w-full max-w-5xl px-3.5 pt-3.5 sm:px-6">
        {view === "today" && answers ? (
          <HomeView
            userName={user?.name ?? undefined}
            profile={answers}
            locationLabel={locationLabel}
            timings={times.timings}
            hijri={times.hijri}
            dayState={state}
            stats={stats}
            onOpenSection={changeView}
            onOpenAdhkar={setAdhkarGroup}
            onOpenAllSections={() => setMoreOpen(true)}
            mainGoal={answers.mainGoal}
            startingRitual={answers.startingRitual}
          />
        ) : null}

        {view === "prayers" && answers ? (
          <div className="space-y-4">
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
            {stats && stats.days > 0 ? <StatsTable stats={stats} history={history} /> : null}
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
            onResetNudges={() => {
              resetNudges();
              setSeenViews({});
              nudgeEngine.reset();
            }}
            onExportData={handleExportData}
            onSetCity={(value) => void handleSetCity(value)}
            onSignOut={() => void handleSignOut()}
            city={locationLabel}
          />
        ) : null}

        {view === "today" && !answers ? (
          <GlassCard soft className="p-6 text-center text-sm text-muted-foreground">
            لا توجد إجابات محفوظة بعد — أكمل الأسئلة ليُبنى التطبيق عليها.
            <div className="mt-4 flex justify-center">
              <Button type="button" className="btn-edge rounded-full" onClick={() => navigate("/onboarding")}>
                ابدأ الأسئلة
              </Button>
            </div>
          </GlassCard>
        ) : null}
      </main>

      <AdhkarDialog
        group={getAdhkarGroup(adhkarGroup ?? "morning")}
        open={adhkarGroup !== null}
        onOpenChange={(open) => setAdhkarGroup(open ? adhkarGroup : null)}
        isDone={adhkarGroup ? state.adhkar.includes(adhkarGroup) : false}
        onToggleDone={(done) => adhkarGroup && handleAdhkarDone(adhkarGroup, done)}
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
            <DialogHeader className="text-right">
              <DialogTitle className="text-lg">هل صلّيت {postPrayer.name}؟</DialogTitle>
              <DialogDescription className="text-right text-[13px] leading-7">
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
