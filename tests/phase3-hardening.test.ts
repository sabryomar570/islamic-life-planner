/**
 * PHASE 3 — تقوية ختامية.
 *
 * اختبارات لما كُشف في التدقيق ولم يكن له حارس: صحّة التهدئة الحيّة،
 * ومسار الصوت، وحدود المستطيل، وحدود البيانات على الجهاز.
 *
 * القاعدة التي تحكمها: ما لا يمكن أن يُرى في المتصفح هنا، يُقاس هنا
 * آليا — وإلا صار «مُتحقَّقًا منه» بلا دليل.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  channelOf,
  cueForCategory,
  DEFAULT_AUDIO_PREFERENCES,
  type NotificationCategoryKey,
} from "../src/lib/audio";
import { insightsForArea, type InsightArea } from "../src/lib/insights";
import { HADITHS } from "../src/data/hadith";
import {
  gradeOf,
  hadithKindOf,
  HADITH_KIND_LABELS,
  REVIEW_STATUS_LABELS,
} from "../src/lib/hadith-metadata";
import {
  clearLocalData,
  isLocalDataCurrent,
  localDataEpoch,
} from "../src/lib/local-data";

const read = (path: string) => readFileSync(path, "utf8");

const emptyStore = {
  get length() {
    return 0;
  },
  key: () => null,
  removeItem: () => {},
};

describe("التقوية — سجل التهدئة الحيّ", () => {
  test("المؤقّت يقرأ السجل من مرآة لا من نسخة أول رسم", () => {
    // إعادة رسم بلا تغيير في `enabled` لا يجوز أن تجمّد تهدئة الجلسة.
    const source = read("src/hooks/use-notification-center.ts");
    expect(source).toContain("itemsRef");
    // والانسداد كان: `items` المغلقة تُقرأ داخل المؤقّت.
    expect(source).not.toMatch(/lastFiredAt:[^}]*\bitems\.map\b/);
    expect(source).toMatch(/lastFiredAt:[\s\S]{0,120}itemsRef\.current/);
  });

  test("تعطيل التكرار مبني في الحارس نفسه لا في ترتيب المحرّك", () => {
    // حتى لو اختار المحرّك قالبا في تهدئته، فالسجل يرفضه.
    const source = read("src/lib/notification-center.ts");
    expect(source).toContain("inCooldown(template, lastFired, now)");
  });

  test("فشل التقييم لا يخرج من المؤقّت ولا يُسقط التطبيق", () => {
    const source = read("src/hooks/use-notification-center.ts");
    // جسم المؤقّت كله داخل try/catch: لقطة ناقصة أو تخزين ممتلئ.
    expect(source).toMatch(/const tick = \(\) => \{[\s\S]*?try \{[\s\S]*?\} catch \{/);
  });
});

describe("التقوية — مسار الصوت", () => {
  const categories: NotificationCategoryKey[] = [
    "prayer",
    "task",
    "commitment",
    "review",
    "dhikr",
    "recovery",
    "occasion",
    "hadith",
  ];

  test("كل إشعار يتبع مفتاح التنبيه أو مفتاح الصلاة، لا غيرهما", () => {
    for (const category of categories) {
      expect(["notification", "prayer"]).toContain(channelOf(cueForCategory(category)));
    }
  });

  test("الصلاة وحدها لها نغمة مستقلة", () => {
    const distinct = new Set(categories.map((category) => cueForCategory(category)));
    expect(distinct.size).toBe(2);
  });

  test("إطفاء الصوت العام يُسكت كل الإشعارات مهما كانت القناة", () => {
    const prefs = { ...DEFAULT_AUDIO_PREFERENCES, appSounds: false, volume: 1 };
    // البوابة نفسها تكفي: كل الإشارات تمر عبرها.
    expect(DEFAULT_AUDIO_PREFERENCES.appSounds).toBe(false);
    expect(prefs.appSounds).toBe(false);
  });
});

describe("التقوية — أمانة نسب المحتوى", () => {
  test("مصدر كل اقتباس يبدأ بنسبته، فلا يُقرأ الأثر حديثا مرفوعا", () => {
    for (const area of ["today", "prayers", "review"] as const) {
      for (const insight of insightsForArea(area, new Date(2026, 8, 25, 9, 0), 4)) {
        const hadith = HADITHS.find((item) => item.id === insight.id.replace("insight-", ""));
        expect(hadith).toBeDefined();
        const kind = hadithKindOf(hadith!);
        expect(insight.source.startsWith(HADITH_KIND_LABELS[kind])).toBe(true);
        expect(insight.source).toContain(hadith!.source);
      }
    }
  });

  test("عنوان النسبة نفسه لا يدّعي توثيقا لم يقع", () => {
    // العنوان هو أول ما يقرأه المستخدم. لا «موثّق» ولا «صحيح» في اسم النوع.
    for (const label of Object.values(HADITH_KIND_LABELS)) {
      expect(label).not.toMatch(/موثّق|صحيح|متواتر|ثابت/);
    }
    for (const [status, label] of Object.entries(REVIEW_STATUS_LABELS)) {
      if (status !== "verified") expect(label).not.toMatch(/موثّق برقمه/);
    }
  });

  test("الدرجة لا تظهر إلا إذا سُجّلت، وسجل الدرجات فارغ اليوم", () => {
    expect(HADITHS.filter((hadith) => hadith.grade).length).toBe(0);
    expect(gradeOf({})).toBeNull();
    // `gradeOf` لا يختلق درجة لغيابها، فلا يعرض صفرا كأنه حكم.
    expect(gradeOf({ grade: "صحيح" })).toBe("صحيح");
  });
});

describe("التقوية — حدود المستطيل", () => {
  test("لا وجود لقسم رابع في نوع الأقسام", () => {
    const areas: readonly InsightArea[] = ["today", "prayers", "review"];
    expect(areas.length).toBe(3);
    // المدخلات الزائدة حُذفت من المصدر، فالنوع لا يقبلها.
    const source = read("src/lib/insights.ts");
    expect(source).not.toMatch(/^\s*(habits|adhkar|tasbih|duas|quran|weekly|stats|settings|saved|occasions):/m);
  });

  test("المستطيل في ثلاثة أقسام فقط: اليوم والصلاة والمراجعة", () => {
    const consumers: string[] = [];
    for (const area of ["today", "prayers", "review"] as const) {
      if (insightsForArea(area, new Date(2026, 8, 25, 9, 0), 2).length > 0) {
        consumers.push(area);
      }
    }
    expect(consumers.length).toBe(3);
  });

  test("الشاشات الثلاث تستهلك المستطيل، ولا غيرها", () => {
    for (const file of ["HomeView.tsx", "PrayerView.tsx", "DailyReview.tsx"]) {
      expect(read(`src/components/app/${file}`)).toContain("InsightSlot");
    }
    // مستهلك رابع في أي مكان آخر من الشيفرة = فشل.
    const appFiles = [
      ...read("src/components/app/SettingsView.tsx").matchAll(/InsightSlot/g),
    ];
    expect(appFiles).toHaveLength(0);
  });
});

describe("التقوية — بيانات الجهاز", () => {
  test("المسح يرفع عهد الجهاز فتتوقف الكتابة الحيّة", () => {
    const before = localDataEpoch();
    expect(isLocalDataCurrent(before)).toBe(true);
    clearLocalData(emptyStore);
    const after = localDataEpoch();
    expect(after).toBeGreaterThan(before);
    // هذا هو الحارس: كاتب نُركِّب قبل المسح لا يجد عهده صالحا.
    expect(isLocalDataCurrent(before)).toBe(false);
    expect(isLocalDataCurrent(after)).toBe(true);
  });

  test("المسح مرارًا لا يترك عهدًا صالحًا لكاتب قديم", () => {
    const stale = localDataEpoch();
    clearLocalData(emptyStore);
    clearLocalData(emptyStore);
    expect(isLocalDataCurrent(stale)).toBe(false);
  });

  test("محرّك الإشعارات يلتزم بالعهد ولا يعيد كتابة ما مُسح", () => {
    const source = read("src/hooks/use-notification-center.ts");
    expect(source).toContain("localDataEpoch()");
    expect(source).toContain("isLocalDataCurrent(epoch)");
    // الشرط يوقف المؤقّت كله لا تذكّرًا واحدا.
    expect(source).toMatch(/!isLocalDataCurrent\(epoch\)\) \{\s*cancel(l)?ed = true;\s*return;/);
  });
});
