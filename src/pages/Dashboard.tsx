import { AppHeader, type DashView } from "@/components/app/AppHeader";
import { HadithView } from "@/components/app/HadithView";
import { PlanView } from "@/components/app/PlanView";
import { PoetryView } from "@/components/app/PoetryView";
import { PrayerView } from "@/components/app/PrayerView";
import { QuranView } from "@/components/app/QuranView";
import { TodayView } from "@/components/app/TodayView";
import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { api } from "@/convex/_generated/api";
import { pickAnswers, type ProfileAnswers } from "@/data/questions";
import { useAuth } from "@/hooks/use-auth";
import { usePrayerTimes } from "@/hooks/use-prayer-times";
import { usePrayerReminders } from "@/hooks/use-reminders";
import { buildDayPlan } from "@/lib/day-plan";
import type { PrayerStatus } from "@/lib/prayers";
import { dateKey, formatArabicTime } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { Loader2, LogOut } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const VALID_VIEWS: DashView[] = ["today", "prayers", "plan", "hadith", "quran", "poetry"];

export default function Dashboard() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialView = (searchParams.get("view") ?? "today") as DashView;
  const [view, setView] = useState<DashView>(
    VALID_VIEWS.includes(initialView) ? initialView : "today",
  );

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

  const setPrayerStatusMutation = useMutation(api.planner.setPrayerStatus);
  const setAdhkarDoneMutation = useMutation(api.planner.setAdhkarDone);
  const toggleFavoriteMutation = useMutation(api.planner.toggleFavorite);

  const answers: ProfileAnswers | null = useMemo(
    () => (profileDoc ? pickAnswers(profileDoc as Partial<ProfileAnswers>) : null),
    [profileDoc],
  );

  const { timings, hijri, usingFallback, refresh } = usePrayerTimes(
    answers?.city ?? "القاهرة",
  );
  const { upcoming, permission, requestPermission } = usePrayerReminders(timings);
  const plan = useMemo(
    () => (answers ? buildDayPlan(answers, timings) : []),
    [answers, timings],
  );

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [view]);

  // مزامنة القسم مع رابط الصفحة حتى يعمل زر الرجوع في المتصفح.
  useEffect(() => {
    const next = (searchParams.get("view") ?? "today") as DashView;
    if (VALID_VIEWS.includes(next) && next !== view) setView(next);
  }, [searchParams, view]);

  if (profileDoc === undefined) {
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

  const state = dayState ?? { prayers: {}, adhkar: [], favorites: [] };

  const changeView = (next: DashView) => {
    setView(next);
    setSearchParams(next === "today" ? {} : { view: next }, { replace: true });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const handlePrayerStatus = (prayer: string, status: PrayerStatus) => {
    void setPrayerStatusMutation({ date: today, prayer, status });
  };

  const handleAdhkarDone = (kind: string, done: boolean) => {
    void setAdhkarDoneMutation({ date: today, kind, done });
  };

  const handleToggleFavorite = (itemId: string, kind: string, title: string) => {
    void toggleFavoriteMutation({ itemId, kind, title });
  };

  return (
    <div className="min-h-screen pb-16">
      <AppHeader
        view={view}
        onViewChange={changeView}
        userName={user?.name ?? user?.email ?? undefined}
        onSignOut={handleSignOut}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pt-6 sm:px-6">
        {view === "today" && answers ? (
          <TodayView
            userName={user?.name ?? undefined}
            profile={answers}
            timings={timings}
            hijri={hijri}
            usingFallback={usingFallback}
            onRefreshTimes={refresh}
            dayState={state}
            onPrayerStatus={handlePrayerStatus}
            onAdhkarDone={handleAdhkarDone}
            plan={plan}
            upcoming={upcoming}
            permission={permission}
            onRequestPermission={requestPermission}
            onOpenSection={(section) => changeView(section)}
          />
        ) : null}

        {view === "prayers" && answers ? (
          <PrayerView
            timings={timings}
            city={answers.city}
            usingFallback={usingFallback}
            onRefreshTimes={refresh}
            dayState={state}
            onPrayerStatus={handlePrayerStatus}
            profile={answers}
            permission={permission}
            onRequestPermission={requestPermission}
            history={history}
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

        {view === "quran" && answers ? <QuranView profile={answers} /> : null}

        {view === "poetry" ? (
          <PoetryView
            favorites={state.favorites.filter((id) => id.startsWith("p"))}
            onToggleFavorite={handleToggleFavorite}
          />
        ) : null}

        {view === "today" && !answers ? (
          <GlassCard soft className="p-8 text-center text-sm text-muted-foreground">
            لا توجد خطّة بعد — أكمل الأسئلة الخمسة عشر لنبني يومك.
            <div className="mt-4 flex justify-center">
              <Button
                type="button"
                className="rounded-full"
                onClick={() => navigate("/onboarding")}
              >
                ابدأ الأسئلة
              </Button>
            </div>
          </GlassCard>
        ) : null}
      </main>

      <footer className="mx-auto mt-8 w-full max-w-6xl px-4 sm:px-6">
        <GlassCard soft className="flex flex-wrap items-center justify-between gap-3 p-4 text-[11px] text-muted-foreground">
          <span>
            مواقيت الصلاة اليوم: الفجر {formatArabicTime(timings.fajr)} • الظهر{" "}
            {formatArabicTime(timings.dhuhr)} • العصر {formatArabicTime(timings.asr)} •
            المغرب {formatArabicTime(timings.maghrib)} • العشاء{" "}
            {formatArabicTime(timings.isha)}
          </span>
          <span className="flex items-center gap-2">
            النصوص الشرعية من مصادرها المذكورة على كل كارت
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
    </div>
  );
}
