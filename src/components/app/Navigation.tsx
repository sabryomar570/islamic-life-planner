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
  Feather,
  HeartHandshake,
  Landmark,
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
  | "prayers"
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
  | "settings";

export const DASH_VIEWS: DashView[] = [
  "today",
  "prayers",
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
];

export function isDashView(value: string | null): value is DashView {
  return value !== null && (DASH_VIEWS as string[]).includes(value);
}

export const VIEW_LABELS: Record<DashView, string> = {
  today: "اليوم",
  prayers: "الصلاة",
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
};

export type NavEntry = {
  key: DashView;
  label: string;
  /** سطر واحد يشرح ما يجده المستخدم هنا — لا وصف تسويقي. */
  hint: string;
  icon: LucideIcon;
};

/** التنقّل الأساسي — خمسة وجهات على الموبايل، وشريط أفقي على سطح المكتب. */
export const PRIMARY_NAV: NavEntry[] = [
  { key: "today", label: "اليوم", hint: "الصلاة القادمة وخطة اليوم", icon: Sparkles },
  { key: "prayers", label: "الصلاة", hint: "المواقيت والسجل", icon: Clock },
  { key: "quran", label: "القرآن", hint: "المصحف كاملًا", icon: BookOpen },
  { key: "adhkar", label: "الأذكار", hint: "أذكار الصباح والمساء والنوم", icon: Sparkles },
];

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
      { key: "adhkar", label: "الأذكار", hint: "الصباح والمساء والنوم", icon: Sparkles },
      { key: "quran", label: "القرآن", hint: "المصحف كاملًا", icon: BookOpen },
      { key: "tasbih", label: "المسبحة", hint: "عدّاد محفوظ", icon: CircleDot },
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
      { key: "settings", label: "الإعدادات", hint: "الإشعارات والمكان والبيانات", icon: Settings },
    ],
  },
];
