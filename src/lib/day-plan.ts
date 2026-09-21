import type { ProfileAnswers } from "@/data/questions";
import type { PrayerKey, Timings } from "@/lib/prayers";
import { addMinutes, formatArabicTime, toMinutes } from "@/lib/time";

export type PlanBlockKind =
  | "adhkar"
  | "prayer"
  | "quran"
  | "sport"
  | "work"
  | "family"
  | "meal"
  | "sleep"
  | "focus";

export type PlanBlock = {
  id: string;
  time: string;
  title: string;
  detail: string;
  kind: PlanBlockKind;
  prayer?: PrayerKey;
};

const QURAN_AMOUNT_LABEL: Record<string, string> = {
  small: "ورد خفيف (أقل من صفحة)",
  page: "صفحة واحدة",
  two: "صفحتان",
  five: "خمس صفحات",
  juz: "جزء كامل",
};

const SPORT_FREQUENCY_LABEL: Record<string, string> = {
  daily: "تمارين يومية",
  three: "٣–٤ مرات أسبوعيًا",
  weekly: "مرة واحدة أسبوعيًا",
  sometimes: "تمارين متقطعة",
  never: "بداية جديدة",
};

const FAMILY_HOURS: Record<string, string> = {
  none: "٣٠ دقيقة ولو بلا هاتف",
  one: "ساعة",
  two: "ساعتان",
  three: "ثلاث ساعات",
};

/**
 * يبني خطّة اليوم من إجابات الأسئلة الخمسة عشر + مواقيت الصلاة الفعلية.
 * كل فترة زمنية تأتي مع تفسير عملي قصير، ليمشي المبتدئ بخطوة واضحة.
 */
export function buildDayPlan(
  answers: ProfileAnswers,
  timings: Timings | null,
): PlanBlock[] {
  const fajr = timings?.fajr ?? answers.wakeTime;
  const dhuhr = timings?.dhuhr ?? "12:30";
  const asr = timings?.asr ?? "15:45";
  const maghrib = timings?.maghrib ?? "18:15";
  const isha = timings?.isha ?? "19:45";

  const blocks: PlanBlock[] = [];

  // ١ — الاستيقاظ وأذكار الصباح
  blocks.push({
    id: "wake",
    time: answers.wakeTime,
    title: "الاستيقاظ وأذكار الصباح",
    detail:
      "ابدأ بـ«الحمد لله الذي أحيانا» ثم أذكار الصباح: آية الكرسي والمعوذات وسيد الاستغفار.",
    kind: "adhkar",
  });

  // ٢ — الفجر
  blocks.push({
    id: "fajr",
    time: fajr,
    title: "صلاة الفجر",
    detail:
      answers.wantsFajrReminder === "yes"
        ? "أذان الفجر + تنبيه قبلها بـ ١٥ دقيقة. من صلى الفجر في جماعة فهو في ذمّة الله."
        : "صلِّ الفجر في وقته، ولو تأخّرت فقُم واقضِ؛ لا تدعها تصبح عادة مفقودة.",
    kind: "prayer",
    prayer: "fajr",
  });

  // ٣ — الرياضة
  const sportBase =
    answers.exerciseTime === "after_fajr"
      ? addMinutes(fajr, 35)
      : answers.exerciseTime === "morning"
        ? addMinutes(answers.workStart, -75)
        : answers.exerciseTime === "after_work"
          ? addMinutes(answers.workEnd, 25)
          : addMinutes(isha, 45);
  blocks.push({
    id: "sport",
    time: sportBase,
    title: `الرياضة — ${SPORT_FREQUENCY_LABEL[answers.exerciseFrequency] ?? "نشاط بدني"}`,
    detail:
      answers.exerciseFrequency === "never"
        ? "ابدأ بـ ١٥ دقيقة مشي سريع. المؤمن القوي أحبّ إلى الله من المؤمن الضعيف."
        : "٢٠–٣٠ دقيقة حركة: مشي سريع، تمارين مقاومة، أو شدّ ومدّ. الماء قبلها وبعدها.",
    kind: "sport",
  });

  // ٤ — ورد القرآن
  const quranBase =
    answers.quranFrequency === "daily" || answers.mainGoal === "quran"
      ? addMinutes(fajr, 30)
      : addMinutes(isha, -60);
  blocks.push({
    id: "quran",
    time: quranBase,
    title: "ورد القرآن",
    detail: `${QURAN_AMOUNT_LABEL[answers.quranAmount] ?? "صفحة واحدة"} بترتيل وبتمعّن، ولا تتركه ولو يومًا واحدًا.`,
    kind: "quran",
  });

  // ٥ — العمل أو الدراسة
  blocks.push({
    id: "work",
    time: answers.workStart,
    title: "العمل / الدراسة",
    detail: `من ${formatArabicTime(answers.workStart)} إلى ${formatArabicTime(
      answers.workEnd,
    )}، مع استراحة ٥ دقائق كل ٥٠ دقيقة، وضَع الهاتف بعيدًا في أوقات العمل المركز.`,
    kind: "work",
  });

  // ٦ — الظهر والعصر
  blocks.push({
    id: "dhuhr",
    time: dhuhr,
    title: "صلاة الظهر",
    detail: "توضّأ قبل الأذان بدقائق، واحضر قلبك: أَقْرَبُ ما يكون العبد من ربه وهو ساجد.",
    kind: "prayer",
    prayer: "dhuhr",
  });

  blocks.push({
    id: "asr",
    time: asr,
    title: "صلاة العصر",
    detail: "من صلى البردين دخل الجنة؛ لا تؤخّرها، اجعلها فاصلًا يُجدّد نشاطك.",
    kind: "prayer",
    prayer: "asr",
  });

  // ٧ — العائلة
  if (answers.familyTime !== "none") {
    blocks.push({
      id: "family",
      time: addMinutes(answers.workEnd, 45),
      title: "وقت العائلة",
      detail: `${FAMILY_HOURS[answers.familyTime]} مع أهلك بلا شاشات؛ صلتك بهم جزء من التزامك.`,
      kind: "family",
    });
  } else {
    blocks.push({
      id: "family",
      time: addMinutes(answers.workEnd, 45),
      title: "وقت العائلة — بداية",
      detail: "٣٠ دقيقة فقط بلا هاتف: سؤال، مكالمة، أو جلسة قصيرة مع من تحب.",
      kind: "family",
    });
  }

  // ٨ — المغرب وأذكار المساء
  blocks.push({
    id: "maghrib",
    time: maghrib,
    title: "صلاة المغرب",
    detail: "بعد المغرب ابدأ أذكار المساء: آية الكرسي والمعوذات وسيد الاستغفار.",
    kind: "prayer",
    prayer: "maghrib",
  });

  // ٩ — العشاء
  blocks.push({
    id: "isha",
    time: isha,
    title: "صلاة العشاء",
    detail: "أعِدّ نيتك للغد، وقل: اللهم أعنّي على ذكرك وشكرك وحسن عبادتك.",
    kind: "prayer",
    prayer: "isha",
  });

  // ١٠ — إغلاق اليوم
  blocks.push({
    id: "close",
    time: addMinutes(answers.sleepTime, -45),
    title: "إغلاق اليوم ومراجعة إنجازك",
    detail:
      "راجع صلواتك في التطبيق، اكتب ثمرة واحدة لليوم، وحدّد أول مهمة لك غدًا.",
    kind: "focus",
  });

  // ١١ — النوم وأذكاره
  blocks.push({
    id: "sleep",
    time: answers.sleepTime,
    title: "النوم وأذكار النوم",
    detail:
      "آية الكرسي، المعوذات، سبحان الله ٣٣ والحمد لله ٣٣ والله أكبر ٣٤، ثم نم على وضوء.",
    kind: "sleep",
  });

  return blocks.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
}

/** مؤشر التشويش القادم من إجابات المستخدم — نصيحة مخصّصة. */
export function distractionAdvice(distraction: string): string {
  switch (distraction) {
    case "phone":
      return "ضع الهاتف في غرفة أخرى وقت الصلاة والورد، وأغلق الإشعارات غير الضرورية.";
    case "late_night":
      return "ابدأ بتقديم النوم ٣٠ دقيقة كل ليلة، ولا هاتف بعد أذكار النوم.";
    case "no_plan":
      return "لا تبدأ يومك بلا خطّة؛ افتح «يومي» في الصباح واعرف فترتك القادمة.";
    case "work":
      return "اربط الصلاة بأوقات العمل: خروج قصير عند الأذان يُنعش تركيزك.";
    case "tired":
      return "قلة النوم والتغذية سبب التعب؛ التزم بالنوم والحركة اليومية والماء.";
    default:
      return "اكتب أول خطوة صغيرة اليوم ونفّذها فورًا.";
  }
}
