/**
 * PHASE 3 — طبقة بيانات الأحاديث.
 *
 * **القاعدة الحاكمة:** لا نخترع حديثًا ولا راويًا ولا مصدرًا ولا درجة. كل ما هنا
 * اشتقاق من الحقول الموجودة في `src/data/hadith.ts`، ولا يضيف ادّعاءً جديدًا.
 *
 * لماذا هذه الطبقة أصلًا؟ لأن قاعدة البيانات الحالية فيها ثلاثة مستويات مختلفة من
 * التوثيق مخلوطة في شكل واحد:
 *
 * 1. حديث براويه معلوم ومصدره جامع صحيح  → `attributed`
 * 2. أثر أو كلام صحابي أو نسبة موصوفة بـ«يُنسب»  → `needs-review`
 * 3. ما لم يوجد بعد كتاب ورقم حديث ومراجعة بشرية  → `verified` (لا يوجد اليوم)
 *
 * إدخال المستوى الثاني في واجهة «الأحاديث» بلا تمييز يُظهر أثرًا أو كلامًا كأنه
 * حديث مرفوع، وهذا أخطر خطأ ممكن في هذا القسم. لذلك الحالة صارت جزءًا من
 * العنصر المعروض، لا خاصية مخفية.
 */

/** حالة التوثيق كما يعرضها التطبيق — النصّان جزء من العقد، لا زينة. */
export type HadithReviewStatus = "verified" | "attributed" | "needs-review";

export const REVIEW_STATUS_LABELS: Record<HadithReviewStatus, string> = {
  verified: "موثّق برقمه في مصدره",
  attributed: "منسوب إلى مصدره",
  "needs-review": "يحتاج مراجعة",
};

/** شرح قصير يظهر عند الحاجة، حتى لا يظن المستخدم أن الشارة زخرفة. */
export const REVIEW_STATUS_HINTS: Record<HadithReviewStatus, string> = {
  verified: "رواه مذكور باسمه ورقمه في مصدره، وراجعه أهل العلم.",
  attributed: "الراوي والمصدر مذكوران، ولم يُثبَّت رقم الحديث في قاعدة البيانات بعد.",
  "needs-review": "النسبة فيه موصوفة لا ثابتة. لم تُراجَع علميًا، فلا تُعرض كحديث مرفوع.",
};

/* ————————————————————— الموضوعات ————————————————————— */

/**
 * أحد عشر موضوعًا بدل ستة وعشرين بابًا. الأبواب تبقى كما هي داخل البيانات؛
 * الموضوع طبقةُ تصفيةٍ فوقها، تُعرض في الأحاديث، وتُبقي الباب الأصلي ظاهرًا.
 */
export type HadithTopic =
  | "prayer"
  | "character"
  | "patience"
  | "repentance"
  | "intention"
  | "knowledge"
  | "parents"
  | "remembrance"
  | "time"
  | "work"
  | "companionship";

export type HadithTopicMeta = {
  id: HadithTopic;
  title: string;
  hint: string;
};

export const HADITH_TOPICS: HadithTopicMeta[] = [
  { id: "prayer", title: "الصلاة", hint: "الخشوع وأوقاتها وقيام الليل" },
  { id: "character", title: "الأخلاق", hint: "حسن الخلق والصدق والعفو" },
  { id: "patience", title: "الصبر", hint: "الابتلاء وفكّ الكرب" },
  { id: "repentance", title: "التوبة", hint: "المحاسبة وتنقية القلب والرجوع" },
  { id: "intention", title: "النية", hint: "الإخلاص والدوام" },
  { id: "knowledge", title: "طلب العلم", hint: "القرآن والتقفّه" },
  { id: "parents", title: "بر الوالدين", hint: "الصلاة وصلة الرحم" },
  { id: "remembrance", title: "الذكر", hint: "الأذكار والشكر والرقية" },
  { id: "time", title: "الوقت", hint: "رمضان والجمعة وأوقاتها" },
  { id: "work", title: "العمل", hint: "الرزق والعطاء والقوة" },
  { id: "companionship", title: "التعامل مع الناس", hint: "الأهل والخلق" },
];

/** كل باب من الأبواب الـ٢٦ يقع في موضوع واحد — لا باب يتيم ولا موضوع بلا باب. */
const TOPIC_BY_SECTION: Record<string, HadithTopic> = {
  prayer: "prayer",
  night: "prayer",
  character: "character",
  honesty: "character",
  pardon: "character",
  patience: "patience",
  relief: "patience",
  forgiveness: "repentance",
  self: "repentance",
  heart: "repentance",
  chastity: "repentance",
  intention: "intention",
  sincerity: "intention",
  knowledge: "knowledge",
  quran: "knowledge",
  parents: "parents",
  adhkar: "remembrance",
  dua: "remembrance",
  healing: "remembrance",
  gratitude: "remembrance",
  ramadan: "time",
  friday: "time",
  provision: "work",
  charity: "work",
  strength: "work",
  family: "companionship",
};

export function topicOfSection(section: string): HadithTopic {
  return TOPIC_BY_SECTION[section] ?? "character";
}

export function topicTitle(topic: HadithTopic): string {
  return HADITH_TOPICS.find((item) => item.id === topic)?.title ?? "";
}

export function topicHint(topic: HadithTopic): string {
  return HADITH_TOPICS.find((item) => item.id === topic)?.hint ?? "";
}

/* ————————————————————— حالة المراجعة ————————————————————— */

/**
 * عبارتان تُغيران تصنيف الحديث كله. الأولى نسبة موصوفة لا ثابتة، والثانية
 * مصدرٌ ليس جامعًا من كتب الحديث بل أثر أو كلام صحابي.
 */
const VAGUE_NARRATOR_MARKERS = ["يُنسب"];
const NOT_MARFU_SOURCE_MARKERS = ["من آثار الصحابة", "من كلام الصحابة", "من الآثار"];

/** بنية الحقول التي يفحصها المصنِّف — decoupling عن صنف Hadith الكامل. */
export type ProvenanceInput = {
  id: string;
  narrator: string;
  source: string;
  book?: string;
  hadithNumber?: string;
};

function isBlank(value: string | undefined) {
  return !value || value.trim().length === 0;
}

/**
 * هل يحقّ لعنصر أن يُعرض كـ«موثّق»؟ الشرط متعمَّد التشدد: لا بدّ من اسم الكتاب
 * ورقم الحديث معا. وغيابهما لا يترك إلا رقما ناقصا، والوصف بما لم يراجع
 * أمر من أشكال الاختلاق.
 */
export function canClaimVerified(item: ProvenanceInput): boolean {
  return (
    !isBlank(item.book) &&
    !isBlank(item.hadithNumber) &&
    !isBlank(item.narrator) &&
    !isBlank(item.source) &&
    !hasVagueNarrator(item) &&
    !isCompanionAthar(item)
  );
}

function hasVagueNarrator(item: ProvenanceInput) {
  return VAGUE_NARRATOR_MARKERS.some((marker) => item.narrator.includes(marker));
}

function isCompanionAthar(item: ProvenanceInput) {
  return NOT_MARFU_SOURCE_MARKERS.some((marker) => item.source.includes(marker));
}

/**
 * يصنّف عنصرًا من قاعدة البيانات. ترتيب الفحوص مقصود: النسبة الموصوفة أولًا
 * لأنها تُبطل أي مطابقة لرقم حديث موجود.
 */
export function reviewStatusOf(item: ProvenanceInput): HadithReviewStatus {
  if (canClaimVerified(item)) return "verified";
  if (hasVagueNarrator(item) || isCompanionAthar(item)) return "needs-review";
  if (isBlank(item.narrator) || isBlank(item.source)) return "needs-review";
  return "attributed";
}

/** لا نعرض درجة لم تُسجَّل. نصوص المصدر تحمل الحكم إن وُجد، وتُعرض كاملة. */
export function gradeOf(item: { grade?: string }): string | null {
  const value = item.grade?.trim();
  return value && value.length > 0 ? value : null;
}

/* ————————————————————— سياق اليوم ————————————————————— */

/**
 * الموضوع الذي يناسب ساعة اليوم. **قاعدة ثابتة لا ذكاء اصطناعي:**
 * الفجر ذكر، والظهر نية وعمل، والمغرب ذكر، وآخر الليل توبة.
 * الثبات أهم من التنويع: المستخدم يتوقع نفس المعنى كل يوم في وقته.
 */
export function dayContextTopic(now: Date): HadithTopic {
  const hour = now.getHours();
  if (hour < 5) return "repentance";
  if (hour < 11) return "remembrance";
  if (hour < 15) return "intention";
  if (hour < 18) return "work";
  if (hour < 21) return "remembrance";
  return "repentance";
}

/** بذرة ثابتة لليوم نفسه، فلا يتغير الحديث مع كل إعادة رسم. */
export function daySeed(now: Date): number {
  return Math.floor(
    new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() / 86_400_000,
  );
}

/** سطر مصدر مُجمَّع للعرض: الكتاب والرقم إن وُجدا، والمصدر كاملًا دائمًا. */
export function citationLine(item: ProvenanceInput): string {
  const parts: string[] = [];
  if (!isBlank(item.book)) {
    parts.push(isBlank(item.hadithNumber) ? item.book! : `${item.book} — حديث رقم ${item.hadithNumber}`);
  }
  parts.push(item.source);
  return parts.join(" · ");
}
