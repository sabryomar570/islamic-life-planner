import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { OWNED_LOCAL_KEYS, isOwnedLocalKey } from "../src/lib/local-data";

/**
 * فحوصات على مستوى المصدر لاشياء لا يقيسها اختبار وحدة:
 * اتجاه CSS، ميزانية الحركة، وإلغاء الحركة عند تفضيل تقليل الحركة.
 * هذه ليست بديلا عن المتصفح: هي حارس يمنع انحدارا في الملف نفسه.
 */

const read = (path: string) => readFileSync(path, "utf8");

const NEW_COMPONENTS = [
  "src/components/app/Artworks.tsx",
  "src/components/app/InsightCarousel.tsx",
  "src/components/app/InsightSlot.tsx",
  "src/components/app/HadithReader.tsx",
  "src/components/app/HadithView.tsx",
  "src/components/app/NotificationCenter.tsx",
];

describe("PHASE 3 — سلامة RTL", () => {
  test("لا أدوات اتجاه فيزيائية في المكوّنات الجديدة", () => {
    // خصائص مثل `ml-` و`pl-` و`text-right` تكسر RTL مهما كان الاتجاه Elsewhere.
    const physical = /(?<![\w-])(ml-|mr-|pl-|pr-|left-|right-|text-left|text-right)(?![\w-])/g;
    for (const file of NEW_COMPONENTS) {
      const hits = read(file).match(physical) ?? [];
      expect({ file, hits }).toEqual({ file, hits: [] });
    }
  });

  test("لا inline style بخصائص فيزيائية", () => {
    for (const file of NEW_COMPONENTS) {
      expect(read(file)).not.toMatch(/(marginLeft|marginRight|paddingLeft|paddingRight|textAlign)\s*:/);
    }
  });
});

describe("PHASE 3 — ميزانية الحركة", () => {
  test("مدة الانتقال بين ١٨٠ و٤٠٠ مللي ثانية", () => {
    const source = read("src/components/app/InsightCarousel.tsx");
    const match = source.match(/TRANSITION_MS\s*=\s*(\d+)/);
    expect(match).not.toBeNull();
    const ms = Number(match![1]);
    expect(ms).toBeGreaterThanOrEqual(180);
    expect(ms).toBeLessThanOrEqual(400);
  });

  test("مدة الوقوف بطيئة: لا تشغيل تلقائي سريع", () => {
    const source = read("src/components/app/InsightCarousel.tsx");
    const match = source.match(/DWELL_MS\s*=\s*([\d_]+)/);
    expect(match).not.toBeNull();
    expect(Number((match![1] as string).replace(/_/g, ""))).toBeGreaterThan(4000);
  });

  test("الدوران يتوقف عند أول تفاعل", () => {
    const source = read("src/components/app/InsightCarousel.tsx");
    expect(source).toContain("interacted");
    expect(source).toMatch(/paused \|\| interacted \|\| reduced/);
  });

  test("لا مؤثرات ثقيلة: لا مكتبة حركة جديدة في المكونات", () => {
    for (const file of NEW_COMPONENTS) {
      expect(read(file)).not.toContain("framer-motion");
    }
  });
});

describe("PHASE 3 — تقليل الحركة", () => {
  const css = read("src/index.css");
  const reduced = css.slice(css.indexOf("@media (prefers-reduced-motion: reduce)"));

  test("حلقة التحميل تتوقف عند تقليل الحركة", () => {
    expect(reduced).toContain(".action-spinner");
    expect(reduced).toMatch(/\.action-spinner\s*\{[\s\S]*animation:\s*none/);
  });

  test("المكوّن نفسه يقرأ تفضيل الحركة من المتصفح", () => {
    expect(read("src/components/app/InsightCarousel.tsx")).toContain(
      "prefers-reduced-motion",
    );
  });
});

describe("PHASE 3 — حالات الأزرار", () => {
  const css = read("src/index.css");
  const surfaces = read("src/components/app/Surfaces.tsx");

  test("لكل حالة اسم صنف في نظام التصميم", () => {
    for (const className of [".action-active", ".action-success", ".action-disabled", ".action-spinner"]) {
      expect(css).toContain(className);
    }
  });

  test("الحالة النشطة لا تعتمد على اللون وحده", () => {
    const block = css.slice(css.indexOf(".action-active"), css.indexOf(".action-success"));
    // حلقة زائدة وخط داخلي: شكلان مرئيان بلا تمييز لون.
    expect(block).toContain("inset");
    expect(block).toContain("0 0 0 2px");
  });

  test("الزر الأساسي والثانوي يتفهان في حالات التحميل والنجاح", () => {
    expect(surfaces).toContain("actionStateClass");
    expect(surfaces).toContain("action-spinner");
    expect(surfaces).toContain("aria-busy");
  });

  test("الشرائح تحمل `touch-target` أي ٤٤ بكسل", () => {
    expect(read("src/components/app/InsightCarousel.tsx")).toContain("touch-target");
  });
});

describe("PHASE 3 — وصولية الرسومات", () => {
  test("كل رسم زخرفي ومخفي عن قارئ الشاشة", () => {
    for (const file of ["src/components/app/Artworks.tsx"]) {
      const source = read(file);
      expect(source).toContain('aria-hidden="true"');
      expect(source).toContain("focusable=\"false\"");
    }
  });

  test("الرسم لا يفتتح له تسمية تُقرأ بصوت", () => {
    expect(read("src/components/app/Artworks.tsx")).not.toContain("<title>");
  });

  test("أسماء الأزرار بالعربية", () => {
    const carousel = read("src/components/app/InsightCarousel.tsx");
    expect(carousel).toContain("الشريحة التالية");
    expect(carousel).toContain("الشريحة السابقة");
  });
});

describe("PHASE 3 — البيانات المحلية", () => {
  test("سجل الإشعارات مفتاح مملوك للتطبيق", () => {
    expect(OWNED_LOCAL_KEYS).toContain("oud:notifications:v1");
    expect(isOwnedLocalKey("oud:notifications:v1")).toBe(true);
  });

  test("لا مفتاح محمي يختلط بالمملوك", () => {
    expect(isOwnedLocalKey("__convexAuthJWT_oudapp")).toBe(false);
    expect(isOwnedLocalKey("__vlyanything")).toBe(false);
  });
});
