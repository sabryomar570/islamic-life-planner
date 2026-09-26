import { DailyReview, type DayReviewRecord } from "@/components/app/DailyReview";
import { DayTimeline } from "@/components/app/DayTimeline";
import { MosqueCard } from "@/components/app/MosqueCard";
import { NextPrayerHero } from "@/components/app/NextPrayerHero";
import { OudLineCard } from "@/components/app/OudLineCard";
import { QiblaCard } from "@/components/app/QiblaView";
import {
  Meter,
  Panel,
  PrimaryButton,
  QuietButton,
  SectionHead,
  Sunken,
} from "@/components/app/Surfaces";
import { ADHKAR_GROUPS, type AdhkarGroupId } from "@/data/adhkar";
import type { ProfileAnswers } from "@/data/questions";
import { getSurah } from "@/data/quran";
import { useNow } from "@/hooks/use-clock";
import type { PlanItemOutcome, PlanItemStatus, DailyScore } from "@/lib/accountability";
import type { AdaptiveSuggestion } from "@/lib/adaptive-planning";
import type { DailyPlan } from "@/lib/daily-plan";
import type { ProgressSummary } from "@/lib/progress";
import type { WeeklyReview } from "@/lib/weekly-review";
import { focusMetric, planLine, reviewDue, type WeeklyFocus } from "@/lib/coach";
import type { MosqueState } from "@/hooks/use-oud";
import type { MosquePlace } from "@/lib/oud-mosque";
import type { QiblaPoint } from "@/lib/qibla";
import type { OudLine } from "@/lib/oud-voice";
import { PRAYERS, type PrayerKey, type PrayerStatus, type Timings } from "@/lib/prayers";
import { arabicNumber, dateKey, formatGregorian, greeting } from "@/lib/time";
import { cn } from "@/lib/utils";
import { BookOpen, Check, ChevronLeft, Moon, Sun, Target } from "lucide-react";
import { useMemo, useState, lazy, Suspense } from "react";

// PHASE 3: كسول عمدا. تحميل الإحصاء يجرّ قاعدة الأحاديث كاملة،
// فلا يدخل المسار الحرج إلا عند ظهوره.
// **بعد كل الاستيراد لا قبله:** تسمية ثابتة بين الاستيرادات تعمل في
// البناء، وتترنّح في خادم التطوير حين لا يُرفع ترتيب التنفيذ كما هو.
const InsightSlot = lazy(() =>
  import("@/components/app/InsightSlot").then((module) => ({ default: module.InsightSlot })),
);

/**
 * PHASE 2A — الشاشة الأولى.
 *
 * الترتيب يجيب على أسئلة اليوم بالترتيب الذي يسألها المستخدم عن نفسه:
 * ما الوقت؟ → ما الصلاة القادمة؟ → ماذا أفعل الآن؟ → أين القرآن والأذكار؟ → كيف أمضي؟
 * ليست عمود بطاقات؛ كل قسم يحمل وزنًا مختلفًا ويشغل السطح الذي يستحقه.
 */

export type HomeSection =
  | "prayers"
  | "qibla"
  | "zakat"
  | "quran"
  | "duas"
  | "tasbih"
  | "hadith"
  | "poetry"
  | "occasions"
  | "adhkar"
  | "stats"
  | "weekly"
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
  onLogPrayer,
  dailyPlan,
  planOutcomes,
  dailyScore,
  lifeProgress,
  oudLine,
  oudXp,
  mosque,
  qibla,
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
    review: Omit<DayReviewRecord, "mood" | "blocker"> & { mood: string; blocker: string } | null;
  };
  stats?: WeekStats | null;
  onSaveReview: (review: DayReviewRecord) => void;
  reviewSaving: boolean;
  onOpenSection: (section: HomeSection) => void;
  onOpenAdhkar: (group: AdhkarGroupId) => void;
  onLogPrayer: (prayer: PrayerKey, status: PrayerStatus) => void;
  dailyPlan: DailyPlan | null;
  planOutcomes: readonly PlanItemOutcome[];
  dailyScore: DailyScore | null;
  lifeProgress: ProgressSummary | null;
  /** سطر الشخصية المحسوب من حالة اليوم، وقد لا يوجد سبب للكلام. */
  oudLine: OudLine | null;
  oudXp: { total: number; today: number; levelLabel: string };
  mosque: { state: MosqueState; places: readonly MosquePlace[] };
  qibla: { coords: QiblaPoint | null; denied: boolean };
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
  const todayKey = dateKey(now);
  const [lastSurah] = useState<number | null>(() => readSurahNumber());
  const [bookmark] = useState<{ surah: number; ayah: number } | null>(() => readBookmark());

  const nowLabel = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

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
  const planLineText = planLine({
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

  // الاقتراح التكيّفي لا يعلو على الخطة؛ يظهر عند وجود سبب حقيقي فقط.
  const actionable = adaptiveSuggestions.find(
    (item) => item.kind === "move" || item.kind === "reduce",
  );

  /**
   * أهم مهمة اليوم، وحالتها الحقيقية.
   *
   * **لماذا زرّ هنا ولا هناك:** كان العنوان أظهر خطوة في الشاشة كلها،
   * لكن بلا فعل: لا زرّ يفتحها ولا زرّ يسجّلها، فبقيت جملة. وخطر
   * التكرار: لو ضاعفنا البطاقة، صار اليوم لوحتين. فنُبقيها موضعها
   * ونجعلها **قابلة للتنفيذ بنقرة واحدة**، مع حالة «تمّت» صريحة.
   */
  const primaryItem = dailyPlan?.primaryAction ?? null;
  const primaryId = primaryItem?.item.id ?? null;
  const primaryDone =
    primaryId !== null &&
    planOutcomes.some((item) => item.date === todayKey && item.itemId === primaryId && item.status === "completed");

  return (
    <div className="stack">
      {/* ——— 1) الترويسة: صغيرة، تُخبر بالوقت والمكان ولا تنافس البطل ——— */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h1 className="label-display">
            {greeting(now)}
            {userName ? `، ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="label-meta mt-1 text-muted-foreground">
            {formatGregorian(now)}
            {hijri ? ` · ${hijri}` : ""}
          </p>
        </div>
        <p className="label-meta truncate text-muted-foreground">{locationLabel}</p>
      </header>

      {/* ——— 2) بطل الشاشة: الصلاة القادمة ——— */}
      <NextPrayerHero
        timings={timings}
        dayState={dayState}
        onOpenPrayers={() => onOpenSection("prayers")}
        onLogCurrent={onLogPrayer}
      />

      {/* ——— 2.5) عود: سطر واحد بعد الصلاة، وبطاقة المسجد تحته ——— */}
      <OudLineCard
        line={oudLine}
        xp={oudXp}
        onOpen={(view) => onOpenSection(view as HomeSection)}
      />
      <MosqueCard
        state={mosque.state}
        places={mosque.places}
        onOpenSettings={() => onOpenSection("settings")}
        onRetry={() => onOpenSection("settings")}
      />
      <QiblaCard
        coords={qibla.coords}
        denied={qibla.denied}
        onOpenSettings={() => onOpenSection("settings")}
        onOpenQibla={() => onOpenSection("qibla")}
      />

      {/* ——— 2.7) إحصاء اليوم: اقتباس واحد ثابت، لا شريط إعلانات ——— */}
      <Suspense fallback={null}>
        <InsightSlot area="today" onNavigate={(view) => onOpenSection(view as HomeSection)} />
      </Suspense>

      {/* ——— 3) خطة اليوم، مرتسية بالصلاة ——— */}
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

      {/* ——— 4) تركيزك اليوم: جملة واحدة، لا صندوق توصيات ——— */}
      <Panel className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="eyebrow flex items-center gap-1.5">
              <Target className="size-3.5" />
              أهم خطوة في يومك
            </p>
            <p className="mt-2 text-[17px] leading-9 font-bold text-foreground">
              {primaryItem?.item.title ??
                (profile.mainGoal === "quran"
                  ? `وردك: ${WIRD_LABEL[profile.quranAmount] ?? "صفحة واحدة"}`
                  : profile.mainGoal === "adhkar"
                    ? "أذكار الصباح والمساء"
                    : profile.mainGoal === "prayer"
                      ? "الصلاة في وقتها"
                      : "خطوة واحدة تُنجَز اليوم")}
            </p>
            <p className="label-body mt-1.5 text-muted-foreground">
              {dailyPlan?.nextAnchor.prompt ?? planLineText}
            </p>
            {primaryId ? (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {primaryDone ? (
                  <p className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-[var(--status-success)]/10 px-4 text-[12px] font-semibold text-[var(--status-success)]">
                    <Check className="size-4" aria-hidden />
                    تمّت الخطوة الأهم اليوم
                  </p>
                ) : (
                  <PrimaryButton
                    onClick={() => onSetPlanOutcome(primaryId, "completed")}
                    className="px-5 text-[12px]"
                  >
                    <Check className="size-3.5" aria-hidden />
                    عملتها
                  </PrimaryButton>
                )}
                <QuietButton onClick={() => onOpenSection("weekly")} className="px-4 text-[12px]">
                  الخطة الأسبوعية
                </QuietButton>
              </div>
            ) : null}
          </div>
          {dailyScore ? (
            <div className="shrink-0 text-end">
              <p className="text-2xl font-bold text-primary">{arabicNumber(dailyScore.score)}</p>
              <p className="label-meta text-muted-foreground">تقدم اليوم</p>
            </div>
          ) : null}
        </div>

        {actionable ? (
          <div className="mt-4 rounded-2xl surface-sunken p-3">
            <p className="text-[12px] font-semibold">اقتراح لتعديل الخطة</p>
            <p className="label-meta mt-1 leading-5 text-muted-foreground">{actionable.reason}</p>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <PrimaryButton
                onClick={() => onApplySuggestion(actionable)}
                disabled={applyingSuggestion}
                className="h-9 px-4 text-[12px]"
              >
                <Check className="size-3.5" />
                موافقتي وتطبيقه
              </PrimaryButton>
              <QuietButton onClick={() => onOpenSection("weekly")} className="h-9 px-4">
                الخطة الأسبوعية
              </QuietButton>
            </div>
          </div>
        ) : null}
      </Panel>

      {/* ——— 5) القرآن والأذكار: وصفتان لا بطاقتان ضخمتان ——— */}
      <section aria-labelledby="today-readings">
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onOpenSection("quran")}
            className="motion-press surface-primary flex items-start gap-3 rounded-3xl p-4 text-start sm:p-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <BookOpen className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-muted-foreground">القرآن</span>
              <span className="mt-0.5 block truncate text-[13px] font-semibold text-foreground">
                {positionLabel}
              </span>
              <span className="label-meta mt-0.5 block text-muted-foreground">
                {WIRD_LABEL[profile.quranAmount] ?? "صفحة واحدة"} · تابع من حيث توقفت
              </span>
            </span>
            <ChevronLeft className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </button>

          <button
            type="button"
            onClick={() => onOpenAdhkar("morning")}
            className="motion-press surface-primary flex items-start gap-3 rounded-3xl p-4 text-start sm:p-5"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sun className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-muted-foreground">أذكار الصباح</span>
              <span className="quran-text mt-0.5 line-clamp-2 block text-[13px] leading-7 text-foreground/90">
                {dailyDhikr.text}
              </span>
              <span className="label-meta mt-0.5 block truncate text-muted-foreground">
                {dayState.adhkar.includes("morning") ? "أتممته اليوم ✓" : dailyDhikr.source}
              </span>
            </span>
            <ChevronLeft className="mt-1 size-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </section>

      {/* ——— 6) الأذكار المتبقية: صف واحد مضغوط ——— */}
      <section aria-label="أذكار اليوم">
        <ul className="grid grid-cols-3 gap-2">
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
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onOpenAdhkar(item.id)}
                  className={cn(
                    "motion-press surface-secondary flex min-h-[76px] w-full flex-col items-center justify-center gap-1 rounded-2xl p-2",
                    done && "bg-[var(--status-success)]/8",
                  )}
                >
                  <item.icon
                    className={cn("size-[18px]", done ? "text-[var(--status-success)]" : "text-primary")}
                  />
                  <span className="text-[11px] font-semibold">أذكار {item.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {done ? "تمّت ✓" : `${arabicNumber(group?.items.length ?? 0)} ذكرًا`}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {/* ——— 7) مراجعة اليوم: طقس صغير لا استبيان ——— */}
      <DailyReview
        visible={Boolean(review) || reviewDue(now, { dayEnd: profile.dayEnd })}
        review={review}
        prayedToday={prayedCount}
        saving={reviewSaving}
        onSave={onSaveReview}
      />

      {/* ——— 8) تقدّم الأسبوع: أرقام مختصرة لا عشر بطاقات إحصاء ——— */}
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

      {/* ——— 9) اقتراح تكيّفي أسبوعي: سطر واحد ——— */}
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

      <p className="px-2 text-center text-[11px] leading-6 text-muted-foreground">{planLineText}</p>
    </div>
  );
}
