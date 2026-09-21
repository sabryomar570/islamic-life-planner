/**
 * حساب التاريخ الهجري والمقارنات الزمنية (عدّ الأيام للمناسبات).
 * نعتمد تقويم أم القرى عبر Intl، وإن لم يتوفر نستخدم حسابًا حسابيًا بسيطًا.
 */

export const HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربيع الأول",
  "ربيع الآخر",
  "جمادى الأولى",
  "جمادى الآخرة",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذو القعدة",
  "ذو الحجة",
];

export type HijriParts = {
  day: number;
  month: number;
  year: number;
  monthName: string;
};

const ARABIC_DIGITS: Record<string, string> = {
  "0": "٠",
  "1": "١",
  "2": "٢",
  "3": "٣",
  "4": "٤",
  "5": "٥",
  "6": "٦",
  "7": "٧",
  "8": "٨",
  "9": "٩",
};

export function toArabicDigits(value: string | number) {
  return String(value).replace(/[0-9]/g, (digit) => ARABIC_DIGITS[digit] ?? digit);
}

/** تحويل حسابي احتياطي (خوارزمية كويتية مبسّطة) إن فشل Intl. */
function arithmeticHijri(date: Date) {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  let julianDays: number;
  if (month < 3) {
    julianDays = Math.floor((year - 1) * 365.25) + Math.floor((month + 10) * 30.6) + day - 321;
  } else {
    julianDays = Math.floor(year * 365.25) + Math.floor((month - 3) * 30.6) + day - 321;
  }
  const l = julianDays - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const remainder = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - remainder) / 5316) * Math.floor((50 * remainder) / 17719) +
    Math.floor(remainder / 5670) * Math.floor((43 * remainder) / 15238);
  const adjusted =
    remainder -
    Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) -
    Math.floor(j / 16) * Math.floor((15238 * j) / 43) +
    29;
  const hijriMonth = Math.floor((24 * adjusted) / 709);
  const hijriDay = adjusted - Math.floor((709 * hijriMonth) / 24);
  const hijriYear = 30 * n + j - 30;
  return { day: hijriDay, month: hijriMonth, year: hijriYear };
}

export function hijriParts(date: Date = new Date()): HijriParts {
  try {
    const formatter = new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", {
      day: "numeric",
      month: "numeric",
      year: "numeric",
    });
    const parts = formatter.formatToParts(date);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      return { day, month, year, monthName: HIJRI_MONTHS[month - 1] ?? "" };
    }
  } catch {
    /* ننتقل للحساب الاحتياطي */
  }
  const fallback = arithmeticHijri(date);
  return {
    day: fallback.day,
    month: fallback.month,
    year: fallback.year,
    monthName: HIJRI_MONTHS[fallback.month - 1] ?? "",
  };
}

export function hijriLabel(date: Date = new Date()) {
  const parts = hijriParts(date);
  return `${toArabicDigits(parts.day)} ${parts.monthName} ${toArabicDigits(parts.year)} هـ`;
}

export function hijriKey(date: Date = new Date()) {
  const parts = hijriParts(date);
  return `${parts.month}-${parts.day}`;
}

/**
 * عدد الأيام حتى أقرب يوم يوافق (شهر/يوم) هجريًا.
 * نمسح الأيام حتى ٤٠٠ يوم لتفادي أخطاء التحويل.
 */
export function daysUntilHijri(month: number, day: number, from: Date = new Date()) {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  for (let offset = 0; offset <= 400; offset += 1) {
    const parts = hijriParts(cursor);
    if (parts.month === month && parts.day === day) return offset;
    cursor.setDate(cursor.getDate() + 1);
  }
  return null;
}

/** أقرب يوم من مجموعة أيام في شهر هجري معيّن (مثل أيام البيض ١٣–١٥). */
export function daysUntilHijriSet(month: number, days: number[], from: Date = new Date()) {
  for (const day of days) {
    const offset = daysUntilHijri(month, day, from);
    if (offset !== null) return { offset, day };
  }
  return null;
}

export function isRamadan(date: Date = new Date()) {
  return hijriParts(date).month === 9;
}

export function ramadanDay(date: Date = new Date()) {
  const parts = hijriParts(date);
  return parts.month === 9 ? parts.day : null;
}

/** الليالي الوترية من العشر الأواخر (٢١، ٢٣، ٢٥، ٢٧، ٢٩). */
export function isOddNightOfLastTen(date: Date = new Date()) {
  const parts = hijriParts(date);
  if (parts.month !== 9 || parts.day < 21) return false;
  // الليلة تسبق يومها: ليلة ٢١ تبدأ مساء اليوم ٢٠.
  const night = parts.day - 1;
  return night >= 21 && night % 2 === 1;
}

/** وصف مختصر لموقعنا من الشهر الهجري: «رمضان • اليوم ٥». */
export function hijriProgressLabel(date: Date = new Date()) {
  const parts = hijriParts(date);
  return `${parts.monthName} • اليوم ${toArabicDigits(parts.day)}`;
}

/** هل نحن في العشر الأواخر من رمضان؟ */
export function isLastTenNights(date: Date = new Date()) {
  const parts = hijriParts(date);
  return parts.month === 9 && parts.day >= 20;
}

export function daysToRamadan(date: Date = new Date()) {
  return daysUntilHijri(9, 1, date);
}

export function isFriday(date: Date = new Date()) {
  return date.getDay() === 5;
}
