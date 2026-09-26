import { CalendarRange, BarChart3, Flame, Sparkles, Star } from "lucide-react";

import { DailyReview, type DayReviewRecord } from "@/components/app/DailyReview";
import { DayTimeline } from "@/components/app/DayTimeline";
import {
  ElevatedCard,
  IconTile,
  ProgressBar,
  ScreenTitle,
  SectionHeader,
  SecondaryButton,
  StatCard,
  Sunken,
  TextLink,
} from "@/components/oud/primitives";
import type { ProfileAnswers } from "@/data/questions";
import { useNow } from "@/hooks/use-clock";
import type { PlanItemOutcome } from "@/lib/accountability";
import type { DailyPlan } from "@/lib/daily-plan";
import type { DailyRow } from "@/lib/coach";
import type { ProgressSummary } from "@/lib/progress";
import type { WeeklyReview } from "@/lib/weekly-review";
import { focusMetric, reviewDue, type WeeklyFocus } from "@/lib/coach";
import { PRAYERS } from "@/lib/prayers";
import { arabicNumber, dateKey } from "@/lib/time";

/**
 * «يومي» — how is the day going, and what did I finish.
 *
 * **It is not a second home screen.** Home answers *what matters now* and
 * stops after one action. This screen answers the other question, so it is
 * allowed to be longer: the plan, the review, the week, the streak, the
 * points. Nothing here competes for attention because nothing here is
 * urgent.
 *
 * **Read order:** progress first, then the three numbers that summarise it,
 * then the plan that produces those numbers, then the review, then the
 * week. A number before the thing that changes it is a scoreboard.
 *
 * **No new copy.** Every string moved here from the home screen, or came
 * from a data source. The section titles are technical UI labels.
 */

type Props = {
  profile: ProfileAnswers;
  dayState: {
    prayers: Record<string, string>;
    adhkar: string[];
    review: Omit<DayReviewRecord, "mood" | "blocker"> & { mood: string; blocker: string } | null;
  };
  stats?: {
    days: number;
    prayerRate: number;
    adhkarRate: number;
    streak: number;
    daily: DailyRow[];
  } | null;
  lifeProgress: ProgressSummary | null;
  dailyPlan: DailyPlan | null;
  planOutcomes: readonly PlanItemOutcome[];
  savingItemId: string | null;
  onSetPlanOutcome: (itemId: string, status: PlanItemOutcome["status"]) => void;
  onResetPlanOutcome: (itemId: string) => void;
  reviewSaving: boolean;
  onSaveReview: (review: DayReviewRecord) => void;
  weeklyReview: WeeklyReview | null;
  reviewingWeek: boolean;
  onSaveWeeklyReview: () => void;
  xp: { total: number; today: number; levelLabel: string };
  achievements: { unlocked: number; total: number };
  onOpenSection: (section: string) => void;
};

export function DayHubView({
  profile,
  dayState,
  stats,
  lifeProgress,
  dailyPlan,
  planOutcomes,
  savingItemId,
  onSetPlanOutcome,
  onResetPlanOutcome,
  reviewSaving,
  onSaveReview,
  weeklyReview,
  reviewingWeek,
  onSaveWeeklyReview,
  xp,
  achievements,
  onOpenSection,
}: Props) {
  const now = useNow(30_000);
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const review = dayState.review as DayReviewRecord | null;
  const todayKey = dateKey(now);

  const prayedToday = PRAYERS.filter(
    (prayer) =>
      dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  const weeklyFocus: WeeklyFocus =
    profile.weeklyFocus === "adhkar" || profile.weeklyFocus === "consistency"
      ? profile.weeklyFocus
      : "prayer";
  const weeklyMetric = stats ? focusMetric(weeklyFocus, stats.daily) : null;

  const doneToday = planOutcomes.filter(
    (item) => item.date === todayKey && item.status === "completed",
  ).length;
  const planTotal = dailyPlan?.sections.reduce((total, section) => total + section.items.length, 0) ?? 0;
  const prayerPct = Math.round((prayedToday / PRAYERS.length) * 100);

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="يومي" subtitle="خطة اليوم ومراجعته وتقدّمك" />

      {/* 1 — progress first, because everything below explains it. */}
      <ElevatedCard className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="label-meta text-muted-foreground">الصلاة اليوم</p>
            <p className="mt-1 text-[24px] leading-9 font-bold text-foreground">
              {arabicNumber(prayedToday)} / {arabicNumber(PRAYERS.length)}
            </p>
          </div>
          <IconTile icon={Sparkles} size="lg" />
        </div>
        <ProgressBar className="mt-3" value={prayerPct} label="الصلاة اليوم" />

        <p className="label-meta mt-3 text-muted-foreground">
          خطة اليوم: {arabicNumber(doneToday)} من {arabicNumber(planTotal)} منفَّذة
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <SecondaryButton icon={CalendarRange} onClick={() => onOpenSection("weekly")} className="px-4 text-[13px]">
            الخطة الأسبوعية
          </SecondaryButton>
          <SecondaryButton icon={BarChart3} onClick={() => onOpenSection("stats")} className="px-4 text-[13px]">
            الإحصاءات
          </SecondaryButton>
        </div>
      </ElevatedCard>

      {/* 2 — three numbers, equal weight, no hero among them. */}
      <ul className="grid grid-cols-3 gap-2.5">
        <li>
          <StatCard
            icon={Star}
            size="sm"
            label="XP"
            value={arabicNumber(xp.total)}
            hint={xp.levelLabel}
            className="h-full"
          />
        </li>
        <li>
          <StatCard
            icon={Flame}
            size="sm"
            label="أيام متصلة"
            value={arabicNumber(lifeProgress?.currentStreak ?? stats?.streak ?? 0)}
            className="h-full"
          />
        </li>
        <li>
          <StatCard
            icon={Sparkles}
            size="sm"
            label="الإنجازات"
            value={`${arabicNumber(achievements.unlocked)}/${arabicNumber(achievements.total)}`}
            className="h-full"
          />
        </li>
      </ul>

      {/* 3 — the plan itself. */}
      {dailyPlan ? (
        <DayTimeline
          plan={dailyPlan}
          outcomes={planOutcomes}
          currentTime={nowLabel}
          savingItemId={savingItemId}
          onSetOutcome={onSetPlanOutcome}
          onResetOutcome={onResetPlanOutcome}
        />
      ) : (
        <ElevatedCard className="p-5">
          <SectionHeader
            title="خطة اليوم"
            subtitle="نجهّز خطتك من نموذج حياتك"
          />
          <p className="label-body mt-2 text-muted-foreground">
            لن نضيف مهمة لم تخترها — انتظر لحظة واحدة.
          </p>
        </ElevatedCard>
      )}

      {/* 4 — the review. A ritual, not a form. */}
      <DailyReview
        visible={Boolean(review) || reviewDue(now, { dayEnd: profile.dayEnd })}
        review={review}
        prayedToday={prayedToday}
        saving={reviewSaving}
        onSave={onSaveReview}
      />

      {/* 5 — the week behind today. */}
      {stats && stats.days > 0 ? (
        <ElevatedCard className="p-5">
          <SectionHeader
            title="كيف يسير أسبوعك"
            action={<TextLink onClick={() => onOpenSection("stats")}>الإحصاءات</TextLink>}
          />
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="label-meta text-muted-foreground">الصلاة في وقتها</p>
                <p className="text-[13px] font-bold text-foreground">{arabicNumber(stats.prayerRate)}٪</p>
              </div>
              <ProgressBar value={stats.prayerRate} tone="success" label="نسبة الصلاة في وقتها" />
            </div>
            <div>
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="label-meta text-muted-foreground">أيام فيها أذكار</p>
                <p className="text-[13px] font-bold text-foreground">{arabicNumber(stats.adhkarRate)}٪</p>
              </div>
              <ProgressBar value={stats.adhkarRate} label="نسبة الأيام التي فيها أذكار" />
            </div>
          </div>

          {weeklyMetric ? (
            <p className="label-meta mt-4 text-muted-foreground">
              تركيز الأسبوع:{" "}
              {weeklyFocus === "prayer"
                ? "الصلاة في وقتها"
                : weeklyFocus === "adhkar"
                  ? "الأذكار"
                  : "الاستمرار"}{" "}
              — {arabicNumber(weeklyMetric.done)} من {arabicNumber(weeklyMetric.total)}{" "}
              {weeklyMetric.unit}.
            </p>
          ) : null}

          {lifeProgress ? (
            <p className="label-meta mt-1 leading-6 text-muted-foreground">
              من خطة الأسبوع: {arabicNumber(lifeProgress.weekly.completed)} خطوة منفَّذة في{" "}
              {arabicNumber(lifeProgress.weekly.activeDays)} أيام نشطة ·{" "}
              {arabicNumber(lifeProgress.weekly.reviewedDays)} يوم مراجَع · أطول سلسلة:{" "}
              {arabicNumber(lifeProgress.longestStreak)} يوم
            </p>
          ) : null}
        </ElevatedCard>
      ) : null}

      {weeklyReview ? (
        <Sunken className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="label-meta min-w-0 flex-1 text-muted-foreground">
            مراجعة الأسبوع: التزام {arabicNumber(weeklyReview.adherence)}٪ عبر{" "}
            {arabicNumber(weeklyReview.reviewedDays)} أيام.
          </p>
          <SecondaryButton onClick={onSaveWeeklyReview} disabled={reviewingWeek} className="h-9 px-4">
            {reviewingWeek ? "جارٍ الحفظ…" : "تحديث المراجعة"}
          </SecondaryButton>
        </Sunken>
      ) : null}
    </div>
  );
}
