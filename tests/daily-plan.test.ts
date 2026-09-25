import { describe, expect, test } from "bun:test";
import { pickAnswers } from "../src/data/questions";
import { buildDailyPlan, dailyFocusLine } from "../src/lib/daily-plan";
import { buildLifeModel } from "../src/lib/life-model";
import type { Timings } from "../src/lib/prayers";
import { generateWeeklyPlan, updateWeeklyPlanItems } from "../src/lib/weekly-plan";

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

function daily(now = new Date(2026, 8, 21, 8, 0)) {
  return buildDailyPlan({
    plan: WEEK,
    date: "2026-09-21",
    timings: TIMINGS,
    now,
  });
}

describe("Daily Plan hierarchy", () => {
  test("answers the day with one clear primary action", () => {
    const plan = daily();
    expect(plan.primaryAction?.item.kind).toBe("commitment");
    expect(plan.primaryAction?.item.title).toBe("إنهاء ملخص المشروع");
    expect(dailyFocusLine(plan)).toContain("مهمتك اليوم");
    expect(dailyFocusLine(plan)).toContain("إنهاء ملخص المشروع");
  });

  test("keeps the requested hierarchy instead of showing everything equally", () => {
    const sections = daily().sections;
    expect(sections.map((section) => section.key)).toEqual([
      "foundation",
      "primary",
      "habits",
      "work",
      "goals",
      "secondary",
    ]);
    expect(sections[0].title).toBe("الصلاة والأساس");
    expect(sections[1].items.map((item) => item.item.kind)).toContain("commitment");
    expect(sections[1].items.map((item) => item.item.kind)).toContain("focus");
  });

  test("uses actual prayer times and gives each prayer a purposeful phase", () => {
    const plan = daily();
    expect(plan.prayerAnchors.map((anchor) => anchor.time)).toEqual([
      "05:12",
      "12:04",
      "15:22",
      "18:07",
      "19:26",
    ]);
    expect(plan.prayerAnchors.map((anchor) => anchor.title)).toEqual([
      "فتح اليوم",
      "إعادة الترتيب",
      "مراجعة التقدم",
      "الانتقال للمساء",
      "إغلاق اليوم",
    ]);
    expect(plan.prayerAnchors.every((anchor) => anchor.prompt.length > 10)).toBe(true);
  });

  test("tracks current and next anchors without inventing a fixed schedule", () => {
    const beforeFajr = daily(new Date(2026, 8, 21, 4, 30));
    expect(beforeFajr.currentAnchor.key).toBe("fajr");
    expect(beforeFajr.nextAnchor.key).toBe("fajr");

    const afternoon = daily(new Date(2026, 8, 21, 13, 0));
    expect(afternoon.currentAnchor.key).toBe("dhuhr");
    expect(afternoon.nextAnchor.key).toBe("asr");
  });
});

describe("Daily Plan filtering and flexibility", () => {
  test("excludes other dates and disabled items", () => {
    const work = WEEK.items.find(
      (item) => item.date === "2026-09-21" && item.kind === "work",
    )!;
    const edited = updateWeeklyPlanItems(WEEK.items, work.id, { enabled: false });
    const plan = buildDailyPlan({
      plan: { ...WEEK, items: edited.items },
      date: "2026-09-21",
      timings: TIMINGS,
      now: new Date(2026, 8, 21, 8, 0),
    });
    expect(plan.sections.find((section) => section.key === "work")).toBeUndefined();
    expect(plan.sections.flatMap((section) => section.items).some((item) => item.item.date !== "2026-09-21")).toBe(false);
  });

  test("leaves flexible habits without a fabricated time", () => {
    const plan = daily();
    const movement = plan.sections
      .flatMap((section) => section.items)
      .find((entry) => entry.item.id.endsWith(":movement"));
    expect(movement).toBeDefined();
    expect(movement?.scheduledTime).toBeUndefined();
  });

  test("respects a user-edited prayer time while keeping all other anchors actual", () => {
    const fajr = WEEK.items.find(
      (item) => item.date === "2026-09-21" && item.prayerAnchor === "fajr",
    )!;
    const edited = updateWeeklyPlanItems(WEEK.items, fajr.id, { startTime: "05:30" });
    const plan = buildDailyPlan({
      plan: { ...WEEK, items: edited.items },
      date: "2026-09-21",
      timings: TIMINGS,
      now: new Date(2026, 8, 21, 8, 0),
    });
    expect(plan.prayerAnchors[0].time).toBe("05:12");
    expect(
      plan.sections[0].items.find((entry) => entry.item.prayerAnchor === "fajr")
        ?.scheduledTime,
    ).toBe("05:30");
    expect(plan.prayerAnchors[1].time).toBe("12:04");
  });
});
