import { describe, expect, test } from "bun:test";
import {
  NOTIFICATION_TEMPLATES,
  inCooldown,
  markFired,
  nextFireTime,
  priorityInRange,
  resolveApplicableTemplates,
  selectNotifications,
  templateToCandidate,
  withinWindow,
  type AppSnapshot,
  type NotificationTemplate,
} from "../src/lib/notification-templates";
import { classifyNotification } from "../src/lib/notification-intelligence";
import {
  MAX_STORED_NOTIFICATIONS,
  appendNotification,
  clearNotifications,
  groupNotifications,
  isValidNotification,
  makeNotificationId,
  markAllRead,
  markRead,
  readNotifications,
  unreadCount,
  writeNotifications,
  type StoredNotification,
} from "../src/lib/notification-center";
import { cueForCategory, type AudioCue } from "../src/lib/audio";

const ALL_AUDIO_CUES: AudioCue[] = [
  "tap",
  "toggle-on",
  "toggle-off",
  "complete",
  "reminder",
  "prayer",
];

const at = (h: number, m = 0) => new Date(2026, 8, 25, h, m);

function templateById(id: string): NotificationTemplate {
  const found = NOTIFICATION_TEMPLATES.find((item) => item.id === id);
  if (!found) throw new Error(`قالب مفقود: ${id}`);
  return found;
}

/* ————————————————————————————— القوالب ————————————————————————————— */

describe("الإشعارات — طبقة الصياغة", () => {
  test("لكل قالب نص وإجراء ونبرة وأولوية داخل المدى", () => {
    for (const template of NOTIFICATION_TEMPLATES) {
      expect(template.title.trim().length).toBeGreaterThan(0);
      expect(template.body.trim().length).toBeGreaterThan(0);
      expect(template.action.trim().length).toBeGreaterThan(0);
      expect(priorityInRange(template.priority)).toBe(true);
      expect(["quiet", "warm", "direct"]).toContain(template.tone);
    }
  });

  test("لا معرّفات قالب مكررة", () => {
    const ids = new Set(NOTIFICATION_TEMPLATES.map((item) => item.id));
    expect(ids.size).toBe(NOTIFICATION_TEMPLATES.length);
  });

  test("لكل فئة إشعار نغمة واحدة محدّدة", () => {
    const seen = new Set<AudioCue>();
    for (const template of NOTIFICATION_TEMPLATES) {
      const cue = cueForCategory(template.category);
      expect(ALL_AUDIO_CUES).toContain(cue);
      seen.add(cue);
    }
    // الصلاة لها نغمة مستقلة، والاستدراك أخفّ من التنبيه.
    expect(cueForCategory("prayer")).toBe("prayer");
    expect(cueForCategory("recovery")).toBe("tap");
    expect(seen.size).toBeGreaterThan(1);
  });

  test("الإشعار يُترجم إلى مرشح يفهمه المحرّك القائم", () => {
    const candidate = templateToCandidate(templateById("prayer-time"), at(12));
    const classified = classifyNotification(candidate);
    expect(classified.category).toBe("prayer");
    expect(classified.priority).toBeGreaterThanOrEqual(90);
  });

  test("حديث اليوم أولوية دنيا: دعوة قراءة لا مهمة", () => {
    const classified = classifyNotification(templateToCandidate(templateById("hadith-of-day"), at(12)));
    expect(classified.category).toBe("hadith");
    expect(classified.priority).toBeLessThan(35);
  });
});

describe("الإشعارات — لا لوم ولا ضغط", () => {
  const FORBIDDEN = [
    "فشلت",
    "لم تفعل",
    "خسرت",
    "ضائع",
    "تأخرت",
    "يجب عليك",
    "أنت فاشل",
    "PIXEL",
  ];

  test("لا قالب يحمل لغة تلامس المستخدم بالذنب", () => {
    for (const template of NOTIFICATION_TEMPLATES) {
      for (const word of FORBIDDEN) {
        expect(template.title).not.toContain(word);
        expect(template.body).not.toContain(word);
      }
    }
  });

  test("النص قصير: إشعار يُقرأ في نفس واحد", () => {
    for (const template of NOTIFICATION_TEMPLATES) {
      expect(template.title.length).toBeLessThan(45);
      expect(template.body.length).toBeLessThan(110);
    }
  });
});

/* ————————————————————————————— التهدئة ————————————————————————————— */

describe("الإشعارات — التهدئة ومنع التكرار", () => {
  test("قالب لم يُطلق بعد ليس في تهدئة", () => {
    expect(inCooldown(templateById("prayer-time"), {}, at(12))).toBe(false);
  });

  test("الهدئة سارية بعد الإطلاق مباشرة", () => {
    const fired = markFired({}, "prayer-time", at(12));
    expect(inCooldown(templateById("prayer-time"), fired, at(12, 5))).toBe(true);
  });

  test("الهدئة تنتهي بعد مدتها", () => {
    const fired = markFired({}, "prayer-time", at(12));
    // رنين الصلاة 240 دقيقة.
    expect(inCooldown(templateById("prayer-time"), fired, at(16, 1))).toBe(false);
  });

  test("الهدئة تخص القالب نفسه لا غيره", () => {
    const fired = markFired({}, "prayer-time", at(12));
    expect(inCooldown(templateById("hadith-of-day"), fired, at(12, 1))).toBe(false);
  });

  test("التحديد يعيد كائنا جديدا ولا يفسد القديم", () => {
    const before = markFired({}, "a", at(12));
    const after = markFired(before, "b", at(12));
    expect(Object.keys(before)).toEqual(["a"]);
    expect(Object.keys(after)).toEqual(["a", "b"]);
  });
});

/* ————————————————————————————— نافذة التوقيت ————————————————————————————— */

describe("الإشعارات — نافذة التوقيت", () => {
  test("قالب بلا نافذة يصلح في أي وقت", () => {
    expect(withinWindow(templateById("prayer-time"), at(3))).toBe(true);
    expect(withinWindow(templateById("prayer-time"), at(23))).toBe(true);
  });

  test("أذكار الصباح لا تظهر في آخر الليل", () => {
    const morning = templateById("dhikr-morning");
    expect(withinWindow(morning, at(6))).toBe(true);
    expect(withinWindow(morning, at(22))).toBe(false);
  });

  test("قالب نافذته انتهت لهذا اليوم لا يجد طريقا", () => {
    // نافذة أذكار الصباح ٤ إلى ١١. عند الثانية بعد الظهر انتهت.
    expect(nextFireTime(templateById("dhikr-morning"), at(14))).toBeNull();
  });

  test("قالب لم تبدأ نافذته بعد ينتظر بداية اليوم", () => {
    // نافذة أذكار النوم تبدأ ٢٠:٠٠، والوقت الآن ١٠:٠٠.
    const next = nextFireTime(templateById("dhikr-sleep"), at(10));
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(20);
  });

  test("قالب قادم ينتظر حتى يفتح نافذته", () => {
    const next = nextFireTime(templateById("dhikr-morning"), at(2));
    expect(next).not.toBeNull();
    expect(next!.getHours()).toBe(4);
  });

  test("نافذة تعبر منتصف الليل تبقى صحيحة", () => {
    const night = templateById("dhikr-sleep"); // 20:00 إلى 23:59
    expect(withinWindow(night, at(22))).toBe(true);
    expect(withinWindow(night, at(12))).toBe(false);
  });
});

/* ————————————————————————————— الاختيار ————————————————————————————— */

describe("الإشعارات — الاختيار، لا إغراق", () => {
  const firedAll = Object.fromEntries(
    NOTIFICATION_TEMPLATES.map((item) => [item.id, at(12).getTime()]),
  );

  test("دفعة واحدة بحد افتراضي واحد", () => {
    const picked = selectNotifications(NOTIFICATION_TEMPLATES, { now: at(12) });
    expect(picked.length).toBe(1);
  });

  test("السقف الصريح مطاعم حتى مع تفعيل كل شيء", () => {
    const picked = selectNotifications(NOTIFICATION_TEMPLATES, { now: at(12), limit: 3 });
    expect(picked.length).toBeLessThanOrEqual(3);
  });

  test("كل القوالب في تهدئة ⇒ لا شيء يظهر", () => {
    const picked = selectNotifications(NOTIFICATION_TEMPLATES, {
      now: at(12, 1),
      lastFiredAt: firedAll,
    });
    expect(picked.length).toBe(0);
  });

  test("لا إشعارين من الفئة نفسها في نافذة واحدة", () => {
    const prayerTemplates = NOTIFICATION_TEMPLATES.filter(
      (item) => item.category === "prayer",
    );
    const picked = selectNotifications(prayerTemplates, { now: at(12), limit: 5 });
    expect(picked.length).toBe(1);
  });
});

/* ————————————————————————————— ملاءمة الحالة ————————————————————————————— */

function snapshot(over: Partial<AppSnapshot> = {}): AppSnapshot {
  return {
    now: at(12),
    adhkarDone: [],
    prayersLogged: [],
    prayerMinutes: { fajr: 300, dhuhr: 720, asr: 900, maghrib: 1080, isha: 1200 },
    remainingSteps: 3,
    reviewedToday: false,
    missedDays: 0,
    sleepMinutes: 22 * 60 + 30,
    ...over,
  };
}

describe("الإشعارات — ملاءمة حالة المستخدم", () => {
  test("أذكار الصباح تظهر إن لم تُقرأ، وتختفي إن قُرئت", () => {
    const todo = resolveApplicableTemplates(NOTIFICATION_TEMPLATES, snapshot());
    const done = resolveApplicableTemplates(
      NOTIFICATION_TEMPLATES,
      snapshot({ adhkarDone: ["morning"] }),
    );
    expect(todo.some((item) => item.id === "dhikr-morning")).toBe(true);
    expect(done.some((item) => item.id === "dhikr-morning")).toBe(false);
  });

  test("صلاة دخل وقتها ولم تُسجل ترشح نغمة الصلاة", () => {
    const atNoon = snapshot({ now: at(13) });
    const applicable = resolveApplicableTemplates(NOTIFICATION_TEMPLATES, atNoon);
    expect(applicable.some((item) => item.id === "prayer-time")).toBe(true);
  });

  test("كل الصلوات مسجلة فلا داعي لنغمة لاحقة", () => {
    const logged = snapshot({
      now: at(23),
      prayersLogged: ["fajr", "dhuhr", "asr", "maghrib", "isha"],
    });
    const applicable = resolveApplicableTemplates(NOTIFICATION_TEMPLATES, logged);
    expect(applicable.some((item) => item.id === "prayer-time")).toBe(false);
  });

  test("لا خطوة باقية فلا تذكير بمهمة", () => {
    const empty = snapshot({ remainingSteps: 0 });
    const applicable = resolveApplicableTemplates(NOTIFICATION_TEMPLATES, empty);
    expect(applicable.some((item) => item.id === "task-step")).toBe(false);
  });

  test("لا يومان من الانقطاع فلا استدراك", () => {
    expect(
      resolveApplicableTemplates(NOTIFICATION_TEMPLATES, snapshot({ missedDays: 1 })).some(
        (item) => item.id === "recovery-soft",
      ),
    ).toBe(false);
    expect(
      resolveApplicableTemplates(NOTIFICATION_TEMPLATES, snapshot({ missedDays: 2 })).some(
        (item) => item.id === "recovery-soft",
      ),
    ).toBe(true);
  });

  test("المراجعة اليومية تهدأ بعد إنجازها", () => {
    expect(
      resolveApplicableTemplates(NOTIFICATION_TEMPLATES, snapshot({ reviewedToday: true })).some(
        (item) => item.id === "review-day",
      ),
    ).toBe(false);
  });
});

/* ————————————————————————————— السجل ————————————————————————————— */

function record(id: string, minutesAgo: number, read = false): StoredNotification {
  const template = templateById(id);
  return {
    id: makeNotificationId(id, at(12).getTime() - minutesAgo * 60_000),
    templateId: id,
    category: template.category,
    title: template.title,
    body: template.body,
    action: template.action,
    view: template.view,
    tone: template.tone,
    at: at(12).getTime() - minutesAgo * 60_000,
    read,
  };
}

describe("مركز الإشعارات — السجل", () => {
  test("يبدأ السجل فارغا", () => {
    expect(readNotifications()).toEqual([]);
  });

  test("علامة المقروء تتغير ولا تفقد الباقي", () => {
    const list = [record("prayer-time", 10), record("hadith-of-day", 20)];
    const marked = markRead(list, list[0].id);
    expect(marked[0].read).toBe(true);
    expect(marked[1].read).toBe(false);
    expect(list[0].read).toBe(false);
  });

  test("تعليم الكل لا يلمس المحفوظات القديمة", () => {
    const list = [record("prayer-time", 10, true), record("hadith-of-day", 20)];
    const all = markAllRead(list);
    expect(unreadCount(all)).toBe(0);
    expect(all).toHaveLength(2);
  });

  test("التفريغ يفرّغ فعلا", () => {
    expect(clearNotifications()).toEqual([]);
  });

  test("الترتيب: الأحدث أولا", () => {
    const now = at(18);
    const older = { ...record("prayer-time", 600), at: now.getTime() - 600 * 60_000 };
    const newer = { ...record("hadith-of-day", 5), at: now.getTime() - 5 * 60_000 };
    const groups = groupNotifications([older, newer], now);
    expect(groups.today[0].id).toBe(newer.id);
  });

  test("ما قبل اليوم يذهب إلى «قبل ذلك»", () => {
    const now = at(9);
    // قبل يوم كامل: ٣٣ ساعة مضت.
    const yesterday = { ...record("prayer-time", 0), at: now.getTime() - 33 * 3_600_000 };
    const today = { ...record("hadith-of-day", 0), at: now.getTime() - 5 * 60_000 };
    const groups = groupNotifications([yesterday, today], now);
    expect(groups.today).toHaveLength(1);
    expect(groups.earlier).toHaveLength(1);
  });

  test("لا سجل يتجاوز السقف مهما تكرر", () => {
    let list: StoredNotification[] = [];
    for (let i = 0; i < MAX_STORED_NOTIFICATIONS + 25; i += 1) {
      list = appendNotification(list, templateById("hadith-of-day"), at(12).getTime() + i * 86_400_000);
    }
    expect(list.length).toBeLessThanOrEqual(MAX_STORED_NOTIFICATIONS);
  });

  test("الإضافة داخل التهدئة لا تفعل شيئا", () => {
    const first = appendNotification([], templateById("prayer-time"), at(12).getTime());
    const second = appendNotification(first, templateById("prayer-time"), at(12, 1).getTime());
    expect(second).toHaveLength(1);
    expect(second[0].id).toBe(first[0].id);
  });

  test("العنصر التالف يُرفض فلا يسقط السجل", () => {
    expect(isValidNotification(null)).toBe(false);
    expect(isValidNotification({ id: "a" })).toBe(false);
    expect(isValidNotification(record("prayer-time", 5))).toBe(true);
  });

  test("الكتابة والقراءة تستمران بلا رمي", () => {
    const list = [record("prayer-time", 5)];
    expect(() => writeNotifications(list)).not.toThrow();
  });
});
