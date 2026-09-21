/** بيانات الصلوات الخمس + أنواع مواقيت الصلاة. */

export type PrayerKey = "fajr" | "dhuhr" | "asr" | "maghrib" | "isha";

export type PrayerStatus = "jamaah" | "ontime" | "late" | "missed";

export const PRAYERS: {
  key: PrayerKey;
  name: string;
  ornament: string;
  hint: string;
}[] = [
  { key: "fajr", name: "الفجر", ornament: "🌄", hint: "أذكار الصباح بعدها مباشرة" },
  { key: "dhuhr", name: "الظهر", ornament: "☀️", hint: "أفضل وقت لورد القرآن" },
  { key: "asr", name: "العصر", ornament: "🌤️", hint: "صلاة البردين، من حافظ عليها دخل الجنة" },
  { key: "maghrib", name: "المغرب", ornament: "🌇", hint: "بعدها أذكار المساء" },
  { key: "isha", name: "العشاء", ornament: "🌙", hint: "ثم أذكار النوم" },
];

export const PRAYER_STATUS_LABELS: Record<PrayerStatus, string> = {
  jamaah: "في جماعة",
  ontime: "في الوقت",
  late: "متأخرة",
  missed: "فائتة",
};

export type Timings = Record<PrayerKey, string> & { sunrise: string };

/** مواقيت تقريبية تُستخدم فقط إذا تعذّر الوصول لخدمة المواقيت. */
export const FALLBACK_TIMINGS: Timings = {
  fajr: "05:00",
  sunrise: "06:20",
  dhuhr: "12:30",
  asr: "15:45",
  maghrib: "18:15",
  isha: "19:45",
};

export function nextPrayer(timings: Timings, now: Date = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (const prayer of PRAYERS) {
    const [hours, minutes] = timings[prayer.key].split(":").map(Number);
    const prayerMinutes = hours * 60 + minutes;
    if (prayerMinutes > nowMinutes) {
      return { ...prayer, time: timings[prayer.key], minutesLeft: prayerMinutes - nowMinutes };
    }
  }
  const [hours, minutes] = timings.fajr.split(":").map(Number);
  const fajrMinutes = hours * 60 + minutes;
  return {
    ...PRAYERS[0],
    time: timings.fajr,
    minutesLeft: fajrMinutes + 1440 - nowMinutes,
  };
}

export function currentPrayer(timings: Timings, now: Date = new Date()) {
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const passed = PRAYERS.filter((prayer) => {
    const [hours, minutes] = timings[prayer.key].split(":").map(Number);
    return hours * 60 + minutes <= nowMinutes;
  });
  return passed.length > 0 ? passed[passed.length - 1] : null;
}
