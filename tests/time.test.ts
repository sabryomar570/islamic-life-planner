/**
 * اختبارات دوال الوقت الخالصة — تُشغَّل بـ `bun test` مباشرة (لا تحتاج إعدادًا).
 * خارج src/ عمدًا: tsc -b لا يشملها، وbun يتعرف عليها تلقائيًا.
 */
import { describe, expect, test } from "bun:test";
import {
  addMinutes,
  arabicNumber,
  dateKey,
  startOfWeekKey,
  diffMinutes,
  formatArabicTime,
  toHHMM,
  toMinutes,
} from "../src/lib/time";

describe("toMinutes/toHHMM — تحويل دائري صحيح", () => {
  test("00:00 → 0 دقيقة", () => {
    expect(toMinutes("00:00")).toBe(0);
  });
  test("06:30 → 390", () => {
    expect(toMinutes("06:30")).toBe(390);
  });
  test("23:59 → 1439", () => {
    expect(toMinutes("23:59")).toBe(1439);
  });
  test("قيمة غير صالحة → 0 (سلوك متسامح موثق)", () => {
    expect(toMinutes("xx:yy")).toBe(0);
  });
  test("0 دقيقة → 00:00", () => {
    expect(toHHMM(0)).toBe("00:00");
  });
  test("1439 → 23:59", () => {
    expect(toHHMM(1439)).toBe("23:59");
  });
  test("دائري: كل دقائق اليوم تعود كما هي", () => {
    for (let minutes = 0; minutes < 1440; minutes += 97) {
      expect(toMinutes(toHHMM(minutes))).toBe(minutes);
    }
  });
});

describe("addMinutes — إضافة مع لفّ منتصف الليل", () => {
  test("23:50 + 20 = 00:10", () => {
    expect(addMinutes("23:50", 20)).toBe("00:10");
  });
  test("00:10 - 20 = 23:50", () => {
    expect(addMinutes("00:10", -20)).toBe("23:50");
  });
  test("إضافة 1440 لا تغيّر شيئًا", () => {
    expect(addMinutes("12:34", 1440)).toBe("12:34");
  });
});

describe("diffMinutes — فرق يتعامل مع عبور منتصف الليل", () => {
  test("من 10:00 إلى 10:30 = 30", () => {
    expect(diffMinutes("10:00", "10:30")).toBe(30);
  });
  test("من 23:50 إلى 00:10 = 20 (عبور ليلي)", () => {
    expect(diffMinutes("23:50", "00:10")).toBe(20);
  });
  test("نفس الوقت = 0", () => {
    expect(diffMinutes("08:00", "08:00")).toBe(0);
  });
});

describe("dateKey — مفتاح التاريخ المحلي بصيغة YYYY-MM-DD", () => {
  test("يصنع مفاتيح بطول وشرط صحيحين", () => {
    const key = dateKey(new Date(2026, 8, 24)); // سبتمبر = شهر 8 صفرية
    expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(key).toBe("2026-09-24");
  });
  test("يحشئ الأصفار للشهر واليوم", () => {
    expect(dateKey(new Date(2026, 0, 5))).toBe("2026-01-05");
  });
  test("افتراضيًا يعطي تاريخ اليوم", () => {
    const now = new Date();
    const expected = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    expect(dateKey()).toBe(expected);
  });
});

describe("startOfWeekKey — الأسبوع المحلي يبدأ الاثنين", () => {
  test("السبت يعود إلى يوم الاثنين في الأسبوع نفسه", () => {
    expect(startOfWeekKey(new Date(2026, 8, 26))).toBe("2026-09-21");
  });

  test("الاثنين يبقى نفسه", () => {
    expect(startOfWeekKey(new Date(2026, 8, 21, 23, 59))).toBe("2026-09-21");
  });
});

describe("arabicNumber — أرقام عربية-هندية", () => {
  test("5 → ٥", () => {
    expect(arabicNumber(5)).toBe("٥");
  });
  test("0 → ٠", () => {
    expect(arabicNumber(0)).toBe("٠");
  });
  test("123 → ١٢٣ بلا فواصل", () => {
    expect(arabicNumber(123)).toBe("١٢٣");
  });
});

describe("formatArabicTime — صياغة عربية كاملة", () => {
  test("05:16 صباحًا", () => {
    expect(formatArabicTime("05:16")).toContain("صباحًا");
    expect(formatArabicTime("05:16")).toContain("٥:١٦");
  });
  test("18:00 مساءً", () => {
    expect(formatArabicTime("18:00")).toContain("مساءً");
  });
  test("00:30 بعد منتصف الليل = صباحًا (12 ساعة تبقى)", () => {
    expect(formatArabicTime("00:30")).toContain("صباحًا");
  });
  test("12:00 ظهرًا يظهر كمساءً في المنطق الحالي (12 يقع في النصف الثاني)", () => {
    // توثيق السلوك الحالي: hours24 >= 12 → مساءً
    expect(formatArabicTime("12:00")).toContain("مساءً");
  });
  test("بلا فترة عند withPeriod=false", () => {
    expect(formatArabicTime("05:16", false)).not.toContain("صباحًا");
  });
});
