/**
 * حساب التاريخ الهجري والمقارنات الزمنية (عدّ الأيام للمناسبات).
 * نعتمد تقويم أم القرى عبر Intl، وإن لم يتوفر نستخدم حسابًا حسابيًا بسيطًا.
 *
 * الأداء: تحويل التاريخ إلى هجري عملية مكلفة (Intl)، لذلك:
 *  - نُخزّن نتيجة كل تاريخ في ذاكرة مؤقتة،
 *  - ونبحث عن أقرب يوم هجري بحثًا ثنائيًا بدل مسح ٤٠٠ يوم.
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

/** مفتاح يوم محلي YYYY-MM-DD (بلا اعتماد على toISOString لتجنّب فرق المنطقة). */
function localDayKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const partsCache = new Map<string, HijriParts>();
const CACHE_LIMIT = 900;

let hijriFormatter: Intl.DateTimeFormat | null = null;
let hijriFormatterFailed = false;

function formatHijri(date: Date) {
  if (hijriFormatterFailed) return null;
  try {
    hijriFormatter =
      hijriFormatter ??
      new Intl.DateTimeFormat("en-US-u-ca-islamic-umalqura-nu-latn", {
        day: "numeric",
        month: "numeric",
        year: "numeric",
      });
    const parts = hijriFormatter.formatToParts(date);
    const day = Number(parts.find((part) => part.type === "day")?.value);
    const month = Number(parts.find((part) => part.type === "month")?.value);
    const year = Number(parts.find((part) => part.type === "year")?.value);
    if (Number.isFinite(day) && Number.isFinite(month) && Number.isFinite(year)) {
      return { day, month, year };
    }
  } catch {
    hijriFormatterFailed = true;
  }
  return null;
}

export function hijriParts(date: Date = new Date()): HijriParts {
  const key = localDayKey(date);
  const cached = partsCache.get(key);
  if (cached) return cached;

  const computed = formatHijri(date) ?? arithmeticHijri(date);
  const result: HijriParts = {
    day: computed.day,
    month: computed.month,
    year: computed.year,
    monthName: HIJRI_MONTHS[computed.month - 1] ?? "",
  };

  if (partsCache.size > CACHE_LIMIT) partsCache.clear();
  partsCache.set(key, result);
  return result;
}

/** قيمة متزايدة بمرور الأيام (سنة*١٢+شهر)*١٠٠+يوم — تُستخدم للمقارنة والبحث. */
function ordinalOf(parts: HijriParts) {
  return ((parts.year * 12 + parts.month) * 100) + parts.day;
}

function offsetDate(from: Date, offset: number) {
  return new Date(from.getFullYear(), from.getMonth(), from.getDate() + offset);
}

const MAX_SEARCH_DAYS = 420;

/**
 * عدد الأيام حتى أقرب يوم يوافق (شهر/يوم) هجريًا.
 * بحث ثنائي على مدى ٤٢٠ يومًا: ٩ خطوات بدل ٤٢٠.
 */
export function daysUntilHijri(month: number, day: number, from: Date = new Date()) {
  const current = hijriParts(from);
  const currentKey = ordinalOf(current);
  let target = ((current.year * 12 + month) * 100) + day;
  if (target < currentKey) target = (((current.year + 1) * 12 + month) * 100) + day;

  let low = 0;
  let high = MAX_SEARCH_DAYS;
  if (ordinalOf(hijriParts(offsetDate(from, high))) < target) return null;

  while (low < high) {
    const mid = Math.floor((low + high) / 2);
    if (ordinalOf(hijriParts(offsetDate(from, mid))) >= target) high = mid;
    else low = mid + 1;
  }

  const found = hijriParts(offsetDate(from, low));
  if (found.month !== month || found.day !== day) return null;
  return low;
}

/** أقرب يوم من مجموعة أيام في شهر هجري معيّن (مثل أيام البيض ١٣–١٥). */
export function daysUntilHijriSet(month: number, days: number[], from: Date = new Date()) {
  let best: { offset: number; day: number } | null = null;
  for (const day of days) {
    const offset = daysUntilHijri(month, day, from);
    if (offset !== null && (!best || offset < best.offset)) best = { offset, day };
  }
  return best;
}

export function hijriLabel(date: Date = new Date()) {
  const parts = hijriParts(date);
  return `${toArabicDigits(parts.day)} ${parts.monthName} ${toArabicDigits(parts.year)} هـ`;
}

export function hijriKey(date: Date = new Date()) {
  const parts = hijriParts(date);
  return `${parts.month}-${parts.day}`;
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
  if (parts.month !== 9 || parts.day < 22) return false;
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


export function isFriday(date: Date = new Date()) {
  return date.getDay() === 5;
}
