/**
 * أسئلة البداية — سبعة أسئلة فقط، وكل إجابة منها تُغيّر شيئًا فعليًا في التطبيق:
 *  - وقت الاستيقاظ والنوم → وقت تذكير أذكار الصباح والمساء والنوم.
 *  - الالتزام بالصلاة → كثافة تنبيهات الصلاة ولهجتها.
 *  - أكثر صلاة تفوتك → تنبيه خاص بها.
 *  - مقدار الورد → وردك المعروض في المصحف والرئيسية.
 *  - أهم ما تتابعه → ترتيب بطاقات الشاشة الرئيسية.
 *  - أول عمل صباحي → أول بطاقة في الرئيسية ومحتوى تذكير الصباح.
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
  | "startingRitual";

export type ProfileAnswers = Record<AnswerKey, string>;

export type QuestionOption = {
  value: string;
  label: string;
  hint?: string;
};

export type QuestionSection = "يومك ونومك" | "صلاتك" | "القرآن" | "هدفك";

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

export function optionsFor(key: AnswerKey): QuestionOption[] {
  return QUESTIONS.find((question) => question.key === key)?.options ?? [];
}

export function labelFor(key: AnswerKey, value: string): string {
  const option = optionsFor(key).find((item) => item.value === value);
  if (option) return option.label;
  if (key === "wakeTime" || key === "sleepTime") return `الساعة ${value}`;
  return value;
}

/** هل يحتاج صاحب هذه الإجابة تنبيهًا مكثّفًا للصلاة؟ */
export function needsGentlePrayerReminders(value: string) {
  return value === "sometimes" || value === "starting";
}
