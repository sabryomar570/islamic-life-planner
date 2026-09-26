/**
 * PHASE NEXT — شخصية عود في الكلام.
 *
 * أهم اختبار هنا ليس سلوكا بل **ممنوع**: أن يخرج من طبقة الشخصية نصّ يدّعي
 * فضلًا أو أجرا أو حديثا بلا مصدر. هذه الطبقة لا تنسب إلى الدين شيئا،
 * فلو دخل منها ادعاء صار التطبيق يقول كلاما عن الله لا سند له.
 */
import { describe, expect, test } from "bun:test";

import {
  allVoiceIds,
  allVoiceTexts,
  applicableGroups,
  markLineShown,
  oudLine,
  seedOf,
  shouldShowLine,
  type OudVoiceContext,
} from "../src/lib/oud-voice";
import { detectIntent, openingLine, respond, type ChatContext } from "../src/lib/oud-chat";

const at = (hour: number, minute = 0) => new Date(2026, 8, 26, hour, minute, 0, 0);

const base: OudVoiceContext = { now: at(15, 50) };

describe("الشخصية — الثبات", () => {
  test("نفس السياق ونفس اليوم يعطيان نفس السطر بالضبط", () => {
    const context: OudVoiceContext = {
      ...base,
      lastPrayer: { name: "العصر", minutesAgo: 12, logged: false },
    };
    const first = oudLine(context);
    const second = oudLine({ ...context });
    expect(first).toEqual(second);
  });

  test("تغيّر اليوم يغيّر الذرة، فلا تتكرّر الجملة نفسها كل يوم", () => {
    const a = at(15, 50);
    const b = new Date(2026, 8, 27, 15, 50);
    expect(seedOf("prayer-chase", "2026-9-26")).not.toBe(seedOf("prayer-chase", "2026-9-27"));
    expect(a.getDate()).not.toBe(b.getDate());
  });

  test("البذرة نفسها تعطي الصيغة نفسها، لا عشوائية مقنّعة", () => {
    expect(seedOf("quiet", "2026-9-26")).toBe(seedOf("quiet", "2026-9-26"));
  });
});

describe("الشخصية — الأولوية: الصلاة فوق كل شيء", () => {
  test("صلاة دخل وقتها ولم تُسجّل تسبق أي كلام عن المهام", () => {
    const line = oudLine({
      ...base,
      lastPrayer: { name: "العصر", minutesAgo: 12, logged: false },
      task: { title: "المذاكرة", startsInMinutes: 0 },
      mosque: { name: "الكوخ", distanceMeters: 120 },
    });
    expect(line?.id).toBe("prayer-chase");
    expect(line?.text).toContain("العصر");
  });

  test("اقتراب الصلاة يعطي تنبيها لا سؤالا", () => {
    const line = oudLine({ now: at(16, 58), nextPrayer: { name: "العصر", minutesLeft: 5 } });
    expect(line?.id).toBe("prayer-lead");
  });

  test("لا خط عن الصلاة إن سُجّلت", () => {
    const ids = applicableGroups({
      ...base,
      lastPrayer: { name: "العصر", minutesAgo: 30, logged: true },
    });
    expect(ids).not.toContain("prayer-chase");
    expect(ids).not.toContain("prayer-direct");
  });

  test("الصلاة اقترتِب والإعلان فوق كل الأولويات الآخرى", () => {
    const line = oudLine({
      now: at(16, 2),
      lastPrayer: { name: "العصر", minutesAgo: 2, logged: false },
      nextPrayer: { name: "المغرب", minutesLeft: 400 },
    });
    expect(line?.id).toBe("prayer-time");
  });
});

describe("الشخصية — الذاكرة لا تختلق", () => {
  test("لا تذكير بالماضي من غير سابق مسجّل", () => {
    const line = oudLine({
      ...base,
      task: { title: "المذاكرة", startsInMinutes: 0 },
      taskPostponedCount: 0,
    });
    expect(line?.id).toBe("task-time");
    expect(line?.text).not.toContain("فاكر");
  });

  test("التذكير بالسابق يظهر فقط عند تكرار حقيقي في السجل", () => {
    const line = oudLine({
      ...base,
      task: { title: "المذاكرة", startsInMinutes: 0 },
      taskPostponedCount: 3,
    });
    expect(line?.id).toBe("task-procrastination");
  });

  test("الغياب يظهر عند يومين فأكثر، لا قبلهما", () => {
    expect(oudLine({ ...base, quietDays: 1 })?.id).not.toBe("absence");
    expect(oudLine({ ...base, quietDays: 2 })?.id).toBe("absence");
  });
});

describe("الشخصية — المدح نادر", () => {
  test("لا نشكر على اليوم العادي", () => {
    const line = oudLine({ ...base, loggedToday: 1 });
    expect(["proud", "warm"]).not.toContain(line?.tone);
  });

  test("المدح يحتاج حدثا حقيقيا: يوم كامل أو رجوع", () => {
    expect(oudLine({ ...base, dayComplete: true })?.tone).toBe("proud");
    expect(oudLine({ ...base, returnedAfterBreak: true })?.tone).toBe("warm");
  });

  test("الوضع الهادئ لا يحتمل إيموجي ولا نبرة فرح", () => {
    const line = oudLine({ ...base, quietDays: 0 });
    expect(line?.id).toBe("quiet");
    expect(line?.tone).toBe("calm");
  });
});

describe("الشخصية — التهدئة", () => {
  test("السطر لا يتكرّر قبل انقضاء مدته", () => {
    const line = oudLine({ ...base, lastPrayer: { name: "العصر", minutesAgo: 30, logged: false } });
    expect(line).not.toBeNull();
    if (!line) return;
    const shown = markLineShown({}, line, base.now);
    expect(shouldShowLine(line, shown, at(15, 55))).toBe(false);
    expect(shouldShowLine(line, shown, at(18, 0))).toBe(true);
  });
});

describe("حارس المحتوى الديني — personalities and chat must not claim religion", () => {
  /** كلمات لا يحقّ أن تخرج من شخصية منتج بلا مصدر شرعي موثّق. */
  const FORBIDDEN = [
    "مليون",
    "حسنه",
    "درجه",
    "٢٧",
    "27",
    "سبع وعشرين",
    "مفيش حاجه بتغفر",
    "مفيش حاجة بتغفر",
    "لا تغفر",
    "يحفظ اليوم",
    "يحفظ يومه",
    " الحديث",
    "رواه",
    "رواه أحمد",
    "صحيح البخاري",
    "الله كذا",
  ];

  test("لا صيغة في الشخصية تحتوي ادعاء ديني أو رقما شرعيا", () => {
    for (const text of allVoiceTexts()) {
      for (const word of FORBIDDEN) {
        expect({ text, word, contains: text.includes(word) }).toEqual({
          text,
          word,
          contains: false,
        });
      }
    }
  });

  test("لا سطر مولّد في كل السياقات يحتوي كلمة ممنوعة", () => {
    const contexts: OudVoiceContext[] = [
      { ...base, lastPrayer: { name: "العصر", minutesAgo: 1, logged: false } },
      { ...base, lastPrayer: { name: "العصر", minutesAgo: 10, logged: false } },
      { ...base, lastPrayer: { name: "العصر", minutesAgo: 60, logged: false } },
      { ...base, nextPrayer: { name: "المغرب", minutesLeft: 3 } },
      { ...base, task: { title: "المذاكرة", startsInMinutes: 0 }, taskPostponedCount: 5 },
      { ...base, quietDays: 4 },
      { ...base, returnedAfterBreak: true },
      { ...base, dayComplete: true },
      { ...base, perfectDay: true },
      { ...base, mosque: { name: "المسجد", distanceMeters: 180 } },
      { ...base, xpGained: 7, unlocked: "ثيم" },
      { ...base, missingAdhkar: ["morning"] },
      { ...base, missingAdhkar: ["sleep"], sleepMinutes: 22 * 60 },
      { ...base },
    ];
    for (const context of contexts) {
      const line = oudLine(context);
      expect(line).not.toBeNull();
      for (const word of FORBIDDEN) {
        expect({ id: line?.id, word, contains: line?.text.includes(word) }).toEqual({
          id: line?.id,
          word,
          contains: false,
        });
      }
    }
  });

  test("لا سطر فيه إيموجي", () => {
    const emoji = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;
    for (const text of allVoiceTexts()) expect({ text, ok: !emoji.test(text) }).toEqual({ text, ok: true });
    for (const id of allVoiceIds()) {
      for (const day of ["2026-9-26", "2026-9-27", "2026-9-28"]) {
        const line = oudLine({ now: at(20), quietDays: 1, [id]: undefined } as never);
        if (line) expect({ id: line.id, ok: !emoji.test(line.text) }).toEqual({ id: line.id, ok: true });
        void day;
      }
    }
  });
});

describe("المحادثة — نفس الشخصية", () => {
  const context: ChatContext = {
    ...base,
    remainingSteps: 2,
    nextTaskTitle: "المذاكرة",
    xpTotal: 40,
    nextPrayer: { name: "المغرب", minutesLeft: 90 },
  };

  test("تشخيص القصد يفهم اللهجة العامية", () => {
    expect(detectIntent("السلام عليكم")).toBe("greeting");
    expect(detectIntent("تعبت دلوقتي")).toBe("complaint");
    expect(detectIntent("كنت في الشغل والله")).toBe("justification");
    expect(detectIntent("صليت العصر؟")).toBe("ask-prayer");
    expect(detectIntent("ممكن أعمل إيه؟")).toBe("ask-reschedule");
    expect(detectIntent("فين أقرب مسجد")).toBe("ask-mosque");
    expect(detectIntent("كام نقطة عندي؟")).toBe("ask-progress");
    expect(detectIntent("حاجتي جايز ولا لأ")).toBe("religious");
  });

  test("التشخيص لا ينهار على نص فارغ ولا على حروف فقط", () => {
    expect(detectIntent("")).toBe("unknown");
    expect(detectIntent("؟؟؟")).toBe("unknown");
  });

  test("الشكوى لا تقابل بجملة تحفيزية عامة", () => {
    const reply = respond("تعبت خالص", context);
    expect(reply.intent).toBe("complaint");
    expect(reply.text).not.toContain("أنت تستطيع");
    expect(reply.text).not.toContain("لا بأس");
    expect(reply.action?.view).toBeTruthy();
  });

  test("سؤال فقهي يحوّل للمحتوى الموثّق ولا يجيب من نفسه", () => {
    const reply = respond("الشيء ده جايز ولا حرام؟", context);
    expect(reply.intent).toBe("religious");
    expect(reply.text).toContain("مش بفتتاوي");
    expect(reply.action?.view).toBe("hadith");
  });

  test("المسافة إلى المسجد لا تُقدّم كدليل على الصلاة", () => {
    const reply = respond("فين المسجد القريب؟", { ...context, mosqueDistanceMeters: 180 });
    expect(reply.basedOn).toContain("لا تدل على أنك صلّيت");
  });

  test("كل ردّ يقول ما الذي بُني عليه", () => {
    for (const message of ["السلام عليكم", "تعبت", "صليت؟", "ماشي", "بجد"]) {
      const reply = respond(message, context);
      expect({ message, basedOn: reply.basedOn.length > 0 }).toEqual({
        message,
        basedOn: true,
      });
    }
  });

  test("ردّ الافتتاح لا يكون ترحيبا بالعبث إذا كان في سبب حقيقي", () => {
    const opening = openingLine({
      ...context,
      lastPrayer: { name: "العصر", minutesAgo: 40, logged: false },
    });
    expect(opening.length).toBeGreaterThan(0);
    expect(opening).not.toContain("السلام عليكم");
  });

  test("الردّ لا يدّعي معرفة ما لم يُسجّل", () => {
    const reply = respond("كام نقطة عندي؟", { now: at(12) });
    expect(reply.text).toContain("٠");
  });
});
