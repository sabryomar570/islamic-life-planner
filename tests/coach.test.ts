import { describe, expect, test } from "bun:test";
import {
  dayPeriod,
  focusMetric,
  planLine,
  reviewDue,
} from "../src/lib/coach";

describe("daily loop", () => {
  test("dayPeriod respects the user's wake and sleep boundaries", () => {
    expect(dayPeriod(new Date(2026, 0, 1, 5, 30), { wakeTime: "06:00", sleepTime: "23:00" })).toBe("night");
    expect(dayPeriod(new Date(2026, 0, 1, 8, 0), { wakeTime: "06:00", sleepTime: "23:00" })).toBe("morning");
    expect(dayPeriod(new Date(2026, 0, 1, 17, 0), { wakeTime: "06:00", sleepTime: "23:00" })).toBe("evening");
  });

  test("reviewDue respects a later user day end", () => {
    const now = new Date(2026, 0, 1, 18, 0);
    expect(reviewDue(now, { dayEnd: "20:00" })).toBe(false);
    expect(reviewDue(new Date(2026, 0, 1, 20, 0), { dayEnd: "20:00" })).toBe(true);
    expect(reviewDue(new Date(2026, 0, 1, 16, 30), { dayEnd: "15:00" })).toBe(true);
  });

  test("focusMetric uses only the latest seven days", () => {
    const daily = Array.from({ length: 10 }, (_, index) => ({
      date: `2026-01-${String(index + 1).padStart(2, "0")}`,
      done: index < 3 ? 5 : index % 2,
      logged: index % 2,
      adhkar: index % 2,
      reviewed: false,
    }));
    const metric = focusMetric("prayer", daily);
    expect(metric.done).toBe(13);
    expect(metric.total).toBe(35);
    expect(metric.pct).toBe(37);
  });

  test("planLine reflects the saved life context without inventing a schedule", () => {
    const line = planLine({
      dayRhythm: "study",
      focusTime: "08:30",
      movement: "walk",
      eveningReset: "reflection",
      startingRitual: "adhkar",
    });
    expect(line).toContain("دراسة");
    expect(line).toContain("أذكار الصباح");
    expect(line).toContain("٨:٣٠");
    expect(line).toContain("مشي خفيف");
    expect(line).toContain("مراجعة اليوم");
  });
});
