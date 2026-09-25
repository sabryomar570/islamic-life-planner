import { describe, expect, test } from "bun:test";
import {
  DEFAULT_ANSWERS,
  ESSENTIAL_ANSWER_KEYS,
  OPTIONAL_ANSWER_KEYS,
  pickAnswers,
  questionFor,
} from "../src/data/questions";
import { dayPeriod, focusMetric, planLine, reviewDue } from "../src/lib/coach";

describe("progressive profile", () => {
  test("keeps seven essential answers and defers eight useful refinements", () => {
    expect(ESSENTIAL_ANSWER_KEYS).toHaveLength(7);
    expect(OPTIONAL_ANSWER_KEYS).toHaveLength(8);
    expect(ESSENTIAL_ANSWER_KEYS.every((key) => questionFor(key))).toBe(true);
  });

  test("fills safe defaults without overwriting saved values", () => {
    const answers = pickAnswers({
      wakeTime: "05:30",
      mainGoal: "quran",
      weeklyFocus: "adhkar",
    });

    expect(answers.wakeTime).toBe("05:30");
    expect(answers.mainGoal).toBe("quran");
    expect(answers.weeklyFocus).toBe("adhkar");
    expect(answers.sleepTime).toBe(DEFAULT_ANSWERS.sleepTime);
  });
});

describe("daily loop", () => {
  test("uses the user's day boundaries for period and review timing", () => {
    const morning = new Date("2026-09-25T07:00:00");
    const night = new Date("2026-09-25T23:30:00");

    expect(dayPeriod(morning, { wakeTime: "06:00", sleepTime: "23:00" })).toBe("morning");
    expect(dayPeriod(night, { wakeTime: "06:00", sleepTime: "23:00" })).toBe("night");
    expect(reviewDue(new Date("2026-09-25T18:00:00"), { dayEnd: "17:00" })).toBe(true);
    expect(reviewDue(new Date("2026-09-25T15:00:00"), { dayEnd: "17:00" })).toBe(false);
  });

  test("keeps the plan human-readable and calculates weekly focus from records", () => {
    const plan = planLine({
      dayRhythm: "work",
      focusTime: "08:30",
      movement: "walk",
      eveningReset: "calm",
      startingRitual: "adhkar",
    });

    expect(plan).toContain("عمل");
    expect(plan).toContain("أذكار الصباح");
    expect(plan).toContain("قبل النوم");

    const metric = focusMetric("prayer", [
      { date: "2026-09-21", done: 4, logged: 5, adhkar: 1, reviewed: false },
      { date: "2026-09-22", done: 5, logged: 5, adhkar: 1, reviewed: true },
    ]);
    expect(metric.done).toBe(9);
    expect(metric.total).toBe(10);
    expect(metric.pct).toBe(90);
  });
});
