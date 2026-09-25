/**
 * PHASE 3 — محتوى مستطيل الإحصاء.
 *
 * **لا اقتباس مخترع.** كل شريحة في هذا الملف مأخوذة من قاعدة الأحاديث
 * نفسها، فيكون مصدرها فعليا لا عبارة جميلة بلا نسبة. وإن لم يوجد في
 * القاعدة ما يصلح لشريحة، لا تُملأ.
 *
 * والاختيار ببذرة ثابتة: نفس القسم يعرض نفس الاقتباس طوال اليوم،
 * فلا يقفز تحت عين القارئ مع كل إعادة رسم.
 */

import type { ArtworkName } from "@/components/app/Artworks";
import type { Insight } from "@/components/app/InsightCarousel";
import { HADITHS, sectionTitle, type Hadith, type HadithSectionId } from "@/data/hadith";
import {
  HADITH_KIND_LABELS,
  daySeed,
  hadithKindOf,
  topicOfSection,
  topicTitle,
} from "@/lib/hadith-metadata";

/** أطول نص في شريحة. ما زاد عن ذلك يُقرا سطرا لا فقرة. */
const MAX_INSIGHT_CHARS = 200;

function shorten(text: string): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= MAX_INSIGHT_CHARS) return clean;
  const cut = clean.slice(0, MAX_INSIGHT_CHARS);
  const lastSpace = cut.lastIndexOf(" ");
  return `${lastSpace > 0 ? cut.slice(0, lastSpace) : cut}…`;
}

/** لكل موضوع رسم ثابت، فلا يقفز الشكل مع كل شريحة. */
const ARTWORK_BY_TOPIC: Record<string, ArtworkName> = {
  prayer: "prayer",
  character: "review",
  patience: "habits",
  repentance: "review",
  intention: "progress",
  knowledge: "hadith",
  parents: "review",
  remembrance: "prayer",
  time: "progress",
  work: "habits",
  companionship: "habits",
};

function toInsight(hadith: Hadith): Insight {
  return {
    id: `insight-${hadith.id}`,
    text: `«${shorten(hadith.text)}»`,
    // النسبة مذكورة مع المصدر، فلا يظنه القارئ مرفوعا وهو أثر.
    source: `${HADITH_KIND_LABELS[hadithKindOf(hadith)]} — ${hadith.narrator} — ${hadith.source}`,
    category: topicTitle(topicOfSection(hadith.section)),
    artwork: ARTWORK_BY_TOPIC[topicOfSection(hadith.section)] ?? "prayer",
    onOpen: "hadith",
    actionLabel: `اقرأ في ${sectionTitle(hadith.section)}`,
  };
}

/**
 * الأبواب التي يتغذى منها كل قسم من أقسام التطبيق.
 *
 * **ثلاثة أقسام لا غير:** اليوم والصلاة والمراجعة. كان هنا أربعة عشر
 * مدخلا منها أحد عشر بلا مستهلك، وكل مدخل زائد دعوة إلى نشر المستطيل
 * في كل شاشة — وهو ما رُفض في المرحلة. فحُذفوا، وصار النوع مغلوبا:
 * إضافة قسم رابع تعني تعديل هذا الملف، فيظهر ذلك في المراجعة.
 */
const SECTIONS_BY_AREA = {
  today: ["intention", "patience", "gratitude", "sincerity"],
  prayers: ["prayer", "night", "sincerity", "gratitude"],
  review: ["self", "forgiveness", "pardon", "heart"],
} as const satisfies Record<string, readonly HadithSectionId[]>;

export type InsightArea = keyof typeof SECTIONS_BY_AREA;

/**
 * يبني شرائح قسم معين. الترتيب ثابت في اليوم، والتكرار يُزال
 * حتى لا تتكرر شاشتان بنفس الاقتباس.
 */
export function insightsForArea(area: InsightArea, now: Date, count = 2): Insight[] {
  const sections: readonly HadithSectionId[] = SECTIONS_BY_AREA[area];
  const pool = HADITHS.filter((hadith) => sections.includes(hadith.section));
  if (pool.length === 0) return [];

  const seed = daySeed(now);
  const picked: Hadith[] = [];
  // نبدأ من بذرة اليوم ونتأخر، فنحصل على ترتيب ثابت بلا عشوائية.
  for (let step = 0; step < pool.length && picked.length < count; step += 1) {
    const candidate = pool[(seed + step) % pool.length];
    if (!picked.some((item) => item.id === candidate.id)) picked.push(candidate);
  }
  return picked.map(toInsight);
}

/** حارس: لا شريحة بلا نص ولا شريحة بلا مصدر. */
export function insightsAreSourced(insights: readonly Insight[]): boolean {
  return insights.every((item) => item.text.length > 0 && item.source.length > 0);
}
