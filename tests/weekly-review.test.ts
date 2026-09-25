import { describe, expect, test } from "bun:test";
import type { PlanItemOutcome } from "../src/lib/accountability";
import { buildWeeklyReview } from "../src/lib/weekly-review";
import type { PlanImportance, PlanItemKind, WeeklyPlan, WeeklyPlanItem } from "../src/lib/weekly-plan";

function item(
  id: string,
  kind: PlanItemKind,
  importance: PlanImportance,
  startTime?: string,
): WeeklyPlanItem {
  return {
    id,
    date: "2026-09-21",
    day: 0,
    kind,
    title: id,
    importance,
    recurrence: "daily",
    origin: "profile",
    enabled: true,
    ...(startTime ? { startTime } : {}),
  };
}

function outcome(id: string, status: PlanItemOutcome["status"]): PlanItemOutcome {
  return {
    date: "2026-09-21",
    itemId: id,
    weekStart: "2026-09-21",
    status,
    postponedTo: status === "postponed" ? "2026-09-22" : null,
    reason: status === "postponed" ? "ظرف طارئ" : "",
    createdAt: 1,
    updatedAt: 1,
  };
}

function plan(items: WeeklyPlanItem[]): WeeklyPlan {
  return {
    weekStart: "2026-09-21",
    timezone: "Africa/Cairo",
    weeklyFocus: "أسبوع هادئ",
    items,
  };
}

describe("Weekly Review", () => {
  test("يجمع PLAN وACTUAL وREVIEW بوزن يحترم أهمية كل عنصر", () => {
    const result = buildWeeklyReview({
      plan: plan([
        item("prayer", "prayer", "foundation", "05:00"),
        item("work", "work", "core", "09:00"),
        item("habit", "habit", "supporting", "18:00"),
        item("optional", "rest", "optional", "20:00"),
      ]),
      outcomes: [
        outcome("prayer", "completed"),
        outcome("work", "partial"),
        outcome("habit", "postponed"),
        outcome("optional", "skipped"),
      ],
      reviews: [{ date: "2026-09-21", mood: "ok", blocker: "busy", note: "ضغط متاح" }],
    });

    expect(result.adherence).toBe(60);
    expect(result.completed).toBe(1);
    expect(result.partial).toBe(1);
    expect(result.postponed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.reviewedDays).toBe(1);
    expect(result.weeklyFocus).toBe("أسبوع هادئ");
  });

  test("يحدد العادة الأكثر ثباتًا والأكثر تأجيلًا والفترات الناجحة والمتعثرة", () => {
    const items = [
      item("habit-1", "habit", "supporting", "07:00"),
      item("habit-2", "habit", "supporting", "07:00"),
      item("work-1", "work", "core", "09:00"),
      item("work-2", "work", "core", "09:00"),
      item("goal-1", "goal", "core", "16:00"),
      item("goal-2", "goal", "core", "16:00"),
    ];
    const result = buildWeeklyReview({
      plan: plan(items),
      outcomes: [
        outcome("habit-1", "completed"),
        outcome("habit-2", "completed"),
        outcome("work-1", "postponed"),
        outcome("work-2", "postponed"),
        outcome("goal-1", "completed"),
        outcome("goal-2", "completed"),
      ],
    });

    expect(result.mostConsistentHabit).toEqual({ kind: "habit", count: 2 });
    expect(result.mostPostponed).toEqual({ kind: "work", count: 2 });
    expect(result.successfulPeriods).toEqual(["07:00", "16:00"]);
    expect(result.difficultPeriods).toEqual(["09:00"]);
  });

  test("يضع الصلاة والأذكار في سياق الصورة الأسبوعية دون تحويلهما إلى درجة مستقلة", () => {
    const result = buildWeeklyReview({
      plan: plan([item("prayer", "prayer", "foundation", "05:00")]),
      outcomes: [outcome("prayer", "completed")],
      prayerLogs: [
        { date: "2026-09-21", prayer: "fajr", status: "ontime" },
        { date: "2026-09-21", prayer: "dhuhr", status: "late" },
        { date: "2026-09-22", prayer: "asr", status: "missed" },
      ],
      adhkarLogs: [
        { date: "2026-09-21", kind: "morning" },
        { date: "2026-09-22", kind: "evening" },
      ],
    });

    expect(result.prayerContext.loggedDays).toBe(2);
    expect(result.prayerContext.onTime).toBe(1);
    expect(result.prayerContext.late).toBe(1);
    expect(result.prayerContext.missed).toBe(1);
    expect(result.prayerContext.note).toContain("جزء من الصورة");
  });

  test("لا يخترع التزامًا أو فترة مختارة من بيانات فارغة", () => {
    const result = buildWeeklyReview({ plan: plan([]), outcomes: [] });

    expect(result.adherence).toBe(0);
    expect(result.mostConsistentHabit).toBeNull();
    expect(result.mostPostponed).toBeNull();
    expect(result.successfulPeriods).toEqual([]);
    expect(result.difficultPeriods).toEqual([]);
    expect(result.prayerContext.loggedDays).toBe(0);
    expect(result.suggestedAdjustments).toHaveLength(1);
    expect(result.suggestedAdjustments[0].kind).toBe("keep");
  });

  test("كل اقتراح تغيير يبقى بانتظار موافقة المستخدم", () => {
    const result = buildWeeklyReview({
      plan: plan([
        item("work-1", "work", "core", "07:00"),
        item("work-2", "work", "core", "07:00"),
        item("habit-1", "habit", "supporting", "18:00"),
        item("habit-2", "habit", "supporting", "18:00"),
      ]),
      outcomes: [
        outcome("work-1", "postponed"),
        outcome("work-2", "postponed"),
        outcome("habit-1", "completed"),
        outcome("habit-2", "completed"),
      ],
    });

    expect(result.suggestedAdjustments.length).toBeGreaterThan(0);
    expect(result.suggestedAdjustments.every((item) => item.requiresApproval)).toBe(true);
  });
});
