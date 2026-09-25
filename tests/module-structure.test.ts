/**
 * PHASE 3.x — بنية الوحدات.
 *
 * **حارس لخطأ حقيقي وقع:** خادم التطوير رفض
 * `ReferenceError: Cannot access 'lazy' before initialization`، والبناء
 * كان أخضر. الفرق أن البناء يرفع الاستيرادات فوق كل جملة، وخادم
 * التطوير يسلّم الملف بترتيبه.
 *
 * والصورة كانت في ثلاثة ملفات: `const X = lazy(...)` **بين سطرين
 * استيراد**، و`lazy` نفسه يُستورد تحتها. بناء أخضر، متصفح أحمر.
 *
 * **لماذا هذا حارس عام لا اختبارPhase 3.x:** النمط يخدش أي ملف
 * يستورد رابطًا كسولا، لا هذا الملف وحده. والفحص على المشروع كله
 * لا على الملفات التي عرفناها — فالعيب القادم يكون في ملف لم نره.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { globSync } from "node:fs";

const files = globSync("src/**/*.{ts,tsx}");

/**
 * آخر سطر استيراد في الملف.
 * الاستيراد متعدّد الأسطر، فنتقدّم حتى أول سطر ينتهي بفاصلة منقوطة.
 */
function lastImportLine(lines: string[]): number {
  let last = -1;
  let index = 0;
  while (index < lines.length) {
    if (/^import\b/.test(lines[index])) {
      last = index;
      while (index < lines.length && !/;\s*$/.test(lines[index])) index += 1;
    }
    index += 1;
  }
  return last;
}

describe("بنية الوحدات — لا تسمية قبل آخر استيراد", () => {
  test("يوجد ما يفحص أصلا، وإلا كان الحارس فارغا يمرّ دائما", () => {
    expect(files.length).toBeGreaterThan(30);
  });

  test("لا سطر تسمية فوق مستوى الصنف قبل آخر استيراد", () => {
    const offenders: string[] = [];
    for (const file of files) {
      const lines = readFileSync(file, "utf8").split("\n");
      const last = lastImportLine(lines);
      if (last < 0) continue;
      for (let index = 0; index < last; index += 1) {
        const line = lines[index];
        // نتجاهل ما داخل استيراد متعدّد الأسطر، فنبدأ بعد آخر استيراد سابق.
        if (/^(const|let|var|export const|export let|export function|function)\s/.test(line)) {
          offenders.push(`${file}:${index + 1}  ${line.trim().slice(0, 60)}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test("ثلاثة الملفات التي كانت معطوبة صارت سليمة", () => {
    // أسماء الملفات تُثبت أن الحارس يراقب مواضعه، لا غيرها.
    for (const file of [
      "src/components/app/DailyReview.tsx",
      "src/components/app/HomeView.tsx",
      "src/components/app/PrayerView.tsx",
    ]) {
      const source = readFileSync(file, "utf8");
      const last = lastImportLine(source.split("\n"));
      const slotAt = source.split("\n").findIndex((line) =>
        /^const InsightSlot = lazy\(/.test(line),
      );
      expect({ file, slotAt, last, afterImports: slotAt > last }).toEqual({
        file,
        slotAt,
        last,
        afterImports: true,
      });
    }
  });

  test("وكل موضع كسول في المشروع يعلن `lazy` من `react` في نفس الملف", () => {
    for (const file of files) {
      // **نقرأ بلا تعليقات.** ملف `ui/index.ts` يذكر `lazy` في أمثلة توثيق
      // داخل تعليقات، وهو لا يستعملها أصلا — فالفحص على النص الخام كان
      // يظنّه موضعًا كسولا ويضرب حارسا صحيحا.
      const source = withoutComments(readFileSync(file, "utf8"));
      if (!/= lazy\(/.test(source)) continue;
      expect({ file, importsLazy: /from\s+"react"/.test(source) && /\blazy\b/.test(source) }).toEqual(
        { file, importsLazy: true },
      );
    }
  });
});

/** يحذف تعليقات السطر والتعليق المتعدد الأسطر، فيبقى الشيفرة وحدها. */
function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^\s*\/\/.*$/gm, " ");
}
