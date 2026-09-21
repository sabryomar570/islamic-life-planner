import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  CalendarClock,
  CalendarHeart,
  CircleDot,
  Clock,
  Feather,
  HeartHandshake,
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
  | "plan"
  | "quran"
  | "hadith"
  | "duas"
  | "tasbih"
  | "poetry"
  | "occasions"
  | "settings";

export const NAV_ITEMS: { key: DashView; label: string; icon: typeof Sparkles }[] = [
  { key: "today", label: "ذكر اليوم", icon: Sparkles },
  { key: "prayers", label: "صلاتي", icon: Clock },
  { key: "plan", label: "خطّة يومي", icon: CalendarClock },
  { key: "quran", label: "المصحف", icon: BookOpen },
  { key: "hadith", label: "الأحاديث", icon: ScrollText },
  { key: "duas", label: "الأدعية", icon: HeartHandshake },
  { key: "tasbih", label: "المسبحة", icon: CircleDot },
  { key: "poetry", label: "الأبيات", icon: Feather },
  { key: "occasions", label: "المناسبات", icon: CalendarHeart },
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
  return (
    <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onViewChange("today")}
            className="flex items-center gap-3 text-right"
            aria-label="سكينة — ذكر اليوم"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-white shadow-lg shadow-sky-500/25">
              <Sparkles className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight">سكينة</span>
              <span className="block text-[11px] text-muted-foreground">
                {offline ? "يعمل دون إنترنت" : "رفيق الالتزام"}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-1.5 lg:hidden">
            {offline ? (
              <span className="glass-tile flex size-9 items-center justify-center rounded-full text-muted-foreground">
                <WifiOff className="size-4" />
              </span>
            ) : null}
            {canInstall && onInstall ? (
              <Button
                variant="ghost"
                size="icon"
                className="glass-tile rounded-full"
                onClick={onInstall}
                aria-label="تثبيت التطبيق"
              >
                <Smartphone className="size-4" />
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              className="glass-tile rounded-full"
              onClick={() => onViewChange("settings")}
              aria-label="الإعدادات"
            >
              <Settings className="size-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="glass-tile h-9 gap-2 rounded-full px-3 text-xs">
                  <UserRound className="size-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="start"
                className="glass-strong w-48 rounded-2xl border-white/70 bg-white/85"
              >
                <DropdownMenuLabel className="text-xs">
                  {userName ?? "مستخدم سكينة"}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => onViewChange("settings")}
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

        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
              aria-current={view === item.key ? "page" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-xs font-medium transition-all",
                view === item.key
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
                  : "glass-tile text-foreground/70 hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          {canInstall && onInstall ? (
            <Button variant="outline" className="rounded-full text-xs" onClick={onInstall}>
              <Smartphone className="size-4" />
              ثبّت التطبيق
            </Button>
          ) : null}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onViewChange("settings")}
            className="glass-tile rounded-full"
            aria-label="الإعدادات"
          >
            <Settings className="size-4" />
          </Button>
          <span className="glass-tile flex items-center gap-2 rounded-full px-3.5 py-2 text-xs text-foreground/70">
            <UserRound className="size-4" />
            {userName ?? "مستخدم سكينة"}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onSignOut}
            className="glass-tile rounded-full"
            aria-label="تسجيل الخروج"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>

      {banner ? <div className="mx-auto w-full max-w-6xl px-4 pb-3 sm:px-6">{banner}</div> : null}
    </header>
  );
}
