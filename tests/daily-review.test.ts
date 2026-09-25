import { describe, expect, test } from "bun:test";
import type { PlanItemOutcome } from "../src/lib/accountability";
import { buildDailyReviewLearning } from "../src/lib/daily-review";
import type { WeeklyPlanItem } from "../src/lib/weekly-plan";

const items: WeeklyPlanItem[] = [
  {
    id: "2026-09-21:prayer:fajr",
    date: "2026-09-21",
    day: 0,
    kind: "prayer",
    title: "صلاة الفجر",
    importance: "foundation",
    recurrence: "daily",
    origin: "prayer-times",
    enabled: true,
  },
  {
    id: "2026-09-21:focus",
    date: "2026-09-21",
    day: 0,
    kind: "focus",
    title: "ساعة تركيز",
    importance: "core",
    recurrence: "daily",
    origin: "profile",
    enabled: true,
  },
  {
    id: "2026-09-21:rest",
    date: "2026-09-21",
    day: 0,
    kind: "rest",
    title: "راحة",
    importance: "optional",
    recurrence: "daily",
    origin: "system",
    enabled: false,
  },
];

function outcome(itemId: string, status: PlanItemOutcome["status"]): PlanItemOutcome {
  return {
    date: "2026-09-21",
    itemId,
    weekStart: "2026-09-21",
    status,
    postponedTo: null,
    reason: "",
    createdAt: 1,
    updatedAt: 1,
  };
}

describe("Daily Review learning", () => {
  test("يجمع المخطط والنفاذ ويشرح النجاح والتعثر من سجلات الخطة", () => {
    const result = buildDailyReviewLearning({
      items,
      outcomes: [outcome(items[0].id, "completed"), outcome(items[1].id, "skipped")],
    });

    expect(result.planned).toBe(2);
    expect(result.completed).toBe(1);
    expect(result.skipped).toBe(1);
    expect(result.succeeded).toEqual(["صلاة الفجر"]);
    expect(result.failed).toEqual(["ساعة تركيز"]);
  });

  test("ملاحظات المستخدم تتقدم على الاستنتاج التلقائي وتُحفظ بنص نظيف", () => {
    const result = buildDailyReviewLearning({
      items,
      outcomes: [outcome(items[0].id, "completed")],
      succeeded: "  جانبت   الموعد  ",
      failed: "انشغلت   بطلب   طارئ",
      why: "  كان   اليوم   مزدحمًا  ",
      tomorrowAdjustment: "أقدم  		      الخطوة",
    });

    expect(result.succeeded).toEqual(["جانبت الموعد"]);
    expect(result.failed).toEqual(["انشغلت بطلب طارئ"]);
    expect(result.why).toBe("كان اليوم مزدحمًا");
    expect(result.tomorrowAdjustment).toBe("أقدم الخطوة");
  });

  test("البيانات الفارغة لا تنتج ادعاءات", () => {
    expect(buildDailyReviewLearning({ items: [], outcomes: [] })).toEqual({
      planned: 0,
      completed: 0,
      partial: 0,
      postponed: 0,
      skipped: 0,
      succeeded: [],
      failed: [],
      why: "",
      tomorrowAdjustment: "",
    });
  });
});
