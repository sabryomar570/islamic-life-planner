import { describe, expect, test } from "bun:test";
import { groupByPrayerAnchor } from "../src/components/app/DayTimeline";
import { prayerState } from "../src/components/app/NextPrayerHero";
import {
  DASH_VIEWS,
  LIBRARY_GROUPS,
  PRIMARY_NAV,
  isDashView,
} from "../src/components/app/Navigation";
import { buildDailyPlan } from "../src/lib/daily-plan";
import { pickAnswers } from "../src/data/questions";
import { buildLifeModel } from "../src/lib/life-model";
import { generateWeeklyPlan } from "../src/lib/weekly-plan";
import type { Timings } from "../src/lib/prayers";

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
const DAY = "2026-09-21";
const PLAN = buildDailyPlan({
  plan: WEEK,
  date: DAY,
  timings: TIMINGS,
  now: new Date(2026, 8, 21, 20, 0),
});

describe("خريطة المعلومات", () => {
  test("التنقّل الأساسي أربع وجهات (الرابع هو «المزيد») وكل واحدة في المكتبة", () => {
    expect(PRIMARY_NAV).toHaveLength(4);
    // «اليوم» هو المدخل ولا يُكرَّر داخل المكتبة؛ الباقي يجب أن يظهر فيها.
    for (const item of PRIMARY_NAV.filter((entry) => entry.key !== "today")) {
      expect(LIBRARY_GROUPS.some((group) => group.entries.some((e) => e.key === item.key))).toBe(true);
    }
  });

  test("كل قسم مذكور في المكتبة موجود فعلًا في قائمة العروض", () => {
    const libraryKeys = LIBRARY_GROUPS.flatMap((group) => group.entries.map((e) => e.key));
    for (const key of libraryKeys) {
      expect(DASH_VIEWS).toContain(key);
      expect(isDashView(key)).toBe(true);
    }
  });

  test("لا تكرار في المجموعات: كل قسم في مجموعة واحدة فقط", () => {
    const seen = new Set<string>();
    for (const group of LIBRARY_GROUPS) {
      for (const entry of group.entries) {
        expect(seen.has(entry.key)).toBe(false);
        seen.add(entry.key);
      }
    }
    // الأقسام التي لا معنى لها في المكتبة تبقى خارجها عمدًا.
    expect(seen.has("today")).toBe(false);
  });

  test("رفض أي مسار غير معروف", () => {
    expect(isDashView("nope")).toBe(false);
    expect(isDashView(null)).toBe(false);
  });
});

describe("حالة الصلاة", () => {
  test("تقرأ الحالة من السجل أولًا، ثم من الوقت", () => {
    expect(prayerState("fajr", "jamaah", 300, 600)).toBe("done");
    expect(prayerState("fajr", "late", 300, 600)).toBe("late");
    expect(prayerState("fajr", "missed", 300, 600)).toBe("missed");
    // دخل وقتها ولم تُسجَّل → فائتة
    expect(prayerState("fajr", undefined, 300, 600)).toBe("missed");
    // لم يدخل وقتها بعد
    expect(prayerState("fajr", undefined, 900, 600)).toBe("pending");
  });
});

describe("الخط الزمني المُرسي بالصلاة", () => {
  const groups = groupByPrayerAnchor(PLAN);

  test("كل مجموعة لها ارتساء صلاة أو حاوية «متى شئت»", () => {
    for (const group of groups) {
      if (group.anchor) {
        expect(["fajr", "dhuhr", "asr", "maghrib", "isha"]).toContain(group.anchor.key);
      }
    }
  });

  test("الصلوات نفسها ليست خطوات داخل الخطة", () => {
    const flat = groups.flatMap((group) => group.items);
    expect(flat.some((entry) => entry.item.kind === "prayer")).toBe(false);
  });

  test("كل خطوة مفعّلة تقع في مجموعة واحدة فقط — لا تكرار في العرض", () => {
    const ids = groups.flatMap((group) => group.items.map((entry) => entry.item.id));
    expect(new Set(ids).size).toBe(ids.length);
  });

  test("لا يُفقد أي عنصر مفعّل في يوم واحد", () => {
    const enabled = PLAN.sections.flatMap((s) => s.items).filter((e) => e.item.kind !== "prayer");
    const grouped = groups.flatMap((g) => g.items);
    expect(grouped).toHaveLength(enabled.length);
  });

  test("ترتيب المجموعات يتبع ترتيب الصلوات لا ترتيب الإدخال", () => {
    const order = groups
      .map((group) => group.anchor?.key)
      .filter((key): key is "fajr" | "dhuhr" | "asr" | "maghrib" | "isha" => key !== undefined);
    const rank = ["fajr", "dhuhr", "asr", "maghrib", "isha"];
    const positions = order.map((key) => rank.indexOf(key));
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
  });
});
