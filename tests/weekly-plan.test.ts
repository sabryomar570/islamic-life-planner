import { describe, expect, test } from "bun:test";
import { pickAnswers } from "../src/data/questions";
import { buildLifeModel } from "../src/lib/life-model";
import {
  generateWeeklyPlan,
  updateWeeklyPlanItems,
  type WeeklyPlanItem,
} from "../src/lib/weekly-plan";

const BASE = {
  wakeTime: "06:00",
  sleepTime: "23:00",
  prayerCommitment: "most",
  mostMissedPrayer: "fajr",
  quranAmount: "page",
  mainGoal: "quran",
  startingRitual: "wird",
};

const MODEL = buildLifeModel(
  pickAnswers({
    ...BASE,
    dayRhythm: "study",
    focusTime: "08:30",
    workStart: "09:00",
    workEnd: "15:00",
    restTime: "12:30",
    movement: "walk",
    eveningReset: "reflection",
    disciplineLevel: "firm",
    weeklyFocus: "consistency",
    commitment: "إنهاء ملخص المشروع",
  }),
);

function plan() {
  return generateWeeklyPlan({
    model: MODEL,
    weekStart: "2026-09-21",
    timezone: "Africa/Cairo",
  });
}

describe("Weekly Plan generation", () => {
  test("is deterministic and covers exactly seven dates", () => {
    const first = plan();
    const second = plan();
    expect(first).toEqual(second);
    expect(new Set(first.items.map((item) => item.date)).size).toBe(7);
    expect(new Set(first.items.map((item) => item.id)).size).toBe(first.items.length);
    expect(first.weekStart).toBe("2026-09-21");
    expect(first.items.at(-1)?.date).toBe("2026-09-27");
  });

  test("contains all core weekly categories without inventing a missing category", () => {
    const generated = plan();
    const count = (kind: string) =>
      generated.items.filter((item) => item.kind === kind).length;
    expect(count("prayer")).toBe(35);
    expect(count("work")).toBe(7);
    expect(count("focus")).toBe(7);
    expect(count("rest")).toBe(7);
    expect(count("sleep")).toBe(7);
    expect(count("habit")).toBe(14);
    expect(count("goal")).toBe(7);
    expect(count("commitment")).toBe(7);

    for (const day of new Set(generated.items.map((item) => item.date))) {
      expect(
        generated.items.filter(
          (item) => item.date === day && item.kind === "prayer" && item.enabled,
        ),
      ).toHaveLength(5);
    }
  });

  test("does not create a work block when the user supplied no work window", () => {
    const flexible = buildLifeModel(pickAnswers({ ...BASE, dayRhythm: "open" }));
    const generated = generateWeeklyPlan({
      model: flexible,
      weekStart: "2026-09-21",
    });
    expect(generated.items.some((item) => item.kind === "work")).toBe(false);
    expect(generated.items.some((item) => item.kind === "focus")).toBe(true);
  });

  test("orders timed items and keeps the weekly priority in the plan", () => {
    const firstDay = plan().items.filter((item) => item.day === 0);
    const focusIndex = firstDay.findIndex((item) => item.kind === "focus");
    const workIndex = firstDay.findIndex((item) => item.kind === "work");
    expect(firstDay[focusIndex].startTime).toBe("08:30");
    expect(firstDay[workIndex].startTime).toBe("09:00");
    expect(focusIndex).toBeLessThan(workIndex);
    expect(firstDay.some((item) => item.title.includes("الاستمرارية"))).toBe(true);
    expect(firstDay.some((item) => item.title === "إنهاء ملخص المشروع")).toBe(true);
  });
});

describe("Weekly Plan editing", () => {
  test("applies a valid edit once and treats a repeated identical patch idempotently", () => {
    const generated = plan();
    const target = generated.items.find((item) => item.kind === "focus")!;
    const first = updateWeeklyPlanItems(generated.items, target.id, {
      startTime: "10:15",
      durationMinutes: 65,
    });
    expect(first.changed).toBe(true);
    expect(first.items.find((item) => item.id === target.id)).toMatchObject({
      startTime: "10:15",
      durationMinutes: 65,
    });

    const repeated = updateWeeklyPlanItems(first.items, target.id, {
      startTime: "10:15",
      durationMinutes: 65,
    });
    expect(repeated.changed).toBe(false);
    expect(repeated.items).toEqual(first.items);
  });

  test("can disable a recurring item without deleting other occurrences", () => {
    const items: WeeklyPlanItem[] = plan().items;
    const result = updateWeeklyPlanItems(items, items[0].id, { enabled: false });
    expect(result.changed).toBe(true);
    expect(result.items.filter((item) => item.id === items[0].id)[0].enabled).toBe(false);
    expect(result.items).toHaveLength(items.length);
  });
});
