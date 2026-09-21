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
  Clock,
  Feather,
  LogOut,
  ScrollText,
  Sparkles,
  UserRound,
} from "lucide-react";

export type DashView =
  | "today"
  | "prayers"
  | "plan"
  | "hadith"
  | "quran"
  | "poetry";

export const NAV_ITEMS: { key: DashView; label: string; icon: typeof Sparkles }[] = [
  { key: "today", label: "ذكر اليوم", icon: Sparkles },
  { key: "prayers", label: "صلاتي", icon: Clock },
  { key: "plan", label: "خطّة يومي", icon: CalendarClock },
  { key: "hadith", label: "أحاديث الخشوع", icon: ScrollText },
  { key: "quran", label: "القرآن الكريم", icon: BookOpen },
  { key: "poetry", label: "أبيات تحفّزك", icon: Feather },
];

export function AppHeader({
  view,
  onViewChange,
  userName,
  onSignOut,
}: {
  view: DashView;
  onViewChange: (view: DashView) => void;
  userName?: string;
  onSignOut: () => void;
}) {
  return (
    <header className="glass-strong sticky top-0 z-40 border-x-0 border-t-0 rounded-none border-b border-white/70">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onViewChange("today")}
            className="flex items-center gap-3 text-right"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-white shadow-lg shadow-sky-500/25">
              <Sparkles className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight">سكينة</span>
              <span className="block text-[11px] text-muted-foreground">
                رفيقك إلى الالتزام
              </span>
            </span>
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="glass-tile h-9 gap-2 rounded-full px-3 text-xs lg:hidden"
              >
                <UserRound className="size-4" />
                {userName ?? "حسابي"}
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
                onClick={onSignOut}
                className="cursor-pointer gap-2 text-destructive focus:text-destructive"
              >
                <LogOut className="size-4" />
                تسجيل الخروج
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onViewChange(item.key)}
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
    </header>
  );
}
