/**
 * PHASE NEXT — اتجاه القبلة: رياضيات صادقة وحدود صادقة.
 *
 * **لماذا أرقام معروفة:** الاتجاه رياضيات لا ذوق، فأي رقم خاطئ يظهر
 * خطأ. القيم أدناه مأخوذة من مراجع القبلة المنشورة الكبرى (القاهرة
 * نحو ١٣٦ درجة، نيويورك نحو ٥٨ درجة، لندن نحو ١١٩ درجة، جاكرتا نحو
 * ٢٩٥ درجة) ومقيسة بدالة مستقلة. فنحن نختبر **الصيغة** لا الأرقام.
 */
import { describe, expect, test } from "bun:test";

import {
  KAABA,
  atKaaba,
  compassSupported,
  distanceToKaabaKm,
  formatBearing,
  formatQiblaDistance,
  isValidPoint,
  needleRotation,
  normalizeDegrees,
  qiblaBearing,
  qiblaDirectionName,
} from "../src/lib/qibla";
import { arabicNumber } from "../src/lib/time";

const CAIRO = { latitude: 30.0444, longitude: 31.2357 };
const NEW_YORK = { latitude: 40.7128, longitude: -74.006 };
const LONDON = { latitude: 51.5074, longitude: -0.1278 };
const JAKARTA = { latitude: -6.2088, longitude: 106.8456 };

describe("الاتجاه: زاوية ابتدائية من موقعك إلى الكعبة", () => {
  test("القاهرة نحو ١٣٦ درجة", () => {
    expect(qiblaBearing(CAIRO)).toBeCloseTo(136.14, 1);
  });

  test("نيويورك نحو ٥٨ درجة", () => {
    expect(qiblaBearing(NEW_YORK)).toBeCloseTo(58.48, 1);
  });

  test("لندن نحو ١١٩ درجة", () => {
    expect(qiblaBearing(LONDON)).toBeCloseTo(118.99, 1);
  });

  test("جاكرتا نحو ٢٩٥ درجة، فالنتيجة لا تقفز بين نصفي الدائرة", () => {
    expect(qiblaBearing(JAKARTA)).toBeCloseTo(295.15, 1);
  });

  test("الزاوية داخل المدى مهما كان الموقع", () => {
    for (const point of [CAIRO, NEW_YORK, LONDON, JAKARTA]) {
      const angle = qiblaBearing(point);
      expect(angle).toBeGreaterThanOrEqual(0);
      expect(angle).toBeLessThan(360);
    }
  });

  test("عند الكعبة نفسها النتيجة صفر بلا انفجار", () => {
    expect(qiblaBearing(KAABA)).toBe(0);
    expect(distanceToKaabaKm(KAABA)).toBeCloseTo(0, 6);
  });

  test("نفس الموقع يعطي نفس الرقم دائما: لا عشوائية ولا تاريخ", () => {
    expect(qiblaBearing(CAIRO)).toBe(qiblaBearing(CAIRO));
  });
});

describe("المسافة: دائرة عظمى لا تقريب مسطح", () => {
  test("القاهرة نحو ١٢٨٧ كيلومتر", () => {
    expect(distanceToKaabaKm(CAIRO)).toBeCloseTo(1287.15, 1);
  });

  test("نيويورك نحو ١٠٣٠٦ كيلومتر", () => {
    expect(distanceToKaabaKm(NEW_YORK)).toBeCloseTo(10306.25, 0);
  });

  test("لندن نحو ٤٧٩٤ كيلومتر", () => {
    expect(distanceToKaabaKm(LONDON)).toBeCloseTo(4793.72, 0);
  });

  test("المسافة لا تنقص سلبا ولا تنفجر عند القطب", () => {
    const northPole = { latitude: 90, longitude: 0 };
    expect(distanceToKaabaKm(northPole)).toBeGreaterThan(0);
    expect(Number.isFinite(distanceToKaabaKm(northPole))).toBe(true);
  });

  test("«أنت عند البيت» تحت كيلومتر واحد فقط", () => {
    expect(atKaaba(distanceToKaabaKm(KAABA))).toBe(true);
    expect(atKaaba(distanceToKaabaKm(CAIRO))).toBe(false);
  });
});

describe("سلامة المدخلات: نرفض ولا نخمّن", () => {
  test("لا إحداثيات، ولا صفر، ولا NaN", () => {
    expect(isValidPoint(null)).toBe(false);
    expect(isValidPoint({})).toBe(false);
    expect(isValidPoint({ latitude: Number.NaN, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: "30", longitude: "31" })).toBe(false);
  });

  test("خط عرض أكبر من ٩٠ مرفوض", () => {
    expect(isValidPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: 30, longitude: 181 })).toBe(false);
  });

  test("الزاوية النافذة تلتف عند الصفر ولا تنقلب", () => {
    expect(normalizeDegrees(-10)).toBe(350);
    expect(normalizeDegrees(370)).toBe(10);
    expect(normalizeDegrees(0)).toBe(0);
    expect(normalizeDegrees(Number.NaN)).toBe(0);
  });
});

describe("اسم الجهة بالعربية", () => {
  test("ست عشرة جهة معروفة", () => {
    expect(qiblaDirectionName(0)).toBe("شمال");
    expect(qiblaDirectionName(90)).toBe("شرق");
    expect(qiblaDirectionName(180)).toBe("جنوب");
    expect(qiblaDirectionName(270)).toBe("غرب");
  });

  test("القاهرة: جنوب شرق", () => {
    expect(qiblaDirectionName(qiblaBearing(CAIRO))).toBe("جنوب شرق");
  });

  test("اللف عند الصفر: ٣٥٧ درجة أقرب إلى شمال منها إلى غرب", () => {
    expect(qiblaDirectionName(357.5)).toBe("شمال");
  });

  test("الاسم لا يدّعي صلاة ولا رضا ولا أجرا", () => {
    for (const angle of [0, 45, 90, 135, 180, 225, 270, 315, 359]) {
      const name = qiblaDirectionName(angle);
      expect(name).not.toMatch(/صلى|صلاة|الجنة|أجر|ثواب|فضل|رضا|رِضى/);
    }
  });
});

describe("البوصلة: نفحص قبل أن ندّعي", () => {
  test("الزوايا تلتف في المدى الصحيح", () => {
    expect(needleRotation(0, 136.14)).toBeCloseTo(136.14, 1);
    expect(needleRotation(100, 50)).toBeCloseTo(310, 1);
  });

  test("بلا مستشعر النتيجة فارغة، ولا إبرة كاذبة", () => {
    expect(needleRotation(null, 136.14)).toBeNull();
    expect(needleRotation(Number.NaN, 136.14)).toBeNull();
  });

  test("في بيئة بلا متصفح نقول لا، ولا نرمي", () => {
    expect(compassSupported()).toBe(false);
  });
});

describe("العرض بالأرقام العربية", () => {
  test("الزاوية والمسافة بأرقام عربية مثل بقية التطبيق", () => {
    expect(formatBearing(136.14)).toBe(arabicNumber(136));
    expect(formatBearing(0)).toBe(arabicNumber(0));
    expect(formatQiblaDistance(1287.15)).toBe(`${arabicNumber(1287)} كم`);
    expect(formatQiblaDistance(0.42)).toBe(`${arabicNumber(420)} متر`);
  });

  test("مدخل تالف يرجع شرطة، لا «NaN كم»", () => {
    expect(formatQiblaDistance(Number.NaN)).toBe("—");
    expect(formatQiblaDistance(-4)).toBe("—");
  });
});
