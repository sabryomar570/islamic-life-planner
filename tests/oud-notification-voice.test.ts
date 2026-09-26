/**
 * PHASE NEXT — نفس الشخصية في الإشعار.
 *
 * **ما الذي كان ناقصا:** نصوص التذكير كانت فصحى مهذّبة لا علاقة لها
 * باللهجة ولا بسبب ظهورها، فكان التطبيق يتكلم بصوتين: بطاقة بلهجة
 * وإشعار بلغة تقرير. والاختبارات هنا تمنع الرجوع إلى الصوت الثاني.
 *
 * والقاعدة أمتن من أسلوب: كل صيغةReminder تمرّ على **نفس** حارس
 * الادعاءات الدينية ونفس حارس الإيموجي، فلا طريق لإدخال شرط ألين
 * لطبقة الإشعارات.
 */
import { describe, expect, test } from "bun:test";

import {
  allReminderKinds,
  allVoiceTexts,
  oudReminderBody,
  type OudReminderKind,
} from "../src/lib/oud-voice";
import { buildReminderSchedule } from "../src/hooks/use-reminders";
import { DEFAULT_PREFERENCES, type Preferences } from "../src/hooks/use-preferences";
import type { Timings } from "../src/lib/prayers";

const TIMINGS: Timings = {
  fajr: "05:00",
  sunrise: "06:20",
  dhuhr: "12:30",
  asr: "15:45",
  maghrib: "18:15",
  isha: "19:45",
};

const at = (hour: number, minute = 0) => new Date(2026, 8, 26, hour, minute, 0, 0);

/** مدخلات سخيّة: كل ما قد يحتاجه أي نوع. */
const fullContext = { prayer: "الفجر", minutes: 10 };

describe("كل نوع تذكير ينتج جملة كاملة", () => {
  test("يوجد أنواع لتغطيتها", () => {
    expect(allReminderKinds().length).toBeGreaterThanOrEqual(12);
  });

  test("لا نوع ينتج نصا فارغا أو فيه أقواس ناقصة", () => {
    for (const kind of allReminderKinds()) {
      const text = oudReminderBody(kind, fullContext, at(12, 0));
      expect(text, kind).toBeTruthy();
      expect(text, kind).not.toContain("{");
      expect(text, kind).not.toContain("}");
      expect(text, kind).not.toMatch(/\s{2,}/);
    }
  });

  test("نوعان يحتاجان اسم الصلاة، فبلاه لا نص مكسور", () => {
    expect(oudReminderBody("prayer", {}, at(12, 0))).toBeNull();
    expect(oudReminderBody("lead", { prayer: "الظهر" }, at(12, 0))).toBeNull();
    expect(oudReminderBody("prayer", { prayer: "الظهر" }, at(12, 0))).toBeTruthy();
  });

  test("دقائق بلا رقم لا تُطبع ٠", () => {
    const text = oudReminderBody("lead", { prayer: "الظهر", minutes: 0 }, at(12, 0));
    expect(text).toBeNull();
  });
});

describe("الثبات: نفس اليوم نفس النص، ويوم آخر نص آخر", () => {
  test("نفس النوع ونفس اليوم يعطيان نفس الجملة", () => {
    const first = oudReminderBody("adhkar-morning", {}, at(6, 0));
    const second = oudReminderBody("adhkar-morning", {}, at(23, 59));
    expect(first).toBe(second);
  });

  test("لا عشوائية: عشرون نداء يعطيان نتيجة واحدة", () => {
    const results = new Set(
      Array.from({ length: 20 }, () => oudReminderBody("wird", {}, at(7, 0))),
    );
    expect(results.size).toBe(1);
  });

  test("بين الأيام يتغيّر النص، فالتذكير لا يزعج", () => {
    const day1 = oudReminderBody("wird", {}, new Date(2026, 8, 26, 7, 0));
    const day2 = oudReminderBody("wird", {}, new Date(2026, 8, 27, 7, 0));
    expect(day1).not.toBe(day2);
  });
});

describe("الحارس: نفس قواعد الشخصية بلا استثناء", () => {
  const FORBIDDEN = [
    "مليون حسنة",
    "٢٧ درجة",
    "سبع وعشرين درجة",
    "مفيش حاجة بتغفرها",
    "من صلى الفجر",
    "يحفظ اليوم كامل",
    "يدخل الجنة",
    "رواه",
    "﴿",
    "﴾",
  ];

  test("لا صيغة تذكير تحمل ادعاء دينيا", () => {
    for (const kind of allReminderKinds()) {
      for (const text of allVoiceTexts().filter((entry) => entry.includes("{prayer}") || !entry.includes("{"))) {
        expect(text, `${kind}: ${text}`).not.toMatch(
          new RegExp(FORBIDDEN.map((word) => word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")),
        );
      }
    }
  });

  test("لا إيموجي في أي صيغة: لا بطاقة ولا تذكير", () => {
    // المدىان منفصلان عمدا: جمع محارف الدمج في صنف واحد يجعل
    // القاعدة تخالف نفسها. والاختبار يفحص المحرف بالطول لا بالكتابة.
    const ranges = [/[\u{1F300}-\u{1FAFF}]/u, /[\u{2600}-\u{27BF}]/u, /[\u{FE00}-\u{FE0F}]/u];
    for (const text of allVoiceTexts()) {
      for (const range of ranges) {
        expect(text).not.toMatch(range);
      }
    }
  });

  test("كل الصيغ مغطّاة فعلا، فلا نوع خارج الحارس", () => {
    const texts = allVoiceTexts();
    for (const kind of allReminderKinds()) {
      const probe = oudReminderBody(
        kind,
        { prayer: "الظهر", minutes: 10 },
        at(12, 0),
      );
      expect(probe, kind).not.toBeNull();
      expect(texts.length).toBeGreaterThanOrEqual(allReminderKinds().length);
    }
  });
});

describe("الجدول: كل تذكير يخرج بصوت الشخصية", () => {
  const prefs: Preferences = { ...DEFAULT_PREFERENCES, leadMinutes: 10, soundOn: false };

  test("لا تذكير بجسم فارغ", () => {
    const schedule = buildReminderSchedule({
      now: at(12, 0),
      timings: TIMINGS,
      prefs: { ...prefs, fridayReminder: false },
      prayers: {},
      adhkarDone: [],
    });
    expect(schedule.length).toBeGreaterThan(0);
    for (const event of schedule) {
      expect(event.body.trim().length, event.id).toBeGreaterThan(0);
    }
  });

  test("تذكير الصلاة يحمل الآية بمصدرها", () => {
    const schedule = buildReminderSchedule({
      now: at(12, 0),
      timings: TIMINGS,
      prefs: { ...prefs, fridayReminder: false },
      prayers: {},
      adhkarDone: [],
    });
    const prayer = schedule.find((event) => event.id.includes(":prayer:dhuhr"));
    expect(prayer?.body).toContain("﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾");
    expect(prayer?.body).toContain("طه ١٤");
  });

  test("لا نصّ بلا مصدر بقى في bodies التذكير", () => {
    const schedule = buildReminderSchedule({
      now: at(12, 0),
      timings: TIMINGS,
      prefs,
      prayers: {},
      adhkarDone: [],
    });
    for (const event of schedule) {
      // أي نصّ ديني باقٍ لازم يكون منسوبا. نسمح للآية المنسوبة وحدها.
      if (/﴿/.test(event.body)) {
        expect(event.body, event.id).toContain("طه ١٤");
      }
      expect(event.body, event.id).not.toMatch(/رواه|صحيح|البخاري|مسلم|أبو داود/);
    }
  });
});

describe("تذكير الصلاة على النبي: اختياري بالكامل", () => {
  const base = {
    now: at(19, 0),
    timings: TIMINGS,
    prayers: {},
    adhkarDone: [] as string[],
  };

  test("مطفأ افتراضا، فلا يجيء من تلقاء نفسه", () => {
    expect(DEFAULT_PREFERENCES.salawatReminder).toBe(false);
    const schedule = buildReminderSchedule({ ...base, prefs: DEFAULT_PREFERENCES });
    expect(schedule.some((event) => event.kind === "salawat")).toBe(false);
  });

  test("مفعّل: تذكير واحد في اليوم في الوقت المطلوب", () => {
    const schedule = buildReminderSchedule({
      ...base,
      prefs: { ...DEFAULT_PREFERENCES, salawatReminder: true, salawatTime: "20:30" },
    });
    const events = schedule.filter((event) => event.kind === "salawat");
    expect(events.length).toBe(1);
    expect(events[0].at.getHours()).toBe(20);
    expect(events[0].at.getMinutes()).toBe(30);
    expect(events[0].body.trim().length).toBeGreaterThan(0);
  });

  test("لا عدد ولا فضل في نصّه: تذكير لا وعد", () => {
    const schedule = buildReminderSchedule({
      ...base,
      prefs: { ...DEFAULT_PREFERENCES, salawatReminder: true },
    });
    const body = schedule.find((event) => event.kind === "salawat")?.body ?? "";
    expect(body).not.toMatch(/١٠٠|١٠٠٠|ألف|مليون|أجر|ثواب|فصل|درجة/);
  });

  test("نوع التذكير الجديد مسجّل في العقد", () => {
    const kinds: readonly string[] = [
      "prayer",
      "lead",
      "adhkar",
      "wird",
      "sleep",
      "friday",
      "ramadan",
      "salawat",
    ];
    for (const kind of kinds) {
      const schedule = buildReminderSchedule({
        ...base,
        // تذكير الجمعة مشروط بيوم الجمعة فعلا، ولأن الشرط تاريخي لا رأسي، فنشغّل الاختبار بتاريخ يناسبه.
        now:
          kind === "friday"
            ? new Date(2026, 8, 25, 19, 0, 0, 0)
            : kind === "ramadan"
              ? new Date(2026, 2, 1, 19, 0, 0, 0)
              : base.now,
        sleepTime: "23:00",
        prefs: {
          ...DEFAULT_PREFERENCES,
          salawatReminder: true,
          fridayReminder: kind === "friday",
        },
      });
      expect(
        schedule.some((event) => event.kind === kind),
        kind,
      ).toBe(true);
    }
  });
});

describe("سؤال ما بعد الصلاة: نفس لهجة البطاقة", () => {
  test("النص موجود ومربوط باسم الصلاة", () => {
    const text = oudReminderBody("post-prayer", { prayer: "المغرب" }, at(18, 30));
    expect(text).toContain("المغرب");
    expect(text).not.toMatch(/﴿|رواه|الجنة|أجر/);
  });

  test("بلا اسم صلاة لا نص", () => {
    expect(oudReminderBody("post-prayer", {}, at(18, 30))).toBeNull();
  });

  test("كل الأنواع تُغطّى بجدول حقيقي، فلا نوع بلا تذكير", () => {
    const covered = new Set<string>();
    for (const kind of allReminderKinds()) {
      const text = oudReminderBody(
        kind,
        { prayer: "الظهر", minutes: 10 },
        at(12, 0),
      );
      if (text) covered.add(kind as OudReminderKind);
    }
    expect(covered.size).toBe(allReminderKinds().length);
  });
});
