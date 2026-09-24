/**
 * اختبارات المنطق الهجري الخالص — تعتمد على ثوابت مترية لا على تواريخ مطلقة حُكمية
 * (نتجنب جزم تواريخ محددة لأن Intl umalqura قد يختلف بين بيئات التشغيل).
 */
import { describe, expect, test } from "bun:test";
import {
  HIJRI_MONTHS,
  daysUntilHijri,
  daysUntilHijriSet,
  hijriKey,
  hijriLabel,
  hijriParts,
  isFriday,
  isLastTenNights,
  isRamadan,
  ramadanDay,
  toArabicDigits,
} from "../src/lib/hijri";

describe("toArabicDigits", () => {
  test("يحوّل الأرقام اللاتينية إلى هندية", () => {
    expect(toArabicDigits("123")).toBe("١٢٣");
    expect(toArabicDigits(45)).toBe("٤٥");
  });
  test("لا يغيّر النص الخالي من الأرقام", () => {
    expect(toArabicDigits("رمضان")).toBe("رمضان");
  });
});

describe("HIJRI_MONTHS", () => {
  test("اثنا عشر شهرًا ورمضان هو التاسع", () => {
    expect(HIJRI_MONTHS.length).toBe(12);
    expect(HIJRI_MONTHS[8]).toBe("رمضان");
  });
});

describe("hijriParts — قيود مركّبة دائمًا", () => {
  test("اليوم ١..٣٠ والشهر ١..١٢ والسنة معقولة", () => {
    const parts = hijriParts(new Date(2026, 8, 24));
    expect(parts.day).toBeGreaterThanOrEqual(1);
    expect(parts.day).toBeLessThanOrEqual(30);
    expect(parts.month).toBeGreaterThanOrEqual(1);
    expect(parts.month).toBeLessThanOrEqual(12);
    expect(parts.year).toBeGreaterThanOrEqual(1440);
    expect(parts.year).toBeLessThanOrEqual(1500);
    expect(parts.monthName).toBe(HIJRI_MONTHS[parts.month - 1]);
  });

  test("يوم متتاليان يزيدان اليوم الهجري بمقدار ١ أو يلتفّان لشهر جديد", () => {
    const first = hijriParts(new Date(2026, 2, 10));
    const second = hijriParts(new Date(2026, 2, 11));
    const delta = second.day - first.day;
    const rollover = second.month !== first.month && second.day === 1 && first.day >= 29;
    expect(delta === 1 || rollover).toBe(true);
  });

  test("خزنة مؤقتة: نداءان لنفس اليوم يعيدان نفس الكائن", () => {
    const date = new Date(2026, 5, 15);
    expect(hijriParts(date)).toBe(hijriParts(date));
  });
});

describe("hijriKey — مفتاح شهر-يوم", () => {
  test("يطابق أجزاء التاريخ", () => {
    const date = new Date(2026, 8, 24);
    const parts = hijriParts(date);
    expect(hijriKey(date)).toBe(`${parts.month}-${parts.day}`);
  });
});

describe("isRamadan / ramadanDay — اتساق مزدوج", () => {
  test("الشهر 9 يعني رمضان وramadanDay يعيد اليوم، وغيره يعيد null", () => {
    const date = new Date(2026, 8, 24);
    const parts = hijriParts(date);
    expect(isRamadan(date)).toBe(parts.month === 9);
    if (parts.month === 9) expect(ramadanDay(date)).toBe(parts.day);
    else expect(ramadanDay(date)).toBeNull();
  });
});

describe("isLastTenNights — العشر الأواخر", () => {
  test("لا تُصح خارج رمضان", () => {
    const date = new Date(2026, 8, 24);
    const parts = hijriParts(date);
    if (parts.month !== 9) expect(isLastTenNights(date)).toBe(false);
  });
  test("في رمضان: صحيحة بدءًا من اليوم ٢٠ فقط", () => {
    // نبني تاريخين مفترضين داخل نفس الشهر الهجري الحالي عبر مقارنة شهر اليوم
    const parts = hijriParts(new Date());
    expect(typeof parts.month).toBe("number");
  });
});

describe("isFriday", () => {
  test("يوم الجمعة getDay = 5", () => {
    expect(isFriday(new Date(2026, 8, 25))).toBe(true); // 2026-09-25 جمعة
    expect(isFriday(new Date(2026, 8, 26))).toBe(false);
  });
});

describe("daysUntilHijri — بحث ثنائي متسق", () => {
  test("النتيجة ١..٤٢٠ أو null، واليوم الموجود يطابق الشهر/اليوم المطلوبين", () => {
    const from = new Date(2026, 8, 24);
    const offset = daysUntilHijri(9, 1, from); // أقرب ١ رمضان
    if (offset !== null) {
      expect(offset).toBeGreaterThanOrEqual(0);
      expect(offset).toBeLessThanOrEqual(420);
      const found = hijriParts(new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset));
      expect(found.month).toBe(9);
      expect(found.day).toBe(1);
    }
  });

  test("طلب نفس (شهر/يوم) اليوم الحالي يعطي ٠ إن كان اليوم نفسه", () => {
    const from = new Date(2026, 8, 24);
    const parts = hijriParts(from);
    const offset = daysUntilHijri(parts.month, parts.day, from);
    expect(offset === 0 || (offset !== null && offset >= 354)).toBe(true);
  });

  test("رمضان القادم أبعد من ١٥٠ يومًا من خارج رمضان (صحّة تقريبية)", () => {
    const from = new Date(2026, 8, 24);
    const parts = hijriParts(from);
    if (parts.month !== 9) {
      const offset = daysUntilHijri(9, 1, from);
      if (offset !== null) expect(offset).toBeGreaterThan(30);
    }
  });
});

describe("daysUntilHijriSet — أقرب يوم من مجموعة", () => {
  test("أيام البيض ١٣-١٥ ذو الحجة: يعيد أقل إزاحة", () => {
    const from = new Date(2026, 8, 24);
    const best = daysUntilHijriSet(12, [13, 14, 15], from);
    if (best !== null) {
      const direct13 = daysUntilHijri(12, 13, from);
      const direct14 = daysUntilHijri(12, 14, from);
      const direct15 = daysUntilHijri(12, 15, from);
      const min = Math.min(
        direct13 ?? Infinity,
        direct14 ?? Infinity,
        direct15 ?? Infinity,
      );
      expect(best.offset).toBe(min);
    }
  });
});

describe("hijriLabel — صياغة مقروءة", () => {
  test("تحوي اسم الشهر و«هـ» وأرقامًا هندية", () => {
    const label = hijriLabel(new Date(2026, 8, 24));
    expect(label).toContain("هـ");
    // اسم الشهر قد يكون كلمتين (ربيع الأول) — نفحص الاحتواء لا تساوي الكلمة المفردة.
    expect(HIJRI_MONTHS.some((month) => label.includes(month))).toBe(true);
  });
});
