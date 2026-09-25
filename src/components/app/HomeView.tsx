import { DailyReview, type DayReviewRecord } from "@/components/app/DailyReview";
import { LifeSystemPanel } from "@/components/app/LifeSystemPanel";
import { GlassCard } from "@/components/app/GlassCard";
import { ADHKAR_GROUPS, type AdhkarGroupId } from "@/data/adhkar";
import { duaOfTheDay } from "@/data/duas";
import type { ProfileAnswers } from "@/data/questions";
import { getSurah } from "@/data/quran";
import { useNow } from "@/hooks/use-clock";
import type { PlanItemOutcome, PlanItemStatus, DailyScore } from "@/lib/accountability";
import type { AdaptiveSuggestion } from "@/lib/adaptive-planning";
import type { DailyPlan } from "@/lib/daily-plan";
import type { ProgressSummary } from "@/lib/progress";
import type { WeeklyReview } from "@/lib/weekly-review";
import {
  planLine,
  reviewDue,
  focusMetric,
  type WeeklyFocus,
} from "@/lib/coach";
import { toArabicDigits } from "@/lib/hijri";
import { PRAYERS, nextPrayer, type Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime, formatGregorian, greeting } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  ChevronLeft,
  Moon,
  Sparkles,
  Sun,
} from "lucide-react";
import { useMemo, useState } from "react";

export type HomeSection =
  | "prayers"
  | "quran"
  | "duas"
  | "tasbih"
  | "hadith"
  | "poetry"
  | "occasions"
  | "settings";

const WIRD_LABEL: Record<string, string> = {
  small: "أقل من صفحة",
  page: "صفحة واحدة",
  two: "صفحتان",
  five: "خمس صفحات",
  juz: "جزء كامل",
};

const LAST_READ_KEY = "sakinah:quran:last";
const BOOKMARK_KEY = "sakinah:quran:bookmark";

export type WeekStats = {
  days: number;
  prayerRate: number;
  adhkarRate: number;
  streak: number;
  weakest: string | null;
  daily: { date: string; done: number; logged: number; adhkar: number; reviewed: boolean }[];
};

function pad(value: number) {
  return toArabicDigits(String(value).padStart(2, "0"));
}

function LiveCountdown({ target, className }: { target: Date; className?: string }) {
  const now = useNow(1000);
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    <span className={cn("tabular-nums", className)}>
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

function readSurahNumber() {
  try {
    const parsed = Number(window.localStorage.getItem(LAST_READ_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function readBookmark() {
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { surah?: number; ayah?: number };
    if (typeof parsed?.surah !== "number") return null;
    return { surah: parsed.surah, ayah: typeof parsed.ayah === "number" ? parsed.ayah : 1 };
  } catch {
    return null;
  }
}

function SectionCard({
  title,
  eyebrow,
  children,
  action,
  onClick,
}: {
  title: string;
  eyebrow: string;
  children: React.ReactNode;
  action: string;
  onClick: () => void;
}) {
  return (
    <GlassCard strong className="overflow-hidden p-0">
      <div className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary">{eyebrow}</p>
            <h2 className="mt-1 text-lg font-bold tracking-tight">{title}</h2>
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Sparkles className="size-5" />
          </span>
        </div>
        <div className="mt-4">{children}</div>
      </div>
      <button
        type="button"
        onClick={onClick}
        className="flex min-h-12 w-full items-center justify-between border-t border-border/55 px-5 text-sm font-semibold text-primary transition-colors hover:bg-primary/5 sm:px-6"
      >
        {action}
        <ChevronLeft className="size-4" />
      </button>
    </GlassCard>
  );
}

export function HomeView({
  userName,
  profile,
  locationLabel,
  timings,
  hijri,
  dayState,
  stats,
  onSaveReview,
  reviewSaving,
  onOpenSection,
  onOpenAdhkar,
  dailyPlan,
  planOutcomes,
  dailyScore,
  lifeProgress,
  weeklyReview,
  adaptiveSuggestions,
  savingItemId,
  applyingSuggestion,
  reviewingWeek,
  onSetPlanOutcome,
  onResetPlanOutcome,
  onSaveWeeklyReview,
  onApplySuggestion,
}: {
  userName?: string;
  profile: ProfileAnswers;
  locationLabel: string;
  timings: Timings;
  hijri: string | null;
  dayState: {
    prayers: Record<string, string>;
    adhkar: string[];
    favorites: string[];
    review: Omit<DayReviewRecord, "mood" | "blocker"> & {
      mood: string;
      blocker: string;
    } | null;
  };
  stats?: WeekStats | null;
  onSaveReview: (review: DayReviewRecord) => void;
  reviewSaving: boolean;
  onOpenSection: (section: HomeSection) => void;
  onOpenAdhkar: (group: AdhkarGroupId) => void;
  dailyPlan: DailyPlan | null;
  planOutcomes: readonly PlanItemOutcome[];
  dailyScore: DailyScore | null;
  lifeProgress: ProgressSummary | null;
  weeklyReview: WeeklyReview | null;
  adaptiveSuggestions: readonly AdaptiveSuggestion[];
  savingItemId: string | null;
  applyingSuggestion: boolean;
  reviewingWeek: boolean;
  onSetPlanOutcome: (itemId: string, status: PlanItemStatus) => void;
  onResetPlanOutcome: (itemId: string) => void;
  onSaveWeeklyReview: () => void;
  onApplySuggestion: (suggestion: AdaptiveSuggestion) => void;
}) {
  const now = useNow(30_000);
  const [lastSurah] = useState<number | null>(() => readSurahNumber());
  const [bookmark] = useState<{ surah: number; ayah: number } | null>(() => readBookmark());
  const dailyDua = useMemo(() => duaOfTheDay(now), [now]);

  const next = nextPrayer(timings, now);
  const nextTarget = useMemo(() => {
    const minutes = Number(next.time.split(":")[0]) * 60 + Number(next.time.split(":")[1]);
    const target = new Date(now);
    target.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }, [next.time, now]);

  const prayedCount = PRAYERS.filter(
    (prayer) => dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;
  const dailyDhikr = useMemo(() => {
    const group = ADHKAR_GROUPS.find((item) => item.id === "morning") ?? ADHKAR_GROUPS[0];
    return group.items[now.getDate() % group.items.length];
  }, [now]);

  const surahName = (number: number) => getSurah(number)?.name ?? arabicNumber(number);
  const positionLabel = bookmark
    ? `سورة ${surahName(bookmark.surah)} — الآية ${arabicNumber(bookmark.ayah)}`
    : lastSurah
      ? `سورة ${surahName(lastSurah)}`
      : "لم تبدأ القراءة بعد";
  const review = dayState.review as DayReviewRecord | null;
  const plan = planLine({
    dayRhythm: profile.dayRhythm,
    dayEnd: profile.dayEnd,
    focusTime: profile.focusTime,
    movement: profile.movement,
    eveningReset: profile.eveningReset,
    startingRitual: profile.startingRitual,
  });

  const weeklyFocus: WeeklyFocus =
    profile.weeklyFocus === "adhkar" || profile.weeklyFocus === "consistency"
      ? profile.weeklyFocus
      : "prayer";
  const weeklyMetric = stats ? focusMetric(weeklyFocus, stats.daily) : null;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3 px-1">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight">
            {greeting(now)}
            {userName ? `، ${userName}` : ""}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {formatGregorian(now)}
            {hijri ? ` • ${hijri}` : ""}
          </p>
        </div>
        <span className="max-w-full truncate rounded-full bg-white/70 px-3 py-1.5 text-[11px] font-medium text-foreground/70 ring-1 ring-white/80">
          {locationLabel}
        </span>
      </header>

      <LifeSystemPanel
        plan={dailyPlan}
        outcomes={planOutcomes}
        score={dailyScore}
        progress={lifeProgress}
        weeklyReview={weeklyReview}
        suggestions={adaptiveSuggestions}
        savingItemId={savingItemId}
        applyingSuggestion={applyingSuggestion}
        reviewing={reviewingWeek}
        onSetOutcome={onSetPlanOutcome}
        onResetOutcome={onResetPlanOutcome}
        onSaveWeeklyReview={onSaveWeeklyReview}
        onApplySuggestion={onApplySuggestion}
      />

      <section aria-labelledby="next-prayer-title">
        <GlassCard strong className="overflow-hidden p-0">
          <div className="grid gap-5 p-5 sm:grid-cols-[1fr_auto] sm:items-center sm:p-6">
            <div>
              <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Moon className="size-4 text-primary" />
                الصلاة القادمة
              </p>
              <h2 id="next-prayer-title" className="mt-2 text-2xl font-bold text-primary">
                {next.name}
              </h2>
              <p className="mt-1 text-base font-semibold text-foreground/80">
                {formatArabicTime(next.time)}
              </p>
            </div>
            <div className="rounded-2xl bg-primary/8 px-4 py-3 text-center">
              <p className="text-[11px] text-muted-foreground">المتبقّي</p>
              <LiveCountdown target={nextTarget} className="mt-1 block text-2xl font-bold tracking-tight" />
            </div>
          </div>
          <div className="border-t border-border/55 px-5 py-4 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold text-foreground/75">
                صلّيت اليوم {arabicNumber(prayedCount)} من {arabicNumber(PRAYERS.length)}
              </p>
              <button
                type="button"
                onClick={() => onOpenSection("prayers")}
                className="flex min-h-10 items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
              >
                فتح سجل الصلاة
                <ChevronLeft className="size-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-1.5" aria-label="حالة صلوات اليوم">
              {PRAYERS.map((prayer) => {
                const status = dayState.prayers[prayer.key];
                return (
                  <span
                    key={prayer.key}
                    title={`${prayer.name} — ${formatArabicTime(timings[prayer.key])}`}
                    className={cn(
                      "h-1.5 flex-1 rounded-full",
                      status === "jamaah" || status === "ontime"
                        ? "bg-emerald-500/80"
                        : status === "late"
                          ? "bg-amber-400/80"
                          : status === "missed"
                            ? "bg-rose-400/80"
                            : "bg-white/80 ring-1 ring-white/90",
                    )}
                  />
                );
              })}
            </div>
          </div>
        </GlassCard>
      </section>

      {profile.mainGoal === "prayer" ? (
        <SectionCard
          eyebrow="تركيزك الأول"
          title="سجّل حضورك بصدق"
          action="افتح سجل الصلاة"
          onClick={() => onOpenSection("prayers")}
        >
          <p className="text-sm leading-7 text-muted-foreground">
            بقيت {arabicNumber(Math.max(0, PRAYERS.length - prayedCount))} صلوات اليوم. السجل
            الصادق أهم من يوم ممتاز.
          </p>
        </SectionCard>
      ) : profile.mainGoal === "quran" ? (
        <SectionCard
          eyebrow="وردك اليومي"
          title={WIRD_LABEL[profile.quranAmount] ?? "صفحة واحدة"}
          action={positionLabel === "لم تبدأ القراءة بعد" ? "ابدأ وردك" : "تابع القراءة"}
          onClick={() => onOpenSection("quran")}
        >
          <p className="text-sm font-semibold text-foreground">{positionLabel}</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">خطوة صغيرة ثابتة أفضل من خطة كبيرة تتأجل.</p>
        </SectionCard>
      ) : profile.mainGoal === "adhkar" ? (
        <SectionCard
          eyebrow="ورد الأذكار"
          title={`${arabicNumber(dayState.adhkar.length)} من ${arabicNumber(3)} مجموعات`}
          action="أكمل أذكارك"
          onClick={() => onOpenAdhkar("morning")}
        >
          <p className="text-sm leading-7 text-muted-foreground">
            {dayState.adhkar.length >= 3
              ? "أتممت مجموعات اليوم الأساسية، بارك الله فيك."
              : "لا يلزم أن تفعلها جميعًا دفعة واحدة؛ ابدأ بذكاء واحد."}
          </p>
        </SectionCard>
      ) : (
        <SectionCard
          eyebrow="دعاء اليوم"
          title="دعاءٌ لما يهمّك"
          action="افتح الأدعية"
          onClick={() => onOpenSection("duas")}
        >
          <p className="quran-text line-clamp-3 text-base leading-8">{dailyDua.text}</p>
          <p className="mt-2 text-[11px] text-primary">{dailyDua.reference}</p>
        </SectionCard>
      )}

      <section aria-labelledby="today-essentials-title">
        <div className="mb-2.5 flex items-center justify-between px-1">
          <h2 id="today-essentials-title" className="text-sm font-bold">
            معك اليوم
          </h2>
          <span className="text-[11px] text-muted-foreground">خطوتان قصيرتان</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <GlassCard className="flex min-h-36 flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Sun className="size-4 text-primary" />
                ذكر الصباح
              </span>
              <button
                type="button"
                onClick={() => onOpenAdhkar("morning")}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                فتح
              </button>
            </div>
            <p className="quran-text mt-3 line-clamp-3 flex-1 text-sm leading-7">{dailyDhikr.text}</p>
            <p className="mt-2 line-clamp-1 text-[10px] text-muted-foreground">{dailyDhikr.source}</p>
          </GlassCard>

          <GlassCard className="flex min-h-36 flex-col p-4">
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                <BookOpen className="size-4 text-primary" />
                آخر موضع للمصحف
              </span>
              <button
                type="button"
                onClick={() => onOpenSection("quran")}
                className="text-[11px] font-semibold text-primary hover:underline"
              >
                متابعة
              </button>
            </div>
            <p className="mt-4 flex-1 text-sm font-semibold leading-7">{positionLabel}</p>
            <p className="mt-2 text-[10px] text-muted-foreground">يُحفظ الموضع على جهازك.</p>
          </GlassCard>
        </div>
      </section>

      <section aria-label="أذكار اليوم">
        <div className="grid grid-cols-3 gap-2.5">
          {(
            [
              { id: "morning" as AdhkarGroupId, label: "الصباح", icon: Sun },
              { id: "evening" as AdhkarGroupId, label: "المساء", icon: Moon },
              { id: "sleep" as AdhkarGroupId, label: "النوم", icon: Moon },
            ]
          ).map((item) => {
            const group = ADHKAR_GROUPS.find((entry) => entry.id === item.id);
            const done = dayState.adhkar.includes(item.id);
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpenAdhkar(item.id)}
                className={cn(
                  "tile-edge flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl px-2 py-3",
                  done && "border-emerald-400/45 bg-emerald-500/6",
                )}
              >
                <item.icon className={cn("size-5", done ? "text-emerald-600" : "text-primary")} />
                <span className="text-[11px] font-semibold">أذكار {item.label}</span>
                <span className="text-[10px] text-muted-foreground">
                  {done ? "تمّت ✓" : `${arabicNumber(group?.items.length ?? 0)} ذكرًا`}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <DailyReview
        visible={Boolean(review) || reviewDue(now, { dayEnd: profile.dayEnd })}
        review={review}
        prayedToday={prayedCount}
        saving={reviewSaving}
        onSave={onSaveReview}
      />

      {stats && weeklyMetric && stats.daily.some((day) => day.logged > 0) ? (
        <GlassCard className="p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-muted-foreground">تركيز هذا الأسبوع</p>
              <h2 className="mt-1 text-base font-bold">
                {weeklyFocus === "prayer"
                  ? "الصلاة في وقتها"
                  : weeklyFocus === "adhkar"
                    ? "الأذكار"
                    : "الاستمرار"}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => onOpenSection("prayers")}
              className="text-[11px] font-semibold text-primary hover:underline"
            >
              التفاصيل
            </button>
          </div>
          <div className="mt-4 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-primary">
                {arabicNumber(weeklyMetric.done)}/{arabicNumber(weeklyMetric.total)}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">{weeklyMetric.unit}</p>
            </div>
            <div className="text-end">
              <p className="text-xl font-bold">{arabicNumber(stats.streak)}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">أيام متصلة كاملة</p>
            </div>
          </div>
        </GlassCard>
      ) : null}

      <p className="px-2 text-center text-[11px] leading-6 text-muted-foreground">{plan}</p>
    </div>
  );
}
