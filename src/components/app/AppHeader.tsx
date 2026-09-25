import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  LIBRARY_GROUPS,
  PRIMARY_NAV,
  type DashView,
  type NavEntry,
} from "@/components/app/Navigation";
import { cn } from "@/lib/utils";
import { ChevronLeft, LayoutGrid, LogOut, Settings, Smartphone, UserRound, WifiOff } from "lucide-react";
import type { ReactNode } from "react";

export type { DashView } from "@/components/app/Navigation";

/**
 * PHASE 2 — الترويسة والتنقّل.
 *
 * الموبايل: شريط سفلي من خمس وجهات + لوحة «المزيد» بمجموعات ذات معنى.
 * سطح المكتب: شريط أفقي للوجهات الأساسية + قائمة منسدلة للمكتبة.
 * لا شريط جانبي إجباري، ولا شبكة بطاقات متساوية لكل الأقسام.
 */

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
  moreOpen: boolean;
  onMoreOpenChange: (open: boolean) => void;
}) {
  const setMoreOpen = onMoreOpenChange;

  const openView = (key: DashView) => {
    setMoreOpen(false);
    onViewChange(key);
  };

  const iconButton = "btn-edge touch-target flex items-center justify-center rounded-2xl";

  return (
    <>
      <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70 pt-[env(safe-area-inset-top)]">
        <div className="page max-w-6xl">
          {/* ——— سطر واحد مضغوط: العلامة على اليمين، الأدوات على اليسار ——— */}
          <div className="flex items-center justify-between gap-2 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                onClick={() => onViewChange("today")}
                className="motion-press flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-sm shadow-primary/25"
                aria-label="عود — اليوم"
              >
                عود
              </button>
              <span className="truncate text-[13px] font-semibold text-foreground/80">
                {userName ? userName.split(" ")[0] : "الصلاة القادمة"}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {offline ? (
                <span
                  className={cn(iconButton, "size-9 text-amber-600")}
                  title="أنت دون إنترنت"
                  aria-label="أنت دون إنترنت"
                  role="status"
                >
                  <WifiOff className="size-3.5" />
                </span>
              ) : null}
              {canInstall && onInstall ? (
                <button type="button" onClick={onInstall} className={cn(iconButton, "size-9")} aria-label="تثبيت التطبيق">
                  <Smartphone className="size-3.5" />
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onViewChange("settings")}
                className={cn(iconButton, "size-9")}
                aria-label="الإعدادات"
                aria-current={view === "settings" ? "page" : undefined}
              >
                <Settings className="size-3.5" />
              </button>
              <AccountMenu
                userName={userName}
                onViewChange={openView}
                onSignOut={onSignOut}
              />
            </div>
          </div>

          {/* ——— سطح المكتب: تنقّل أفقي بدل ثلاث أعمدة قسرية ——— */}
          <nav
            aria-label="التنقّل الرئيسي"
            className="hidden items-center gap-1 pb-2 lg:flex"
          >
            {PRIMARY_NAV.map((item) => {
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => onViewChange(item.key)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "motion-press flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium",
                    active
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "text-foreground/70 hover:bg-white/70",
                  )}
                >
                  <item.icon className="size-4" />
                  {item.label}
                </button>
              );
            })}
            <LibraryMenu view={view} onViewChange={onViewChange} />
          </nav>

          {banner ? <div className="pb-2.5">{banner}</div> : null}
        </div>
      </header>

      {/* ——— الموبايل: خمسة وجهات + المزيد ——— */}
      <nav
        className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]"
        aria-label="التنقّل السريع"
      >
        <div className="glass-strong pointer-events-auto flex w-full max-w-md items-stretch gap-0.5 rounded-[1.6rem] border border-white/70 p-1.5">
          {PRIMARY_NAV.map((item) => {
            const active = view === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onViewChange(item.key)}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "motion-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.15rem] px-1 py-2",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex size-8 items-center justify-center rounded-xl transition-colors",
                    active ? "bg-primary text-primary-foreground" : "",
                  )}
                >
                  <item.icon className="size-[18px]" />
                </span>
                <span className="truncate text-[11px] font-medium leading-none">{item.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="motion-press flex min-w-0 flex-1 flex-col items-center gap-1 rounded-[1.15rem] px-1 py-2 text-muted-foreground"
            aria-label="كل الأقسام"
          >
            <span className="flex size-8 items-center justify-center rounded-xl">
              <LayoutGrid className="size-[18px]" />
            </span>
            <span className="truncate text-[11px] font-medium leading-none">المزيد</span>
          </button>
        </div>
      </nav>

      <LibrarySheet
        open={moreOpen}
        onOpenChange={setMoreOpen}
        view={view}
        onOpenView={openView}
        userName={userName}
        onSignOut={onSignOut}
      />
    </>
  );
}

/* ————————————————————— قائمة المكتبة على سطح المكتب ————————————————————— */

function LibraryMenu({
  view,
  onViewChange,
}: {
  view: DashView;
  onViewChange: (view: DashView) => void;
}) {
  const inLibrary = LIBRARY_GROUPS.some((group) =>
    group.entries.some((entry) => entry.key === view),
  );
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "motion-press flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-medium",
            inLibrary ? "bg-white/80 text-foreground" : "text-foreground/70 hover:bg-white/70",
          )}
        >
          <LayoutGrid className="size-4" />
          المزيد
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-strong max-h-[80vh] w-80 overflow-y-auto rounded-2xl border-white/70 bg-white/95 p-2"
      >
        {LIBRARY_GROUPS.map((group) => (
          <div key={group.id} className="mb-1 last:mb-0">
            <DropdownMenuLabel className="px-2 pb-1 pt-2 text-[11px] font-semibold text-muted-foreground">
              {group.title}
            </DropdownMenuLabel>
            {group.entries.map((entry) => (
              <DropdownMenuItem
                key={entry.key}
                onClick={() => onViewChange(entry.key)}
                className="cursor-pointer gap-2.5 rounded-xl px-2 py-2"
              >
                <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <entry.icon className="size-3.5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13px] font-medium">{entry.label}</span>
                  <span className="block truncate text-[11px] text-muted-foreground">{entry.hint}</span>
                </span>
                {view === entry.key ? (
                  <ChevronLeft className="size-3.5 shrink-0 text-primary" />
                ) : null}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator className="my-1" />
          </div>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ————————————————————— قائمة الحساب ————————————————————— */

function AccountMenu({
  userName,
  onViewChange,
  onSignOut,
}: {
  userName?: string;
  onViewChange: (view: DashView) => void;
  onSignOut: () => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="btn-edge touch-target flex size-9 items-center justify-center rounded-2xl" aria-label="الحساب">
          <UserRound className="size-3.5" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="glass-strong w-52 rounded-2xl border-white/70 bg-white/95"
      >
        <DropdownMenuLabel className="truncate text-xs">{userName ?? "حسابي"}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => onViewChange("settings")} className="cursor-pointer gap-2">
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
  );
}

/* ————————————————————— لوحة المكتبة على الموبايل ————————————————————— */

function LibrarySheet({
  open,
  onOpenChange,
  view,
  onOpenView,
  userName,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  view: DashView;
  onOpenView: (view: DashView) => void;
  userName?: string;
  onSignOut: () => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="glass-strong max-h-[86dvh] overflow-y-auto rounded-t-[1.75rem] border-white/70 bg-white/96 px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-2"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="label-section">كل الأقسام</SheetTitle>
        </SheetHeader>

        {/* مجموعات ذات معنى بدل شبكة بطاقات متساوية */}
        <div className="mt-2 space-y-4">
          {LIBRARY_GROUPS.map((group) => (
            <section key={group.id} aria-label={group.title}>
              <div className="mb-1.5 flex items-baseline justify-between px-1">
                <h3 className="text-[13px] font-bold">{group.title}</h3>
                <span className="text-[11px] text-muted-foreground">{group.hint}</span>
              </div>
              <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                {group.entries.map((entry) => (
                  <li key={entry.key}>
                    <LibraryTile entry={entry} active={view === entry.key} onOpen={() => onOpenView(entry.key)} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--rule)] pt-3">
          <span className="flex min-w-0 items-center gap-2 text-[13px]">
            <UserRound className="size-4 shrink-0 text-primary" />
            <span className="truncate">{userName ?? "حسابي"}</span>
          </span>
          <button
            type="button"
            onClick={() => {
              onOpenChange(false);
              onSignOut();
            }}
            className="touch-target inline-flex items-center gap-1.5 rounded-full px-3 text-xs font-medium text-destructive"
          >
            <LogOut className="size-3.5" />
            خروج
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function LibraryTile({
  entry,
  active,
  onOpen,
}: {
  entry: NavEntry;
  active: boolean;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-current={active ? "page" : undefined}
      className={cn(
        "motion-press surface-secondary flex w-full items-center gap-2.5 rounded-2xl p-2.5 text-start",
        active && "bg-primary/10 ring-1 ring-primary/30",
      )}
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <entry.icon className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[13px] font-semibold">{entry.label}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{entry.hint}</span>
      </span>
    </button>
  );
}
