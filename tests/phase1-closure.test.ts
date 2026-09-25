/**
 * PHASE 1 CLOSURE — اختبارات تغلق الفجوات التي وجدها تدقيق الحلقة:
 * مصدر واحد للصلاة، اشتقاق الأسبوع من العنصر، ونتائج الأيام السابقة.
 */
import { describe, expect, test } from "bun:test";
import {
  calculateDailyScore,
  mergePrayerLogsIntoOutcomes,
  mergePrayerOutcomes,
  type PlanItemOutcome,
} from "../src/lib/accountability";
import { buildDailyPlan, buildDayItems } from "../src/lib/daily-plan";
import { startOfWeekKey, weekStartOfDateKey } from "../src/lib/time";
import {
  generateWeeklyPlan,
  planItemWeekStart,
  type WeeklyPlanItem,
} from "../src/lib/weekly-plan";
import { buildProgressSummary } from "../src/lib/progress";
import { buildLifeModel } from "../src/lib/life-model";
import { pickAnswers } from "../src/data/questions";

const WEEK = "2026-09-21"; // الاثنين
const TIMINGS = {
  fajr: "05:10",
  sunrise: "06:30",
  dhuhr: "12:40",
  asr: "16:05",
  maghrib: "19:20",
  isha: "20:45",
} as const;

function outcome(partial: Partial<PlanItemOutcome> & { itemId: string }): PlanItemOutcome {
  return {
    date: "2026-09-21",
    weekStart: WEEK,
    status: "completed",
    postponedTo: null,
    reason: "",
    createdAt: 1,
    updatedAt: 1,
    ...partial,
  };
}

describe("week arithmetic is identical on client and server", () => {
  test("weekStartOfDateKey lands on Monday for every weekday", () => {
    for (let offset = 0; offset < 7; offset += 1) {
      const date = new Date(`${WEEK}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + offset);
      const key = date.toISOString().slice(0, 10);
      expect(weekStartOfDateKey(key)).toBe(WEEK);
    }
  });

  test("local startOfWeekKey agrees with the UTC helper for the same calendar date", () => {
    for (let offset = 0; offset < 21; offset += 1) {
      const key = weekStartOfDateKey(shift(WEEK, offset));
      // نفس تاريخ التقويم يُنظر عبر المنطقة الزمنية المحلية أو UTC.
      expect(startOfWeekKey(new Date(`${key}T00:00:00`))).toBe(key);
    }
  });

  test("a plan item carries its own week, so a browsed week cannot reject it", () => {
    const nextWeek = shift(WEEK, 7);
    expect(planItemWeekStart(`${nextWeek}:prayer:fajr`)).toBe(nextWeek);
    expect(planItemWeekStart(`${WEEK}:focus`)).toBe(WEEK);
    expect(planItemWeekStart("not-a-plan-item")).toBeUndefined();
  });
});

function shift(dateKey: string, days: number) {
  const value = new Date(`${dateKey}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

describe("prayer outcomes have one source of truth", () => {
  const prayerItems: WeeklyPlanItem[] = [
    {
      id: `${WEEK}:prayer:fajr`,
      date: WEEK,
      day: 0,
      kind: "prayer",
      title: "صلاة الفجر",
      importance: "foundation",
      recurrence: "daily",
      origin: "prayer-times",
      enabled: true,
      prayerAnchor: "fajr",
    },
    {
      id: `${WEEK}:prayer:isha`,
      date: WEEK,
      day: 0,
      kind: "prayer",
      title: "صلاة العشاء",
      importance: "foundation",
      recurrence: "daily",
      origin: "prayer-times",
      enabled: true,
      prayerAnchor: "isha",
    },
  ];

  test("a prayer log decides the prayer item even when nothing was written to the plan", () => {
    const merged = mergePrayerLogsIntoOutcomes({
      items: prayerItems,
      outcomes: [],
      prayerLogs: [{ date: WEEK, prayer: "fajr", status: "jamaah", updatedAt: 10 }],
    });
    expect(merged).toHaveLength(1);
    expect(merged[0]).toMatchObject({ itemId: `${WEEK}:prayer:fajr`, status: "completed", weekStart: WEEK });
  });

  test("the finer prayer log wins over a coarser plan mark", () => {
    const merged = mergePrayerLogsIntoOutcomes({
      items: prayerItems,
      outcomes: [outcome({ itemId: `${WEEK}:prayer:fajr`, status: "skipped" })],
      prayerLogs: [{ date: WEEK, prayer: "fajr", status: "late", updatedAt: 20 }],
    });
    expect(merged[0].status).toBe("partial");
  });

  test("an explicit postponement survives, because a prayer log cannot express it", () => {
    const merged = mergePrayerLogsIntoOutcomes({
      items: prayerItems,
      outcomes: [
        outcome({ itemId: `${WEEK}:prayer:fajr`, status: "postponed", postponedTo: shift(WEEK, 1) }),
      ],
      prayerLogs: [{ date: WEEK, prayer: "fajr", status: "jamaah", updatedAt: 30 }],
    });
    expect(merged[0].status).toBe("postponed");
  });

  test("no log means no invented outcome", () => {
    const merged = mergePrayerLogsIntoOutcomes({
      items: prayerItems,
      outcomes: [],
      prayerLogs: [{ date: shift(WEEK, 1), prayer: "fajr", status: "jamaah", updatedAt: 5 }],
    });
    expect(merged).toHaveLength(0);
  });

  test("the latest log of the day wins when a status is corrected", () => {
    const merged = mergePrayerLogsIntoOutcomes({
      items: prayerItems,
      outcomes: [],
      prayerLogs: [
        { date: WEEK, prayer: "isha", status: "missed", updatedAt: 1 },
        { date: WEEK, prayer: "isha", status: "ontime", updatedAt: 99 },
      ],
    });
    expect(merged[0].status).toBe("completed");
  });

  test("the client wrapper delegates to the same rule", () => {
    const plan = buildDailyPlan({ plan: { weekStart: WEEK, timezone: "local", weeklyFocus: "prayer", items: prayerItems }, date: WEEK, timings: TIMINGS });
    const merged = mergePrayerOutcomes(
      plan.sections.flatMap((section) => section.items),
      [],
      { fajr: "jamaah" },
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].status).toBe("completed");
    expect(merged[0].weekStart).toBe(WEEK);
  });
});

describe("server-side day scores use the same function as the live score", () => {
  const answers = {
    wakeTime: "05:30",
    sleepTime: "23:00",
    prayerCommitment: "ontime",
    mostMissedPrayer: "asr",
    quranAmount: "page",
    mainGoal: "quran",
    startingRitual: "adhkar",
    dayRhythm: "work",
    focusTime: "09:00",
    weeklyFocus: "prayer",
  };
  const plan = generateWeeklyPlan({
    model: buildLifeModel(pickAnswers(answers)),
    weekStart: WEEK,
    timezone: "local",
  });

  test("buildDayItems without timings yields the same items and bands", () => {
    const daily = buildDailyPlan({ plan, date: WEEK, timings: TIMINGS });
    const bands = (entries: readonly { item: WeeklyPlanItem; band: string }[]) =>
      entries.map((entry) => `${entry.item.id}:${entry.band}`).sort();
    expect(bands(buildDayItems(plan.items, WEEK))).toEqual(
      bands(daily.sections.flatMap((section) => section.items)),
    );
  });

  test("a day with nothing logged scores zero but is not absent", () => {
    const items = buildDayItems(plan.items, WEEK);
    const score = calculateDailyScore({ items, outcomes: [], closed: true });
    expect(items.length).toBeGreaterThan(0);
    expect(score.score).toBe(0);
    expect(score.missing).toBe(items.length);
    expect(score.meaning).toBe("daily-progress-only");
  });

  test("logged prayers move the score, so a past day is comparable to today", () => {
    const items = buildDayItems(plan.items, WEEK);
    const bare = calculateDailyScore({ items, outcomes: [], closed: true }).score;
    const withPrayers = calculateDailyScore({
      items,
      outcomes: mergePrayerLogsIntoOutcomes({
        items: items.map((entry) => entry.item),
        outcomes: [],
        prayerLogs: [
          { date: WEEK, prayer: "fajr", status: "jamaah" },
          { date: WEEK, prayer: "dhuhr", status: "ontime" },
          { date: WEEK, prayer: "asr", status: "late" },
          { date: WEEK, prayer: "maghrib", status: "ontime" },
          { date: WEEK, prayer: "isha", status: "ontime" },
        ],
      }),
      closed: true,
    }).score;
    expect(withPrayers).toBeGreaterThan(bare);
  });

  test("streaks and week-over-week change need real per-day scores", () => {
    const days = [
      { date: shift(WEEK, 0), score: 40, completed: 2, partial: 0, postponed: 0, skipped: 1, reviewed: true },
      { date: shift(WEEK, 1), score: 80, completed: 6, partial: 0, postponed: 0, skipped: 0, reviewed: true },
    ];
    const previous = [
      { date: shift(WEEK, -6), score: 20, completed: 1, partial: 0, postponed: 0, skipped: 2, reviewed: false },
      { date: shift(WEEK, -5), score: 30, completed: 1, partial: 0, postponed: 0, skipped: 1, reviewed: false },
    ];
    const summary = buildProgressSummary(days, previous);
    expect(summary.currentStreak).toBe(2);
    expect(summary.weekly.averageScore).toBe(60);
    expect(summary.weekly.changeFromPrevious).toBe(35);
  });
});
