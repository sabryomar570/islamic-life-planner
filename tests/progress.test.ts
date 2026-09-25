import { describe, expect, test } from "bun:test";
import {
  buildProgressSummary,
  calculateAchievements,
  calculateStreaks,
  calculateWeeklyProgress,
  type ProgressDay,
} from "../src/lib/progress";

function day(
  date: string,
  completed: number,
  score: number | null = completed > 0 ? 80 : 0,
  extra: Partial<ProgressDay> = {},
): ProgressDay {
  return {
    date,
    score,
    completed,
    partial: 0,
    postponed: 0,
    skipped: 0,
    reviewed: false,
    ...extra,
  };
}

describe("Streaks and weekly progress", () => {
  test("counts only active days and does not turn a skipped day into progress", () => {
    const result = calculateStreaks([
      day("2026-09-01", 1),
      day("2026-09-02", 0, 20),
      day("2026-09-03", 2),
      day("2026-09-04", 1),
    ]);
    expect(result.current).toBe(2);
    expect(result.longest).toBe(2);
  });

  test("summarizes the latest seven days and compares with the prior week", () => {
    const days = [
      day("2026-09-01", 1, 60),
      day("2026-09-02", 2, 80),
      day("2026-09-03", 1, 70, { postponed: 1, reviewed: true }),
      day("2026-09-04", 0, 0),
      day("2026-09-05", 2, 90),
      day("2026-09-06", 1, 65),
      day("2026-09-07", 3, 95),
      day("2026-09-08", 1, 75),
    ];
    const previous = [day("2026-08-25", 1, 50), day("2026-08-26", 1, 55)];
    const result = calculateWeeklyProgress(days, previous);
    expect(result.days).toHaveLength(7);
    expect(result.activeDays).toBe(6);
    expect(result.completed).toBe(10);
    expect(result.postponed).toBe(1);
    expect(result.reviewedDays).toBe(1);
    expect(result.averageScore).toBe(68);
    expect(result.changeFromPrevious).toBe(15);
  });

  test("handles an empty history without inventing a score or streak", () => {
    const result = buildProgressSummary([]);
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(0);
    expect(result.weekly.averageScore).toBeNull();
    expect(result.weekly.changeFromPrevious).toBeNull();
    expect(result.achievements.every((item) => !item.unlocked)).toBe(true);
  });
});

describe("Milestones", () => {
  test("unlocks only milestones supported by actual records", () => {
    const early = calculateAchievements([day("2026-09-01", 1)]);
    expect(early.find((item) => item.id === "first-step")?.unlocked).toBe(true);
    expect(early.find((item) => item.id === "steady-seven")?.unlocked).toBe(false);
    expect(early.find((item) => item.id === "first-review")?.unlocked).toBe(false);

    const sustained = calculateAchievements([
      ...Array.from({ length: 7 }, (_, index) =>
        day(`2026-09-${String(index + 1).padStart(2, "0")}`, 1),
      ),
      day("2026-09-08", 0, 0, { reviewed: true }),
    ]);
    expect(sustained.find((item) => item.id === "steady-seven")?.unlocked).toBe(true);
    expect(sustained.find((item) => item.id === "first-review")?.unlocked).toBe(true);
  });

  test("uses bounded progress values suitable for calm UI feedback", () => {
    const achievements = calculateAchievements([
      day("2026-09-01", 12),
      day("2026-09-02", 9),
    ]);
    const first = achievements.find((item) => item.id === "first-step")!;
    const steady = achievements.find((item) => item.id === "steady-seven")!;
    expect(first.progress).toBeLessThanOrEqual(first.target);
    expect(steady.progress).toBeLessThanOrEqual(steady.target);
    expect(steady.kind).toBe("consistency");
  });
});
