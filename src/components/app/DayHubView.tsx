import { DailyReview, type DayReviewRecord } from "@/components/app/DailyReview";
import { DayTimeline } from "@/components/app/DayTimeline";
import {
  Meter,
  Panel,
  QuietButton,
  SectionHead,
  Sunken,
} from "@/components/app/Surfaces";
import type { ProfileAnswers } from "@/data/questions";
import { useNow } from "@/hooks/use-clock";
import type { PlanItemOutcome } from "@/lib/accountability";
import type { DailyPlan } from "@/lib/daily-plan";
import type { ProgressSummary } from "@/lib/progress";
import type { DailyRow } from "@/lib/coach";
import type { WeeklyReview } from "@/lib/weekly-review";
import { focusMetric, reviewDue, type WeeklyFocus } from "@/lib/coach";

import { PRAYERS } from "@/lib/prayers";
import { arabicNumber, dateKey } from "@/lib/time";
import { BarChart3, CalendarRange, ChevronLeft } from "lucide-react";

/**
 * «يومي» — منطقة إدارة اليوم ومراجعته.
 *
 * **لماذا وُجدت:** كانت كل خطة اليوم والمراجعة والإحصاء مكتوبة داخل
 * الشاشة الرئيسية، فصارت الشاشة الواحدة تجمع «أين أنا» و«كيف يسير
 * يومي» معا. الأولى سؤال الرئيسية، والثانية سؤال هذه المنطقة. فمُنعت
 * الأولى عن الثاني، لا حُذفت البيانات ولا تغيّر المنطق: كل ما هنا
 * نفس الاستعلامات ونفس الدوال، نُقلت كما هي.
 *
 * **بلا نصوص جديدة:** كل سطر هنا منقول بحرفه من مكانه القديم. اسم
 * المنطقة («يومي») هو الاسم المعتمد في خريطة المعلومات.
 */

type Props = {
  profile: ProfileAnswers;
  dayState: {
    prayers: Record<string, string>;
    adhkar: string[];
    review: Omit<DayReviewRecord, "mood" | "blocker"> & { mood: string; blocker: string } | null;
  };
  /** نفس ما كانت تتلقاه الشاشة الرئيسية: النسب واليومي الأسبوعي. */
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
  onOpenSection,
}: Props) {
  const now = useNow(30_000);
  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const review = dayState.review as DayReviewRecord | null;

  const prayedToday = PRAYERS.filter(
    (prayer) =>
      dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  const weeklyFocus: WeeklyFocus =
    profile.weeklyFocus === "adhkar" || profile.weeklyFocus === "consistency"
      ? profile.weeklyFocus
      : "prayer";
  const weeklyMetric = stats ? focusMetric(weeklyFocus, stats.daily) : null;
  const todayKey = dateKey(now);
  const doneToday = planOutcomes.filter(
    (item) => item.date === todayKey && item.status === "completed",
  ).length;

  const shortcuts = [
    { key: "weekly", label: "الخطة الأسبوعية", icon: CalendarRange },
    { key: "stats", label: "الإحصاءات", icon: BarChart3 },
  ];

  return (
    <div className="stack">
      <Panel className="px-5 py-6 sm:px-6">
        <SectionHead
          eyebrow="يومي"
          title="خطة اليوم ومراجعته"
          hint={`${arabicNumber(doneToday)} خطوة منفَّذة اليوم`}
        />
        <ul className="mt-4 flex flex-wrap gap-2">
          {shortcuts.map((item) => (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onOpenSection(item.key)}
                className="motion-press surface-secondary flex min-h-11 items-center gap-2 rounded-full px-4 text-[13px] font-semibold text-foreground/80"
              >
                <item.icon className="size-4" aria-hidden />
                {item.label}
                <ChevronLeft className="size-3.5 text-muted-foreground" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </Panel>

      {/* خطة اليوم كاملة — هنا موطنها، لا في الرئيسية. */}
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
        <Panel className="px-5 py-6 sm:px-6">
          <SectionHead
            eyebrow="خطة اليوم"
            title="نجهّز خطتك من نموذج حياتك"
            hint="لن نضيف مهمة لم تخترها — انتظر لحظة واحدة."
          />
        </Panel>
      )}

      <DailyReview
        visible={Boolean(review) || reviewDue(now, { dayEnd: profile.dayEnd })}
        review={review}
        prayedToday={prayedToday}
        saving={reviewSaving}
        onSave={onSaveReview}
      />

      {stats && stats.days > 0 ? (
        <Panel className="p-5 sm:p-6">
          <SectionHead
            eyebrow="متابعتي"
            title="كيف يسير أسبوعك"
            action={
              <button
                type="button"
                onClick={() => onOpenSection("stats")}
                className="touch-target inline-flex items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-primary"
              >
                الإحصاءات
                <ChevronLeft className="size-3.5" />
              </button>
            }
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="label-meta text-muted-foreground">الصلاة في وقتها</p>
                <p className="text-[13px] font-bold text-foreground">{arabicNumber(stats.prayerRate)}٪</p>
              </div>
              <Meter className="mt-1.5" value={stats.prayerRate} tone="success" label="نسبة الصلاة في وقتها" />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="label-meta text-muted-foreground">أيام فيها أذكار</p>
                <p className="text-[13px] font-bold text-foreground">{arabicNumber(stats.adhkarRate)}٪</p>
              </div>
              <Meter className="mt-1.5" value={stats.adhkarRate} label="نسبة الأيام التي فيها أذكار" />
            </div>
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <p className="label-meta text-muted-foreground">سجل خطة الأسبوع</p>
                <p className="text-[13px] font-bold text-foreground">
                  {arabicNumber(lifeProgress?.currentStreak ?? stats.streak)}
                </p>
              </div>
              <Meter
                className="mt-1.5"
                value={Math.min(100, (lifeProgress?.currentStreak ?? stats.streak) * 14)}
                tone="attention"
                label="أيام متصلة"
              />
            </div>
          </div>

          {weeklyMetric ? (
            <p className="label-meta mt-4 text-muted-foreground">
              تركيز الأسبوع:{" "}
              {weeklyFocus === "prayer" ? "الصلاة في وقتها" : weeklyFocus === "adhkar" ? "الأذكار" : "الاستمرار"} —{" "}
              {arabicNumber(weeklyMetric.done)} من {arabicNumber(weeklyMetric.total)} {weeklyMetric.unit}.
            </p>
          ) : null}

          {lifeProgress ? (
            <p className="label-meta mt-1 leading-6 text-muted-foreground">
              من خطة الأسبوع: {arabicNumber(lifeProgress.weekly.completed)} خطوة منفَّذة في{" "}
              {arabicNumber(lifeProgress.weekly.activeDays)} أيام نشطة
              {lifeProgress.weekly.postponed > 0
                ? ` · ${arabicNumber(lifeProgress.weekly.postponed)} مؤجّل`
                : ""}{" "}
              · {arabicNumber(lifeProgress.weekly.reviewedDays)} يوم مراجَع
              {lifeProgress.weekly.averageScore !== null
                ? ` · متوسّط ${arabicNumber(lifeProgress.weekly.averageScore)}`
                : ""}
              {lifeProgress.weekly.changeFromPrevious !== null
                ? ` · ${lifeProgress.weekly.changeFromPrevious >= 0 ? "أعلى" : "أقل"} من الأسبوع الذي قبله بـ${arabicNumber(
                    Math.abs(lifeProgress.weekly.changeFromPrevious),
                  )} نقطة`
                : ""}
              .<br />
              أطول سلسلة: {arabicNumber(lifeProgress.longestStreak)} يوم
            </p>
          ) : null}
        </Panel>
      ) : null}

      {weeklyReview ? (
        <Sunken className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="label-meta min-w-0 flex-1 text-muted-foreground">
            مراجعة الأسبوع: التزام {arabicNumber(weeklyReview.adherence)}٪ عبر {arabicNumber(weeklyReview.reviewedDays)} أيام.
          </p>
          <QuietButton onClick={onSaveWeeklyReview} disabled={reviewingWeek} className="h-9 px-4">
            {reviewingWeek ? "جارٍ الحفظ…" : "تحديث المراجعة"}
          </QuietButton>
        </Sunken>
      ) : null}
    </div>
  );
}
