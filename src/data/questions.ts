/**
 * خمسة عشر سؤالًا عن نظام حياتك: نومك، صلاتك، عملك، رياضتك، وهدفك.
 * من هذه الإجابات يُبنى يومك وأذكارك ومواعيد تذكيرك.
 */

export type QuestionKind = "time" | "choice" | "text";

export type AnswerKey =
  | "wakeTime"
  | "sleepTime"
  | "prayerCommitment"
  | "mostMissedPrayer"
  | "wantsFajrReminder"
  | "quranFrequency"
  | "quranAmount"
  | "workStart"
  | "workEnd"
  | "exerciseFrequency"
  | "exerciseTime"
  | "familyTime"
  | "distraction"
  | "mainGoal"
  | "city";

export type ProfileAnswers = Record<AnswerKey, string>;

export type QuestionOption = {
  value: string;
  label: string;
  hint?: string;
};

export type Question = {
  key: AnswerKey;
  title: string;
  hint: string;
  section:
    | "يومك ونومك"
    | "صلاتك"
    | "القرآن والذكر"
    | "عملك ووقتك"
    | "رياضتك"
    | "هدفك وبيئتك";
  kind: QuestionKind;
  options?: QuestionOption[];
  placeholder?: string;
};

export const QUESTIONS: Question[] = [
  {
    key: "wakeTime",
    title: "في أي ساعة تستيقظ عادةً؟",
    hint: "اكتب ساعة استيقاظك الفعلية (لا التي تتمنّاها)؛ الخطة الواقعية تبدأ من الواقع.",
    section: "يومك ونومك",
    kind: "time",
  },
  {
    key: "sleepTime",
    title: "في أي ساعة تنام فعليًا؟",
    hint: "بإجابتك نُحدّد موعد أذكار المساء وتذكير أذكار النوم قبل فراشك.",
    section: "يومك ونومك",
    kind: "time",
  },
  {
    key: "prayerCommitment",
    title: "هل تصلي الصلوات الخمس في وقتها؟",
    hint: "لا حكم ولا لوم هنا؛ نحتاج فقط أن نعرف نقطة البداية لنحدّد الخطوة التالية.",
    section: "صلاتك",
    kind: "choice",
    options: [
      { value: "always", label: "نعم، بانتظام ولله الحمد", hint: "سنركّز على الخشوع وقيام الليل" },
      { value: "most", label: "أغلب الوقت، وأحيانًا أتأخر", hint: "سنثبّت الفوائت أولًا" },
      { value: "sometimes", label: "أحيانًا فقط", hint: "نبني عادة صلاة واحدة ثابتة أولًا" },
      { value: "starting", label: "لم أبدأ بعد وأريد البدء", hint: "نبدأ بصلاة واحدة في وقتها" },
    ],
  },
  {
    key: "mostMissedPrayer",
    title: "أي صلاة أكثر ما تفوتك؟",
    hint: "سنركّز التنبيهات عليها.",
    section: "صلاتك",
    kind: "choice",
    options: [
      { value: "fajr", label: "الفجر" },
      { value: "dhuhr", label: "الظهر" },
      { value: "asr", label: "العصر" },
      { value: "maghrib", label: "المغرب" },
      { value: "isha", label: "العشاء" },
      { value: "none", label: "لا تفوتني صلاة، الحمد لله" },
    ],
  },
  {
    key: "wantsFajrReminder",
    title: "هل تريد تنبيهًا لصلاة الفجر والاستيقاظ قبلها؟",
    hint: "سنضع في خطتك أذكار الصباح بعد الفجر مباشرة.",
    section: "صلاتك",
    kind: "choice",
    options: [
      { value: "yes", label: "نعم، أريد أن أنتظم على الفجر" },
      { value: "later", label: "ليس الآن، لكن ذكّرني بالصلوات" },
    ],
  },
  {
    key: "quranFrequency",
    title: "هل تقرأ القرآن يوميًا؟",
    hint: "القليل الدائم خير من الكثير المنقطع.",
    section: "القرآن والذكر",
    kind: "choice",
    options: [
      { value: "daily", label: "نعم، يوميًا" },
      { value: "weekly", label: "أسبوعيًا" },
      { value: "rarely", label: "نادرًا" },
      { value: "never", label: "لا، أريد أن أبدأ" },
    ],
  },
  {
    key: "quranAmount",
    title: "كم تريد أن يكون وردك اليومي من القرآن؟",
    hint: "سنضعه في خطتك في الوقت المناسب لك.",
    section: "القرآن والذكر",
    kind: "choice",
    options: [
      { value: "small", label: "أقل من صفحة (ورد خفيف)" },
      { value: "page", label: "صفحة واحدة" },
      { value: "two", label: "صفحتان" },
      { value: "five", label: "خمس صفحات" },
      { value: "juz", label: "جزء كامل" },
    ],
  },
  {
    key: "workStart",
    title: "متى يبدأ عملك أو دراستك؟",
    hint: "لو يومك حرّ، اختر الساعة التي تبدأ فيها نشاطك.",
    section: "عملك ووقتك",
    kind: "time",
  },
  {
    key: "workEnd",
    title: "متى ينتهي عملك أو دراستك؟",
    hint: "سنجعل وقتك بعد العمل للرياضة أو العائلة.",
    section: "عملك ووقتك",
    kind: "time",
  },
  {
    key: "exerciseFrequency",
    title: "هل تمارس الرياضة؟",
    hint: "المؤمن القوي أحبّ إلى الله؛ ولو ٢٠ دقيقة تكفي للبداية.",
    section: "رياضتك",
    kind: "choice",
    options: [
      { value: "daily", label: "نعم، يوميًا" },
      { value: "three", label: "٣ أو ٤ مرات في الأسبوع" },
      { value: "weekly", label: "مرة في الأسبوع" },
      { value: "sometimes", label: "أحيانًا ومتقطعة" },
      { value: "never", label: "لا، وأريد أن أبدأ" },
    ],
  },
  {
    key: "exerciseTime",
    title: "ما الوقت الأنسب لك للرياضة؟",
    hint: "سنضعها في الخطّة في أقرب وقت ممكن من اختيارك.",
    section: "رياضتك",
    kind: "choice",
    options: [
      { value: "after_fajr", label: "بعد الفجر" },
      { value: "morning", label: "صباحًا" },
      { value: "after_work", label: "بعد العمل" },
      { value: "after_isha", label: "بعد العشاء" },
    ],
  },
  {
    key: "familyTime",
    title: "كم وقتًا تُخصّصه للعائلة والراحة؟",
    hint: "الالتزام لا يعني إهمال أهلك؛ بل راحتك جزء من قوّتك.",
    section: "عملك ووقتك",
    kind: "choice",
    options: [
      { value: "none", label: "لا وقت حاليًا وأريد أن أخصّص" },
      { value: "one", label: "ساعة" },
      { value: "two", label: "ساعتان" },
      { value: "three", label: "ثلاث ساعات أو أكثر" },
    ],
  },
  {
    key: "distraction",
    title: "ما أكثر ما يشوّش يومك ويُضيّع التزامك؟",
    hint: "سنبني خطتك لتقاوم هذا التشويش.",
    section: "هدفك وبيئتك",
    kind: "choice",
    options: [
      { value: "phone", label: "الهاتف والتطبيقات" },
      { value: "late_night", label: "السهر وتأخّر النوم" },
      { value: "no_plan", label: "غياب الخطة والفوضى" },
      { value: "work", label: "ضغط العمل أو الدراسة" },
      { value: "tired", label: "التعب وقلة النشاط" },
    ],
  },
  {
    key: "mainGoal",
    title: "ما هدفك الأول الآن؟",
    hint: "سنركّز عليه في الشاشة الرئيسية.",
    section: "هدفك وبيئتك",
    kind: "choice",
    options: [
      { value: "prayer", label: "الصلاة في وقتها بخشوع" },
      { value: "quran", label: "ورد القرآن كل يوم" },
      { value: "organize", label: "تنظيم يومي وتقليل الفوضى" },
      { value: "sport", label: "الرياضة وصحة الجسد" },
      { value: "family", label: "برّ الوالدين وصلاح البيت" },
      { value: "all", label: "كل ذلك، أريد التزامًا كاملًا" },
    ],
  },
  {
    key: "city",
    title: "في أي مدينة تعيش؟",
    hint: "نستخدمها لحساب مواقيت الصلاة والأذان بدقة. اكتبها كما هي معروفة (مثال: القاهرة، الرياض، اسطنبول).",
    section: "هدفك وبيئتك",
    kind: "text",
    placeholder: "القاهرة",
  },
];

export const QUESTIONS_COUNT = QUESTIONS.length;

export const DEFAULT_ANSWERS: ProfileAnswers = {
  wakeTime: "06:00",
  sleepTime: "23:00",
  prayerCommitment: "most",
  mostMissedPrayer: "fajr",
  wantsFajrReminder: "yes",
  quranFrequency: "rarely",
  quranAmount: "page",
  workStart: "09:00",
  workEnd: "17:00",
  exerciseFrequency: "sometimes",
  exerciseTime: "after_work",
  familyTime: "two",
  distraction: "phone",
  mainGoal: "prayer",
  city: "القاهرة",
};

/** يدمج أي إجابات محفوظة مع القيم الافتراضية لضمان خطّة كاملة دائمًا. */
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
