import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
 * PHASE 2 — Surface primitives.
 *
 * القاعدة: ليست كل منطقة بطاقة. تدرّج هرمي مقصود:
 *   canvas → primary surface → secondary surface → compact control → plain content
 * الزجاج يخدم المرحلتين الأولى والثانية فقط؛ ما بعد ذلك عادي.
 */

type SurfaceProps = {
  children: ReactNode;
  className?: string;
  as?: "section" | "div" | "article" | "aside";
  role?: string;
};

/** Primary surface — اللوح الرئيسي للشاشة. واحد فقط في كل شاشة. */
export function Panel({ children, className, as: Tag = "section", role }: SurfaceProps) {
  return (
    <Tag
      role={role}
      className={cn(
        "relative rounded-3xl surface-primary",
        "before:pointer-events-none before:absolute before:inset-x-[12%] before:top-0 before:h-px before:bg-gradient-to-l before:from-transparent before:via-white/90 before:to-transparent",
        className,
      )}
    >
      {children}
    </Tag>
  );
}


/** Sunken — حفرة أو حالة فارغة. بصريًا «أخفض» من محيطه. */
export function Sunken({ children, className, as: Tag = "div", role }: SurfaceProps) {
  return (
    <Tag role={role} className={cn("rounded-2xl surface-sunken", className)}>
      {children}
    </Tag>
  );
}


/** Editorial — ورق دافئ للقرآن والشعر. لا زجاج ولا أزرق. */
export function Editorial({ children, className, as: Tag = "div", role }: SurfaceProps) {
  return (
    <Tag role={role} className={cn("rounded-3xl surface-editorial", className)}>
      {children}
    </Tag>
  );
}


/* ————————————————————————————— Typography ————————————————————————————— */

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("eyebrow", className)}>{children}</p>;
}


/** عنوان القسم — 13px/600. أعلى السلّم من النص، أقل من الشاشة. */
export function SectionHead({
  title,
  eyebrow,
  hint,
  action,
  className,
  id,
}: {
  title: string;
  eyebrow?: string;
  hint?: string;
  action?: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="min-w-0">
        {eyebrow ? <Eyebrow className="mb-1">{eyebrow}</Eyebrow> : null}
        <h2 id={id} className="label-section text-foreground">
          {title}
        </h2>
        {hint ? <p className="label-meta mt-1 text-muted-foreground">{hint}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/* ————————————————————————————— Controls ————————————————————————————— */

/** Compact control — للاختيار السريع داخل الشاشة. هدف لمس 44px. */
export function ChoiceChip({
  children,
  active,
  className,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        "motion-press touch-target rounded-full px-3.5 label-meta font-medium",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "surface-secondary text-foreground/75 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** زر إجراء داخل لوحة — ثانوي بطبعه. */
export function QuietButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "motion-press touch-target inline-flex items-center justify-center gap-1.5 rounded-full px-4 label-meta font-semibold",
        "surface-secondary text-foreground/80 hover:bg-white/80",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/** زر رئيسي — واحد فقط في أي شاشة. */
export function PrimaryButton({
  children,
  className,
  ...props
}: React.ComponentProps<"button">) {
  return (
    <button
      type="button"
      className={cn(
        "motion-press btn-primary-edge touch-target inline-flex items-center justify-center gap-2 rounded-full px-5 text-[13px] font-semibold text-primary-foreground",
        "disabled:cursor-not-allowed disabled:opacity-55",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ————————————————————————————— Data display ————————————————————————————— */

/** مقياس رفيع يقرأ كبيانات لا كزخرفة. */
export function Meter({
  value,
  max = 100,
  tone,
  className,
  label,
}: {
  value: number;
  max?: number;
  tone?: "success" | "attention" | "missed";
  className?: string;
  label?: string;
}) {
  const pct = max === 0 ? 0 : Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      className={cn("meter", className)}
      data-tone={tone}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

/** نقطة حالة موحّدة لكل التطبيق. */
export function StatusDot({
  state,
  className,
}: {
  state: "success" | "attention" | "missed" | "idle" | "neutral" | "primary";
  className?: string;
}) {
  const tones: Record<string, string> = {
    success: "bg-[var(--status-success)]",
    attention: "bg-[var(--status-attention)]",
    missed: "bg-[var(--status-missed)]",
    idle: "bg-[var(--status-idle)]",
    neutral: "bg-[var(--status-neutral)]",
    primary: "bg-primary",
  };
  return <span className={cn("status-dot", tones[state], className)} aria-hidden />;
}

/** شارة نصية صغيرة — للبيانات الوصفية لا للحكم على الحالة. */
export function Tag({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 label-meta font-medium",
        "surface-secondary text-foreground/70",
        className,
      )}
    >
      {children}
    </span>
  );
}

/* ————————————————————————————— States ————————————————————————————— */

/** حالة فارغة: رسالة بشرية قصيرة + إجراء واضح. */
export function EmptyState({
  title,
  body,
  action,
  icon,
}: {
  title: string;
  body?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <Sunken className="px-6 py-10 text-center">
      {icon ? <div className="mb-3 flex justify-center text-muted-foreground/70">{icon}</div> : null}
      <p className="label-section text-foreground">{title}</p>
      {body ? <p className="label-body mx-auto mt-2 max-w-sm text-muted-foreground">{body}</p> : null}
      {action ? <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </Sunken>
  );
}

/** حالة خطأ: رسالة هادئة + إعادة محاولة. */
export function ErrorState({
  title = "تعذّر تحميل هذا الجزء",
  body,
  onRetry,
}: {
  title?: string;
  body?: string;
  onRetry?: () => void;
}) {
  return (
    <Sunken role="alert" className="px-6 py-8 text-center">
      <p className="label-section text-foreground">{title}</p>
      {body ? <p className="label-body mx-auto mt-2 max-w-sm text-muted-foreground">{body}</p> : null}
      {onRetry ? (
        <div className="mt-4 flex justify-center">
          <QuietButton onClick={onRetry}>إعادة المحاولة</QuietButton>
        </div>
      ) : null}
    </Sunken>
  );
}

/** هيكل عظمي يطابق الترتيب النهائي — لا «جارٍ التحميل…». */
export function Skeleton({ className }: { className?: string }) {
  return <span aria-hidden className={cn("skeleton block", className)} />;
}


/** تنبيه دون اتصال — صغير وغير مزعج. */
export function OfflineNote({ children }: { children?: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-2xl bg-[var(--status-attention)]/10 px-3 py-2 label-meta text-foreground/75"
    >
      <span className="status-dot bg-[var(--status-attention)]" aria-hidden />
      {children ?? "أنت دون إنترنت — يعمل المحتوى المحفوظ، وتُرسل تسجيلاتك عند عودة الاتصال."}
    </div>
  );
}
