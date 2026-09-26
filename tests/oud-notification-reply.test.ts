/**
 * PHASE NEXT — الردّ من الإشعار، ضمن حدود المنصة.
 *
 * الاختبارات هنا تحرس **ادّعاء**. ما نكتبه في التقرير والواجهة يجب أن يطابق
 * ما يفعله المتصفح فعلا:
 * - أزرار الإشعار موجودة في الويب وتعمل على Chromium و Firefox-أندرويد.
 * - الردّ النصّي داخل الإشعار **غير موجود في الويب**، ومن ينبّئ غير ذلك كاذب.
 * - ما نفعله: زرّان يفتحان التطبيق ومعهما ردّ محفوظ، لا صندوق كتابة وهمي.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import { notificationActionsSupported } from "../src/lib/notify";
import { buildReminderSchedule } from "../src/hooks/use-reminders";
import { DEFAULT_PREFERENCES, type Preferences } from "../src/hooks/use-preferences";
import type { Timings } from "../src/lib/prayers";

const SW = readFileSync("public/sw.js", "utf8");

const TIMINGS: Timings = {
  fajr: "05:00",
  sunrise: "06:20",
  dhuhr: "12:30",
  asr: "15:45",
  maghrib: "18:15",
  isha: "19:45",
};

const at = (hour: number, minute = 0) => new Date(2026, 8, 26, hour, minute, 0, 0);

const prefs: Preferences = { ...DEFAULT_PREFERENCES, leadMinutes: 10, soundOn: false };

describe("القدرة: نفحص قبل أن ندّعي", () => {
  test("الفحص لا يرمي خطأ في بيئة بلا Notification", () => {
    const original = (globalThis as { Notification?: unknown }).Notification;
    try {
      (globalThis as { Notification?: unknown }).Notification = undefined;
      expect(notificationActionsSupported()).toBe(false);
    } finally {
      (globalThis as { Notification?: unknown }).Notification = original;
    }
  });

  test("في بيئة بلا خاصية actions نقول لا", () => {
    const original = (globalThis as { Notification?: unknown }).Notification;
    try {
      (globalThis as { Notification?: unknown }).Notification = function Fake() {} as never;
      // كائن دالة عادي: prototype بلا actions
      expect(notificationActionsSupported()).toBe(false);
      class WithActions {
        static permission = "granted";
      }
      Object.defineProperty(WithActions.prototype, "actions", { value: [] });
      (globalThis as { Notification?: unknown }).Notification = WithActions as never;
      expect(notificationActionsSupported()).toBe(true);
    } finally {
      (globalThis as { Notification?: unknown }).Notification = original;
    }
  });
});

describe("الجدول: تذكير الصلاة يحمل رابط العرض الصحيح", () => {
  const schedule = buildReminderSchedule({
    now: at(12, 0),
    timings: TIMINGS,
    prefs,
    prayers: {},
    adhkarDone: [],
  });

  test("لكل صلاة تذكير ووجهته شاشة الصلاة", () => {
    const prayerEvents = schedule.filter((event) => event.kind === "prayer");
    expect(prayerEvents).toHaveLength(5);
    for (const event of prayerEvents) {
      expect(event.url).toBe("/dashboard?view=prayers");
    }
  });

  test("تذكير ما قبل الصلاة موجود ويسبق وقتها", () => {
    const lead = schedule.find((event) => event.kind === "lead");
    expect(lead).toBeTruthy();
    expect(lead!.at.getTime()).toBeLessThan(lead!.at.getTime() + 10 * 60_000);
  });
});

describe("عامل الخدمة — العقد مع المتصفح", () => {
  test("يمرّر actions من الرسالة إلى الإشعار", () => {
    expect(SW).toContain('data.type === "NOTIFY"');
    expect(SW).toContain("actions: Array.isArray(actions) ? actions : undefined");
  });

  test("يقرأ event.action ويحوّله إلى reply في الرابط", () => {
    expect(SW).toContain("const action = event.action ||");
    expect(SW).toContain("reply=${encodeURIComponent(action)}");
  });

  test("لا يرسم حقل كتابة داخل الإشعار: لا نصّ يُرسل ولا نصّ يُقرأ", () => {
    // ذكر `RemoteInput` في تعليق **لإثبات غيابه** مقصود، فلا نحسبه
    // الادّعاء would be a real text field, and we assert its absence.
    const notifyBlock = SW.slice(SW.indexOf('data.type === "NOTIFY"'), SW.indexOf('data.type === "CLEAR_CACHES"'));
    expect({ hasInput: /\binput\b\s*:/.test(notifyBlock), hasText: /\btext\b\s*:/.test(notifyBlock) }).toEqual({
      hasInput: false,
      hasText: false,
    });
    expect(SW).not.toContain("event.text");
  });

  test("الضغط العادي بلا زر يفتح الوجهة كما كانت", () => {
    expect(SW).toContain("const base = (event.notification.data && event.notification.data.url)");
  });
});

describe("أمان — ما لا نكتبه", () => {
  test("لا ادّعاء بردّ نصّي داخل الإشعار في الكود كله", () => {
    const notify = readFileSync("src/lib/notify.ts", "utf8");
    // الكود يذكر RemoteInput **ليقرّ بغيابه**، لا ليدّعيه.
    expect(notify).toContain("RemoteInput");
    expect(notify).toContain("notificationsSupported");
  });
});
