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
  Bookmark,
  CalendarHeart,
  CircleDot,
  Clock,
  Feather,
  HeartHandshake,
  Landmark,
  LayoutGrid,
  LogOut,
  ScrollText,
  Settings,
  Smartphone,
  Sparkles,
  UserRound,
  WifiOff,
} from "lucide-react";
import type { ReactNode } from "react";

export type DashView =
  | "today"
  | "prayers"
  | "quran"
  | "hadith"
  | "duas"
  | "tasbih"
  | "poetry"
  | "prophets"
  | "occasions"
  | "saved"
  | "settings";

export type NavItem = {
  key: DashView;
  label: string;
  description: string;
  icon: typeof Sparkles;
};

/** كل الأقسام — بلا تكرار وبوصف قصير يوضّح ما فيه. */
export const NAV_ITEMS: NavItem[] = [
  { key: "today", label: "الرئيسية", description: "الصلاة القادمة وذكر اليوم", icon: Sparkles },
  { key: "prayers", label: "صلاتي", description: "المواقيت، التسجيل، والإحصاءات", icon: Clock },
  { key: "quran", label: "المصحف", description: "القرآن كاملًا ويعمل دون إنترنت", icon: BookOpen },
  { key: "duas", label: "الأدعية", description: "أدعية قرآنية ونبوية بأبوابها", icon: HeartHandshake },
  { key: "hadith", label: "الأحاديث", description: "أبواب بأسانيدها ورواتها", icon: ScrollText },
  { key: "tasbih", label: "المسبحة", description: "عدّاد تسبيح محفوظ على جهازك", icon: CircleDot },
  { key: "poetry", label: "الأبيات", description: "شعر عربي مختار", icon: Feather },
  { key: "prophets", label: "قصص الأنبياء", description: "قصص موثقة بمصادرها من القرآن والسيرة", icon: Landmark },
  { key: "occasions", label: "المناسبات", description: "رمضان والأعياد والصيام", icon: CalendarHeart },
  { key: "saved", label: "محفوظاتي", description: "كل ما حفظته من آيات وأحاديث وأبيات وأدعية", icon: Bookmark },
  { key: "settings", label: "الإعدادات", description: "الإشعارات، المكان، والعمل دون إنترنت", icon: Settings },
];

/** خمسة أزرار في الشريط السفلي؛ بقية الأقسام داخل «المزيد». */
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
  moreOpen,
  onMoreOpenChange,
}: {
  view: DashView;
  onViewChange: (view: DashView) => void;
  userName?: string;
  onSignOut: () => void;
  offline?: boolean;
  canInstall?: boolean;
  onInstall?: () => void;
  banner?: ReactNode;
  /** حالة نافذة «كل الأقسام» — مرفوعة للأعلى ليتمكّن زرّها في الرئيسية من فتحها. */
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
}) {
  const setMoreOpen = onMoreOpenChange;

  const openView = (key: DashView) => {
    setMoreOpen(false);
    onViewChange(key);
  };

  const iconButton =
    "btn-edge flex size-9 items-center justify-center rounded-2xl";

  return (
    <>
      <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70">
        <div className="mx-auto grid w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-2 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-1.5 justify-self-start">
            <button
              type="button"
              onClick={() => setMoreOpen(true)}
              className={iconButton}
              aria-label="كل الأقسام"
            >
              <LayoutGrid className="size-4" />
            </button>
            {offline ? (
              <span className={cn(iconButton, "text-amber-600")} title="أنت دون إنترنت">
                <WifiOff className="size-3.5" />
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => onViewChange("today")}
            className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-lg font-bold text-white shadow-lg shadow-sky-500/25"
            aria-label="عود — الرئيسية"
          >
            عود
          </button>

          <div className="flex items-center gap-1.5 justify-self-end">
            {canInstall && onInstall ? (
              <button
                type="button"
                onClick={onInstall}
                className={iconButton}
                aria-label="تثبيت التطبيق"
              >
                <Smartphone className="size-4" />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => onViewChange("settings")}
              className={iconButton}
              aria-label="الإعدادات"
            >
              <Settings className="size-4" />
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className={iconButton} aria-label="الحساب">
                  <UserRound className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="glass-strong w-48 rounded-2xl border-white/70 bg-white/90"
              >
                <DropdownMenuLabel className="truncate text-xs">
                  {userName ?? "حسابي"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => openView("settings")} className="cursor-pointer gap-2">
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

        {banner ? <div className="mx-auto w-full max-w-6xl px-4 pb-2.5 sm:px-6">{banner}</div> : null}
      </header>

      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.7rem,env(safe-area-inset-bottom))]"
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
                  "flex w-[4.1rem] flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl transition-all",
                    active ? "bg-primary text-primary-foreground shadow-md shadow-primary/30" : "",
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
            className="flex w-[4.1rem] flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[10px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <span className="flex size-8 items-center justify-center rounded-xl">
              <LayoutGrid className="size-[18px]" />
            </span>
            المزيد
          </button>
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent
          side="bottom"
          className="glass-strong rounded-t-[2rem] border-white/70 bg-white/95 px-5 pb-10 pt-2"
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
                  "tile-edge flex items-start gap-2.5 rounded-2xl p-3 text-right transition-colors hover:bg-white",
                  view === item.key && "ring-2 ring-primary/40",
                )}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                  <item.icon className="size-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-[13px] font-semibold">{item.label}</span>
                  <span className="mt-0.5 block text-[10px] leading-4 text-muted-foreground">
                    {item.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
          <div className="tile-edge mt-4 flex items-center justify-between rounded-2xl p-3">
            <span className="flex min-w-0 items-center gap-2 text-[13px]">
              <UserRound className="size-4 shrink-0 text-primary" />
              <span className="truncate">{userName ?? "حسابي"}</span>
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
