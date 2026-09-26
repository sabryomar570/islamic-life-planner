import { lazy, Suspense } from "react";
import { Check, Target } from "lucide-react";

import { NextPrayerHero } from "@/components/app/NextPrayerHero";
import { OudLineCard } from "@/components/app/OudLineCard";
import { MosqueCard } from "@/components/app/MosqueCard";
import { QiblaCard } from "@/components/app/QiblaView";
import {
  ActionButton,
  ElevatedCard,
  IconTile,
  ProgressRing,
  SectionHeader,
  SecondaryButton,
} from "@/components/oud/primitives";
import { LIBRARY_GROUPS, type DashView } from "@/components/app/Navigation";
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
 * «الرئيسية» — the only question on the home screen is *what matters now*.
 *
 * **The order is the design.** Prayer is the single Level 3 element on
 * this screen. Everything after it steps down the ladder, one level per
 * step, and nothing is allowed to compete:
 *
 *   1  prayer hero          level 3
 *   2  the line from Oud    level 2, one sentence
 *   3  one important action level 2, the only other thing that gets a button
 *   4  quick access         level 1, quiet, no buttons inside
 *
 * There is no second hero. The mosque, the qibla, the plan and the task
 * are not four cards competing to be read first; they are one hero and
 * three supporting layers.
 *
 * **No new copy here.** Service names and hints come from `LIBRARY_GROUPS`.
 * The greeting, the day score label and the action label are strings that
 * already existed in the product.
 */

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
  | "chat";

/** Quick access names and hints come from the same source as «عبادتي». */
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
  applyingSuggestion: boolean;
  onSetPlanOutcome: (itemId: string, status: PlanItemStatus) => void;
  onApplySuggestion: (suggestion: AdaptiveSuggestion) => void;
}) {
  const now = useNow(30_000);
  const todayKey = dateKey(now);

  const prayedCount = PRAYERS.filter(
    (prayer) => dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  const actionable = adaptiveSuggestions.find(
    (item) => item.kind === "move" || item.kind === "reduce",
  );

  /**
   * The one action. It is the only thing on this screen with a filled
   * button, because a second filled button would be a second hero.
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
    <div className="flex flex-col gap-4">
      {/* 0 — a quiet line of orientation. Not a card: it must not compete. */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1 px-1">
        <div className="min-w-0">
          <h1 className="text-[22px] leading-8 font-bold text-foreground">
            {greeting(now)}
            {userName ? `، ${userName.split(" ")[0]}` : ""}
          </h1>
          <p className="label-meta mt-0.5 text-muted-foreground">
            {formatGregorian(now)}
            {hijri ? ` · ${hijri}` : ""}
          </p>
        </div>
        <p className="label-meta truncate text-muted-foreground">{locationLabel}</p>
      </header>

      {/* 1 — the hero. One per screen. */}
      <NextPrayerHero
        timings={timings}
        dayState={dayState}
        onOpenPrayers={() => onOpenSection("prayers")}
        onLogCurrent={onLogPrayer}
      />

      {/* 2 — Oud, one line, immediately under the prayer. */}
      <OudLineCard
        line={oudLine}
        xp={oudXp}
        onOpen={(view) => onOpenSection(view as HomeSection)}
      />

      {/* 3 — the one important action. */}
      <ElevatedCard className="p-5">
        <div className="flex items-start gap-4">
          <IconTile icon={Target} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="label-meta text-muted-foreground">أهم خطوة في يومك</p>
            <p className="mt-1 text-[18px] leading-8 font-bold text-foreground">
              {primaryItem?.item.title ??
                (profile.mainGoal === "quran"
                  ? "وردك اليوم"
                  : profile.mainGoal === "adhkar"
                    ? "أذكار الصباح والمساء"
                    : profile.mainGoal === "prayer"
                      ? "الصلاة في وقتها"
                      : "خطوة واحدة تُنجَز اليوم")}
            </p>
            {dailyPlan?.nextAnchor.prompt ? (
              <p className="label-body mt-1 text-muted-foreground">{dailyPlan.nextAnchor.prompt}</p>
            ) : null}

            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              {primaryId ? (
                primaryDone ? (
                  <span className="inline-flex oud-tap items-center gap-1.5 rounded-full bg-[var(--status-success)]/12 px-4 text-[13px] font-semibold text-[var(--status-success)]">
                    <Check className="size-4" aria-hidden />
                    تمّت الخطوة الأهم اليوم
                  </span>
                ) : (
                  <ActionButton
                    icon={Check}
                    onClick={() => onSetPlanOutcome(primaryId, "completed")}
                    className="px-5"
                  >
                    عملتها
                  </ActionButton>
                )
              ) : null}
              <SecondaryButton onClick={() => onOpenSection("weekly")} className="px-4">
                الخطة الأسبوعية
              </SecondaryButton>
            </div>
          </div>

          {dailyScore ? (
            <div className="flex shrink-0 flex-col items-center gap-1.5">
              <ProgressRing value={dailyScore.score} size={72} stroke={7} label="تقدم اليوم">
                <span className="text-[19px] leading-none font-bold text-primary">
                  {arabicNumber(dailyScore.score)}
                </span>
              </ProgressRing>
              <p className="label-meta text-muted-foreground">تقدم اليوم</p>
              <p className="label-meta text-muted-foreground">
                {arabicNumber(prayedCount)} من {arabicNumber(PRAYERS.length)}
              </p>
            </div>
          ) : null}
        </div>

        {actionable ? (
          <div className="oud-sunken mt-4 flex flex-wrap items-center justify-between gap-3 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold">اقتراح لتعديل الخطة</p>
              <p className="label-meta mt-0.5 text-muted-foreground">{actionable.reason}</p>
            </div>
            <ActionButton
              icon={Check}
              onClick={() => onApplySuggestion(actionable)}
              disabled={applyingSuggestion}
              className="px-4 text-[13px]"
            >
              موافقتي وتطبيقه
            </ActionButton>
          </div>
        ) : null}
      </ElevatedCard>

      {/* 4 — supporting context. Quiet by construction. */}
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

      <Suspense fallback={null}>
        <InsightSlot area="today" onNavigate={(view) => onOpenSection(view as HomeSection)} />
      </Suspense>

      {/* 5 — quick access. Four tiles, equal weight, no button inside. */}
      <section aria-label="وصول سريع" className="flex flex-col gap-3">
        <SectionHeader title="وصول سريع" />
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {quick.map((entry) => (
            <li key={entry.key}>
              <button
                type="button"
                onClick={() => {
                  if (entry.key === "adhkar") onOpenAdhkar("morning");
                  else onOpenSection(entry.key as HomeSection);
                }}
                className="oud-press oud-card oud-tap flex w-full flex-col items-center gap-2 rounded-3xl px-3 py-4"
              >
                <IconTile icon={entry.icon} size="md" />
                <span className="truncate text-[13px] font-semibold text-foreground">{entry.label}</span>
                <span className="truncate text-[11px] text-muted-foreground">{entry.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
