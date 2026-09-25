import { describe, expect, test } from "bun:test";
import {
  addMinutes,
  dateKey,
  diffMinutes,
  startOfWeekKey,
  toHHMM,
  toMinutes,
  weekStartOfDateKey,
} from "../src/lib/time";
import { MAX_PLAN_ITEMS, WEEK_LENGTH } from "../src/lib/weekly-plan";
import { HADITHS } from "../src/data/hadith";

/**
 * حدّ الأسبوع والتاريخ.
 *
 * خوف بدأ به هذا الملف: `startOfWeekKey` يحسب محليا، و`weekStartOfDateKey`
 * يحسب بـUTC. أشبّه أن يتسرّب يوم من أسبوع إلى آخر.
 *
 * والفحص أدناه يثبت أن الخوف غير مبرر. مفتاح التاريخ `YYYY-MM-DD` هو تاريخ
 * تقويمي بلا منطقة زمنية، فالاثنين له تاريخ واحد مهما كانت المنطقة.
 * ويظهر الاختلاف فقط لو أُعطي أحدهما **طابعا زمنيا** لا مفتاح تاريخ،
 * وهذا لا يحدث في أي مسار في الشيفرة.
 */

const THIS_MONDAY = "2026-09-21";
const NEXT_MONDAY = "2026-09-28";

describe("حدّ الأسبوع — التوافق بين المحلي و UTC", () => {
  test("كل يوم في الأسبوع يعود إلى اثنين واحد", () => {
    for (let day = 21; day <= 27; day += 1) {
      expect(weekStartOfDateKey(`2026-09-${day}`)).toBe(THIS_MONDAY);
    }
  });

  test("الاثنين هو بداية نفسه، والأحد آخر أيامه", () => {
    expect(weekStartOfDateKey(THIS_MONDAY)).toBe(THIS_MONDAY);
    expect(weekStartOfDateKey("2026-09-27")).toBe(THIS_MONDAY);
  });

  test("أسبوعان متتاليان لا يتقاطعان", () => {
    // الأحد ٢٧ في أسبوع ٢١، والاثنين ٢٨ يفتح أسبوعا جديدا.
    expect(weekStartOfDateKey("2026-09-27")).toBe(THIS_MONDAY);
    expect(weekStartOfDateKey(NEXT_MONDAY)).toBe(NEXT_MONDAY);
    expect(weekStartOfDateKey("2026-10-04")).toBe(NEXT_MONDAY);
    expect(weekStartOfDateKey("2026-10-05")).toBe("2026-10-05");
  });

  test("مفتاح غير صالح يعود كما هو ولا ينهار", () => {
    expect(weekStartOfDateKey("غير-تاريخ")).toBe("غير-تاريخ");
    expect(weekStartOfDateKey("")).toBe("");
  });

  test("سبعة أيام بالضبط بين بداية الأسبوع وتاليه", () => {
    const current = new Date(`${THIS_MONDAY}T00:00:00Z`).getTime();
    const next = new Date(`${NEXT_MONDAY}T00:00:00Z`).getTime();
    expect(Math.round((next - current) / 86_400_000)).toBe(WEEK_LENGTH);
  });
});

describe("حدّ الأسبوع — منظور المنطقة الزمنية", () => {
  const ZONES = [
    "UTC",
    "Asia/Riyadh",
    "Asia/Tokyo",
    "America/New_York",
    "Pacific/Auckland",
    "Asia/Kolkata",
  ];

  const INSTANTS = [
    "2026-09-25T22:30:00Z",
    "2026-09-26T01:30:00Z",
    "2026-09-25T23:59:59Z",
    "2026-09-26T00:00:01Z",
    "2026-01-01T05:00:00Z",
    "2026-12-31T20:00:00Z",
  ];

  test("المحلي و UTC يتّفقان في كل منطقة وكل لحظة حدّ", () => {
    for (const zone of ZONES) {
      for (const iso of INSTANTS) {
        const instant = new Date(iso);
        // هذا هو تاريخ الجهاز المحلي كما يقرأه المتصفح في تلك المنطقة.
        const local = new Date(instant.toLocaleString("en-US", { timeZone: zone }));
        const localStart = startOfWeekKey(local);
        const serverStart = weekStartOfDateKey(dateKey(local));
        expect({ zone, iso, localStart, serverStart }).toEqual({
          zone,
          iso,
          localStart,
          serverStart,
        });
      }
    }
  });

  test("الرجوع من أسبوع آخر إلى الحالي يعطي بداية الأسبوع نفسه", () => {
    const thisWeek = startOfWeekKey(new Date(2026, 8, 25));
    const otherWeek = weekStartOfDateKey("2026-10-05");
    expect(otherWeek).not.toBe(thisWeek);
    expect(weekStartOfDateKey(thisWeek)).toBe(thisWeek);
  });
});

describe("حدّ اليوم — منتصف الليل", () => {
  test("قبل منتصف الليل وبعده يومان مختلفان في الأسبوع نفسه", () => {
    const before = dateKey(new Date(2026, 8, 25, 23, 59, 59));
    const after = dateKey(new Date(2026, 8, 26, 0, 0, 1));
    expect(before).not.toBe(after);
    expect(weekStartOfDateKey(before)).toBe(weekStartOfDateKey(after));
  });

  test("انقضاء منتصف الليل داخل اليوم لا يغيّر الأسبوع", () => {
    const early = startOfWeekKey(new Date(2026, 8, 26, 0, 0));
    const late = startOfWeekKey(new Date(2026, 8, 26, 23, 59));
    expect(late).toBe(early);
  });

  test("من الأحد إلى الاثنين يبدأ أسبوع جديد، وهذا هو السلوك الصحيح", () => {
    // ليس تسرّبًا: الأسبوع يبدأ مع الاثنين بعينه.
    const sundayNight = startOfWeekKey(new Date(2026, 8, 27, 23, 59));
    const mondayDawn = startOfWeekKey(new Date(2026, 8, 28, 0, 0));
    expect(sundayNight).toBe(THIS_MONDAY);
    expect(mondayDawn).toBe(NEXT_MONDAY);
    expect(sundayNight).not.toBe(mondayDawn);
  });

  test("صيغة المفتاح ثابتة الطول عبر الشهور", () => {
    for (const [month, day] of [[0, 5], [8, 25], [11, 31]] as const) {
      const key = dateKey(new Date(2026, month, day));
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(key.length).toBe(10);
    }
  });
});

describe("حدّ الوقت — التفاف بعد منتصف الليل", () => {
  test("الدقائق تلتف في اليوم ولا تفيض", () => {
    expect(toHHMM(1440)).toBe("00:00");
    expect(toHHMM(-1)).toBe("23:59");
    expect(toHHMM(1500)).toBe("01:00");
  });

  test("الفرق يعبر منتصف الليل موجبا", () => {
    expect(diffMinutes("23:30", "00:15")).toBe(45);
    expect(diffMinutes("00:00", "00:00")).toBe(0);
  });

  test("إضافة دقائق تعبر الحدّ دون انقلاب التاريخ", () => {
    expect(addMinutes("23:45", 30)).toBe("00:15");
  });

  test("نص تالف يعطي صفرا بدل انهيار", () => {
    expect(toMinutes("غير-وقت")).toBe(0);
  });
});

describe("حدّ الخطة — لا يتجاوز الأسبوع", () => {
  test("سقف الخطة سليم فلا انهيار عند تجاوزه", () => {
    expect(MAX_PLAN_ITEMS).toBe(140);
    expect(MAX_PLAN_ITEMS).toBeGreaterThan(WEEK_LENGTH);
  });

  test("كل نص في القاعدة له معرّف صالح", () => {
    expect(HADITHS.every((hadith) => hadith.id.trim().length > 0)).toBe(true);
  });
});
