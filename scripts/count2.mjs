import { HADITHS } from "../src/data/hadith.ts";
import { hadithKindOf, reviewStatusOf, canClaimVerified } from "../src/lib/hadith-metadata.ts";
const k = { marfu: 0, athar: 0, attributed: 0, unverified: 0 };
const r = { verified: 0, traceable: 0, unverified: 0 };
for (const h of HADITHS) { k[hadithKindOf(h)]++; r[reviewStatusOf(h)]++; }
console.log("kind:", JSON.stringify(k));
console.log("review:", JSON.stringify(r));
console.log("canClaimVerified any:", HADITHS.some(canClaimVerified));
