/** أدوات الوقت والتاريخ — بصياغة عربية وأرقام عربية-هندية (٠١٢٣). */
import { toArabicDigits } from "./hijri";

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map((part) => Number(part));
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return 0;
  return hours * 60 + minutes;
}

export function toHHMM(minutes: number): string {
  const wrapped = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(wrapped / 60);
  const mins = wrapped % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

export function addMinutes(hhmm: string, delta: number): string {
  return toHHMM(toMinutes(hhmm) + delta);
}

/** الفرق بالدقائق من وقت إلى وقت (يتعامل مع عبور منتصف الليل). */
export function diffMinutes(from: string, to: string): number {
  const delta = toMinutes(to) - toMinutes(from);
  return delta < 0 ? delta + 1440 : delta;
}

export function arabicNumber(value: number): string {
  return value.toLocaleString("ar-EG", { useGrouping: false });
}

/** يحوّل 05:16 إلى ٥:١٦ صباحًا */
export function formatArabicTime(hhmm: string, withPeriod = true): string {
  const minutes = toMinutes(hhmm);
  const hours24 = Math.floor(minutes / 60);
  const mins = minutes % 60;
  const isPm = hours24 >= 12;
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  // الدقائق أيضًا بأرقام هندية — كشفها اختبارات bun: كانت تظهر ٥:16 بأرقام مختلطة.
  const time = `${arabicNumber(hours12)}:${toArabicDigits(String(mins).padStart(2, "0"))}`;
  if (!withPeriod) return time;
  return `${time} ${isPm ? "مساءً" : "صباحًا"}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${arabicNumber(minutes)} دقيقة`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (rest === 0) return `${arabicNumber(hours)} ساعة`;
  return `${arabicNumber(hours)} ساعة و${arabicNumber(rest)} دقيقة`;
}

/** مفاتيح التواريخ بصيغة YYYY-MM-DD (بالتوقيت المحلي للمستخدم). */
export function dateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatGregorian(date: Date = new Date()): string {
  return date.toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatHijri(date: Date = new Date()): string {
  try {
    return date.toLocaleDateString("ar-SA-u-ca-islamic-umalqura", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

export function weekdayShort(date: Date): string {
  return date.toLocaleDateString("ar-EG", { weekday: "short" });
}

export function greeting(date: Date = new Date()): string {
  const hour = date.getHours();
  if (hour < 4) return "طابت ليلتك";
  if (hour < 12) return "صباح الخير";
  if (hour < 17) return "نهارك طيب";
  if (hour < 20) return "مساء الخير";
  return "طابت ليلتك";
}

export function isSameDay(a: string, b: string) {
  return a === b;
}
