/**
 * PHASE 3 — طبقة صياغة الإشعارات.
 *
 * ليست نظاما موازيا. ترتيب الأولويات يبقى في
 * `notification-intelligence.ts`؛ هذا الملف يجهز النصوص ويطبق نافذة التوقيت
 * وفترة التهدئة قبل التسليم لذلك المحرّك.
 *
 * قاعدة الصياغة: الإشعار يقول أين أنت وماذا بعد، لا أين يجب أن تكون.
 * لا لوم ولا ضغط ولا مقارنة. كثرة التنبيهات توقف المستخدم عنها كلها،
 * بمن فيها ما هو مهم فعلا.
 */

import {
  prioritizeNotifications,
  type ClassifiedNotification,
  type NotificationCandidate,
} from "./notification-intelligence";

/** نبرة العرض. لا تغيّر النص، بل شدة ما يظهر على الشاشة. */
export type NotificationTone = "quiet" | "warm" | "direct";

export type NotificationCategory =
  | "prayer"
  | "task"
  | "commitment"
  | "review"
  | "dhikr"
  | "recovery"
  | "occasion"
  | "hadith";

export type TimeWindow = {
  /** دقيقة اليوم: من 0 إلى 1439. */
  start: number;
  end: number;
};

export type NotificationTemplate = {
  id: string;
  category: NotificationCategory;
  title: string;
  body: string;
  /** نص الإجراء. واضح بلا استعجال. */
  action: string;
  /** الشاشة المقترحة عند الضغط على الإجراء. */
  view?: string;
  priority: number;
  tone: NotificationTone;
  /** دقائق منع تكرار نفس القالب بعدها. */
  cooldownMinutes: number;
  /** وقت اليوم المناسب. غيابها يعني أي وقت. */
  window?: TimeWindow;
};

const h = (hour: number, minute = 0) => hour * 60 + minute;

/**
 * القوالب. النصوص متوارثة من محرّك التنبيهات القائم في `use-nudges.ts`
 * مع صياغة سياقية أوضح. ولم يخترع فيها حديث ولا مصدر ديني.
 */
export const NOTIFICATION_TEMPLATES: NotificationTemplate[] = [
  {
    id: "prayer-time",
    category: "prayer",
    title: "وقت الصلاة الآن",
    body: "الصلاة على وقتها تحفظ وقتك، ومن صلاها بعد ذلك فقد ضاع منه وقت.",
    action: "سجّل صلاتك",
    view: "prayers",
    priority: 100,
    tone: "direct",
    cooldownMinutes: 240,
  },
  {
    id: "prayer-lead",
    category: "prayer",
    title: "اقترب وقت الصلاة",
    body: "تبقى دقائق قليلة. رتّب ما حولك الآن، وصلي في وقتها.",
    action: "افتح صلاتي",
    view: "prayers",
    priority: 95,
    tone: "quiet",
    cooldownMinutes: 90,
  },
  {
    id: "dhikr-morning",
    category: "dhikr",
    title: "أذكار الصباح",
    body: "ابدأ بآية الكرسي وسيد الاستغفار، وأتم الباقي وأنت في الطريق.",
    action: "افتح الأذكار",
    priority: 78,
    tone: "quiet",
    cooldownMinutes: 600,
    window: { start: h(4), end: h(11) },
  },
  {
    id: "dhikr-evening",
    category: "dhikr",
    title: "أذكار المساء",
    body: "المعوذات وسيد الاستغفار والرضا بالإسلام، قبل أن يمضي النهار.",
    action: "افتح الأذكار",
    priority: 76,
    tone: "quiet",
    cooldownMinutes: 600,
    window: { start: h(16), end: h(23) },
  },
  {
    id: "dhikr-sleep",
    category: "dhikr",
    title: "أذكار النوم",
    body: "آية الكرسي، ثم المعوذات، ثم التسبيح ثلاثا وثلاثين.",
    action: "افتح أذكار النوم",
    priority: 60,
    tone: "quiet",
    cooldownMinutes: 720,
    window: { start: h(20), end: h(23, 59) },
  },
  {
    id: "task-step",
    category: "task",
    title: "خطوة واحدة من يومك",
    body: "باقي خطوة واحدة، وتحافظ على وعدك لنفسك اليوم.",
    action: "افتح خطة اليوم",
    view: "today",
    priority: 88,
    tone: "warm",
    cooldownMinutes: 120,
  },
  {
    id: "commitment-near",
    category: "commitment",
    title: "التزامك يقترب",
    body: "اقترب الموعد الذي اخترته لنفسك. خطوة واحدة تكفي.",
    action: "افتح الخطة",
    view: "weekly",
    priority: 85,
    tone: "warm",
    cooldownMinutes: 180,
  },
  {
    id: "review-day",
    category: "review",
    title: "قبل ما ينتهي اليوم",
    body: "دقيقة واحدة تكفي لتعرف أين وصلت، وتترك الغد أوضح.",
    action: "راجع يومك",
    view: "review",
    priority: 74,
    tone: "warm",
    cooldownMinutes: 240,
    window: { start: h(18), end: h(23, 59) },
  },
  {
    id: "review-week",
    category: "review",
    title: "مراجعة الأسبوع",
    body: "ما الذي ثبت، وما الذي تعثر؟ سؤالان يجعلان الأسبوع القادم أهدأ.",
    action: "افتح الخطة الأسبوعية",
    view: "weekly",
    priority: 70,
    tone: "quiet",
    cooldownMinutes: 1_440,
  },
  {
    id: "recovery-soft",
    category: "recovery",
    title: "ارجع بلطف",
    body: "انقطاع يوم لا يلغي ما بنيت. خطوة صغيرة اليوم تكفي.",
    action: "افتح خطة اليوم",
    view: "today",
    priority: 35,
    tone: "quiet",
    cooldownMinutes: 720,
  },
  {
    id: "occasion",
    category: "occasion",
    title: "مناسباتك",
    body: "ما هو قادم في تقويمك، في مكان واحد.",
    action: "افتح المناسبات",
    view: "occasions",
    priority: 55,
    tone: "quiet",
    cooldownMinutes: 1_440,
  },
  {
    id: "hadith-of-day",
    category: "hadith",
    title: "حديث اليوم",
    body: "حديث واحد مع راويه ومصدره، بلا تشويش.",
    action: "اقرأ الحديث",
    view: "hadith",
    priority: 25,
    tone: "quiet",
    cooldownMinutes: 1_440,
  },
];

/** يحوّل القالب إلى مرشح يفهمه محرّك الأولويات القائم. */
const KIND_BY_CATEGORY: Record<NotificationCategory, string> = {
  prayer: "prayer",
  task: "important-task",
  commitment: "commitment",
  review: "review",
  dhikr: "adhkar",
  recovery: "recovery",
  occasion: "occasion",
  hadith: "hadith",
};

export function templateToCandidate(
  template: NotificationTemplate,
  at: Date,
): NotificationCandidate {
  return {
    id: template.id,
    at,
    kind: KIND_BY_CATEGORY[template.category],
    title: template.title,
  };
}

/** هل نحن داخل نافذة القالب؟ النافذة التي تعبر منتصف الليل تحسب لاسمين. */
export function withinWindow(template: NotificationTemplate, now: Date): boolean {
  if (!template.window) return true;
  const current = now.getHours() * 60 + now.getMinutes();
  const { start, end } = template.window;
  if (start <= end) return current >= start && current <= end;
  return current >= start || current <= end;
}

/** هل ما زالت صلاحية التهدئة سارية. */
export function inCooldown(
  template: NotificationTemplate,
  lastFiredAt: Readonly<Record<string, number>>,
  now: Date,
): boolean {
  const last = lastFiredAt[template.id];
  if (!last) return false;
  return now.getTime() - last < template.cooldownMinutes * 60_000;
}

/** الوقت الذي يجب أن يتحرك فيه الإشعار، أو null إن لم يجد طريقه اليوم. */
export function nextFireTime(
  template: NotificationTemplate,
  now: Date,
): Date | null {
  if (!template.window) return new Date(now.getTime());
  const current = now.getHours() * 60 + now.getMinutes();
  const { start, end } = template.window;
  if (start <= end) {
    if (current < start) return atMinutes(now, start);
    if (current > end) return null;
    return new Date(now.getTime());
  }
  if (current > end && current < start) return atMinutes(now, start);
  return new Date(now.getTime());
}

function atMinutes(base: Date, minutes: number): Date {
  const target = new Date(base);
  target.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return target;
}

export type SelectInput = {
  now: Date;
  lastFiredAt?: Readonly<Record<string, number>>;
  recentIds?: readonly string[];
  burstWindowMinutes?: number;
  /** سقف صريح: دفعة واحدة لا تعرض أكثر من هذا. */
  limit?: number;
};

export type SelectedNotification = {
  template: NotificationTemplate;
  classified: ClassifiedNotification<NotificationCandidate>;
};

/**
 * يختار ما يستحق الإظهار الآن. الترتيب النهائي يبقى لمحرّك الأولويات
 * حتى لا يختلف هذا الملف عن بقية النظام في فهم الأولوية.
 */
export function selectNotifications(
  templates: readonly NotificationTemplate[],
  input: SelectInput,
): SelectedNotification[] {
  const lastFiredAt = input.lastFiredAt ?? {};
  const eligible: { template: NotificationTemplate; at: Date }[] = [];

  for (const template of templates) {
    if (inCooldown(template, lastFiredAt, input.now)) continue;
    const at = nextFireTime(template, input.now);
    if (!at) continue;
    eligible.push({ template, at });
  }

  const chosen = prioritizeNotifications(
    eligible.map((item) => templateToCandidate(item.template, item.at)),
    {
      now: input.now,
      recentIds: input.recentIds,
      burstWindowMinutes: input.burstWindowMinutes,
    },
  );

  const byId = new Map(eligible.map((item) => [item.template.id, item.template]));
  const out: SelectedNotification[] = [];
  for (const classified of chosen.slice(0, input.limit ?? 1)) {
    const template = byId.get(classified.id);
    if (template) out.push({ template, classified });
  }
  return out;
}

/** سجل التهدئة: يحدّث الطابع الزمني للقالب عند الإظهار. */
export function markFired(
  lastFiredAt: Readonly<Record<string, number>>,
  templateId: string,
  now: Date,
): Record<string, number> {
  return { ...lastFiredAt, [templateId]: now.getTime() };
}

export function dailyKey(now: Date): string {
  return `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
}

export const MAX_TEMPLATE_PRIORITY = 100;
export const MIN_TEMPLATE_PRIORITY = 1;

export function priorityInRange(priority: number): boolean {
  return priority >= MIN_TEMPLATE_PRIORITY && priority <= MAX_TEMPLATE_PRIORITY;
}

/* ————————————————————— ملاءمة القوالب لحالة المستخدم ————————————————————— */

export type AppSnapshot = {
  now: Date;
  /** أذكار أنجزها اليوم: morning | evening | sleep. */
  adhkarDone: readonly string[];
  /** صلوات سجّلها اليوم. */
  prayersLogged: readonly string[];
  /** أوقات الصلاة اليوم بالدقائق. */
  prayerMinutes: Readonly<Record<string, number>>;
  /** هل بقيت خطوات في خطة اليوم. */
  remainingSteps: number;
  /** هل راجع يومه اليوم. */
  reviewedToday: boolean;
  /** عدد أيام الانقطاع المتتالية قبل اليوم. */
  missedDays: number;
  /** وقت النوم المختار بالدقائق. */
  sleepMinutes?: number;
};

/**
 * يحوّل حالة التطبيق إلى قائمة قوالب تستحق العرض.
 *
 * **نقطة مهمة:** الشرط يقرّر *أن يظهر*، والأولوية تقرّر *متى*، والتهدئة
 * تقرّر *لا يتكرر*. ثلاث طبقات منفصلة عمدا حتى لا تختلط.
 */
export function resolveApplicableTemplates(
  templates: readonly NotificationTemplate[],
  snapshot: AppSnapshot,
): NotificationTemplate[] {
  const { now, adhkarDone, prayersLogged } = snapshot;
  const current = now.getHours() * 60 + now.getMinutes();
  const applicable: NotificationTemplate[] = [];

  for (const template of templates) {
    switch (template.id) {
      case "prayer-time": {
        // نغمة واحدة لكل صلاة: أول صلاة دخل وقتها ولم يسجلها.
        const due = Object.entries(snapshot.prayerMinutes).find(
          ([key, minutes]) => minutes <= current && !prayersLogged.includes(key),
        );
        if (due) applicable.push(template);
        break;
      }
      case "prayer-lead": {
        const upcoming = Object.entries(snapshot.prayerMinutes).some(
          ([key, minutes]) => !prayersLogged.includes(key) && minutes > current && minutes - current <= 10,
        );
        if (upcoming) applicable.push(template);
        break;
      }
      case "dhikr-morning":
        if (!adhkarDone.includes("morning")) applicable.push(template);
        break;
      case "dhikr-evening":
        if (!adhkarDone.includes("evening")) applicable.push(template);
        break;
      case "dhikr-sleep":
        if (
          !adhkarDone.includes("sleep") &&
          snapshot.sleepMinutes !== undefined &&
          current >= snapshot.sleepMinutes - 45
        ) {
          applicable.push(template);
        }
        break;
      case "task-step":
        if (snapshot.remainingSteps > 0) applicable.push(template);
        break;
      case "review-day":
        if (!snapshot.reviewedToday) applicable.push(template);
        break;
      case "review-week":
        // الأسبوع: بعد ظهر الخميس. لا داعي للتذكير كل يوم.
        if (now.getDay() === 4) applicable.push(template);
        break;
      case "recovery-soft":
        // يومان متتاليان بلا نشاط، ولا أكثر: بعدها يئمل التطبيق.
        if (snapshot.missedDays >= 2) applicable.push(template);
        break;
      case "commitment-near":
      case "occasion":
      case "hadith-of-day":
      default:
        applicable.push(template);
        break;
    }
  }
  return applicable;
}
