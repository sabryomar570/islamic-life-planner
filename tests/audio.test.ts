import { describe, expect, test } from "bun:test";
import {
  AUDIO_CHANNELS,
  DEFAULT_AUDIO_PREFERENCES,
  MAX_CUE_DURATION_MS,
  channelOf,
  cueAllowed,
  cueDuration,
  cueWithinSafetyLimit,
  effectiveVolume,
  type AudioCue,
  type AudioPreferences,
} from "../src/lib/audio";
import { audioPreferencesOf, DEFAULT_PREFERENCES } from "../src/hooks/use-preferences";

const ALL_CUES: AudioCue[] = [
  "tap",
  "toggle-on",
  "toggle-off",
  "complete",
  "reminder",
  "prayer",
];

const on: AudioPreferences = {
  ...DEFAULT_AUDIO_PREFERENCES,
  appSounds: true,
  volume: 1,
};

describe("الصوت — البوابة النقية", () => {
  test("المفتاح العام يقفل كل شيء", () => {
    const off = { ...on, appSounds: false };
    for (const cue of ALL_CUES) {
      expect(cueAllowed(cue, off)).toBe(false);
    }
  });

  test("إطفاء قناة واحدة لا يمسّ غيرها", () => {
    const noPrayer = { ...on, prayerReminderSound: false };
    expect(cueAllowed("prayer", noPrayer)).toBe(false);
    expect(cueAllowed("complete", noPrayer)).toBe(true);
    expect(cueAllowed("tap", noPrayer)).toBe(true);
  });

  test("صوت الصلاة قناة مستقلة وليست نسخة من التنبيه", () => {
    const noNotification = { ...on, notificationSound: false };
    expect(cueAllowed("reminder", noNotification)).toBe(false);
    expect(cueAllowed("prayer", noNotification)).toBe(true);
  });

  test("اللمسة الخفيفة تتبع رد الفعل الخفيف", () => {
    const noFeedback = { ...on, gentleFeedback: false };
    for (const cue of ["tap", "toggle-on", "toggle-off"] as AudioCue[]) {
      expect(cueAllowed(cue, noFeedback)).toBe(false);
    }
  });

  test("الصوت صامت افتراضيا", () => {
    expect(DEFAULT_AUDIO_PREFERENCES.appSounds).toBe(false);
    expect(cueAllowed("prayer", DEFAULT_AUDIO_PREFERENCES)).toBe(false);
  });

  test("مستوى الصوت صفر يسكت كل قناة مفتوحة", () => {
    const silent = { ...on, volume: 0 };
    for (const cue of ALL_CUES) {
      expect(cueAllowed(cue, silent)).toBe(false);
    }
  });
});

describe("الصوت — مستوى الصوت الفعلي", () => {
  test("المفتاح العام يضرب المستوى إلى الصفر", () => {
    expect(effectiveVolume({ ...on, appSounds: false, volume: 0.9 })).toBe(0);
  });

  test("المستوى يبقى بين صفر وواحد", () => {
    expect(effectiveVolume({ ...on, volume: 5 })).toBe(1);
    expect(effectiveVolume({ ...on, volume: -3 })).toBe(0);
    expect(effectiveVolume({ ...on, volume: Number.NaN })).toBe(0);
    expect(effectiveVolume({ ...on, volume: 0.4 })).toBeCloseTo(0.4);
  });
});

describe("الصوت — حدود الأمان", () => {
  test("لا نغمة تتجاوز الحد المسموح", () => {
    for (const cue of ALL_CUES) {
      expect(cueWithinSafetyLimit(cue)).toBe(true);
      expect(cueDuration(cue)).toBeLessThanOrEqual(MAX_CUE_DURATION_MS);
    }
  });

  test("نغمة الصلاة هي الأطول لأنها تحتاج أن تُميَّز", () => {
    expect(cueDuration("prayer")).toBe(MAX_CUE_DURATION_MS);
    for (const cue of ALL_CUES.filter((item) => item !== "prayer")) {
      expect(cueDuration(cue)).toBeLessThan(cueDuration("prayer"));
    }
  });

  test("كل نوع صوت مربوط بقناة معرّفة", () => {
    for (const cue of ALL_CUES) {
      expect(AUDIO_CHANNELS.some((channel) => channel.key === channelOf(cue))).toBe(true);
    }
  });

  test("لا موسيقى: لا نوع صوت بلا قناة", () => {
    for (const cue of ALL_CUES) {
      expect(["notification", "prayer", "completion", "feedback"]).toContain(channelOf(cue));
    }
  });
});

describe("الصوت — الربط بتفضيلات المستخدم", () => {
  test("soundOn هو المفتاح العام", () => {
    expect(audioPreferencesOf({ ...DEFAULT_PREFERENCES, soundOn: false }).appSounds).toBe(false);
    expect(audioPreferencesOf({ ...DEFAULT_PREFERENCES, soundOn: true }).appSounds).toBe(true);
  });

  test("prayerRing هو قناة الصلاة نفسها، بلا إعداد ثانٍ", () => {
    const off = audioPreferencesOf({ ...DEFAULT_PREFERENCES, prayerRing: false });
    expect(off.prayerReminderSound).toBe(false);
  });

  test("التفضيلات المحفوظة تنتج نغمة مسموحة", () => {
    const prefs = audioPreferencesOf({
      ...DEFAULT_PREFERENCES,
      soundOn: true,
      soundVolume: 0.3,
    });
    expect(cueAllowed("complete", prefs)).toBe(true);
    expect(effectiveVolume(prefs)).toBeCloseTo(0.3);
  });
});
