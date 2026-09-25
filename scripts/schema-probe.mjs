// فحص مبدئي: هل يش启 تفعيل التحقق من المخطط آمن؟
// نقرأ المخطط ونحصي الحقول الاختيارية — التحقق صارم فالحقول الاختيارية
// التي يرسلها العميل بقيمة `undefined` تصير أخطاء. نعرف الأرقام قبل القرار.
import { readFileSync } from "node:fs";

const source = readFileSync("src/convex/schema.ts", "utf8");

const tables = [...source.matchAll(/^\s{2}(\w+):\s*defineTable\(/gm)].map((m) => m[1]);
const fields = [...source.matchAll(/^\s{4}(\w+):\s*(v\.\w+)/gm)].map((m) => m[2]);
const optional = [...source.matchAll(/^\s{4}(\w+):\s*v\.optional\(/gm)].map((m) => m[1]);

console.log("validation flag :", /schemaValidation:\s*(\w+)/.exec(source)?.[1]);
console.log("tables          :", tables.length, tables.join(", "));
console.log("fields          :", fields.length);
console.log("v.optional      :", optional.length, optional.join(", "));

const kinds = {};
for (const f of fields) kinds[f] = (kinds[f] ?? 0) + 1;
console.log("field kinds     :", JSON.stringify(kinds));

// هل هناك أي فهرس ثانوي على حقل اختياري؟ الفهرس على اختياري يسبّب خطأ.
const indexes = [...source.matchAll(/\.index\("([^"]+)",\s*q\.field\("([^"]+)"\)/g)];
console.log("indexes         :", indexes.length);
for (const [, name, field] of indexes) {
  if (optional.includes(field)) console.log("  RISK index on optional:", name, "->", field);
}

// هل هناك أي optional مع union liberally typed؟
const unions = [...source.matchAll(/^\s{4}(\w+):\s*v\.union\(v\.literal\(([^)]*)\)/gm)];
console.log("literal unions  :", unions.length, unions.map((m) => m[1]).join(", "));
