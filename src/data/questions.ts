/**
 * أسئلة البداية — خمسة عشر سؤالًا أساسيًا، وكل إجابة منها تُغيّر شيئًا فعليًا:
 *  - وقت الاستيقاظ والنوم → وقت تذكير أذكار الصباح والمساء والنوم + نافذة الرئيسية.
 *  - الالتزام بالصلاة → كثافة تنبيهات الصلاة ولهجتها.
 *  - أكثر صلاة تفوتك → تنبيه خاص بها.
 *  - مقدار الورد → وردك المعروض في المصحف والرئيسية.
 *  - أهم ما تتابعه → ترتيب بطاقات الشاشة الرئيسية.
 *  - أول عمل صباحي → أول بطاقة في الرئيسية ومحتوى تذكير الصباح.
 *  - شكل يومك ونهاية التزامك → تسمية يومك ووقت فتح مراجعة اليوم.
 *  - مستوى المتابعة → نبرة المراجعة والتذكير.
 *  - تركيز الأسبوع → المؤشر الأسبوعي الوحيد المعروض.
 * المكان لا يُسأل عنه: يُستنتج من المنطقة الزمنية للجهاز.
 */

export type QuestionKind = "time" | "choice";

export type AnswerKey =
  | "wakeTime"
  | "sleepTime"
  | "prayerCommitment"
  | "mostMissedPrayer"
  | "quranAmount"
  | "mainGoal"
  | "startingRitual"
  // ——— أسئلة «حياتك»: كل إجابة تُغيّر ترتيب الرئيسية أو وقت المراجعة أو نبرة المحاسبة ———
  | "dayRhythm"
  | "dayEnd"
  | "focusTime"
  | "movement"
  | "distraction"
  | "eveningReset"
  | "disciplineLevel"
  | "weeklyFocus";

export type ProfileAnswers = Record<AnswerKey, string>;

/**Seven questions required for a useful first-run experience.*/
export const ESSENTIAL_ANSWER_KEYS = [
  "wakeTime",
  "sleepTime",
  "prayerCommitment",
  "mostMissedPrayer",
  "quranAmount",
  "mainGoal",
  "startingRitual",
] as const satisfies readonly AnswerKey[];

/**Useful profile refinements collected progressively, not forced on first run.*/
export const OPTIONAL_ANSWER_KEYS = [
  "dayRhythm",
  "dayEnd",
  "focusTime",
  "movement",
  "distraction",
  "eveningReset",
  "disciplineLevel",
  "weeklyFocus",
] as const satisfies readonly AnswerKey[];

export type QuestionOption = {
  value: string;
  label: string;
  hint?: string;
};

export type QuestionSection = "يومك ونومك" | "صلاتك" | "القرآن" | "هدفك" | "حياتك";

export type Question = {
  key: AnswerKey;
  title: string;
  hint: string;
  section: QuestionSection;
  kind: QuestionKind;
  options?: QuestionOption[];
};

export const QUESTIONS: Question[] = [
  {
    key: "wakeTime",
    title: "في أي ساعة تستيقظ عادةً؟",
    hint: "عليها نضبط تذكير أذكار الصباح وموعد أول عمل في يومك.",
    section: "يومك ونومك",
    kind: "time",
  },
  {
    key: "sleepTime",
    title: "في أي ساعة تنام فعليًا؟",
    hint: "نذكّرك بأذكار المساء قبلها، وبأذكار النوم قبل فراشك.",
    section: "يومك ونومك",
    kind: "time",
  },
  {
    key: "prayerCommitment",
    title: "أين أنت مع الصلوات الخمس؟",
    hint: "نوع التنبيه يختلف: من يبدأ يحتاج تذكيرًا أوضح، ومن ينتظم لا يحتاج تكرارًا.",
    section: "صلاتك",
    kind: "choice",
    options: [
      { value: "always", label: "في وقتها بانتظام", hint: "تنبيه واحد عند دخول الوقت" },
      { value: "most", label: "أغلب الوقت وأتأخر أحيانًا", hint: "تنبيه عند الوقت وقبل الفوات" },
      {
        value: "sometimes",
        label: "أحيانًا فقط",
        hint: "تنبيه عند الوقت وقبله بدقائق",
      },
      { value: "starting", label: "لم أبدأ بعد وأريد البدء", hint: "تبدأ بصلاة واحدة في وقتها" },
    ],
  },
  {
    key: "mostMissedPrayer",
    title: "أي صلاة أكثر ما تفوتك؟",
    hint: "نجعل تنبيهها أقوى وأبكر من غيرها.",
    section: "صلاتك",
    kind: "choice",
    options: [
      { value: "fajr", label: "الفجر" },
      { value: "dhuhr", label: "الظهر" },
      { value: "asr", label: "العصر" },
      { value: "maghrib", label: "المغرب" },
      { value: "isha", label: "العشاء" },
      { value: "none", label: "لا تفوتني، الحمد لله" },
    ],
  },
  {
    key: "quranAmount",
    title: "كم تريد أن يكون وردك اليومي من القرآن؟",
    hint: "يظهر في الرئيسية وفي المصحف ليذكّرك بحدّك اليومي.",
    section: "القرآن",
    kind: "choice",
    options: [
      { value: "small", label: "أقل من صفحة" },
      { value: "page", label: "صفحة واحدة" },
      { value: "two", label: "صفحتان" },
      { value: "five", label: "خمس صفحات" },
      { value: "juz", label: "جزء كامل" },
    ],
  },
  {
    key: "mainGoal",
    title: "ما أهم شيء تريد أن يتابعه معك؟",
    hint: "بطاقته تكون أول ما تراه في الرئيسية.",
    section: "هدفك",
    kind: "choice",
    options: [
      { value: "prayer", label: "الصلوات في وقتها" },
      { value: "quran", label: "ورد القرآن" },
      { value: "adhkar", label: "الأذكار في أوقاتها" },
      { value: "duas", label: "الدعاء واللجوء إلى الله" },
    ],
  },
  {
    key: "startingRitual",
    title: "بماذا تحب أن تبدأ صباحك؟",
    hint: "نضعه أول شاشتك، ونذكّرك به بعد استيقاظك.",
    section: "هدفك",
    kind: "choice",
    options: [
      { value: "wird", label: "ورد القرآن" },
      { value: "adhkar", label: "أذكار الصباح" },
      { value: "dua", label: "دعاء الصباح" },
      { value: "tasbih", label: "تسبيح وذكر" },
    ],
  },
  // ——— «حياتك»: ثمانية أسئلة تُدير ترتيب يومك ومراجعته — كل إجابة مستخدمة فعلًا ———
  {
    key: "dayRhythm",
    title: "كيف يبدو يومك غالبًا؟",
    hint: "حتى يُسمّى يومك باسمه، وتُرتّب خطواته المناسبة له.",
    section: "حياتك",
    kind: "choice",
    options: [
      { value: "study", label: "دراسة" },
      { value: "work", label: "عمل" },
      { value: "both", label: "دراسة وعمل" },
      { value: "open", label: "وقتي مرن" },
    ],
  },
  {
    key: "dayEnd",
    title: "متى ينتهي التزامك اليومي عادة؟",
    hint: "بعد هذا الوقت نفتح معك مراجعة يومك — دقيقة واحدة.",
    section: "حياتك",
    kind: "time",
  },
  {
    key: "focusTime",
    title: "متى تبدأ أهم مسؤولية في يومك؟",
    hint: "نضعها في سطر خطة اليوم حتى لا يضيع أول يومك بين التنقلات.",
    section: "حياتك",
    kind: "time",
  },
  {
    key: "movement",
    title: "ما الحركة التي تستطيع إبقاءها على يومك؟",
    hint: "نذكّرك بها كخطوة واقعية، لا كهدف تفشل فيه.",
    section: "حياتك",
    kind: "choice",
    options: [
      { value: "walk", label: "مشي خفيف" },
      { value: "sport", label: "رياضة أو تمرين" },
      { value: "active", label: "نشاط داخل العمل أو الدراسة" },
      { value: "rest", label: "الراحة أولًا", hint: "نبدأ بخطوة أخف الآن" },
    ],
  },
  {
    key: "distraction",
    title: "ما أكثر ما يسحب انتباهك عن واجبك؟",
    hint: "نحوّلها إلى تذكير صغير يحترم وقتك، بلا لوم أو مبالغة.",
    section: "حياتك",
    kind: "choice",
    options: [
      { value: "phone", label: "الهاتف" },
      { value: "social", label: "التواصل الاجتماعي" },
      { value: "fatigue", label: "الإرهاق" },
      { value: "noise", label: "الضجيج أو تشتت المكان" },
    ],
  },
  {
    key: "eveningReset",
    title: "كيف تحب أن تهدأ قبل النوم؟",
    hint: "نقترح نهاية يوم قصيرة تتناسب مع التزاماتك بدل وصفة عامة.",
    section: "حياتك",
    kind: "choice",
    options: [
      { value: "quran", label: "قراءة خفيفة" },
      { value: "adhkar", label: "أذكار المساء والنوم" },
      { value: "reflection", label: "مراجعة اليوم" },
      { value: "calm", label: "هدوء ودون شاشة" },
    ],
  },
  {
    key: "disciplineLevel",
    title: "كيف تحب أن أتابعك؟",
    hint: "توازن بين الرفق والجدّ؛ تختاره أنت ويمكن تغييره من الإعدادات.",
    section: "حياتك",
    kind: "choice",
    options: [
      { value: "gentle", label: "برفق", hint: "تذكير هادئ فقط، بلا أسئلة إضافية" },
      { value: "balanced", label: "متوازن", hint: "تذكير + مراجعة يوم واحدة" },
      { value: "firm", label: "حازم", hint: "أذكرك بصراحة وأسأل عن العائق" },
    ],
  },
  {
    key: "weeklyFocus",
    title: "ما الذي نركّز عليه هذا الأسبوع؟",
    hint: "هدف واحد فقط، ونقيسه بأدلة من سجلك لا بالشعور.",
    section: "حياتك",
    kind: "choice",
    options: [
      { value: "prayer", label: "الصلاة في وقتها" },
      { value: "adhkar", label: "أذكار الصباح والمساء" },
      { value: "consistency", label: "ألا يمر يوم بلا ذكر وصلاة" },
    ],
  },
];

export const QUESTIONS_COUNT = QUESTIONS.length;

export const DEFAULT_ANSWERS: ProfileAnswers = {
  wakeTime: "06:00",
  sleepTime: "23:00",
  prayerCommitment: "most",
  mostMissedPrayer: "fajr",
  quranAmount: "page",
  mainGoal: "prayer",
  startingRitual: "wird",
  dayRhythm: "open",
  dayEnd: "17:00",
  focusTime: "08:00",
  movement: "walk",
  distraction: "phone",
  eveningReset: "adhkar",
  disciplineLevel: "balanced",
  weeklyFocus: "prayer",
};

/** يدمج الإجابات المحفوظة مع القيم الافتراضية حتى لا تنقص إجابة أبدًا. */
export function pickAnswers(
  source?: Partial<Record<AnswerKey, string>> | null,
): ProfileAnswers {
  const result: ProfileAnswers = { ...DEFAULT_ANSWERS };
  if (!source) return result;
  (Object.keys(DEFAULT_ANSWERS) as AnswerKey[]).forEach((key) => {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) result[key] = value;
  });
  return result;
}

export function questionFor(key: AnswerKey): Question {
  const question = QUESTIONS.find((item) => item.key === key);
  if (!question) throw new Error(`Unknown profile question: ${key}`);
  return question;
}

export function optionsFor(key: AnswerKey): QuestionOption[] {
  return questionFor(key).options ?? [];
}

export function labelFor(key: AnswerKey, value: string): string {
  const option = optionsFor(key).find((item) => item.value === value);
  if (option) return option.label;
  if (key === "wakeTime" || key === "sleepTime" || key === "dayEnd" || key === "focusTime") {
    return `الساعة ${value}`;
  }
  return value;
}

/** هل يحتاج صاحب هذه الإجابة تنبيهًا مكثّفًا للصلاة؟ */
export function needsGentlePrayerReminders(value: string) {
  return value === "sometimes" || value === "starting";
}
