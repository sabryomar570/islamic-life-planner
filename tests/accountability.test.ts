import { describe, expect, test } from "bun:test";
import {
  calculateDailyScore,
  isValidPostponedDate,
  mergePrayerOutcomes,
  upsertPlanOutcome,
  type PlanItemOutcome,
} from "../src/lib/accountability";
import { buildDailyPlan, type DailyPlanItem } from "../src/lib/daily-plan";
import { pickAnswers } from "../src/data/questions";
import { buildLifeModel } from "../src/lib/life-model";
import type { Timings } from "../src/lib/prayers";
import { generateWeeklyPlan } from "../src/lib/weekly-plan";

const TIMINGS: Timings = {
  fajr: "05:12",
  sunrise: "06:31",
  dhuhr: "12:04",
  asr: "15:22",
  maghrib: "18:07",
  isha: "19:26",
};
const MODEL = buildLifeModel(
  pickAnswers({
    wakeTime: "06:00",
    sleepTime: "23:00",
    prayerCommitment: "most",
    mostMissedPrayer: "fajr",
    quranAmount: "page",
    mainGoal: "quran",
    startingRitual: "wird",
    dayRhythm: "study",
    focusTime: "08:30",
    workStart: "09:00",
    workEnd: "15:00",
    restTime: "12:30",
    commitment: "إنهاء ملخص المشروع",
  }),
);
const WEEK = generateWeeklyPlan({ model: MODEL, weekStart: "2026-09-21" });
const DAILY = buildDailyPlan({
  plan: WEEK,
  date: "2026-09-21",
  timings: TIMINGS,
  now: new Date(2026, 8, 21, 20, 0),
});

function outcome(
  itemId: string,
  status: PlanItemOutcome["status"],
  extra: Partial<PlanItemOutcome> = {},
): PlanItemOutcome {
  return {
    date: "2026-09-21",
    itemId,
    weekStart: "2026-09-21",
    status,
    postponedTo: null,
    reason: "",
    createdAt: 1,
    updatedAt: 1,
    ...extra,
  };
}

function item(kind: string, importance: "foundation" | "core" | "supporting" | "optional", id = kind): DailyPlanItem {
  const source = WEEK.items.find((candidate) => candidate.kind === kind)!;
  return {
    item: { ...source, id, importance },
    band: "primary",
  };
}

describe("Plan outcomes", () => {
  test("completion and duplicate clicks converge to one unchanged record", () => {
    const first = upsertPlanOutcome(null, {
      date: "2026-09-21",
      itemId: "2026-09-21:focus",
      weekStart: "2026-09-21",
      status: "completed",
      now: 100,
    });
    expect(first.changed).toBe(true);
    const repeated = upsertPlanOutcome(first.outcome, {
      date: "2026-09-21",
      itemId: "2026-09-21:focus",
      weekStart: "2026-09-21",
      status: "completed",
      now: 200,
    });
    expect(repeated.changed).toBe(false);
    expect(repeated.outcome.updatedAt).toBe(100);
  });

  test("partial and postponed remain first-class states with a clean reason", () => {
    const partial = upsertPlanOutcome(null, {
      date: "2026-09-21",
      itemId: "2026-09-21:work",
      weekStart: "2026-09-21",
      status: "partial",
      reason: "  أنهيت القسم الأول  ",
      now: 100,
    });
    expect(partial.outcome.status).toBe("partial");
    expect(partial.outcome.reason).toBe("أنهيت القسم الأول");

    const postponed = upsertPlanOutcome(null, {
      date: "2026-09-21",
      itemId: "2026-09-21:quran",
      weekStart: "2026-09-21",
      status: "postponed",
      postponedTo: "2026-09-22",
      now: 100,
    });
    expect(postponed.outcome.postponedTo).toBe("2026-09-22");
  });

  test("only a later valid date can be a postponement target", () => {
    expect(isValidPostponedDate("2026-09-21", "2026-09-22")).toBe(true);
    expect(isValidPostponedDate("2026-09-21", "2026-09-21")).toBe(false);
    expect(isValidPostponedDate("2026-09-21", "bad-date")).toBe(false);
  });
});

describe("Daily Score", () => {
  test("weights importance and keeps a human, explainable progress score", () => {
    const completed = DAILY.sections
      .flatMap((section) => section.items)
      .find((entry) => entry.item.kind === "commitment")!;
    const work = DAILY.sections
      .flatMap((section) => section.items)
      .find((entry) => entry.item.kind === "work")!;
    const result = calculateDailyScore({
      items: DAILY.sections.flatMap((section) => section.items),
      outcomes: [
        outcome(completed.item.id, "completed"),
        outcome(work.item.id, "postponed", { postponedTo: "2026-09-22" }),
      ],
      closed: true,
      previousAverage: 0,
    });

    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
    expect(result.completed).toBe(1);
    expect(result.postponed).toBe(1);
    expect(result.breakdown.length).toBeGreaterThan(0);
    expect(result.explanation.join(" ")).toContain("ليست تقييمًا لقيمتك كإنسان");
    expect(result.comparison).toBe("above-baseline");
  });

  test("does not punish unfinished future steps before the day closes", () => {
    const one = item("focus", "core", "focus");
    const future = item("work", "core", "future-work");
    const open = calculateDailyScore({
      items: [one, future],
      outcomes: [outcome(one.item.id, "completed")],
      closed: false,
    });
    const closed = calculateDailyScore({
      items: [one, future],
      outcomes: [outcome(one.item.id, "completed")],
      closed: true,
    });
    expect(open.score).toBe(100);
    expect(closed.score).toBe(50);
    expect(open.missing).toBe(0);
    expect(closed.missing).toBe(1);
  });

  test("a completed optional item cannot outweigh a missing foundation item", () => {
    const foundation = item("prayer", "foundation", "foundation");
    const optional = item("movement", "optional", "optional");
    const result = calculateDailyScore({
      items: [foundation, optional],
      outcomes: [outcome(optional.item.id, "completed")],
      closed: true,
    });
    expect(result.score).toBe(20);
    expect(result.missing).toBe(1);
  });

  test("merges existing prayer logs without creating fake records for unlogged prayers", () => {
    const items = DAILY.sections
      .flatMap((section) => section.items)
      .filter((entry) => entry.item.kind === "prayer");
    const merged = mergePrayerOutcomes(items, [], {
      fajr: "ontime",
      dhuhr: "late",
      asr: "missed",
    });
    expect(merged).toHaveLength(3);
    expect(merged.find((entry) => entry.itemId.endsWith(":fajr"))?.status).toBe("completed");
    expect(merged.find((entry) => entry.itemId.endsWith(":dhuhr"))?.status).toBe("partial");
    expect(merged.find((entry) => entry.itemId.endsWith(":asr"))?.status).toBe("skipped");
    expect(merged.some((entry) => entry.itemId.endsWith(":maghrib"))).toBe(false);
  });
});
