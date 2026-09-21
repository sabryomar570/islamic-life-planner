import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  soft?: boolean;
  hover?: boolean;
  id?: string;
};

/** لوح زجاجي فاتح: حدود مضيئة وضباب محسوب دون أي سطح داكن. */
export function GlassCard({
  children,
  className,
  strong = false,
  soft = false,
  hover = false,
  id,
}: GlassCardProps) {
  return (
    <section
      id={id}
      className={cn(
        "rounded-3xl edge-light",
        strong ? "glass-strong" : soft ? "glass-soft" : "glass",
        hover && "glass-hover",
        className,
      )}
    >
      {children}
    </section>
  );
}

/** حبيبة صغيرة شفافة تُستخدم داخل الألواح. */
export function GlassPill({
  children,
  className,
  active = false,
  ...props
}: React.ComponentProps<"button"> & { active?: boolean }) {
  return (
    <button
      type="button"
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-all",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
          : "glass-tile text-foreground/75 hover:text-foreground",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function SectionTitle({
  icon,
  title,
  hint,
  action,
}: {
  icon?: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon ? (
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-primary">
            {icon}
          </span>
        ) : null}
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
          {hint ? (
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{hint}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}
