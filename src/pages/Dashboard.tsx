import { AdhkarDialog } from "@/components/app/AdhkarDialog";
import { AppHeader, type DashView } from "@/components/app/AppHeader";
import { GlassCard } from "@/components/app/GlassCard";
import { HadithView } from "@/components/app/HadithView";
import { NudgeCenter } from "@/components/app/NudgeCenter";
import { OccasionsView } from "@/components/app/OccasionsView";
import { PlanView } from "@/components/app/PlanView";
import { PoetryView } from "@/components/app/PoetryView";
import { PrayerView } from "@/components/app/PrayerView";
import { QuranView } from "@/components/app/QuranView";
import { SettingsView } from "@/components/app/SettingsView";
import { TodayView } from "@/components/app/TodayView";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { getAdhkarGroup, type AdhkarGroupId } from "@/data/adhkar";
import { todayOccasions } from "@/data/occasions";
import { pickAnswers, type ProfileAnswers } from "@/data/questions";
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
import { buildDayPlan } from "@/lib/day-plan";
import {
  clearOfflineProfile,
  EMPTY_DAY_STATE,
  readOfflineDayState,
  readOfflineProfile,
  saveOfflineDayState,
  saveOfflineProfile,
} from "@/lib/offline-store";
import type { PrayerKey, PrayerStatus } from "@/lib/prayers";
import { useInstallPrompt, useOnlineStatus } from "@/lib/pwa";
import {
  cachedSurahNumbers,
  clearQuranCache,
  downloadFullQuran,
} from "@/lib/quran-store";
import { dateKey, formatArabicTime } from "@/lib/time";
import { SURAH_COUNT } from "@/data/quran";
import { useMutation, useQuery } from "convex/react";
import { Loader2, LogOut, Smartphone, WifiOff } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

const VALID_VIEWS: DashView[] = [
  "today",
  "prayers",
  "plan",
  "hadith",
  "quran",
  "poetry",
  "occasions",
  "settings",
];

const PRAYER_KEYS: PrayerKey[] = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
const ADHKAR_KINDS = ["morning", "evening", "sleep", "after_prayer", "distress"] as const;
const FAVORITE_KINDS = ["hadith", "poem", "dhikr", "ayah"] as const;

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
  const [adhkarGroup, setAdhkarGroup] = useState<AdhkarGroupId | null>(() => {
    const param = searchParams.get("adhkar");
    return param === "morning" || param === "evening" || param === "sleep" ? param : null;
  });
  const [quranCache, setQuranCache] = useState({
    cachedCount: 0,
    downloading: false,
    progress: 0,
  });

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
  const toggleFavoriteMutation = useMutation(api.planner.toggleFavorite);
  const setLocationMutation = useMutation(api.planner.setLocation);

  /* عند انعدام الشبكة يعتمد التطبيق على آخر نسخة محفوظة من بياناتك. */
  const cachedProfile = useMemo(
    () => readOfflineProfile<Partial<ProfileAnswers>>(),
    // نقرأ مرة واحدة لكل تحميل صفحة.
    [],
  );

  /* لا نستخدم النسخة المحفوظة إلا عند انقطاع الشبكة، لا لمستخدم لم يُنشئ ملفًا بعد. */
  const useCachedData = profileDoc === undefined && !online;

  const answers: ProfileAnswers | null = useMemo(() => {
    if (profileDoc) return pickAnswers(profileDoc as Partial<ProfileAnswers>);
    if (useCachedData && cachedProfile) return pickAnswers(cachedProfile);
    return null;
  }, [profileDoc, cachedProfile, useCachedData]);

  useEffect(() => {
    if (profileDoc) saveOfflineProfile(profileDoc);
    // الحساب بلا ملف: نمسح أي نسخة محفوظة حتى لا تظهر بيانات حساب سابق.
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

  const times = usePrayerTimes({
    city: answers?.city ?? "القاهرة",
    coords,
    method: prefs.method,
  });

  const prayers = dayState?.prayers ?? {};
  const adhkarDone = dayState?.adhkar ?? [];

  const reminders = useReminderCenter({
    timings: times.timings,
    prefs,
    sleepTime: answers?.sleepTime,
    prayers,
    adhkarDone,
  });

  const plan = useMemo(
    () => (answers ? buildDayPlan(answers, times.timings) : []),
    [answers, times.timings],
  );

  const occasions = useMemo(() => todayOccasions(reminders.now), [reminders.now]);

  const nudgeInput = useMemo(
    () => ({
      adhkarDone,
      prayers,
      timings: times.timings,
      sleepTime: answers?.sleepTime,
      permissionState: reminders.permission,
      seenViews,
      now: reminders.now,
    }),
    [
      adhkarDone,
      prayers,
      times.timings,
      answers?.sleepTime,
      reminders.permission,
      reminders.now,
      seenViews,
    ],
  );
  const nudgeEngine = useNudgeEngine(Boolean(profileDoc) && prefs.nudgesEnabled, nudgeInput);

  /* عند دخول أي قسم نُسجّل زيارته حتى لا ينبّهك التطبيق على قسم زرته. */
  useEffect(() => {
    if (!profileDoc) return;
    markViewSeen(view);
    setSeenViews(readSeenViews());
  }, [view, profileDoc]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // مزامنة القسم مع الرابط ليعمل زر الرجوع في المتصفح والاختصارات.
  useEffect(() => {
    const next = searchParams.get("view");
    if (isDashView(next) && next !== view) setView(next);
    const adhkarParam = searchParams.get("adhkar");
    if (adhkarParam === "morning" || adhkarParam === "evening" || adhkarParam === "sleep") {
      setAdhkarGroup(adhkarParam);
    }
  }, [searchParams, view]);

  // إشعارات النظام تفتح URL معيّنًا، فنوجّه المستخدم إليه.
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
    toast.info("بدأ تنزيل المصحف؛ يمكنك التنقّل في التطبيق أثناء التنزيل.");
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
        toast.warning(
          `حُفظ ${result.done} سورة، وتعذّر ${result.failed.length}. أعد المحاولة لتحميل الناقص.`,
        );
      } else {
        toast.success("تم تنزيل المصحف كاملًا؛ يعمل الآن دون إنترنت.");
      }
    } catch {
      toast.error("توقّف التنزيل، تحقق من الاتصال وأعد المحاولة.");
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

  if (profileDoc === undefined && !useCachedData) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ تجهيز يومك...
        </div>
      </main>
    );
  }

  if (profileDoc === null) {
    return <Navigate to="/onboarding" replace />;
  }

  const state =
    dayState ?? (useCachedData ? readOfflineDayState(today) : null) ?? EMPTY_DAY_STATE;

  const changeView = (next: string) => {
    if (!isDashView(next)) return;
    setView(next);
    setSearchParams(next === "today" ? {} : { view: next }, { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handlePrayerStatus = (prayer: string, status: PrayerStatus) => {
    const key = PRAYER_KEYS.find((item) => item === prayer);
    if (!key) return;
    void setPrayerStatusMutation({ date: today, prayer: key, status });
  };

  const handleAdhkarDone = (kind: string, done: boolean) => {
    if (!ADHKAR_KINDS.includes(kind as (typeof ADHKAR_KINDS)[number])) return;
    void setAdhkarDoneMutation({
      date: today,
      kind: kind as (typeof ADHKAR_KINDS)[number],
      done,
    });
  };

  const handleToggleFavorite = (itemId: string, kind: string, title: string) => {
    if (!FAVORITE_KINDS.includes(kind as (typeof FAVORITE_KINDS)[number])) return;
    void toggleFavoriteMutation({
      itemId,
      kind: kind as (typeof FAVORITE_KINDS)[number],
      title,
    });
  };

  const handleGeoRequest = async () => {
    const result = await geo.request();
    if (!result) return;
    try {
      await setLocationMutation({
        latitude: result.latitude,
        longitude: result.longitude,
      });
      toast.success("حُفظ موقعك؛ صارت المواقيت على إحداثياتك مباشرة.");
    } catch {
      toast.error("تعذّر حفظ الموقع في حسابك، لكنه محفوظ على جهازك.");
    }
  };

  const handleExportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      preferences: prefs,
      bookmark: window.localStorage.getItem("sakinah:quran:bookmark"),
      seenViews,
      nudges: readNudgeState(),
      coords: window.localStorage.getItem("sakinah:coords:v1"),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sakinah-backup-${today}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("نُزّلت نسخة من إعداداتك.");
  };

  const banner = !online ? (
    <div className="glass-tile flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2 text-[11px]">
      <span className="flex items-center gap-2">
        <WifiOff className="size-3.5 text-amber-600" />
        أنت دون إنترنت: المصحف المحفوظ، والأذكار، والأحاديث، والمواقيت المحفوظة تعمل الآن،
        وتسجيلاتك ستُرسل تلقائيًا عند عودة الاتصال.
      </span>
      <button
        type="button"
        className="text-muted-foreground underline-offset-4 hover:underline"
        onClick={() => changeView("quran")}
      >
        ما هو المحفوظ؟
      </button>
    </div>
  ) : install.canInstall ? (
    <div className="glass-tile flex flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2 text-[11px]">
      <span className="flex items-center gap-2">
        <Smartphone className="size-3.5 text-primary" />
        ثبّت سكينة على جهازك لتعمل كتطبيق مستقل ودون إنترنت.
      </span>
      <span className="flex items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-7 rounded-full text-[11px]"
          onClick={() => void install.promptInstall()}
        >
          تثبيت
        </Button>
      </span>
    </div>
  ) : null;

  return (
    <div className="min-h-screen pb-16">
      <AppHeader
        view={view}
        onViewChange={changeView}
        userName={user?.name ?? user?.email ?? undefined}
        onSignOut={handleSignOut}
        offline={!online}
        canInstall={install.canInstall}
        onInstall={() => void install.promptInstall()}
        banner={banner}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        {view === "today" && answers ? (
          <TodayView
            userName={user?.name ?? undefined}
            profile={answers}
            timings={times.timings}
            hijri={times.hijri}
            offlineSaved={times.offlineSaved}
            onRefreshTimes={times.refresh}
            dayState={state}
            onPrayerStatus={handlePrayerStatus}
            onAdhkarDone={handleAdhkarDone}
            onOpenAdhkar={setAdhkarGroup}
            plan={plan}
            upcoming={reminders.upcoming}
            permission={reminders.permission}
            onRequestPermission={() => void reminders.requestPermission()}
            nextReminder={reminders.upcomingLabel}
            occasions={occasions}
            onOpenSection={changeView}
          />
        ) : null}

        {view === "prayers" && answers ? (
          <PrayerView
            timings={times.timings}
            city={answers.city}
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
        ) : null}

        {view === "plan" && answers ? (
          <PlanView
            plan={plan}
            profile={answers}
            onEditProfile={() => navigate("/onboarding?edit=1")}
          />
        ) : null}

        {view === "hadith" ? (
          <HadithView
            favorites={state.favorites.filter((id) => id.startsWith("h"))}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : null}

        {view === "quran" && answers ? (
          <QuranView
            profile={answers}
            mushafMode={prefs.mushafMode}
            fontScale={prefs.fontScale}
            onMushafModeChange={(value) => setPref("mushafMode", value)}
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
            favorites={state.favorites.filter((id) => id.startsWith("p"))}
            onToggleFavorite={handleToggleFavorite}
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
              label: geo.label ?? profileDoc?.locationLabel ?? null,
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
            onEditCity={() => navigate("/onboarding?edit=1")}
            onSignOut={handleSignOut}
            city={answers.city}
          />
        ) : null}

        {view === "today" && !answers ? (
          <GlassCard soft className="p-8 text-center text-sm text-muted-foreground">
            لا توجد خطّة بعد — أكمل الأسئلة الخمسة عشر لنبني يومك.
            <div className="mt-4 flex justify-center">
              <Button type="button" className="rounded-full" onClick={() => navigate("/onboarding")}>
                ابدأ الأسئلة
              </Button>
            </div>
          </GlassCard>
        ) : null}
      </main>

      <footer className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
        <GlassCard soft className="flex flex-wrap items-center justify-between gap-3 p-4 text-[11px] text-muted-foreground">
          <span>
            مواقيت اليوم: الفجر {formatArabicTime(times.timings.fajr)} • الظهر{" "}
            {formatArabicTime(times.timings.dhuhr)} • العصر {formatArabicTime(times.timings.asr)} •
            المغرب {formatArabicTime(times.timings.maghrib)} • العشاء{" "}
            {formatArabicTime(times.timings.isha)}
          </span>
          <span className="flex items-center gap-2">
            {times.offlineSaved ? "مواقيت محفوظة (قد تختلف دقائق)" : "مواقيت مباشرة"}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-[11px]"
              onClick={handleSignOut}
            >
              <LogOut className="size-3.5" />
              خروج
            </Button>
          </span>
        </GlassCard>
      </footer>

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
    </div>
  );
}
