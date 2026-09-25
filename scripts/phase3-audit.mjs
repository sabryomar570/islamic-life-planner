// فحص مؤقت: تصنيف الأحاديث + تحقّق من تطابق حساب بداية الأسبوع.
import { HADITHS } from "../src/data/hadith.ts";
import { startOfWeekKey, weekStartOfDateKey, dateKey } from "../src/lib/time.ts";

const counts = { marfu: 0, athar: 0, attributed: 0, noCollector: 0 };
const odd = [];
for (const h of HADITHS) {
  if (h.narrator.includes("يُنسب")) { counts.attributed++; continue; }
  if (/من آثار الصحابة|من كلام الصحابة|من الآثار/.test(h.source)) { counts.athar++; continue; }
  if (!h.source.includes("رواه")) { counts.noCollector++; odd.push(`${h.id} :: ${h.source}`); continue; }
  counts.marfu++;
}
console.log("=== attribution split ===");
console.log(JSON.stringify(counts, null, 2));
console.log("=== sources with no 'رواه' ===");
console.log(odd.join("\n"));

// هل يتفق حسابا بداية الأسبوع عبر مناطق زمنية مختلفة؟
console.log("=== week start agreement across time zones ===");
const zones = ["UTC", "Asia/Riyadh", "Asia/Tokyo", "America/New_York", "Pacific/Auckland", "Asia/Kolkata"];
const instants = [
  new Date("2026-09-25T22:30:00Z"),
  new Date("2026-09-26T01:30:00Z"),
  new Date("2026-09-25T23:59:59Z"),
  new Date("2026-09-26T00:00:01Z"),
  new Date("2026-01-01T05:00:00Z"),
  new Date("2026-12-31T20:00:00Z"),
];
let mismatches = 0;
for (const zone of zones) {
  for (const instant of instants) {
    // نحاكي زمن الجهاز: نحسب التاريخ المحلي كما لو كان الجهاز في تلك المنطقة.
    const shifted = new Date(instant.toLocaleString("en-US", { timeZone: zone }));
    const localStart = startOfWeekKey(shifted);
    const serverStart = weekStartOfDateKey(dateKey(shifted));
    if (localStart !== serverStart) {
      mismatches += 1;
      console.log(`MISMATCH ${zone} ${instant.toISOString()} local=${localStart} server=${serverStart}`);
    }
  }
}
console.log(mismatches === 0 ? "no mismatches" : `${mismatches} mismatches`);
