import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type GlassCardProps = {
  children: ReactNode;
  className?: string;
  strong?: boolean;
  soft?: boolean;
  hover?: boolean;
  id?: string;
  /** للتحكم في ترتيب الأقسام حسب سياق الوقت (order) وغيره. */
  style?: React.CSSProperties;
};

/** لوح زجاجي فاتح: حدود مضيئة وضباب محسوب دون أي سطح داكن. */
export function GlassCard({
  children,
  className,
  strong = false,
  soft = false,
  hover = false,
  id,
  style,
}: GlassCardProps) {
  return (
    <section
      id={id}
      style={style}
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


