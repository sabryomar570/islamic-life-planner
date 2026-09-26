import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookOpen,
  Bookmark,
  CalendarHeart,
  CalendarRange,
  CircleDot,
  ClipboardCheck,
  Clock,
  Compass,
  Feather,
  Fingerprint,
  HandCoins,
  HeartHandshake,
  Landmark,
  MessageCircle,
  ScrollText,
  Settings,
  Sparkles,
} from "lucide-react";

/**
 * PHASE 2 — خريطة المعلومات.
 *
 * كل قسم له موقع أساسي واحد. لا تُعرَّض كل الأقسام كشبكة بطاقات متساوية:
 * المتوازن هو خمسة؛ ما عداه يُفتح من «المزيد» في مجموعات ذات معنى.
 */

export type DashView =
  | "today"
  | "ibadat"
  | "yawmy"
  | "chat"
  | "prayers"
  | "qibla"
  | "zakat"
  | "adhkar"
  | "quran"
  | "tasbih"
  | "hadith"
  | "duas"
  | "poetry"
  | "prophets"
  | "occasions"
  | "saved"
  | "stats"
  | "weekly"
  | "review"
  | "settings"
  | "developer";

export const DASH_VIEWS: DashView[] = [
  "today",
  "ibadat",
  "yawmy",
  "chat",
  "prayers",
  "qibla",
  "zakat",
  "adhkar",
  "quran",
  "tasbih",
  "hadith",
  "duas",
  "poetry",
  "prophets",
  "occasions",
  "saved",
  "stats",
  "weekly",
  "review",
  "settings",
  "developer",
];

export function isDashView(value: string | null): value is DashView {
  return value !== null && (DASH_VIEWS as string[]).includes(value);
}

export const VIEW_LABELS: Record<DashView, string> = {
  today: "الرئيسية",
  ibadat: "عبادتي",
  yawmy: "يومي",
  chat: "كلّم عود",
  prayers: "الصلاة",
  qibla: "القبلة",
  zakat: "الزكاة",
  adhkar: "الأذكار",
  quran: "القرآن",
  tasbih: "المسبحة",
  hadith: "الأحاديث والآثار",
  duas: "الأدعية",
  poetry: "الأبيات",
  prophets: "قصص الأنبياء",
  occasions: "المناسبات",
  saved: "المحفوظات",
  stats: "الإحصاءات",
  weekly: "الخطة الأسبوعية",
  review: "مراجعة اليوم",
  settings: "الإعدادات",
  developer: "المطوّر",
};

export type NavEntry = {
  key: DashView;
  label: string;
  /** سطر واحد يشرح ما يجده المستخدم هنا — لا وصف تسويقي. */
  hint: string;
  icon: LucideIcon;
};

/**
 * المناطق الأربع — ما يراه المستخدم في الشريط السفلي.
 *
 * الفكرة: الشريط يحمل **مناطق** لا شاشات. كل منطقة يجيب سؤالا مختلفا:
 *   الرئيسية: أين أنا الآن، وما أهم خطوة دلوقتي؟
 *   عبادتي:   كل أدوات العبادة، من الصلاة إلى الحديث.
 *   يومي:     اليوم ماشي إزاي، وما الذي أنجزته؟
 *   الإعدادات: كل ما يضبط السلوك والخصوصية.
 *
 * أي شاشة أخرى (قرآن، أذكار، قبلة، زكاة، مراجعة) تدخل داخل منطقة،
 * ولا تشغل خانة مستقلة في الشريط.
 */
export const ZONES: NavEntry[] = [
  { key: "today", label: "الرئيسية", hint: "الصلاة القادمة وأهم خطوة", icon: Sparkles },
  { key: "ibadat", label: "عبادتي", hint: "كل أدوات العبادة في مكان واحد", icon: Landmark },
  { key: "yawmy", label: "يومي", hint: "خطة اليوم ومراجعته وتقدّمك", icon: ClipboardCheck },
  { key: "settings", label: "الإعدادات", hint: "الإشعارات والصوت والخصوصية", icon: Settings },
];

/** الشريط الأفقي على سطح المكتب يعرض المناطق نفسها. */
export const PRIMARY_NAV: NavEntry[] = ZONES;

/* ═══════════════════ Service Hub — خريطة الخدمات ═══════════════════ */

/**
 * ترتيب الخدمات داخل «عبادتي».
 *
 * القاعدة: **لا شبكة متساوية.** كل خدمة تُؤدّى كل يوم كبيرة، وما يفتح
 * مرة في الأسبوع أصغر، وما يقرأ فيه نادرا يُجمّع. الشبكة المتساوية تجعل
 * fifteen خدمة يبدو five and fifteen.
 *
 * ثلاث درجات حضور فقط، والمنطق بسيط:
 *   primary    تُفتح كل يوم: بطاقة كبيرة
 *   secondary  تُفتح أسبوعيا: بطاقة متوسطة
 *   compact    قراءة وتمنّع: صف صغير
 */
export type ServiceTier = "primary" | "secondary" | "compact";

export type ServiceSection = {
  id: string;
  title: string;
  hint?: string;
  services: { key: DashView; tier: ServiceTier }[];
};

export const SERVICE_SECTIONS: ServiceSection[] = [
  {
    id: "base",
    title: "الأساس",
    services: [
      { key: "prayers", tier: "primary" },
      { key: "quran", tier: "primary" },
      { key: "adhkar", tier: "primary" },
    ],
  },
  {
    id: "tools",
    title: "أدوات العبادة",
    services: [
      { key: "tasbih", tier: "secondary" },
      { key: "qibla", tier: "secondary" },
      { key: "zakat", tier: "secondary" },
    ],
  },
  {
    id: "library",
    title: "المحتوى",
    services: [
      { key: "hadith", tier: "secondary" },
      { key: "duas", tier: "secondary" },
      { key: "prophets", tier: "compact" },
      { key: "occasions", tier: "compact" },
      { key: "poetry", tier: "compact" },
    ],
  },
  {
    id: "tracking",
    title: "المتابعة",
    services: [
      { key: "review", tier: "secondary" },
      { key: "weekly", tier: "secondary" },
      { key: "stats", tier: "secondary" },
      { key: "saved", tier: "compact" },
    ],
  },
];

/**
 * «ابدأ من هنا» — أربع خدمات في الأعلى.
 *
 * **ليس قياسًا للاستخدام:** لا بيانات استخدام في التطبيق، فمن يدّعي أنها
 * الأشد استخدامًا يكذب. هذه_services الأساس التي يفتحها المسلم في يومه،
 * والاختيار له بعد أن يرى الباقي تحتها.
 */
export const QUICK_SERVICES: DashView[] = ["prayers", "quran", "adhkar", "qibla"];

export type NavGroup = {
  id: string;
  title: string;
  hint: string;
  entries: NavEntry[];
};

/** مكتبة المحتوى — مقسّمة بحسب صلتها باليوم لا بحسب النوع التقني. */
export const LIBRARY_GROUPS: NavGroup[] = [
  {
    id: "worship",
    title: "عبادتي",
    hint: "ما يؤدّيه كل يوم",
    entries: [
      { key: "prayers", label: "الصلاة", hint: "المواقيت والتسجيل", icon: Clock },
      { key: "qibla", label: "القبلة", hint: "زاويتك من موقعك", icon: Compass },
      { key: "adhkar", label: "الأذكار", hint: "الصباح والمساء والنوم", icon: Sparkles },
      { key: "quran", label: "القرآن", hint: "المصحف كاملًا", icon: BookOpen },
      { key: "tasbih", label: "المسبحة", hint: "عدّاد محفوظ", icon: CircleDot },
      { key: "zakat", label: "الزكاة", hint: "تقدير على أرقامك", icon: HandCoins },
    ],
  },
  {
    id: "knowledge",
    title: "المعرفة",
    hint: "ما يقرأه قلبك",
    entries: [
      {
        key: "hadith",
        label: "الأحاديث والآثار",
        hint: "كل نص موسوم بنسبته الحقيقية",
        icon: ScrollText,
      },
      { key: "duas", label: "الأدعية", hint: "من القرآن والسنة", icon: HeartHandshake },
      { key: "prophets", label: "قصص الأنبياء", hint: "موثّقة بمصادرها", icon: Landmark },
      { key: "poetry", label: "الأبيات", hint: "شعر عربي مختار", icon: Feather },
      { key: "occasions", label: "المناسبات", hint: "رمضان والأعياد", icon: CalendarHeart },
    ],
  },
  {
    id: "tracking",
    title: "متابعتي",
    hint: "ما أرصده عن نفسي",
    entries: [
      { key: "saved", label: "المحفوظات", hint: "كل ما حفظته", icon: Bookmark },
      { key: "stats", label: "الإحصاءات", hint: "سجلّك وخطّ الأساس", icon: BarChart3 },
      { key: "review", label: "مراجعة اليوم", hint: "سؤال واحد خفيف", icon: ClipboardCheck },
      { key: "weekly", label: "الخطة الأسبوعية", hint: "خطتك وتعديلها", icon: CalendarRange },
    ],
  },
  {
    id: "app",
    title: "التطبيق",
    hint: "إعدادات وطريقة الاستخدام",
    entries: [
      {
        key: "chat",
        label: "كلّم عود",
        hint: "شكوى أو سؤال أو طلب ترتيب",
        icon: MessageCircle,
      },
      { key: "settings", label: "الإعدادات", hint: "الإشعارات والمكان والبيانات", icon: Settings },
      // «المطوّر» هنا لا في الشريط السفلي: هو صفحة عن التطبيق،
      // والشريط السفلي للأقسام التي يستخدمها المستخدم كل يوم.
      { key: "developer", label: "المطوّر", hint: "من هو OUD ولماذا", icon: Fingerprint },
    ],
  },
];

/* خريطة مفتاح ← مدخل. تُبنى هنا لا فوق، لأن `LIBRARY_GROUPS` يُعرَّف
 * أسفله: البدء قبله يعني قراءة قيمة قبل تعريفها. */

/** كل خدمة باسمها ووصفها، من مصدر واحد. لا نسخة ثانية في أي مكوّن. */
export const SERVICE_BY_KEY: ReadonlyMap<DashView, NavEntry> = new Map(
  LIBRARY_GROUPS.flatMap((group) => group.entries).map((entry) => [entry.key, entry]),
);

/** اسم خدمة أو صفها التوضيحي، أو `undefined` إن لم تكن خدمة. */
export function serviceEntry(key: DashView): NavEntry | undefined {
  return SERVICE_BY_KEY.get(key);
}
