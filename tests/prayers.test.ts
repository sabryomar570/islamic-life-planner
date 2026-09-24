/**
 * اختبارات منطق المواقيت الخالص — بلا شبكة وبلا hooks.
 */
import { describe, expect, test } from "bun:test";
import { FALLBACK_TIMINGS, PRAYERS, nextPrayer, type Timings } from "../src/lib/prayers";

const TIMINGS: Timings = {
  fajr: "05:00",
  dhuhr: "12:00",
  asr: "15:30",
  maghrib: "18:00",
  isha: "19:30",
};

describe("بنية البيانات", () => {
  test("خمس صلوات بالمفاتيح المعروفة", () => {
    expect(PRAYERS.map((prayer) => prayer.key)).toEqual([
      "fajr",
      "dhuhr",
      "asr",
      "maghrib",
      "isha",
    ]);
  });
  test("أسماء عربية لكل صلاة", () => {
    for (const prayer of PRAYERS) {
      expect(prayer.name.length).toBeGreaterThan(1);
    }
  });
  test("الاحتياطي يحوي خمس مواقيت بصيغة HH:MM", () => {
    for (const value of Object.values(FALLBACK_TIMINGS)) {
      expect(value).toMatch(/^([01]\d|2[0-3]):[0-5]\d$/);
    }
  });
});

describe("nextPrayer — الصلاة القادمة", () => {
  test("قبل الفجر → الفجر هو القادمة", () => {
    const now = new Date(2026, 8, 24, 4, 30); // 04:30
    const next = nextPrayer(TIMINGS, now);
    expect(next.key).toBe("fajr");
    expect(next.time).toBe("05:00");
  });

  test("بين الفجر والظهر → الظهر", () => {
    const now = new Date(2026, 8, 24, 9, 0);
    expect(nextPrayer(TIMINGS, now).key).toBe("dhuhr");
  });

  test("بين العصر والمغرب → المغرب", () => {
    const now = new Date(2026, 8, 24, 16, 45);
    expect(nextPrayer(TIMINGS, now).key).toBe("maghrib");
  });

  test("بعد العشاء → الفجر التالي (لفّ يومي)", () => {
    const now = new Date(2026, 8, 24, 22, 0);
    const next = nextPrayer(TIMINGS, now);
    expect(next.key).toBe("fajr");
  });

  test("في لحظة دخول الوقت بالضبط: الوقت المنقضي يُعد ماضيًا (≤ ينتقل للقادمة)", () => {
    // توثيق السلوك الحالي عند الحد: toMinutes(timings) <= minutes
    const now = new Date(2026, 8, 24, 15, 30);
    expect(nextPrayer(TIMINGS, now).key).toBe("maghrib");
  });
});
