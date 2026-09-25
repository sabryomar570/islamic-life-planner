/**
 * PHASE 3 — طبقة بيانات الأحاديث.
 *
 * **القاعدة الحاكمة:** لا نخترع حديثًا ولا راويًا ولا مصدرًا ولا درجة.
 * كل ما هنا اشتقاق من الحقول القائمة في `src/data/hadith.ts`.
 *
 * لماذا الطبقة موجودة؟ لأن قاعدة البيانات تخلط أربعة أنواع مختلفة في شكل واحد،
 * ولا يصحّ أن يقرأها المستخدم كلها على أنها «أحاديث نبوية»:
 *
 *   1. حديث مرفوع   — لفظ عن راوٍ محدّد، رواه كتاب جامع
 *   2. أثر صحابي    — كلام الصحابة نفسه، وليس مرفوعًا
 *   3. منسوب        — نسبة موصوفة («يُنسب»)، لم تثبت
 *   4. ينقصه توثيق  — راوٍ أو مصدر ناقص
 *
 * **الترتيب مقصود:** أثرُ الصحابة يُفحص قبل النسبة الموصوفة، لأن المصدر
 * يكشف النوع بدقة أكبر من الراوي. عنصرٌ راويه «يُنسب للصحابة» ومصدره
 * «من آثار الصحابة» **أثر** لا منسوب، ولو عُكس الترتيب صار منسوبًا.
 */

/** نوع النسبة — هذا ما يحدّده للمستخدم، وهو صنف لا حالة توثيق. */
export type HadithKind = "marfu" | "athar" | "attributed" | "unverified";

export const HADITH_KIND_LABELS: Record<HadithKind, string> = {
  marfu: "حديث مرفوع",
  athar: "أثر صحابي",
  attributed: "منسوب",
  unverified: "ينقصه توثيق",
};

/** الشرح يوضّح الفرق لمن لا يعرف اصطلاح «مرفوع». */
export const HADITH_KIND_HINTS: Record<HadithKind, string> = {
  marfu: "ألفظه عن راوٍ محدّد، ورواه كتاب جامع معروف.",
  athar: "من كلام الصحابة رضي الله عنهم، وليس حديثًا مرفوعًا.",
  attributed: "النسبة فيه موصوفة لا ثابتة، فلم يثبت أنها مروية.",
  unverified: "ينقصه راوٍ أو مصدر، فلا يعرض كحديث حتى يتحقق.",
};

/**
 * ثلاث نغمات بصرية لا أربع، لأن المشغول لا يقرأ أربع شارات.
 * الأثر لا يأخذ شكل المرفوع أبدا — هذه هي الحماية البصرية لا اللفظية.
 */
export type HadithTone = "raised" | "companion" | "uncertain";

export const HADITH_KIND_TONES: Record<HadithKind, HadithTone> = {
  marfu: "raised",
  athar: "companion",
  attributed: "uncertain",
  unverified: "uncertain",
};

/** حالة المراجعة العلمية. مستقلة عن النوع، وحقلها اليوم فارغ عمدًا. */
export type HadithReviewStatus = "verified" | "traceable" | "unverified";

export const REVIEW_STATUS_LABELS: Record<HadithReviewStatus, string> = {
  verified: "موثّق برقمه في مصدره",
  traceable: "الراوي والمصدر مذكوران",
  unverified: "لم يُراجَع علميًا بعد",
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
 * يصنّف نوع النسبة. الترتيب: نقص ← أثر ← نسبة موصوفة ← مرفوع.
 * الأولوية للمصدر على الراوي، لأن «من آثار الصحابة» قاطع في النوع.
 */
export function hadithKindOf(item: ProvenanceInput): HadithKind {
  if (isBlank(item.narrator) || isBlank(item.source)) return "unverified";
  if (isCompanionAthar(item)) return "athar";
  if (hasVagueNarrator(item)) return "attributed";
  return "marfu";
}

/** هل يصحّ عرضه بوصفه حديثا مرفوعا؟ الأثر والنسبة لا يصحّ. */
export function isMarfu(item: ProvenanceInput): boolean {
  return hadithKindOf(item) === "marfu";
}

/** هل يحتاج مراجعة بشرية قبل الاعتماد عليه؟ */
export function needsScholarlyReview(item: ProvenanceInput): boolean {
  return hadithKindOf(item) !== "marfu" || !canClaimVerified(item);
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
 * حالة المراجعة العلمية. `verified` تتطلّب كتابًا ورقمًا ** ومراجعة بشرية**.
 * لا يوجد اليوم عنصر واحد يحقّ له هذا الوصف، وهذا صحيح لا نقص في التنفيذ.
 */
export function reviewStatusOf(item: ProvenanceInput): HadithReviewStatus {
  if (canClaimVerified(item)) return "verified";
  if (isBlank(item.narrator) || isBlank(item.source)) return "unverified";
  return "traceable";
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
