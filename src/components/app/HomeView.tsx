import { lazy, Suspense } from "react";
import { Check, Target } from "lucide-react";

import { LIBRARY_GROUPS, type DashView } from "@/components/app/Navigation";
import { MosqueCard } from "@/components/app/MosqueCard";
import { NextPrayerHero } from "@/components/app/NextPrayerHero";
import { OudLineCard } from "@/components/app/OudLineCard";
import { QiblaCard } from "@/components/app/QiblaView";
import { Panel, PrimaryButton, QuietButton } from "@/components/app/Surfaces";
import type { ProfileAnswers } from "@/data/questions";
import { useNow } from "@/hooks/use-clock";
import type { MosqueState } from "@/hooks/use-oud";
import type { PlanItemOutcome, PlanItemStatus, DailyScore } from "@/lib/accountability";
import type { AdaptiveSuggestion } from "@/lib/adaptive-planning";
import type { DailyPlan } from "@/lib/daily-plan";
import type { MosquePlace } from "@/lib/oud-mosque";
import type { OudLine } from "@/lib/oud-voice";
import type { QiblaPoint } from "@/lib/qibla";
import { PRAYERS, type PrayerKey, type PrayerStatus, type Timings } from "@/lib/prayers";
import { arabicNumber, dateKey, formatGregorian, greeting } from "@/lib/time";

/**
 * «الرئيسية» — أين أنا الآن، وما أهم خطوة دلوقتي.
 *
 * **الترتيب الهرمي المعتمد:** الصلاة (أكبر عنصر) ← سطر عود ← **خطوة
 * واحدة بارزة** ← ثم الباقي: المسجد والقبلة والاقتباس والوصول السريع.
 *
 * **لماذا اقتُطع كل هذا من هنا:** كانت الخطة اليومية والمراجعة
 * والإحصاءات والقرآن والأذكار مكتوبة كلها في هذه الشاشة، فصارت «أين
 * أنا» و«كيف يسير يومي» في مكان واحد. نُقلت الخطة والمراجعة
 * والإحصاءات إلى منطقة «يومي»، والخدمات إلى «عبادتي». لم يُحذف منطق
 * ولا استعلام ولا نص: الشاشة أضيق لأن سؤالها واحد.
 *
 * **بلا نصوص جديدة:** أسماء الخدمات وأوصاف الوصول السريع مأخوذة من
 * `LIBRARY_GROUPS`، وهو مصدر واحد لاسم كل خدمة ووصفها.
 */

/** الاقتباس كسول: شريط واحد صغير لا يستحق أن يكون في الحزمة الأولى. */
const InsightSlot = lazy(() =>
  import("@/components/app/InsightSlot").then((module) => ({ default: module.InsightSlot })),
);

type HomeSection =
  | "prayers"
  | "qibla"
  | "settings"
  | "quran"
  | "adhkar"
  | "tasbih"
  | "zakat"
  | "weekly"
  | "stats"
  | "review"
  | "chat";

/** الوصول السريع: نفس أسماء ووصف الخدمات في «عبادتي». */
const WORSHIP = LIBRARY_GROUPS[0].entries;
const QUICK_KEYS: DashView[] = ["quran", "adhkar", "qibla", "tasbih"];

export function HomeView({
  userName,
  profile,
  locationLabel,
  timings,
  hijri,
  dayState,
  oudLine,
  oudXp,
  mosque,
  qibla,
  onOpenSection,
  onOpenAdhkar,
  onLogPrayer,
  dailyPlan,
  planOutcomes,
  dailyScore,
  adaptiveSuggestions,
  savingItemId,
  applyingSuggestion,
  onSetPlanOutcome,
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
    review: unknown;
  };
  oudLine: OudLine | null;
  oudXp: { total: number; today: number; levelLabel: string };
  mosque: { state: MosqueState; places: readonly MosquePlace[] };
  qibla: { coords: QiblaPoint | null; denied: boolean };
  onOpenSection: (section: HomeSection) => void;
  onOpenAdhkar: (group: "morning" | "evening" | "sleep") => void;
  onLogPrayer: (prayer: PrayerKey, status: PrayerStatus) => void;
  dailyPlan: DailyPlan | null;
  planOutcomes: readonly PlanItemOutcome[];
  dailyScore: DailyScore | null;
  adaptiveSuggestions: readonly AdaptiveSuggestion[];
  savingItemId: string | null;
  applyingSuggestion: boolean;
  onSetPlanOutcome: (itemId: string, status: PlanItemStatus) => void;
  onApplySuggestion: (suggestion: AdaptiveSuggestion) => void;
}) {
  const now = useNow(30_000);
  const todayKey = dateKey(now);

  const prayedCount = PRAYERS.filter(
    (prayer) => dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  // الاقتراح التكيّفي لا يعلو على الخطة؛ يظهر عند وجود سبب حقيقي فقط.
  const actionable = adaptiveSuggestions.find(
    (item) => item.kind === "move" || item.kind === "reduce",
  );

  /**
   * أهم مهمة اليوم، وحالتها الحقيقية.
   *
   * العنوان كان أظهر خطوة في الشاشة كلها لكن بلا فعل: لا زرّ يفتحها ولا
   * زرّ يسجّلها، فبقيت جملة. فبقيت موضعها **بعد الصلاة مباشرة** —
   * كما هو الترتيب الهرمي المعتمد — وصارت قابلة للتنفيذ بنقرة واحدة،
   * مع حالة «تمّت» صريحة.
   */
  const primaryItem = dailyPlan?.primaryAction ?? null;
  const primaryId = primaryItem?.item.id ?? null;
  const primaryDone =
    primaryId !== null &&
    planOutcomes.some((item) => item.date === todayKey && item.itemId === primaryId && item.status === "completed");

  const quick = QUICK_KEYS.map((key) => WORSHIP.find((entry) => entry.key === key)).filter(
    (entry): entry is (typeof WORSHIP)[number] => Boolean(entry),
  );

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

      {/* ——— 3) سطر عود: تحت البطل مباشرة، ولا يعلو عليه ——— */}
      <OudLineCard
        line={oudLine}
        xp={oudXp}
        onOpen={(view) => onOpenSection(view as HomeSection)}
      />

      {/* ——— 4) الخطوة الأهم: عنصر واحد بارز، لا ثلاث بطاقات متساوية ——— */}
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
                  ? "وردك اليوم"
                  : profile.mainGoal === "adhkar"
                    ? "أذكار الصباح والمساء"
                    : profile.mainGoal === "prayer"
                      ? "الصلاة في وقتها"
                      : "خطوة واحدة تُنجَز اليوم")}
            </p>
            <p className="label-body mt-1.5 text-muted-foreground">
              {dailyPlan?.nextAnchor.prompt ?? ""}
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
              <p className="label-meta mt-1 text-muted-foreground">
                {arabicNumber(prayedCount)} من {arabicNumber(PRAYERS.length)}
              </p>
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

      {/* ——— 5) السياق القريب: المسجد والقبلة ——— */}
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

      {/* اقتباس واحد ثابت، لا شريط إعلانات. */}
      <Suspense fallback={null}>
        <InsightSlot area="today" onNavigate={(view) => onOpenSection(view as HomeSection)} />
      </Suspense>

      {/* ——— 6) وصول سريع: أربع خدمات، أوزان متساوية لا هيمنة ——— */}
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {quick.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              onClick={() => {
                if (entry.key === "adhkar") onOpenAdhkar("morning");
                else onOpenSection(entry.key as HomeSection);
              }}
              className="motion-press surface-secondary flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2"
            >
              <entry.icon className="size-5 shrink-0 text-primary" aria-hidden />
              <span className="truncate text-[12px] font-semibold">{entry.label}</span>
              <span className="truncate text-[11px] text-muted-foreground">{entry.hint}</span>
            </button>
          </li>
        ))}
      </ul>

      <p className="sr-only">{savingItemId ? "جارٍ الحفظ" : ""}</p>
    </div>
  );
}
