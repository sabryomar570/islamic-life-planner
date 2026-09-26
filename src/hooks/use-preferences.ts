/** تفضيلات المستخدم: الإشعارات، مواقيت التذكير، قراءة المصحف، وعرض التطبيق. */
import { useCallback, useEffect, useState } from "react";
import type { RingTone } from "@/lib/notify";
import {
  DEFAULT_AUDIO_PREFERENCES,
  type AudioPreferences,
} from "@/lib/audio";

export type Preferences = {
  prayerAlerts: boolean;
  leadMinutes: number;
  adhkarReminders: boolean;
  morningTime: string;
  eveningTime: string;
  wirdReminder: boolean;
  wirdTime: string;
  sleepReminder: boolean;
  fridayReminder: boolean;
  ramadanReminders: boolean;
  nudgesEnabled: boolean;
  /** PHASE 3: المفتاح العام للصوت. إيقافه يوقف كل النغمات بلا استثناء. */
  soundOn: boolean;
  /** نغمة مستقلة عند دخول وقت الصلاة (نفس مفتاح `prayerRing` القديم). */
  prayerRing: boolean;
  ringTone: RingTone;
  /** PHASE 3: قنوات الصوت التفصيلية. */
  notificationSound: boolean;
  completionSound: boolean;
  gentleFeedback: boolean;
  soundVolume: number;
  /** رسالة «هل صلّيت؟» بعد كل صلاة مع سطر الصدق. */
  postPrayerPrompt: boolean;
  salawatPopup: boolean;
  /**
   * PHASE NEXT: تذكير الصلاة على النبي اختياري بالكامل.
   * **مطفأ افتراضا**: نرسل تنبيهها حين يطلبه صاحبه فقط، فلا نصير منتجا
   * يقتحم إيمانه بلا إذن.
   */
  salawatReminder: boolean;
  salawatTime: string;
  method: number;
  fontScale: number;
  reducedMotion: boolean;
};

export const DEFAULT_PREFERENCES: Preferences = {
  prayerAlerts: true,
  leadMinutes: 10,
  adhkarReminders: true,
  morningTime: "06:30",
  eveningTime: "17:30",
  wirdReminder: true,
  wirdTime: "07:00",
  sleepReminder: true,
  fridayReminder: true,
  ramadanReminders: true,
  nudgesEnabled: true,
  soundOn: false,
  prayerRing: true,
  ringTone: "chime" as RingTone,
  notificationSound: true,
  completionSound: true,
  gentleFeedback: true,
  soundVolume: DEFAULT_AUDIO_PREFERENCES.volume,
  postPrayerPrompt: true,
  salawatPopup: true,
  salawatReminder: false,
  salawatTime: "20:00",
  method: 3,
  fontScale: 1.2,
  reducedMotion: false,
};

const STORAGE_KEY = "sakinah:prefs:v1";

/** طرق حساب المواقيت المدعومة (أرقام Aladhan). */
export const PRAYER_METHODS: { value: number; label: string }[] = [
  { value: 3, label: "رابطة العالم الإسلامي" },
  { value: 4, label: "أم القرى — مكة المكرمة" },
  { value: 5, label: "الهيئة المصرية العامة للمساحة" },
  { value: 2, label: "الجمعية الإسلامية بأمريكا الشمالية" },
  { value: 1, label: "جامعة العلوم الإسلامية — كراتشي" },
  { value: 8, label: "دائرة الشؤون الإسلامية — الخليج" },
];

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** يقرأ التفضيلات ويتأكد من صحّة كل قيمة (حماية من بيانات محفوظة قديمة أو معدّلة). */
export function readPreferences(): Preferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFERENCES;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    const merged: Preferences = { ...DEFAULT_PREFERENCES };
    (Object.keys(DEFAULT_PREFERENCES) as (keyof Preferences)[]).forEach((key) => {
      const value = parsed[key];
      if (typeof value === typeof DEFAULT_PREFERENCES[key] && value !== undefined) {
        // @ts-expect-error — التحقق أعلاه يضمن تطابق النوع
        merged[key] = value;
      }
    });
    merged.leadMinutes = clamp(Math.round(merged.leadMinutes), 0, 60);
    merged.fontScale = clamp(merged.fontScale, 0.8, 2);
    merged.soundVolume = clamp(merged.soundVolume, 0, 1);
    merged.method = PRAYER_METHODS.some((item) => item.value === merged.method)
      ? merged.method
      : DEFAULT_PREFERENCES.method;
    for (const key of ["morningTime", "eveningTime", "wirdTime", "salawatTime"] as const) {
      if (!TIME_PATTERN.test(merged[key])) merged[key] = DEFAULT_PREFERENCES[key];
    }
    return merged;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function writePreferences(prefs: Preferences) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* الحافظة ممتلئة */
  }
}

/**
 * PHASE 3 — ترجمة تفضيلات المستخدم إلى بنية الصوت.
 *
 * `soundOn` هو المفتاح العام، و`prayerRing` قناة الصلاة نفسها. هكذا
 * الإعدادان القديمان يبقيان يعملان، وكل قناة لها مفتاح صريح.
 */
export function audioPreferencesOf(prefs: Preferences): AudioPreferences {
  return {
    appSounds: prefs.soundOn,
    notificationSound: prefs.notificationSound,
    prayerReminderSound: prefs.prayerRing,
    completionSound: prefs.completionSound,
    gentleFeedback: prefs.gentleFeedback,
    volume: prefs.soundVolume,
  };
}

export function usePreferences() {
  const [prefs, setPrefs] = useState<Preferences>(() => readPreferences());

  useEffect(() => {
    writePreferences(prefs);
  }, [prefs]);

  const setPref = useCallback(
    <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
      setPrefs((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const reset = useCallback(() => setPrefs(DEFAULT_PREFERENCES), []);

  return { prefs, setPref, setPrefs, reset };
}
