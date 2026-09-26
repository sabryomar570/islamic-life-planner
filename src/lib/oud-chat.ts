/**
 * PHASE NEXT — عقل الشخصية في المحادثة.
 *
 * **هذا ليس Chatbot، ولا نموذجا لغويا.** هو امتداد الشخصية نفسها: يفهم نية
 * الكلام من كلماته، ويردّ من **حالة التطبيق الحقيقية** بنفس لهجة `oud-voice`.
 *
 * **ما يفعله:** يشخّص قصد المستخدم (شكوى، تبرير، سؤال، طلب إعادة ترتيب)،
 * ثم يبني ردّا قصيرا، ويختم بخطوة تالية واحدة قابلة للتنفيذ.
 *
 * **ما لا يفعله، ولا يفعله أبدا:**
 * - لا يدّعي معرفة الغيب ولا يخمّن ما سيحدث لك.
 * - لا يفتي ولا يحكم. سؤال فقهي أو خلافي يحوّله إلى المحتوى الموثّق داخل
 *   التطبيق، ويقول بصراحة أنه لا يجيب في الدين من نفسه.
 * - لا ينسب حديثا ولا دعاء ولا أجرا. المحتوى الديني في OUD يأتي من
 *   `data/hadith.ts` و`data/adhkar.ts` و`data/duas.ts` ومعاه مصدره.
 * - لا يستنتج أن المستخدم تغيّر من نبرة كلامه. الرمي يُبنى على أرقام
 *   مسجّلة، لا على انطباع.
 *
 * **لماذا محلّي لا سحابي:** الردّ المبني على حالة جهازك لا يحتاج أن يخرج من
 * جهازك. أخف وأسرع وأخص. وإن أردنا نموذجا لغويا حقيقيا فيجب أن يكون
 * **إضافة** فوق هذا المحرك لا بديلا عنه، ويحتاج مفتاحا لم يُعطَ بعد.
 */

import { arabicNumber, formatDuration } from "./time";
import { oudLine, type OudVoiceContext } from "./oud-voice";

export type ChatIntent =
  | "greeting"
  | "complaint"
  | "justification"
  | "ask-prayer"
  | "ask-tasks"
  | "ask-reschedule"
  | "ask-mosque"
  | "ask-progress"
  | "praise"
  | "religious"
  | "unknown";

export type ChatReply = {
  intent: ChatIntent;
  /** ردّ الشخصية — قصير، مصري، بلا إيموجي. */
  text: string;
  /** خطوة تالية واحدة إن وُجدت. لا أكثر. */
  action?: { label: string; view: string };
  /** ما الذي بُني عليه الردّ. يبقى في الحالة ليبقى الردّ قابلا للتدقيق. */
  basedOn: string;
};

/** الحقول التي يحتاجها الردّ ليقول شيئا صحيحا. */
export type ChatContext = OudVoiceContext & {
  /** عدد الخطوات الباقية في خطة اليوم. */
  remainingSteps?: number;
  /** اسم أول مهمة باقية اليوم. */
  nextTaskTitle?: string;
  /** رصيد النقاط الكلي. */
  xpTotal?: number;
  /** مسافة أقرب مسجد، إن كان الموقع مفعّلا. */
  mosqueDistanceMeters?: number;
  /** اسم صاحب التطبيق. */
  userName?: string;
};

/* ————————————————————— تشخيص القصد ————————————————————— */

type IntentRule = { intent: ChatIntent; words: readonly string[] };

/**
 * القواعد مرتّبة من الأضيق إلى الأعمّ، وأول مطابقة تفوز.
 * الترتيب مقصود: «مش عارف أصلي صليت ولا» يجب أن تُفهم كسؤال عن الصلاة
 * لا كشكوى، و«تعبت من المذاكرة» كشكوى لا كسؤال عن المذاكرة.
 */
const RULES: IntentRule[] = [
  {
    intent: "religious",
    words: [
      "فتوى",
      "اجمع",
      "جايز",
      "حلال",
      "حرام",
      "رايك",
      "رايكي",
      "اكتب حديث",
      "قول حديث",
      "ثبت حديث",
      "صح ولا",
      "ينفع اصلي",
      "دعاء",
    ],
  },
  {
    intent: "ask-reschedule",
    words: [
      "اعمل ايه",
      "عمل ايه",
      "اقترح",
      "ترتيب",
      "رتب",
      "اقدر اعمل",
      "ممكن اعمل",
      "خطه",
      "خطتي",
      "اقسم",
      "اعاده",
    ],
  },
  {
    intent: "ask-mosque",
    words: ["مسجد", "جامع", "خريطة", "ازاي اوصل", "فين"],
  },
  {
    // **المفرد والمثنى كلاهما.** المستخدم يكتب «كام نقطة» لا «كام نقاط»،
    // والقائمة صُنعت على الجمع أول مرة فسقطت عليه. تعلّمنا من الاختبار.
    intent: "ask-progress",
    words: ["نقاط", "نقطة", "انجاز", "انجازات", "تقدم", "مستوى", "مستواي", "ليفل"],
  },
  {
    intent: "ask-tasks",
    words: [
      "مذاكره",
      "مهمه",
      "شغلت",
      "انجزت",
      "خطوة",
      "متبقي",
      "فاضل",
      "ياريت",
    ],
  },
  {
    intent: "ask-prayer",
    words: [
      "صلي",
      "الصلاة",
      "صلاه",
      "فجر",
      "الظهر",
      "عصر",
      "مغرب",
      "العشاء",
      "امسكت",
    ],
  },
  {
    intent: "justification",
    words: [
      "كنت في",
      "كنت مش",
      "في الطريق",
      "في الشغل",
      "نسيت",
      "نصيت",
      "كان فيه",
      "متأخر",
      "اتأخرت",
      "تأخرت",
    ],
  },
  {
    intent: "complaint",
    words: [
      "تعبت",
      "مش قادر",
      "مش عارف",
      "زهقت",
      "ملقت",
      "مليت",
      "ضيق",
      "مش طايق",
      "عصبت",
      "مش هينفع",
      "مش عايز",
    ],
  },
  {
    intent: "greeting",
    words: [
      "السلام عليكم",
      "وعليكم",
      "اهلا",
      "صباح الخير",
      "مساء الخير",
      "ازيك",
      "هاي",
    ],
  },
  {
    intent: "praise",
    words: ["تمام", "ماشي", "شكرا", "ممتاز", "تسلم", "برافو", "جميل"],
  },
];

/**
 * توحيد كتابة المستخدم: تشكيل، همزات، تاء مربوطة، علامات.
 * لأن المستخدم يكتب على الهاتف بسرعة، فالبحث عن لفظ حرفي بلا توحيد
 * يفوّت نصف الكلمات.
 */
function normalize(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/[ىيئ]/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ة/g, "ه")
    .replace(/[؟?!.,،؛؛]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function detectIntent(message: string): ChatIntent {
  const text = normalize(message);
  if (text.length === 0) return "unknown";
  for (const rule of RULES) {
    if (rule.words.some((word) => text.includes(normalize(word)))) return rule.intent;
  }
  return "unknown";
}

/* ————————————————————— الردّ ————————————————————— */

type Recipe = { text: string; action?: { label: string; view: string }; basedOn: string };

/** خطوة تالية واحدة قابلة للتنفيذ. بلا رقم مفبرك: نقول المتاح فقط. */
function nextStep(context: ChatContext): { label: string; view: string } | undefined {
  if (context.nextPrayer && context.nextPrayer.minutesLeft <= 20) {
    return { label: "افتح صلاتك", view: "prayers" };
  }
  if ((context.remainingSteps ?? 0) > 0) {
    return { label: "افتح خطة اليوم", view: "today" };
  }
  if ((context.missingAdhkar ?? []).length > 0) {
    return { label: "افتح الأذكار", view: "adhkar" };
  }
  return { label: "افتح يومك", view: "today" };
}

function recipeFor(intent: ChatIntent, context: ChatContext): Recipe {
  const prayer = context.lastPrayer;
  const next = context.nextPrayer;

  switch (intent) {
    case "religious":
      return {
        // رفض صريح وواضح. لا مراوغة ولا «ربما» ولا حكم من عندنا.
        text: "أنا مش بفتتاوي ومش بهوّل كلام. ادخل الأحاديث والأدعية، كل نصّ هناك ومعاه مصدره، وقول رايك لو عايز.",
        action: { label: "افتح الأحاديث", view: "hadith" },
        basedOn: "حدود الدور: لا حكم فقهي ولا نسبة شرعية بلا مصدر",
      };

    case "complaint": {
      // لا «لا بأس، أنت قادر». نسمّي الشيء الوحيد الممكن اليوم.
      const remaining = context.remainingSteps ?? 0;
      return {
        text:
          remaining > 0
            ? `ماشي، تعب حقيقي. ما فيش داعي تكمّل الكل — خُد خطوة واحدة بس: ${context.nextTaskTitle ?? "أهم خطوة"}، والباقي بكرة.`
            : "ماشي، تعب حقيقي. النهارده خلّصت اللي عليك، والباقي مفيش مطلوب منك.",
        action: nextStep(context),
        basedOn: "عدد الخطوات الباقية فعلا في خطة اليوم",
      };
    }

    case "justification": {
      // نقبل التبرير بلا محاكمة، ثم نعيده إلى السجل. الصدق أهم من الحدة.
      if (prayer && !prayer.logged) {
        return {
          text: `عادي، ده بيحصل. بس سيبها فاضية مش هترجع لوحدها — ${prayer.name} لسه مفتوحة، سجّلها وخلّينا نعدّي.`,
          action: { label: "سجّل الصلاة", view: "prayers" },
          basedOn: "صلاة دخل وقتها ولم تُسجّل بعد",
        };
      }
      return {
        text: "سمعتك، مش هحاسبك دلوقتي. علّينا نكمّل اللي بعده.",
        action: nextStep(context),
        basedOn: "لا خطوة باقية، فلا محاسبة",
      };
    }

    case "ask-prayer": {
      if (prayer && !prayer.logged) {
        return {
          text: `${prayer.name} مرّت عليك من ${formatDuration(prayer.minutesAgo)} ولسه فاضية.`,
          action: { label: "افتح صلاتك", view: "prayers" },
          basedOn: "آخر صلاة في السجل ولم تُسجّل",
        };
      }
      if (next) {
        return {
          text: `القادمة ${next.name} بعد ${formatDuration(next.minutesLeft)}.`,
          action: { label: "افتح صلاتك", view: "prayers" },
          basedOn: "مواقيت اليوم المحسوبة من موقعك",
        };
      }
      return {
        text: "مفيش وقت محسوب دلوقتي. افتح صلاتك وأنا أرتّبهم.",
        action: { label: "افتح صلاتك", view: "prayers" },
        basedOn: "لا مواقيت في اللقطة الحالية",
      };
    }

    case "ask-tasks": {
      const remaining = context.remainingSteps ?? 0;
      if (remaining === 0) {
        return {
          text: "مفيش خطوة متبقية. قلت ده خلاص، يبقى خلاص.",
          basedOn: "خطة اليوم مكتملة",
        };
      }
      return {
        text: `فاضل ${arabicNumber(remaining)} خطوة. أهم واحدة دلوقتي: ${context.nextTaskTitle ?? "شوف خطة اليوم"}.`,
        action: { label: "افتح الخطة", view: "today" },
        basedOn: "خطة اليوم: عدد وأول خطوة باقية",
      };
    }

    case "ask-reschedule": {
      const remaining = context.remainingSteps ?? 0;
      if (remaining <= 1) {
        return {
          text: "مفيش داعي ترتّب حاجة. اللي فاضل خلّصه، والباقي بكره.",
          basedOn: "خطوة واحدة باقية أو أقل",
        };
      }
      return {
        text: `عندك ${arabicNumber(remaining)} خطوة. خُد الأهم وحدها دلوقتي، واللي بعدها نبدأ نعدّلها. ما الغطّيش الخطة كلها.`,
        action: { label: "افتح خطة اليوم", view: "today" },
        basedOn: "عدد الخطوات الباقية",
      };
    }

    case "ask-mosque": {
      if (context.mosqueDistanceMeters !== undefined) {
        return {
          text: `أقرب مسجد على بعد ${arabicNumber(context.mosqueDistanceMeters)} متر منك دلوقتي.`,
          action: { label: "افتح صلاتك", view: "prayers" },
          basedOn: "المسافة من الموقع الحالي فقط، ولا تدل على أنك صلّيت",
        };
      }
      return {
        text: "ما فعّلتش الموقع، فما أعرفش أقرب مسجد. لو سمحت بالموقع من الإعدادات تظهر المسافة هنا.",
        action: { label: "افتح الإعدادات", view: "settings" },
        basedOn: "لا إحداثيات متاحة في هذه الجلسة",
      };
    }

    case "ask-progress": {
      const total = context.xpTotal ?? 0;
      return {
        text: `عندك ${arabicNumber(total)} نقطة، و${arabicNumber(context.quietDays ?? 0)} يوم انقطاع. دي أرقامك انت، ومحدش تاني شايفها.`,
        basedOn: "رصيد النقاط المحفوظ على جهازك",
      };
    }

    case "greeting": {
      const line = oudLine(context);
      return {
        text: line?.text ?? "أهلاً. أنا عود، ومعاك.",
        basedOn: "سطر الشخصية المحسوب من لحظتك الحالية",
      };
    }

    case "praise":
      return {
        text: "المدح مني قليل عشان يبقى يسوى. خُد اللي بعده.",
        basedOn: "ردّ استقبال بلا ادعاء",
      };

    case "unknown":
    default: {
      const line = oudLine(context);
      return {
        text: line?.text ?? "قولّي بس عايز تعمل إيه، وأنا أرتّبهولك.",
        action: nextStep(context),
        basedOn: line ? `سطر الشخصية: ${line.id}` : "لا سبب واضح للكلام",
      };
    }
  }
}

/**
 * يردّ على رسالة. مدخل واحد مخرج واحد، بلا حالة: يمكن اختباره، ويمكن
 * اختبار الواجهة عليه.
 */
export function respond(message: string, context: ChatContext): ChatReply {
  const intent = detectIntent(message);
  const recipe = recipeFor(intent, context);
  return {
    intent,
    text: recipe.text,
    action: recipe.action,
    basedOn: recipe.basedOn,
  };
}

/** أوّل ردّ عند فتح المحادثة: يقرأ اللقطة نفسها، فلا يكون ترحيبا بالعبث. */
export function openingLine(context: ChatContext): string {
  const line = oudLine(context);
  if (line) return line.text;
  const name = context.userName?.split(" ")[0];
  return name ? `يا ${name}، قولي عايز ترتّب إيه.` : "قولّي بس عايز تعمل إيه، وأنا أرتّبهولك.";
}
