/**
 * فحص المخطط: لماذا `schemaValidation: false`، وهل يمكن تفعيله بأمان؟
 *
 * **لماذا لا نجرّب التفعيل؟** لأنه غير قابل للتراجع: إن كان في النشر
 * أي مستند لا يطابق المخطط الحالي، صار تفعيله سبب توقف قراءة ذلك
 * الجدول لا مجرد تحذير. والبيئة هنا لا تملك وصولا إلى بيانات النشر
 * ولا أداة متصفح، فالتجربة المباشرة غير ممكنة. فالفحص يجيب بدلا من
 * ذلك عن سؤالين يمكن الجواب عنهما بالمصدر:
 *
 *   ١. هل الفهارس على حقول غير اختيارية؟ (Convex يرفض النشر إن كان
 *      فهرس على حقل اختياري، وهذه كانت العقبة الوحيدة المحتملة)
 *   ٢. هل المخطط نفسه يعلن اعتماده على سجلات ناقصة الحقول؟
 *
 * الثاني هو الحاسم: إن كان التطبيق مصمما ليستقبل سجلات قديمة، فالتفعيل
 * يكسر قراءتها بقدر ما يحمي كتابتها.
 *
 * التشغيل: `bun scripts/schema-probe.mjs`
 */

import schema from "../src/convex/schema.ts";
import { readFileSync } from "node:fs";

const raw = readFileSync("src/convex/schema.ts", "utf8");

/** الجدول: كتلة `defineTable({...})` حتى القوس المستخدم التالي. */
function tablesOf(source) {
  const starts = [...source.matchAll(/^ {4}(\w+): defineTable\(\{/gm)];
  return starts.map((match, index) => {
    const body = source.slice(match.index, starts[index + 1]?.index ?? source.length);
    return { name: match[1], body };
  });
}

/** حقول الجدول على عمودها الأساسي، مع تمييز `v.optional`. */
function fieldsOf(body) {
  const fields = [];
  for (const line of body.split("\n")) {
    const match = /^ {6}(\w+):\s*(v\.\w+)/.exec(line);
    if (!match) continue;
    fields.push({ name: match[1], optional: /v\.optional\(/.test(line) });
  }
  return fields;
}

/** أسماء الحقول في كل فهرس: `["userId", "date"]` أو `q.field("date")`. */
function indexFieldsOf(body) {
  const out = [];
  for (const match of body.matchAll(/\.index\(\s*"([^"]+)"\s*,\s*\[([^\]]*)\]/g)) {
    const fields = [...match[2].matchAll(/"([^"]+)"/g)].map((f) => f[1]);
    out.push({ index: match[1], fields });
  }
  for (const match of body.matchAll(/\.index\(\s*"([^"]+)"\s*,\s*q\.field\("([^"]+)"\)/g)) {
    out.push({ index: match[1], fields: [match[2]] });
  }
  return out;
}

const tables = tablesOf(raw);

console.log("=== 1. علم التفعيل ===");
console.log("schemaValidation (runtime):", schema.schemaValidation);
console.log("schemaValidation (source) :", /schemaValidation:\s*(\w+)/.exec(raw)?.[1]);

console.log("\n=== 2. الجداول ===");
let totalFields = 0;
let totalOptional = 0;
for (const table of tables) {
  const fields = fieldsOf(table.body);
  const optional = fields.filter((field) => field.optional);
  totalFields += fields.length;
  totalOptional += optional.length;
  console.log(
    `  ${table.name.padEnd(20)} ${String(fields.length).padStart(2)} حقلًا · ` +
      `${optional.length} اختياري`,
  );
}
console.log(
  `  المجموع: ${tables.length} جدولًا · ${totalFields} حقلًا · ${totalOptional} اختياريًا`,
);

console.log("\n=== 3. الفهارس على حقول اختيارية (Convex يرفض النشر) ===");
// جدول `users` خارج فحص الفهارس: النص حرفيًا قالب Convex Auth الافتراضي
// («do not remove or modify»)، وفهرسه على `email` الاختياري مجرّب عندهم
// ومنشور في كل مشروع يتبع هذا القالب. عدّه خطرا هنا تضليل.
const isAuthTemplate = (table) => /do not remove or modify/i.test(table.body);
const risks = [];
for (const table of tables) {
  if (isAuthTemplate(table)) continue;
  const optional = new Set(
    fieldsOf(table.body)
      .filter((field) => field.optional)
      .map((field) => field.name),
  );
  for (const index of indexFieldsOf(table.body)) {
    for (const field of index.fields) {
      if (optional.has(field)) risks.push(`${table.name}.${field} (فهرس ${index.index})`);
    }
  }
}
const authTables = tables.filter(isAuthTemplate).map((table) => table.name);
console.log(
  risks.length === 0
    ? `  لا فهرس على حقل اختياري في جداول التطبيق (${tables.length} جدولًا).`
    : risks.map((line) => `  ${line}`).join("\n"),
);
if (authTables.length > 0) {
  console.log(`  مستثناة كقالب المصادقة: ${authTables.join(", ")}`);
}

console.log("\n=== 4. إعلانات التوافق مع سجلات قديمة ===");
for (const line of raw.split("\n")) {
  if (/ملفات قديمة|backward compatibility|اختياري/i.test(line)) {
    console.log("  -", line.replace(/^(\s*(\/\/|\*)\s*)/, ""));
  }
}

console.log("\n=== 5. الخلاصة ===");
console.log(
  totalOptional > 0
    ? `  المخطط فيه ${totalOptional} حقلًا اختياريًا صرّح بأنه من أجل سجلات قديمة.`
    : "  لا حقول اختيارية معلنة.",
);
console.log(
  risks.length === 0
    ? "  الفهارس سليمة، فالعقبة الوحيدة المحتملة (الفهرس على اختياري) غير موجودة."
    : "  يوجد فهرس على حقل اختياري، فيجب إصلاحه قبل أي محاولة تفعيل.",
);
console.log(
  "  القرار: إبقاء التحقق معطّلا. التفعيل يحتاج هجرة بيانات تعبر بكل\n" +
    "  السجلات القائمة، ولا يمكن التحقق من ذلك هنا ولا قياس أثره.",
);
