/**
 * PHASE NEXT — خريطة المعلومات تُحرس، لا الشيفرة فقط.
 *
 * **العلّة التي يمنعها:** أضفنا وجهتين (القبلة والزكاة) ونسينا واحدة من
 * ثلاث: التسمية، أو المجموعة، أو الشهرة. النتيجة: وجهة تفتح بالبحث
 * المباشر ولا يجدها أحد، والشريط السفلي ينتفخ. فصار للاختبار.
 *
 * وهذه ليست أسلوبيات: **`PRIMARY_NAV` ما زال أربعة**، والوجهة الجديدة
 * لا تدخل إلا من «عبادتي»، والشريط السفلي لا يتزحلق مع كل إضافة.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  DASH_VIEWS,
  LIBRARY_GROUPS,
  PRIMARY_NAV,
  VIEW_LABELS,
  isDashView,
  type DashView,
} from "../src/components/app/Navigation";

const allEntries = LIBRARY_GROUPS.flatMap((group) => group.entries);
const groupKeys = allEntries.map((entry) => entry.key);

describe("الشبكة كاملة: كل وجهة تُفتح وتُسمّى", () => {
  test("يوجد ما نفحص، وإلا كان الحارس فارغا يمرّ دائما", () => {
    expect(DASH_VIEWS.length).toBeGreaterThan(12);
    expect(LIBRARY_GROUPS.length).toBeGreaterThan(2);
  });

  test("كل وجهة لها تسمية عربية غير فارغة", () => {
    for (const view of DASH_VIEWS) {
      expect(VIEW_LABELS[view], view).toBeTruthy();
      expect(VIEW_LABELS[view].trim().length, view).toBeGreaterThan(0);
    }
  });

  test("لا تسمية مكرّرة تربك القارئ", () => {
    const labels = DASH_VIEWS.map((view) => VIEW_LABELS[view]);
    expect(new Set(labels).size).toBe(labels.length);
  });

  test("كل وجهة في `DASH_VIEWS` موجودة فعلا في زخرفتها", () => {
    const source = readFileSync("src/components/app/Navigation.tsx", "utf8");
    for (const view of DASH_VIEWS) {
      expect(source, view).toContain(`"${view}"`);
    }
  });

  test("وجهة غير معروفة تُرفض بدل أن تُرسم فارغة", () => {
    expect(isDashView("today")).toBe(true);
    expect(isDashView("qibla")).toBe(true);
    expect(isDashView("zakat")).toBe(true);
    expect(isDashView("nope")).toBe(false);
    expect(isDashView(null)).toBe(false);
  });
});

describe("لا وجهة يتيمة: كل شاشة تُفتح من مكان معلوم", () => {
  test("كل وجهة داخل مجموعة في القائمة الجانبية، عدا جذر «اليوم»", () => {
    // `today` هي الجذر: لا تحتاج مدخلا في «المزيد» لأنها أول زر في
    // الشريط السفلي وتُفتح تلقائيا. وأي وجهة أخرى يتيمةDestination لا
    // يستطيع المستخدم أن يصل إليها من القائمة أيا كان.
    const missing = DASH_VIEWS.filter(
      (view) => view !== "today" && !groupKeys.includes(view),
    );
    expect(missing).toEqual([]);
    expect(PRIMARY_NAV.some((entry) => entry.key === "today")).toBe(true);
  });

  test("كل مجموعة مفتاح فريد، وكل داخلها مفتاح فريد", () => {
    const ids = LIBRARY_GROUPS.map((group) => group.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(groupKeys).size).toBe(groupKeys.length);
  });

  test("كل مجموعة لها عنوان ووصف يشرحانها", () => {
    for (const group of LIBRARY_GROUPS) {
      expect(group.title.trim().length, group.id).toBeGreaterThan(0);
      expect(group.hint.trim().length, group.id).toBeGreaterThan(0);
    }
  });

  test("كل مدخل له سطر واحد يشرح ما يجده المستخدم", () => {
    for (const entry of allEntries) {
      expect(entry.hint.trim().length, entry.key).toBeGreaterThan(0);
      expect(entry.hint.length, entry.key).toBeLessThan(60);
    }
  });

  test("لا مدخل يكرر نفسه داخل نفس المجموعة", () => {
    for (const group of LIBRARY_GROUPS) {
      const keys = group.entries.map((entry) => entry.key);
      expect(new Set(keys).size, group.id).toBe(keys.length);
    }
  });
});

describe("الخدمات الجديدة تحت عبادتي، لا في الشريط السفلي", () => {
  const worship = LIBRARY_GROUPS.find((group) => group.id === "worship");

  test("مجموعة «عبادتي» موجودة", () => {
    expect(worship).toBeDefined();
    expect(worship!.title).toBe("عبادتي");
  });

  test("القبلة والزكاة داخلها", () => {
    const keys = worship!.entries.map((entry) => entry.key);
    expect(keys).toContain("qibla");
    expect(keys).toContain("zakat");
  });

  test("القبلة والزكاة ليسا في الشريط السفلي", () => {
    const primary = PRIMARY_NAV.map((entry) => entry.key);
    expect(primary).not.toContain("qibla");
    expect(primary).not.toContain("zakat");
  });

  test("الشريط السفلي ما زال صغيرا: خمس وجهات كحد أقصى", () => {
    expect(PRIMARY_NAV.length).toBeLessThanOrEqual(5);
  });

  test("الشريط السفلي ما زال يومي الاستعمال: فيه الصلاة والأذكار والقرآن", () => {
    const keys = PRIMARY_NAV.map((entry) => entry.key);
    expect(keys).toContain("today");
    expect(keys).toContain("prayers");
    expect(keys).toContain("quran");
    expect(keys).toContain("adhkar");
  });

  test("الشريط السفلي كله موجود داخل المجموعات، فلا زر ميت", () => {
    for (const entry of PRIMARY_NAV) {
      const inGroups = groupKeys.includes(entry.key);
      const isRoot = entry.key === "today";
      expect(inGroups || isRoot, entry.key).toBe(true);
    }
  });
});

describe("الوجهة تُرسم فعلا في لوحة القيادة", () => {
  const dashboard = readFileSync("src/pages/Dashboard.tsx", "utf8");

  test("لوح لكل وجهة جديدة شرط عرض", () => {
    expect(dashboard).toContain('view === "qibla"');
    expect(dashboard).toContain('view === "zakat"');
  });

  test("الشاشتان كسولتان، فلا تدخلان المسار الحرج", () => {
    expect(dashboard).toMatch(/const QiblaView = lazy\(/);
    expect(dashboard).toMatch(/const ZakatView = lazy\(/);
  });

  test("القبلة تأخذ إحداثيات الموقع لا اسم المدينة", () => {
    expect(dashboard).toContain("QiblaView coords={geo.coords}");
  });
});

describe("الرئيسية تستقبل خدمة القبلة", () => {
  const home = readFileSync("src/components/app/HomeView.tsx", "utf8");

  test("بطاقة القبلة تُرسم في الرئيسية", () => {
    expect(home).toContain("<QiblaCard");
  });

  test("بطاقة المسجد والقبلة في نفس الكتلة: صلاة ومكان", () => {
    expect(home).toContain("<MosqueCard");
    expect(home.indexOf("<QiblaCard")).toBeGreaterThan(home.indexOf("<MosqueCard"));
  });

  test("أهم خطوة في اليوم قابلة للتنفيذ، لا جملة فقط", () => {
    expect(home).toContain("أهم خطوة في يومك");
    expect(home).toContain('onSetPlanOutcome(primaryId, "completed")');
    expect(home).toContain("تمّت الخطوة الأهم اليوم");
  });
});

describe("النوع متسق: كل مفتاح DashView حقيقي", () => {
  test("المفاتيح من نفس الاتحاد، لا سلاسل حرة", () => {
    const union = readFileSync("src/components/app/Navigation.tsx", "utf8");
    const declared = union.slice(union.indexOf("export type DashView"), union.indexOf("export const DASH_VIEWS"));
    for (const view of DASH_VIEWS) {
      expect(declared, view).toContain(`"${view}"`);
    }
  });

  test("كل مفتاح في المصفوفة من الاتحاد", () => {
    const asType: DashView[] = [...DASH_VIEWS];
    expect(asType).toHaveLength(new Set(asType).size);
  });
});
