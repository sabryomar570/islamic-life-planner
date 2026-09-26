/**
 * PHASE NEXT — تقدير الزكاة: حساب بلا حكم.
 *
 * **الحارس الأهم هنا ليس حسابا:** التطبيق **لا يُصدر فتوى ولا نصابا ولا
 * نسبة**. لذلك نمسك الشيفرة نفسها: لا ثابت نصاب، ولا نسبة مقرّرة،
 * ولا نصّ ديني بلا مصدر، ولا عبارة تقول «يجب عليك» أو «يغفر لك».
 *
 * وهذه ليست رقابة شكلية: لو دخل ثابت نصاب في الشيفرة لغدا، صار
 * التطبيق ينطق علما لا يملكه. الاختبار هنا يمنع ذلك من الأساس.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  EMPTY_ZAKAT_DRAFT,
  ZAKAT_ASSETS,
  ZAKAT_ASK_SCHOLAR,
  ZAKAT_NO_RULING,
  ZAKAT_STORAGE_KEY,
  ZAKAT_WHY_USER_INPUT,
  hasAmount,
  parseAmount,
  readZakatDraft,
  writeZakatDraft,
  zakatTotals,
  type ZakatDraft,
} from "../src/lib/zakat";

const SOURCE = readFileSync("src/lib/zakat.ts", "utf8");
const VIEW_SOURCE = readFileSync("src/components/app/ZakatView.tsx", "utf8");

/** مسودة بمال مكتوب ونصاب ونسبة. */
const full = (values: Partial<ZakatDraft["values"]>): ZakatDraft => ({
  ...EMPTY_ZAKAT_DRAFT,
  nisab: "1000",
  rate: "2.5",
  values: { ...EMPTY_ZAKAT_DRAFT.values, ...values },
});

describe("قراءة الأرقام: العربية والفاصلة والرفض", () => {
  test("الأرقام العربية-الهندية تُقرأ", () => {
    expect(parseAmount("١٢٣٤")).toBe(1234);
  });

  test("الفاصلة العشرية العربية تُقرأ، لا تُبتلع", () => {
    // علّة حقيقية كشفها هذا الاختبار: `٣٫٥` كانت ترجع صفرا لأن الفاصلة
    // العربية ليست نقطة في `Number`، فكان حقل صحيح يختفي صفرا.
    expect(parseAmount("٣٫٥")).toBeCloseTo(3.5, 5);
    expect(parseAmount("١٢٫٧٥")).toBeCloseTo(12.75, 5);
  });

  test("الأرقام الفارسية تُقرأ", () => {
    expect(parseAmount("۱۲۳")).toBe(123);
  });

  test("الفواصل والمسافات لا تكسر الرقم", () => {
    expect(parseAmount("1,250")).toBe(1250);
    expect(parseAmount(" 12 500 ")).toBe(12500);
  });

  test("ما لا معنى له صفر، ولا NaN يتسرّب", () => {
    expect(parseAmount("")).toBe(0);
    expect(parseAmount("غير رقم")).toBe(0);
    expect(parseAmount(null)).toBe(0);
    expect(parseAmount(undefined)).toBe(0);
    expect(parseAmount(Number.NaN)).toBe(0);
    expect(parseAmount(-5)).toBe(0);
    expect(parseAmount(Number.POSITIVE_INFINITY)).toBe(0);
  });

  test("الفارغ غير المكتوب: نفرّق بين «فارغ» و«صفر»", () => {
    expect(hasAmount("")).toBe(false);
    expect(hasAmount("   ")).toBe(false);
    expect(hasAmount("0")).toBe(true);
  });
});

describe("الحساب: (أصول − ديون) − نصاب، ثم × نسبة", () => {
  test("مثال كامل يدويًا", () => {
    const totals = zakatTotals(full({ cash: "1000", bank: "4000" }));
    expect(totals.assets).toBe(5000);
    expect(totals.net).toBe(5000);
    expect(totals.aboveNisab).toBe(4000);
    expect(totals.due).toBeCloseTo(100, 6);
  });

  test("الدين يطرح قبل المقارنة بالنصاب", () => {
    const totals = zakatTotals({ ...full({ cash: "2000" }), debt: "500" });
    expect(totals.net).toBe(1500);
    expect(totals.aboveNisab).toBe(500);
    expect(totals.due).toBeCloseTo(12.5, 6);
  });

  test("مال تحت النصاب: المستحق صفر، لا رقم سالب", () => {
    const totals = zakatTotals(full({ cash: "500" }));
    expect(totals.belowNisab).toBe(true);
    expect(totals.aboveNisab).toBe(0);
    expect(totals.due).toBe(0);
  });

  test("مال يساوي النصاب بالضبط: تحت، لا فوق", () => {
    const totals = zakatTotals(full({ cash: "1000" }));
    expect(totals.belowNisab).toBe(true);
    expect(totals.due).toBe(0);
  });

  test("بلا نصاب مكتوب: لا حساب، ونقول ذلك صراحة", () => {
    const totals = zakatTotals({ ...full({ cash: "9000" }), nisab: "" });
    expect(totals.needsNisab).toBe(true);
    expect(totals.due).toBe(0);
    expect(totals.aboveNisab).toBe(0);
  });

  test("نصاب مكتوب وصفر: لا حساب", () => {
    expect(zakatTotals({ ...full({ cash: "9000" }), nisab: "0" }).needsNisab).toBe(true);
  });

  test("نسبة المستخدم هي المعتمدة، لا نسبة مفترضة", () => {
    const five = zakatTotals({ ...full({ cash: "3000" }), rate: "5" });
    const two = zakatTotals({ ...full({ cash: "3000" }), rate: "2" });
    expect(five.due).toBeCloseTo(100, 6);
    expect(two.due).toBeCloseTo(40, 6);
  });

  test("بلا أصول مكتوبة: الشاشة تقول فراغ، لا صفرا لاثنتين", () => {
    const totals = zakatTotals(EMPTY_ZAKAT_DRAFT);
    expect(totals.empty).toBe(true);
    expect(totals.assets).toBe(0);
  });

  test("دفع أكثر من الديون لا يجعل صافي المال سالبا", () => {
    const totals = zakatTotals({ ...full({ cash: "100" }), debt: "900" });
    expect(totals.net).toBe(0);
    expect(totals.due).toBe(0);
  });
});

describe("البنود وصفية: التطبيق لا يقرّر ما يدخل", () => {
  test("لكل بند مفتاح وتسمية ووصف", () => {
    for (const entry of ZAKAT_ASSETS) {
      expect(entry.key.length).toBeGreaterThan(0);
      expect(entry.label.trim().length).toBeGreaterThan(0);
      expect(entry.hint.trim().length).toBeGreaterThan(0);
    }
  });

  test("لا بند يقول «تجب عليك» ولا «لا تجب»", () => {
    for (const entry of ZAKAT_ASSETS) {
      expect(`${entry.label} ${entry.hint}`).not.toMatch(/تجب|تجبِ|لا تجب|واجب| forbidden| Forbidden/);
    }
  });
});

describe("الحارس: لا فتوى ولا نصاب ولا نسبة في الشيفرة", () => {
  test("لا رقم يشبه نصابا مكتوبا كثابت", () => {
    // النصاب أرقامطوال بالمئات، فلا معنى لوجوده ثابتا في الوحدة.
    const numerics = SOURCE.match(/(?<![\w.])\d{3,}(?![\w.])/g) ?? [];
    const suspicious = numerics.filter((value) => {
      const number = Number(value);
      return number >= 200 && number <= 200_000;
    });
    expect(suspicious).toEqual([]);
  });

  test("النسبة ليست ثابتا معطوبا، بل حقل قابل للتعديل", () => {
    expect(SOURCE).toContain("rate");
    // القيمة الافتراضية في الحقل نفسه، لا في دالة ثابتة.
    expect(SOURCE).not.toMatch(/const\s+ZAKAT_RATE\s*=/);
  });

  test("النصوص العلنية تعلن أنها ليست فتوى", () => {
    expect(ZAKAT_NO_RULING).toMatch(/مش فتوى|لا فتوى/);
    expect(ZAKAT_WHY_USER_INPUT).toMatch(/النصاب/);
    expect(ZAKAT_ASK_SCHOLAR).toMatch(/دار الإفتاء|أهل العلم|مسجدك/);
  });

  test("لا نصّ ديني بلا مصدر: لا حديث ولا آية ولا نسبة مقرّرة", () => {
    const combined = `${SOURCE}\n${VIEW_SOURCE}\n${ZAKAT_NO_RULING}\n${ZAKAT_WHY_USER_INPUT}\n${ZAKAT_ASK_SCHOLAR}`;
    // الأقواس المزخرفة العربية فقط: `»` وحدها علامة اقتباس عادية في
    // النصوص العربية («…») وقد استعملناها عمدا، فإسقاطها حارس أعمى.
    expect(combined).not.toMatch(/﴿|﴾/);
    expect(combined).not.toMatch(/رواه|أخرجه|صحيح البخاري|صحيح مسلم|سنن أبي داود/);
    expect(combined).not.toMatch(/زكاة الفطر|فطر/);
  });

  test("لا وعد ولا وعد مكذوب: لا «يغفر» ولا «يدخل الجنة»", () => {
    const combined = `${SOURCE}\n${VIEW_SOURCE}`;
    expect(combined).not.toMatch(/يغفر|يدخل الجنة|ينجي من النار|أجر/);
  });

  test("الواجهة تعرض الحدّين قبل الحقول، لا بعد النتيجة", () => {
    const nisabField = VIEW_SOURCE.indexOf('id="zakat-nisab"');
    const noRuling = VIEW_SOURCE.indexOf("ZAKAT_NO_RULING");
    expect(nisabField).toBeGreaterThan(-1);
    expect(noRuling).toBeGreaterThan(-1);
    expect(noRuling).toBeLessThan(nisabField);
  });
});

describe("التخزين: على الجهاز وحده، ويقاوم التلف", () => {
  test("يكتب ويقرأ بلا رمي", () => {
    const map = new Map<string, string>();
    const store = {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
    };
    const draft = full({ cash: "1500" });
    expect(writeZakatDraft(draft, store)).toBe(true);
    expect(readZakatDraft(store).values.cash).toBe("1500");
  });

  test("مخزن يرمي: نخسر الحفظ ولا نكسر التطبيق", () => {
    const store = {
      getItem: () => null,
      setItem: () => {
        throw new Error("full");
      },
    };
    expect(writeZakatDraft(EMPTY_ZAKAT_DRAFT, store)).toBe(false);
  });

  test("مخزن يرمي في القراءة: نردّ مسودة فارغة", () => {
    const store = {
      getItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readZakatDraft(store)).toEqual(EMPTY_ZAKAT_DRAFT);
  });

  test("JSON تالف أو غريب الشكل: لا يسقط", () => {
    const cases = ["{", "null", "42", '"نص"', JSON.stringify({ values: 7 })];
    for (const raw of cases) {
      const store = { getItem: () => raw };
      expect(() => readZakatDraft(store)).not.toThrow();
      expect(readZakatDraft(store).values).toEqual(EMPTY_ZAKAT_DRAFT.values);
    }
  });

  test("حقل غير نصي يُسقَط، ونص طويل يُقصّ", () => {
    const raw = JSON.stringify({
      values: { cash: 123, bank: "x".repeat(80) },
      nisab: true,
      rate: "2.5",
    });
    const draft = readZakatDraft({ getItem: () => raw });
    expect(draft.values.cash).toBe("");
    expect(draft.values.bank.length).toBe(24);
    expect(draft.nisab).toBe("");
    expect(draft.rate).toBe("2.5");
  });

  test("المفتاح في سجل المسح، فالمحسوب على الجهاز يمسحه", () => {
    const localData = readFileSync("src/lib/local-data.ts", "utf8");
    expect(ZAKAT_STORAGE_KEY).toBe("oud:zakat:v1");
    expect(localData).toContain(`"${ZAKAT_STORAGE_KEY}"`);
  });

  test("بلا متصفح: نعطي مسودة، ولا نرمي", () => {
    expect(readZakatDraft(null)).toEqual(EMPTY_ZAKAT_DRAFT);
    expect(writeZakatDraft(EMPTY_ZAKAT_DRAFT, null)).toBe(false);
  });
});
