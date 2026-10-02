import { cn } from "@/lib/utils";
import { Check, ChevronLeft, Loader2, WifiOff } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

/**
 * OUD — Design System, generation two.
 *
 * **The rule that replaces the old one:** there are four depth levels and
 * nothing else. Canvas, surface, elevated card, hero. Every element on
 * every screen borrows one of them. A screen that invents a fifth level is
 * a bug, not a design choice.
 *
 *   Level 0  canvas      the page itself
 *   Level 1  surface     the slab a screen is made of
 *   Level 2  elevated    the card that must be read before its neighbours
 *   Level 3  hero        the one thing that matters right now
 *
 * The prayer on Home is the only Level 3 on that screen. Not the mosque,
 * not the qibla, not the task. One hero, or none.
 *
 * **Icons are a system too:** one gel tile class, four sizes. The tile gives
 * the glyph a surface, a highlight, an edge and an inner shadow, so an icon
 * reads as an object rather than as ink. The meaning of an icon never
 * changes here, only its material. In 3D the tile is a gel base with a
 * visible side and the glyph stands 12px off it, which is why the tile
 * keeps its own short lens instead of borrowing the screen's.
 *
 * **3D is presentation, never information.** Nothing in this file is
 * readable only because of a transform, and every lift has a text
 * equivalent next to it. Depth is how the app feels, not how it speaks.
 *
 * **No user-facing copy lives in this file.** Every string arrives as a prop
 * or comes from a data source. Placeholders are marked as such.
 */

/* ══════════════════════════ Depth ══════════════════════════ */

type ShellProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside" | "li";
  role?: string;
  /** Anchor target, for a section index that scrolls instead of paging. */
  id?: string;
};

/** Level 1 — the surface a screen is made of. */
export function Surface({ children, className, as: Tag = "section", role, id }: ShellProps) {
  return (
    <Tag id={id} role={role} className={cn("oud-surface rounded-3xl", className)}>
      {children}
    </Tag>
  );
}

/** Level 2 — the elevated card. */
export function ElevatedCard({ children, className, as: Tag = "div", id }: ShellProps) {
  return (
    <Tag id={id} className={cn("oud-card rounded-3xl", className)}>
      {children}
    </Tag>
  );
}

/** Level 3 — hero. One per screen. */
export function HeroCard({ children, className, as: Tag = "section" }: ShellProps) {
  return <Tag className={cn("oud-hero rounded-[1.75rem]", className)}>{children}</Tag>;
}

/** Recessed — an empty state or a quiet read area. Never decorative. */
export function Sunken({ children, className, as: Tag = "div", role }: ShellProps) {
  return (
    <Tag role={role} className={cn("oud-sunken rounded-2xl", className)}>
      {children}
    </Tag>
  );
}

/* ══════════════════════════ Icons ══════════════════════════ */

export type IconSize = "sm" | "md" | "lg" | "xl";

const ICON_CLASS: Record<IconSize, string> = {
  sm: "oud-icon-sm",
  md: "oud-icon-md",
  lg: "oud-icon-lg",
  xl: "oud-icon-xl",
};

const GLYPH_CLASS: Record<IconSize, string> = {
  sm: "size-[1rem]",
  md: "size-[1.25rem]",
  lg: "size-[1.5rem]",
  xl: "size-[2.25rem]",
};

/**
 * The icon container. One material, four sizes.
 *
 * `flat` opts out of the gel for dense lists where forty tiles would turn
 * the screen into a pinboard. The size scale never changes.
 */
export function IconTile({
  icon: Icon,
  size = "md",
  flat = false,
  tone = "primary",
  className,
  title,
}: {
  icon: LucideIcon;
  size?: IconSize;
  flat?: boolean;
  tone?: "primary" | "success" | "attention" | "missed" | "neutral";
  className?: string;
  /** Accessible name. Required unless the icon is decorative next to a label. */
  title?: string;
}) {
  const tones: Record<string, string> = {
    primary: "text-primary",
    success: "text-[var(--status-success)]",
    attention: "text-[var(--status-attention)]",
    missed: "text-[var(--status-missed)]",
    neutral: "text-muted-foreground",
  };
  return (
    <span
      className={cn(
        ICON_CLASS[size],
        flat ? "oud-icon-tile oud-icon-flat" : "oud-icon-tile",
        tones[tone],
        className,
      )}
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <Icon className={GLYPH_CLASS[size]} aria-hidden />
    </span>
  );
}

/* ══════════════════════════ Buttons ══════════════════════════ */

export type ActionState = "default" | "success";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  icon?: LucideIcon;
  iconEnd?: LucideIcon;
  loading?: boolean;
  full?: boolean;
  /** `success` adds a tick and a green tint, so a confirm is not a guess. */
  state?: ActionState;
};

const BUTTON_BASE =
  "oud-press oud-3d-lift oud-tap inline-flex items-center justify-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:pointer-events-none disabled:opacity-55";

/** Level 3 interaction: the primary action. At most one per screen region. */
export function ActionButton({
  children,
  icon: Icon,
  iconEnd: IconEnd,
  loading = false,
  full = false,
  state = "default",
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BUTTON_BASE,
        "bg-[linear-gradient(135deg,var(--oud-accent-top),var(--oud-accent-bottom))] text-white",
        "shadow-[0_8px_22px_-12px_oklch(0.5_0.16_257/0.55)]",
        state === "success" && "ring-2 ring-[var(--status-success)]/60",
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Icon ? <Icon className="size-4" aria-hidden /> : null}
      <span>{children}</span>
      {IconEnd ? <IconEnd className="size-4" aria-hidden /> : null}
    </button>
  );
}
/** Level 2 interaction: the secondary action. Quiet, never competing. */
export function SecondaryButton({
  children,
  icon: Icon,
  iconEnd: IconEnd,
  loading = false,
  full = false,
  state = "default",
  className,
  disabled,
  ...rest
}: ButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        BUTTON_BASE,
        "oud-surface text-foreground/85 hover:border-[var(--oud-line-strong)]",
        state === "success" && "border-[var(--status-success)]/40 text-[var(--status-success)]",
        full && "w-full",
        className,
      )}
      {...rest}
    >
      {state === "success" ? (
        <Check className="size-4" aria-hidden />
      ) : loading ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : Icon ? (
        <Icon className="size-4" aria-hidden />
      ) : null}
      <span>{children}</span>
      {IconEnd ? <IconEnd className="size-4" aria-hidden /> : null}
    </button>
  );
}

/** A quiet text action, for a header that says "see everything". */
export function TextLink({
  children,
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        "oud-press oud-tap inline-flex items-center gap-1 rounded-full px-2 text-[13px] font-semibold text-primary",
        className,
      )}
      {...rest}
    >
      <span>{children}</span>
      <ChevronLeft className="size-3.5" aria-hidden />
    </button>
  );
}

/* ══════════════════════════ Structure ══════════════════════════ */

export function SectionHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        <h2 className="text-[17px] leading-7 font-bold text-foreground">{title}</h2>
        {subtitle ? <p className="label-meta mt-0.5 text-muted-foreground">{subtitle}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** Screen title, used by the app bar and by nothing else. */
export function ScreenTitle({
  title,
  subtitle,
  className,
}: {
  title: string;
  subtitle?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <h1 className="text-[19px] leading-7 font-bold text-foreground">{title}</h1>
      {subtitle ? <p className="label-meta mt-0.5 text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

/* ══════════════════════════ Data display ══════════════════════════ */

export function StatCard({
  icon,
  label,
  value,
  hint,
  size = "md",
  className,
}: {
  icon?: LucideIcon;
  label: string;
  value: string | number;
  hint?: string;
  size?: IconSize;
  className?: string;
}) {
  return (
    <div className={cn("oud-card flex flex-col gap-2 p-4", className)}>
      {icon ? <IconTile icon={icon} size={size} /> : null}
      <p className="label-meta text-muted-foreground">{label}</p>
      <p className="text-[20px] leading-7 font-bold text-foreground">{value}</p>
      {hint ? <p className="label-meta text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/**
 * A worship service in the hub.
 *
 * Icon above, name, one line of description. Not a row with a chevron:
 * the hub is a set of things you might open, not a list you must follow.
 */
export function ServiceCard({
  icon,
  title,
  description,
  onClick,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "oud-press oud-card oud-tap flex flex-col items-center gap-2.5 rounded-3xl px-4 py-5 text-center",
        className,
      )}
    >
      <IconTile icon={icon} size="lg" />
      <span className="text-[15px] font-bold text-foreground">{title}</span>
      {description ? (
        <span className="label-meta line-clamp-2 text-muted-foreground">{description}</span>
      ) : null}
    </button>
  );
}

/** A row inside one card: icon, title, optional meta, chevron on the left. */
export function ListRow({
  icon,
  title,
  meta,
  onClick,
  trailing,
  className,
  flat = false,
}: {
  icon?: LucideIcon;
  title: string;
  meta?: string;
  onClick?: () => void;
  trailing?: ReactNode;
  className?: string;
  flat?: boolean;
}) {
  const body = (
    <>
      {icon ? <IconTile icon={icon} size="sm" flat={flat} /> : null}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold text-foreground">{title}</span>
        {meta ? <span className="label-meta block truncate text-muted-foreground">{meta}</span> : null}
      </span>
      {trailing ?? (onClick ? <ChevronLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null)}
    </>
  );
  if (!onClick) {
    return <div className={cn("flex items-center gap-3 px-4 py-3", className)}>{body}</div>;
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn("oud-press oud-tap flex w-full items-center gap-3 px-4 py-3 text-start", className)}
    >
      {body}
    </button>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: ReactNode;
  tone?: "neutral" | "primary" | "success" | "attention" | "missed";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-[var(--oud-canvas)] text-muted-foreground",
    primary: "bg-primary/10 text-primary",
    success: "bg-[var(--status-success)]/12 text-[var(--status-success)]",
    attention: "bg-[var(--status-attention)]/14 text-[var(--status-attention)]",
    missed: "bg-[var(--status-missed)]/12 text-[var(--status-missed)]",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/**
 * An achievement.
 *
 * Locked is a real state, not an empty one: it keeps the same footprint and
 * the same shape so the grid does not reflow when one unlocks. The lock is
 * an icon plus reduced contrast, never colour alone.
 */
export function AchievementCard({
  title,
  detail,
  unlocked,
  className,
}: {
  title: string;
  detail?: string;
  unlocked: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 rounded-3xl p-4 text-center",
        unlocked ? "oud-card" : "oud-sunken",
        className,
      )}
    >
      <span
        className={cn(
          "grid size-12 place-items-center rounded-2xl",
          unlocked ? "bg-[linear-gradient(155deg,var(--oud-accent-top),var(--oud-accent-bottom))] text-white" : "text-muted-foreground",
        )}
        aria-hidden
      >
        {unlocked ? <Check className="size-5" /> : <span className="size-2.5 rounded-full bg-current opacity-50" />}
      </span>
      <span className={cn("text-[13px] font-semibold", unlocked ? "text-foreground" : "text-muted-foreground")}>
        {title}
      </span>
      {detail ? <span className="label-meta line-clamp-2 text-muted-foreground">{detail}</span> : null}
      <span className="sr-only">{unlocked ? "مفتوح" : "مقفل"}</span>
    </div>
  );
}

/* ══════════════════════════ Progress ══════════════════════════ */

export function ProgressBar({
  value,
  max = 100,
  tone = "primary",
  label,
  className,
}: {
  value: number;
  max?: number;
  tone?: "primary" | "success" | "attention";
  label?: string;
  className?: string;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const tones: Record<string, string> = {
    primary: "bg-[linear-gradient(90deg,var(--oud-accent-top),var(--oud-accent-bottom))]",
    success: "bg-[var(--status-success)]",
    attention: "bg-[var(--status-attention)]",
  };
  return (
    <div
      className={cn("h-2 w-full overflow-hidden rounded-full bg-[var(--oud-canvas)]", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span className={cn("block h-full rounded-full transition-[width] duration-300", tones[tone])} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** A ring for the one number that owns its card. Never for three at once. */
export function ProgressRing({
  value,
  max = 100,
  size = 132,
  stroke = 10,
  tone = "primary",
  label,
  children,
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  tone?: "primary" | "success" | "attention";
  label?: string;
  children?: ReactNode;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const tones: Record<string, string> = {
    primary: "var(--primary)",
    success: "var(--status-success)",
    attention: "var(--status-attention)",
  };
  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden focusable="false">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" strokeWidth={stroke} className="stroke-[var(--oud-canvas)]" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={tones[tone]}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
        />
      </svg>
      {children ? <div className="absolute inset-0 grid place-items-center">{children}</div> : null}
    </div>
  );
}

/* ══════════════════════════ States ══════════════════════════ */

/**
 * The four states a screen can be in.
 *
 * They are separate components on purpose. One shared "nothing here"
 * string across loading, empty and error is how an app stops telling the
 * user what actually happened.
 */
export function EmptyState({
  icon,
  title,
  body,
  action,
  className,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <Sunken className={cn("flex flex-col items-center gap-2 px-6 py-10 text-center", className)}>
      {icon ? <IconTile icon={icon} size="lg" flat /> : null}
      <p className="text-[15px] font-bold text-foreground">{title}</p>
      {body ? <p className="label-body max-w-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </Sunken>
  );
}

export function LoadingState({ label, rows = 3, className }: { label?: string; rows?: number; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-3", className)} role="status" aria-live="polite" aria-busy="true">
      {label ? <span className="sr-only">{label}</span> : null}
      {Array.from({ length: rows }, (_, index) => (
        <div key={index} className="oud-sunken h-20 animate-pulse rounded-3xl" />
      ))}
    </div>
  );
}

export function ErrorState({
  title,
  body,
  onRetry,
  retryLabel,
  className,
}: {
  title: string;
  body?: string;
  onRetry?: () => void;
  /** The retry label is technical UI chrome, not personality copy. */
  retryLabel?: string;
  className?: string;
}) {
  return (
    <Sunken role="alert" className={cn("flex flex-col items-center gap-2 px-6 py-8 text-center", className)}>
      <p className="text-[15px] font-bold text-foreground">{title}</p>
      {body ? <p className="label-body max-w-sm text-muted-foreground">{body}</p> : null}
      {onRetry ? (
        <div className="mt-2">
          <SecondaryButton onClick={onRetry}>{retryLabel ?? "إعادة المحاولة"}</SecondaryButton>
        </div>
      ) : null}
    </Sunken>
  );
}

export function OfflineState({ children }: { children?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2.5 rounded-2xl bg-[var(--status-attention)]/12 px-3.5 py-2.5"
    >
      <WifiOff className="size-4 shrink-0 text-[var(--status-attention)]" aria-hidden />
      <span className="label-meta text-foreground/80">
        {children ?? "أنت دون إنترنت — يعمل المحتوى المحفوظ، وتُرسل تسجيلاتك عند عودة الاتصال."}
      </span>
    </div>
  );
}

/* ══════════════════════════ Inputs ══════════════════════════ */

export function Field({
  label,
  icon: Icon,
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: string; icon?: LucideIcon }) {
  return (
    <label className={cn("block", className)}>
      <span className="label-meta mb-1.5 block text-muted-foreground">{label}</span>
      <span className="oud-surface flex min-h-12 items-center gap-2.5 rounded-2xl px-3.5">
        {Icon ? <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden /> : null}
        <input
          className="w-full bg-transparent text-[14px] text-foreground outline-none placeholder:text-muted-foreground/70"
          {...rest}
        />
      </span>
    </label>
  );
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  disabled,
}: {
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "oud-press relative h-7 w-12 shrink-0 rounded-full border disabled:pointer-events-none disabled:opacity-50",
        checked
          ? "border-transparent bg-[linear-gradient(135deg,var(--oud-accent-top),var(--oud-accent-bottom))]"
          : "border-[var(--oud-line)] bg-[var(--oud-canvas)]",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 grid size-5 place-items-center rounded-full bg-white shadow-sm transition-[inset-inline-start] duration-200",
          checked ? "start-[1.45rem]" : "start-0.5",
        )}
        aria-hidden
      />
    </button>
  );
}

/* ══════════════════════════ Segmented tabs ══════════════════════════ */

export function SegmentedTabs({
  tabs,
  value,
  onChange,
  className,
}: {
  tabs: readonly { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
  className?: string;
}) {
  return (
    <div
      role="tablist"
      className={cn("oud-sunken flex gap-1 rounded-full p-1", className)}
    >
      {tabs.map((tab) => {
        const active = tab.key === value;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.key)}
            className={cn(
              "oud-press oud-tap flex-1 rounded-full px-3 text-[13px] font-semibold",
              active
                ? "bg-[linear-gradient(135deg,var(--oud-accent-top),var(--oud-accent-bottom))] text-white"
                : "text-muted-foreground",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
