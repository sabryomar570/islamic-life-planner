/**
 * PHASE NEXT — شخصية عود.
 *
 * **هذه ليست قوالب تحفيزية.** كل سطر هنا يجيب على سؤال واحد: ما الذي تغيّر
 * في حياة المستخدم حتى يصحّ أن نقول هذا؟ لو لم يتغيّر شيء، فلا كلام.
 *
 * قواعد ثابتة — لا خيارات للمستخدم ولا نبرة يختارها:
 *
 * 1. **شخصية واحدة للجميع.** عود صاحبك المصري المتابع: لا يطبطب كل مرة،
 *    ويقولك لو قصرت، ويفرحلك فعلا لما ترجع.
 * 2. **بلا عشوائية.** الاختيار بين صيغ نفس السياق يبذرة على (المعرّف +
 *    تاريخ اليوم)، فيبقى **مستقرا خلال اليوم، ومتنوّعا بين الأيام**، وقابلا
 *    للاختبار. لو استعملنا `Math.random` لترتجف الرسالة كل دقيقة وتبعثر
 *    الذاكرة والاختبارات معا.
 * 3. **بلا إيموجي.** الإيموجي هنا تثاور مصطنع. الحالة تُقرأ بالكلمة
 *    والصوتة، لا بالرمز.
 * 4. **المدح نادر.** «تسلمم» لا تعني أن كل يوم إنجاز. المدح يبان، وشرطه
 *    حدث حقيقي لا مزاج.
 * 5. **الجلد دعابة لا إهانة.** ن teasing على تكرار السلوك نفسه، ولا نلمس
 *    المستخدم نفسه. نقول له إن عود راقب، لا إنه صغير.
 * 6. **صفر ادعاء ديني في هذه الطبقة.** لا حديث ولا آية ولا دعاء ولا فضل
 *    ولا أجر ولا حكم. أي نص ديني في OUD يأتي من المتاجر الموثّقة في
 *    `data/hadith.ts` و`data/adhkar.ts` و`data/duas.ts` فقط، ومعاه مصدره.
 *    ممنوع هنا: «مليون حسنة»، «سبع وعشرين درجة»، «مفيش حاجة بتغفرها»،
 *    «من صلى الفجر حفظ اليوم كامل». هذه لم تُراجع علميا، فلا تخرج من هنا،
 *    و`tests/oud-voice.test.ts` يمنع عودة أي منها.
 *
 * وحدة المنطق خالصة: لا React ولا شبكة ولا تخزين. كل ما هنا يُختبر.
 */

import { arabicNumber } from "./time";

/** نبرة السطر — تغيّر شكل العرض، لا النص. */
export type OudTone = "calm" | "direct" | "tease" | "warm" | "proud";

export type OudLineId =
  | "prayer-lead"
  | "prayer-time"
  | "prayer-chase"
  | "prayer-direct"
  | "task-time"
  | "task-procrastination"
  | "task-done-after-delay"
  | "absence"
  | "return-after-break"
  | "day-complete"
  | "big-win"
  | "mosque-near"
  | "xp-earned"
  | "unlock"
  | "adhkar-missed"
  | "late-night"
  | "quiet";

export type OudLine = {
  id: OudLineId;
  /** معرّف الصيغة داخل المجموعة — يُستعمل للتهدئة ولاختبار الثبات. */
  variant: string;
  text: string;
  tone: OudTone;
  /** أولوية السياق: الصلاة فوق كل شيء، ثم اليوم، ثم الطقس. */
  priority: number;
  /** دقائق منع تكرار نفس السطر بالذات. */
  cooldownMinutes: number;
  /** الشاشة المقترحة عند الضغط على السطر. */
  view?: string;
};

/**
 * سياق الشخصية. كل حقل مشتقّ من **حالة حقيقية** في التطبيق:
 * لا قيمة افتراضية، ولا «نفترض أن» — ما لم يكن معروضا فليس في الكلام.
 */
export type OudVoiceContext = {
  now: Date;
  /** الصلاة القادمة: الاسم والدقائق المتبقية. */
  nextPrayer?: { name: string; minutesLeft: number };
  /** آخر صلاة دخل وقتها: الاسم، كم دقيقة مضت، وهل سُجّلت. */
  lastPrayer?: { name: string; minutesAgo: number; logged: boolean };
  /** الوقت الذي نبدأ به التذكير قبل الصلاة. */
  leadMinutes?: number;
  /** مهمة قريبة من وقتها، أو أُنجزت للتو. */
  task?: { title: string; startsInMinutes: number };
  /**
   * كم مرة **أخّرها المستخدم فعلا** — من سجلّ نتائج الخطة المحفوظ.
   * صفر يعني: لا سابق، فلا تذكير. هذه الذاكرة الوحيدة المسموحة.
   */
  taskPostponedCount?: number;
  /** أنهى مهمة مؤجّلة، وبعد كم يوم. */
  taskDoneAfterDays?: number;
  /** أيام متواصلة بلا أي نشاط مسجّل. */
  quietDays?: number;
  /** رجع اليوم بعد انقطاع. */
  returnedAfterBreak?: boolean;
  /** كل صلوات اليوم سُجّلت. */
  dayComplete?: boolean;
  /** يوم استثنائي: كل الصلوات في وقتها. */
  perfectDay?: boolean;
  mosque?: { name: string; distanceMeters: number };
  /** نقاط كسبها للتو. */
  xpGained?: number;
  /** اسم ما فُتح للتو: إنجاز أو ثيم. */
  unlocked?: string;
  /** أذكار لم تُقرأ اليوم بعد. */
  missingAdhkar?: string[];
  /** وقت نومه المختار بالدقائق. */
  sleepMinutes?: number;
};

type Pool = { variant: string; text: string; tone: OudTone };

type GroupMeta = {
  priority: number;
  cooldownMinutes: number;
  view?: string;
  /** الحقول التي لا ينتج نص مفيد بدونها. */
  requires: readonly (keyof OudVoiceContext)[];
  pool: Pool[];
};

/**
 * كل مجموعة صيغ. المهدرة منها تُحذف، ولا نكتب ناقصا.
 * كل صيغة جملة مكتملة، بلا علامات تعجب مكثّفة إلا حين تخدم الكلام.
 */
const POOLS: Record<OudLineId, GroupMeta> = {
  "prayer-lead": {
    priority: 100,
    cooldownMinutes: 45,
    view: "prayers",
    requires: ["nextPrayer"],
    pool: [
      { variant: "a", text: "و{next} هياذن — رتّب اللي حواليك", tone: "direct" },
      { variant: "b", text: "{next} بعد {n} دقيقة، جهّز حالك", tone: "direct" },
      { variant: "c", text: "اقترب وقت {next}، ما تاخدش قرار كبير دلوقتي", tone: "calm" },
    ],
  },
  "prayer-time": {
    priority: 100,
    cooldownMinutes: 20,
    view: "prayers",
    requires: ["lastPrayer"],
    pool: [
      { variant: "a", text: "دلوقتي {last}، ولا حجّة", tone: "direct" },
      { variant: "b", text: "حان وقت {last}، قوم وخلّص", tone: "direct" },
    ],
  },
  "prayer-chase": {
    priority: 98,
    cooldownMinutes: 60,
    view: "prayers",
    requires: ["lastPrayer"],
    pool: [
      { variant: "a", text: "مشفتكش سجّلت {last} يعني", tone: "direct" },
      { variant: "b", text: "{last} عدّت وسجلّك فاضي، املاه", tone: "direct" },
    ],
  },
  "prayer-direct": {
    priority: 97,
    cooldownMinutes: 90,
    view: "prayers",
    requires: ["lastPrayer"],
    pool: [
      { variant: "a", text: "صليت ولا؟", tone: "direct" },
      { variant: "b", text: "قولّي بس: صليت {last} ولا لأ؟", tone: "direct" },
    ],
  },
  "task-time": {
    priority: 90,
    cooldownMinutes: 30,
    view: "today",
    requires: ["task"],
    pool: [
      { variant: "a", text: "وقت {task} يبويااا", tone: "warm" },
      { variant: "b", text: "حان وقت {task}، تلبّس ولا هنلغبط", tone: "tease" },
    ],
  },
  "task-procrastination": {
    priority: 94,
    cooldownMinutes: 240,
    view: "today",
    requires: ["task", "taskPostponedCount"],
    pool: [
      { variant: "a", text: "فاكر… قلت أفكرك بس. {task} اتأخّرت {n} مرة", tone: "tease" },
      { variant: "b", text: "فاكر؟ {task} مازال مستنيّاك من يومين", tone: "tease" },
      {
        variant: "c",
        text: "عاوز تشمّتهم فيك يعني… {task} بتتأجّل من غير سبب",
        tone: "tease",
      },
    ],
  },
  "task-done-after-delay": {
    priority: 88,
    cooldownMinutes: 20,
    view: "today",
    requires: ["task"],
    pool: [
      { variant: "a", text: "أخيرًا جِدع، تسلمم", tone: "warm" },
      { variant: "b", text: "خلاص خلصتها، كده بقى — تسلمم", tone: "warm" },
    ],
  },
  absence: {
    priority: 60,
    cooldownMinutes: 720,
    view: "today",
    requires: ["quietDays"],
    pool: [
      { variant: "a", text: "يومين عاديّين، عم مش فارقك بقي", tone: "tease" },
      { variant: "b", text: "ناقصني {n} يوم… مش لوم، بس أنا ملّيت عليك", tone: "tease" },
    ],
  },
  "return-after-break": {
    priority: 86,
    cooldownMinutes: 60,
    view: "today",
    requires: ["returnedAfterBreak"],
    pool: [
      { variant: "a", text: "أخيرًا جِدع، تسلمم", tone: "warm" },
      { variant: "b", text: "رحت وارجعت… ييجي يوم نضيفه", tone: "warm" },
    ],
  },
  "day-complete": {
    priority: 84,
    cooldownMinutes: 360,
    view: "prayers",
    requires: ["dayComplete"],
    pool: [
      { variant: "a", text: "خلاص، اليوم كله خلص. أنضِف", tone: "proud" },
      { variant: "b", text: "كل الصلوات اليوم اتسجّلت… يستاهل", tone: "proud" },
    ],
  },
  "big-win": {
    priority: 92,
    cooldownMinutes: 720,
    view: "prayers",
    requires: ["perfectDay"],
    pool: [
      { variant: "a", text: "ايوا بقي FA7L888 يجُدعاااان", tone: "proud" },
      { variant: "b", text: "ده يوم يتفلتر عليه، خلاص", tone: "proud" },
      { variant: "c", text: "كل حاجة في وقتها؟ مش عارف أقول إيه", tone: "proud" },
    ],
  },
  "mosque-near": {
    priority: 95,
    cooldownMinutes: 90,
    view: "prayers",
    requires: ["mosque"],
    pool: [
      { variant: "a", text: "{n} متر ونكون فالمسجد", tone: "calm" },
      { variant: "b", text: "المسجد على بُعد {n} متر بالظبط", tone: "calm" },
    ],
  },
  "xp-earned": {
    priority: 50,
    cooldownMinutes: 20,
    view: "stats",
    requires: ["xpGained"],
    pool: [
      { variant: "a", text: "يسلم عقلّك", tone: "warm" },
      { variant: "b", text: "{n} نقطة… شغل نضيف", tone: "warm" },
    ],
  },
  unlock: {
    priority: 70,
    cooldownMinutes: 5,
    requires: ["unlocked"],
    pool: [
      { variant: "a", text: "دلع نفسك بقي", tone: "warm" },
      { variant: "b", text: "خدّها… دي ليك", tone: "warm" },
    ],
  },
  "adhkar-missed": {
    priority: 65,
    cooldownMinutes: 120,
    view: "adhkar",
    requires: ["missingAdhkar"],
    pool: [
      { variant: "a", text: "أذكار {what} لسه، دقيقة واحدة وتخلص", tone: "calm" },
      { variant: "b", text: "نكتفي بدعاء واحد دلوقتي، والباقي بعدين", tone: "calm" },
    ],
  },
  "late-night": {
    priority: 40,
    cooldownMinutes: 240,
    view: "adhkar",
    requires: ["sleepMinutes"],
    pool: [
      { variant: "a", text: "الليل بقى طويل، نمّ بقى", tone: "calm" },
      { variant: "b", text: "مفيش حاجة تستاهل السهر دلوقتي", tone: "calm" },
    ],
  },
  quiet: {
    priority: 1,
    cooldownMinutes: 90,
    requires: [],
    pool: [
      { variant: "a", text: "أنا هنا… يومك معاك", tone: "calm" },
      { variant: "b", text: "مش لازم تعمل حاجة دلوقتي، خد نفس", tone: "calm" },
      { variant: "c", text: "لسه في وقت، متستعجلش", tone: "calm" },
    ],
  },
};

/**
 * بذرة صغيرة وثابتة. ليست عشوائية: نفس (المعرّف + اليوم) يعطي نفس الصيغة.
 * لو تغيّرت، ترتجف الرسالة كل دقيقة وتضيع نتيجة الاختبارات.
 *
 * المعامل أوسع من `OudLineId` قصدا: تستعمله صيغ التذكير أدناه ببذرة
 * مستقلة، فلا تتزاحم صيغ الإشعار مع صيغ البطاقة على نفس المفتاح.
 */
export function seedOf(id: string, dayKey: string): number {
  let hash = 2166136261;
  const source = `${id}|${dayKey}`;
  for (let index = 0; index < source.length; index += 1) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % 100_000;
}

/** الرقم الذي تستعمله الصيغة: الدقائق، المسافة، عدد المرات، أو النقاط. */
function numberFor(id: OudLineId, context: OudVoiceContext): number {
  switch (id) {
    case "prayer-lead":
      return context.nextPrayer?.minutesLeft ?? 0;
    case "mosque-near":
      return context.mosque?.distanceMeters ?? 0;
    case "task-procrastination":
      return context.taskPostponedCount ?? 0;
    case "absence":
      return context.quietDays ?? 0;
    case "xp-earned":
      return context.xpGained ?? 0;
    default:
      return 0;
  }
}

/** هل هذا الحقل يحمل معلومة حقيقية، لا قيمة فارغة؟ */
function carriesValue(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (value instanceof Date) return true;
  return Object.keys(value as object).length > 0;
}

/** ينسّق صيغة واحدة. الحقل الناقص يُسقط الصيغة ولا ينتج نصا مكسورا. */
function render(
  id: OudLineId,
  variant: Pool,
  context: OudVoiceContext,
): string | null {
  for (const key of POOLS[id].requires) {
    if (!carriesValue(context[key])) return null;
  }
  const text = variant.text
    .replace(/\{next\}/g, context.nextPrayer?.name ?? "")
    .replace(/\{last\}/g, context.lastPrayer?.name ?? "")
    .replace(/\{task\}/g, context.task?.title ?? "")
    .replace(/\{what\}/g, context.missingAdhkar?.[0] ?? "")
    .replace(/\{n\}/g, arabicNumber(numberFor(id, context)));
  return text.replace(/\s{2,}/g, " ").trim();
}

/**
 * أي المجموعات تنطبق على هذه اللقطة.
 * كل شرط **مشتقّ من حالة موجودة**؛ لا تخمين ولا نسبة.
 */
export function applicableGroups(context: OudVoiceContext): OudLineId[] {
  const minutes = context.now.getHours() * 60 + context.now.getMinutes();
  const lead = context.leadMinutes ?? 10;
  const groups: OudLineId[] = [];

  const last = context.lastPrayer;
  if (last && !last.logged) {
    if (last.minutesAgo <= 4) groups.push("prayer-time");
    else if (last.minutesAgo <= 25) groups.push("prayer-chase");
    else groups.push("prayer-direct");
  }

  const next = context.nextPrayer;
  if (next && next.minutesLeft > 0 && next.minutesLeft <= lead) groups.push("prayer-lead");

  // التسويف يحتاج **سابقا مسجّلا**. بدونه ممنوع أن نتّهمه بجديد.
  if (context.task && (context.taskPostponedCount ?? 0) >= 2) {
    groups.push("task-procrastination");
  } else if (context.task && Math.abs(context.task.startsInMinutes) <= 5) {
    groups.push("task-time");
  }

  if (context.taskDoneAfterDays !== undefined && context.taskDoneAfterDays >= 2) {
    groups.push("task-done-after-delay");
  }

  if (context.mosque && context.mosque.distanceMeters <= 400) groups.push("mosque-near");

  if (context.perfectDay) groups.push("big-win");
  else if (context.dayComplete) groups.push("day-complete");

  if (context.returnedAfterBreak) groups.push("return-after-break");
  else if ((context.quietDays ?? 0) >= 2) groups.push("absence");

  if (context.unlocked) groups.push("unlock");
  if ((context.xpGained ?? 0) > 0) groups.push("xp-earned");

  const sleep = context.sleepMinutes;
  if (sleep !== undefined && minutes >= sleep - 20) {
    groups.push("late-night");
  } else if ((context.missingAdhkar ?? []).length > 0) {
    groups.push("adhkar-missed");
  }

  groups.push("quiet");
  return groups;
}

/**
 * يبني سطر الشخصية للسياق الحالي.
 * @returns السطر، أو `null` إن لم يكن في اللقطة سبب حقيقي للكلام.
 */
export function oudLine(context: OudVoiceContext): OudLine | null {
  const { now } = context;
  const dayKey = dayKeyOf(now);
  const groups = applicableGroups(context).sort((a, b) => POOLS[b].priority - POOLS[a].priority);

  for (const id of groups) {
    const meta = POOLS[id];
    const seed = seedOf(id, dayKey);
    // ندور على صيغة يملؤها السياق فعلا، بدءا من البذرة: نُبقي التنوّع
    // ولا نخترع متغيّرا غائبا.
    for (let offset = 0; offset < meta.pool.length; offset += 1) {
      const variant = meta.pool[(seed + offset) % meta.pool.length];
      const text = render(id, variant, context);
      if (text) {
        return {
          id,
          variant: variant.variant,
          text,
          tone: variant.tone,
          priority: meta.priority,
          cooldownMinutes: meta.cooldownMinutes,
          view: meta.view,
        };
      }
    }
  }
  return null;
}

/**
 * هل نعرض هذا السطر؟ التهدئة على **الصيغة** لا على المعرّف: سطر الصلاة
 * يبقى مرئيّا، لكن لا نقول «صليت ولا» مرتين في الساعة.
 */
export function shouldShowLine(
  line: OudLine,
  lastShown: Readonly<Record<string, number>>,
  now: Date,
): boolean {
  const last = lastShown[line.id];
  if (!last) return true;
  return now.getTime() - last >= line.cooldownMinutes * 60_000;
}

/** يحدّث سجلّ التهدئة. */
export function markLineShown(
  lastShown: Readonly<Record<string, number>>,
  line: OudLine,
  now: Date,
): Record<string, number> {
  return { ...lastShown, [line.id]: now.getTime() };
}

/** اسم النبرة — للعرض/testing فقط، النص لا يتغيّر بتغيّرها. */
export function toneLabel(tone: OudTone): string {
  switch (tone) {
    case "direct":
      return "مباشر";
    case "tease":
      return "دعابة";
    case "warm":
      return "دافئ";
    case "proud":
      return "فرحان";
    default:
      return "هادئ";
  }
}

/* ————————————————————— صوت التذكير ————————————————————— */

/**
 * **نفس الشخصية في الإشعار، لا نبرة ثانية.** كانت نصوص التذكير
 * فصحى مهذّبة لا علاقة لها باللهجة ولا بسبب ظهورها، فكان التطبيق يتكلم
 * بأصوات. هذه الصيغ تربط كل تنبيه بسببه: تذكير الصلاة يعرف الصلاة
 * والدقائق، وتذكير الأذكار يعرف أنه أذكار.
 *
 * قواعد لا تساوم: بلا إيموجي، وبلا ادعاء ديني، وبلا وعد بعدد ولا
 * فضل. الجملة قصيرة لأنها تُقرأ على شاشة مقفلة.
 */
export type OudReminderKind =
  | "prayer"
  | "lead"
  | "after"
  | "adhkar-morning"
  | "adhkar-evening"
  | "sleep"
  | "wird"
  | "friday"
  | "suhoor"
  | "iftar"
  | "salawat"
  | "post-prayer";

/** ما تحتاجه صيغة التذكير لتخرج جملة كاملة. الغائب يُسقط الصيغة. */
export type OudReminderContext = {
  /** اسم الصلاة: الفجر، الظهر… */
  prayer?: string;
  /** الدقائق المتبقية قبل الدخول. */
  minutes?: number;
};

const REMINDER_POOLS: Record<OudReminderKind, { requires: (keyof OudReminderContext)[]; pool: Pool[] }> = {
  prayer: {
    requires: ["prayer"],
    pool: [
      { variant: "a", text: "حان وقت {prayer}. وقّف اللي في إيدك.", tone: "direct" },
      { variant: "b", text: "{prayer} جه وقتها. روح اتوضا.", tone: "direct" },
    ],
  },
  lead: {
    requires: ["prayer", "minutes"],
    pool: [
      { variant: "a", text: "{prayer} بعد {n} دقيقة. جهّز حالك من دلوقتي.", tone: "direct" },
      { variant: "b", text: "قرب وقت {prayer}. توضّأ وهو لسه فاضي.", tone: "calm" },
    ],
  },
  after: {
    requires: ["prayer"],
    pool: [
      { variant: "a", text: "فات وقت {prayer}. الوقت لسه باق، فقوم دلوقتي.", tone: "direct" },
      { variant: "b", text: "{prayer} اتأخرت. مش لازم تؤجلها تاني.", tone: "direct" },
    ],
  },
  "adhkar-morning": {
    requires: [],
    pool: [
      { variant: "a", text: "أذكار الصباح لسه قدامك. دقيقة واحدة تفي.", tone: "calm" },
      { variant: "b", text: "صباحك لسه فاضي. خد راحتك مع الأذكار.", tone: "calm" },
    ],
  },
  "adhkar-evening": {
    requires: [],
    pool: [
      { variant: "a", text: "أذكار المساء مستنياك. دقيقة تكفي.", tone: "calm" },
      { variant: "b", text: "اختم نهارك بذكر. دقيقة واحدة بس.", tone: "calm" },
    ],
  },
  sleep: {
    requires: [],
    pool: [
      { variant: "a", text: "قبل الفراش: أذكار النوم. دقيقة واحدة.", tone: "calm" },
      { variant: "b", text: "مستنيك تنام. خد أذكار النوم وريّح.", tone: "calm" },
    ],
  },
  wird: {
    requires: [],
    pool: [
      { variant: "a", text: "وردك لسه. صفحة واحدة بتفي.", tone: "calm" },
      { variant: "b", text: "وقّف وردك. ولا تقطعه في النص.", tone: "calm" },
    ],
  },
  friday: {
    requires: [],
    pool: [
      { variant: "a", text: "الجمعة. سورة الكهف وحدها تفرق.", tone: "calm" },
      { variant: "b", text: "يوم الجمعة. لو بس كلمة، تكفي.", tone: "calm" },
    ],
  },
  suhoor: {
    requires: [],
    pool: [{ variant: "a", text: "السحور قرّب. تمر وماء وخلاص.", tone: "calm" }],
  },
  iftar: {
    requires: [],
    pool: [{ variant: "a", text: "الفطر جه. افطر وكمّل يومك.", tone: "calm" }],
  },
  salawat: {
    requires: [],
    pool: [
      { variant: "a", text: "وقفة للصلاة على النبي ﷺ. دقيقة واحدة.", tone: "calm" },
      { variant: "b", text: "صلاة على النبي ﷺ تستاهل وقفتك.", tone: "calm" },
    ],
  },
  "post-prayer": {
    requires: ["prayer"],
    pool: [
      {
        variant: "a",
        text: "بعد {prayer} هسألك: صلّيت؟ سجّل بصراحة، السجل دلوقتي مش لحد تاني.",
        tone: "direct",
      },
      {
        variant: "b",
        text: "خلّينا نعرف حالك في {prayer}. إجابة واحدة وخلاص.",
        tone: "calm",
      },
    ],
  },
};

/** مفتاح اليوم نفسه المستعمل في `oudLine`، حتى تتأرجح الصيغ معا. */
function dayKeyOf(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

/**
 * سطر التذكير للسياق الحالي.
 *
 * **بلا `Math.random`**: البذرة على (النوع + اليوم)، فيبقى النص
 * مستقرا خلال اليوم ومتنوعا بين الأيام. لو زحف كل تنبيه لنفس الجملة
 * صار التطبيق باردا، ولو تغيّر كل مرة صار مهزوزا.
 *
 * @returns الجملة، أو `null` إن كان الحقل الناقص يمنعها.
 */
export function oudReminderBody(
  kind: OudReminderKind,
  context: OudReminderContext = {},
  now: Date = new Date(),
): string | null {
  const meta = REMINDER_POOLS[kind];
  for (const key of meta.requires) {
    if (!carriesValue(context[key])) return null;
  }
  const seed = seedOf(`reminder:${kind}`, dayKeyOf(now));
  for (let offset = 0; offset < meta.pool.length; offset += 1) {
    const variant = meta.pool[(seed + offset) % meta.pool.length];
    const text = variant.text
      .replace(/\{prayer\}/g, context.prayer ?? "")
      .replace(/\{n\}/g, arabicNumber(context.minutes ?? 0))
      .replace(/\s{2,}/g, " ")
      .trim();
    if (text) return text;
  }
  return null;
}

/** كل أنواع التذكير — يستعملها الاختبار ليغطّي كل واحد. */
export function allReminderKinds(): OudReminderKind[] {
  return Object.keys(REMINDER_POOLS) as OudReminderKind[];
}

/** كل الصيغ مجمّعة — يستعملها حارس المحتوى الديني ليقرأ النص كله. */
export function allVoiceTexts(): string[] {
  return [
    ...Object.values(POOLS).flatMap((group) => group.pool.map((variant) => variant.text)),
    ...Object.values(REMINDER_POOLS).flatMap((group) =>
      group.pool.map((variant) => variant.text),
    ),
  ];
}

/** كل المعرّفات — يستعملها الاختبار ليغطّي كل سياق. */
export function allVoiceIds(): OudLineId[] {
  return Object.keys(POOLS) as OudLineId[];
}
