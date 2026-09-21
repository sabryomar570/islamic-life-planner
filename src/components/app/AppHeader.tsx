import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarClock,
  CalendarHeart,
  CircleDot,
  Clock,
  Feather,
  HeartHandshake,
  LayoutGrid,
  LogOut,
  ScrollText,
  Settings,
  Smartphone,
  Sparkles,
  UserRound,
  WifiOff,
} from "lucide-react";
import { useState, type ReactNode } from "react";

export type DashView =
  | "today"
  | "prayers"
  | "plan"
  | "quran"
  | "hadith"
  | "duas"
  | "tasbih"
  | "poetry"
  | "occasions"
  | "settings";

export type NavItem = {
  key: DashView;
  label: string;
  description: string;
  icon: typeof Sparkles;
};

/** كل الأقسام مرتّبة: العبادة اليومية أولًا، ثم المصحف، ثم المعرفة، ثم الأدوات. */
export const NAV_ITEMS: NavItem[] = [
  { key: "today", label: "ذكر اليوم", description: "آية وذكر وحديث يخصّان اليوم", icon: Sparkles },
  { key: "prayers", label: "صلاتي", description: "المواقيت والسجلّ والإحصاءات", icon: Clock },
  { key: "plan", label: "خطّة يومي", description: "جدولك المبني على إجاباتك", icon: CalendarClock },
  { key: "quran", label: "المصحف", description: "القرآن كاملًا بصفحات المصحف", icon: BookOpen },
  { key: "hadith", label: "الأحاديث", description: "أبواب تحثّ القلب على الخشوع", icon: ScrollText },
  { key: "duas", label: "الأدعية", description: "أدعية مأثورة لكل حاجة", icon: HeartHandshake },
  { key: "tasbih", label: "المسبحة", description: "مسبحة بعدّاد واهتزاز", icon: CircleDot },
  { key: "poetry", label: "الأبيات", description: "شعر حماسي يحفّز على الفعل", icon: Feather },
  { key: "occasions", label: "المناسبات", description: "رمضان والعيد والأيام المباركة", icon: CalendarHeart },
  { key: "settings", label: "الإعدادات", description: "التنبيهات والموقع والعمل دون إنترنت", icon: Settings },
];

/** خمسة أزرار فقط في الشريط السفلي؛ بقية الأقسام داخل «المزيد». */
const BOTTOM_NAV: { key: DashView; label: string; icon: typeof Sparkles }[] = [
  { key: "today", label: "الرئيسية", icon: Sparkles },
  { key: "quran", label: "المصحف", icon: BookOpen },
  { key: "prayers", label: "صلاتي", icon: Clock },
  { key: "duas", label: "الأدعية", icon: HeartHandshake },
];

export function AppHeader({
  view,
  onViewChange,
  userName,
  onSignOut,
  offline = false,
  canInstall = false,
  onInstall,
  banner,
}: {
  view: DashView;
  onViewChange: (view: DashView) => void;
  userName?: string;
  onSignOut: () => void;
  offline?: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
  banner?: ReactNode;
}) {
  const [moreOpen, setMoreOpen] = useState(false);

  const openView = (key: DashView) => {
    setMoreOpen(false);
    onViewChange(key);
  };

  return (
    <>
      {/* الشريط العلوي المختصر: قائمة — الشعار بالمنتصف — الحساب والإعدادات */}
      <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2.5 sm:px-6">
          <div className="flex items-center gap-1.5 justify-self-start">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className="glass-tile flex size-10 items-center justify-center rounded-2xl transition-transform hover:scale-[1.03]"
              aria-label="كل الأقسام"
            >
              <LayoutGrid className="size-5" />
            </button>
            {offline ? (
              <span
                className="glass-tile flex size-10 items-center justify-center rounded-2xl text-muted-foreground"
                title="أنت دون إنترنت"
              >
                <WifiOff className="size-4" />
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onViewChange("today")}
            className="flex flex-col items-center leading-tight"
            aria-label="سكينة — الرئيسية"
          >
            <span className="text-lg font-bold tracking-tight">سكينة</span>
            <span className="text-[10px] text-muted-foreground">
              {offline ? "يعمل دون إنترنت" : "رفيق الالتزام"}
            </span>
          </button>

          <div className="flex items-center gap-1.5 justify-self-end">
            {canInstall && onInstall ? (
              <button
                type="button"
                onClick={onInstall}
                className="glass-tile flex size-10 items-center justify-center rounded-2xl transition-transform hover:scale-[1.03]"
                aria-label="تثبيت التطبيق"
              >
                <Smartphone className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onViewChange("settings")}
              className="glass-tile flex size-10 items-center justify-center rounded-2xl transition-transform hover:scale-[1.03]"
              aria-label="الإعدادات"
            >
              <Settings className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="glass-tile flex size-10 items-center justify-center rounded-2xl transition-transform hover:scale-[1.03]"
                  aria-label="الحساب"
                >
                  <UserRound className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-strong w-48 rounded-2xl border-white/70 bg-white/85"
              >
                <DropdownMenuLabel className="truncate text-xs">
                  {userName ?? "مستخدم سكينة"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => openView("settings")}
                  className="cursor-pointer gap-2"
                >
                  <Settings className="size-4" />
                  الإعدادات
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onSignOut}
                  className="cursor-pointer gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="size-4" />
                  تسجيل الخروج
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {banner ? (
          <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6">{banner}</div>
        ) : null}
      </header>

      {/* الشريط السفلي العائم — مثل التطبيقات الأصلية */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        aria-label="التنقّل الرئيسي"
      >
        <div className="glass-strong pointer-events-auto flex items-center gap-0.5 rounded-[1.75rem] border border-white/70 p-1.5 shadow-xl shadow-sky-900/10">
          {BOTTOM_NAV.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onViewChange(item.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-medium transition-all",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl transition-all",
                    active
                      ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                      : "bg-transparent",
                  )}
                >
                  <item.icon className="size-[18px]" />
                </span>
                {item.label}
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex w-[4.25rem] flex-col items-center gap-1 rounded-2xl py-1.5 text-[10px] font-medium text-muted-foreground transition-all hover:text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-xl">
              <LayoutGrid className="size-[18px]" />
            </span>
            المزيد
          </button>
        </div>
      </nav>

      {/* نافذة «المزيد»: كل الأقسام منظمة بوصف قصير لكل واحد */}
      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="glass-strong rounded-t-[2rem] border-white/70 bg-white/90 px-5 pb-10 pt-2"
        >
          <SheetHeader className="items-center text-center">
            <SheetTitle className="text-base">كل الأقسام</SheetTitle>
          </SheetHeader>
          <div className="mt-1 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => openView(item.key)}
                className={cn(
                  "glass-tile flex items-start gap-3 rounded-2xl p-3.5 text-right transition-all hover:bg-white/85",
                  view === item.key && "ring-2 ring-primary/40",
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <item.icon className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="glass-tile mt-4 flex items-center justify-between rounded-2xl p-3.5">
            <span className="flex min-w-0 items-center gap-2 text-sm">
              <UserRound className="size-4 shrink-0 text-primary" />
              <span className="truncate">{userName ?? "مستخدم سكينة"}</span>
            </span>
            <button
              type="button"
              onClick={() => {
                setMoreOpen(false);
                onSignOut();
              }}
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
            >
              <LogOut className="size-3.5" />
              خروج
            </button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
