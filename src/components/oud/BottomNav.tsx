import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

import { ZONES, type DashView } from "@/components/app/Navigation";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * OUD — the bottom bar.
 *
 * **Attached, not floating.** It sits on the bottom edge with a light
 * radius at the top, one clear surface and one soft top line. No heavy
 * shadow, no blur, no centre button, no fifth "more" slot.
 *
 * **The active destination is a gel droplet, not a colour swap.** A single
 * element exists above the bar; it travels to whichever destination is
 * active and gently swells into an organic shape around it. The icon then
 * reads clearly on top of it, which is the whole point: the indicator
 * explains the change instead of only reporting it.
 *
 * The droplet is deliberately small. A big bubble would be a button, and a
 * button in the middle of a navigation bar is a shortcut to something the
 * product has not decided on.
 *
 * **The droplet is 3D, and the measurement is not.** The element framer
 * motion measures and animates is an empty, correctly sized box. The gel
 * body inside it carries the material and the real `translateZ`, so the
 * droplet swells toward the eye on its own short lens. Two elements, two
 * jobs, and neither overwrites the other's transform.
 *
 * **Reduced motion:** the droplet still moves, because moving it is the
 * only way to show where the selection went. What disappears is the spring
 * and the overshoot, not the meaning. With motion fully reduced the change
 * is instant.
 */

export type BottomNavProps = {
  view: DashView;
  onChange: (view: DashView) => void;
  /** Optional extra affordance rendered to the left of the zones. */
  trailing?: React.ReactNode;
  className?: string;
};

export function BottomNav({ view, onChange, trailing, className }: BottomNavProps) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  // A layout animation needs a real box. Without it the first paint would
  // show a droplet at the wrong place and slide on hydration.
  useEffect(() => {
    setMounted(true);
  }, []);

  const activeKey = ZONES.some((zone) => zone.key === view) ? view : ZONES[0].key;

  return (
    <nav
      aria-label="التنقّل الرئيسي"
      className={cn(
        "fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)]",
        "rounded-t-[1.75rem] border-t border-[var(--oud-line)] bg-[var(--oud-surface)]",
        "shadow-[0_-8px_28px_-20px_oklch(0.42_0.08_255/0.5)]",
        className,
      )}
    >
      <ul className="oud-3d-nav-slab mx-auto flex max-w-lg items-stretch gap-1 px-2 pt-1.5 pb-1">
        {ZONES.map((zone) => (
          <li key={zone.key} className="min-w-0 flex-1">
            <NavItem
              zoneKey={zone.key}
              label={zone.label}
              icon={zone.icon}
              active={zone.key === activeKey}
              onSelect={() => onChange(zone.key)}
              mounted={mounted}
              reduced={Boolean(reduced)}
            />
          </li>
        ))}
      </ul>
      {trailing ? <div className="pb-1">{trailing}</div> : null}
    </nav>
  );
}

function NavItem({
  zoneKey,
  label,
  icon: Icon,
  active,
  onSelect,
  mounted,
  reduced,
}: {
  zoneKey: DashView;
  label: string;
  icon: LucideIcon;
  active: boolean;
  onSelect: () => void;
  mounted: boolean;
  reduced: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? "page" : undefined}
      className={cn(
        "oud-press relative flex w-full flex-col items-center gap-0.5 rounded-2xl px-1 py-2",
        "min-h-16",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground/80",
      )}
    >
      {active && mounted ? (
        <motion.span
          aria-hidden
          layoutId="oud-nav-droplet"
          className="oud-3d-droplet"
          transition={
            reduced
              ? { duration: 0 }
              : { type: "spring", stiffness: 420, damping: 34, mass: 0.7 }
          }
        >
          <span className="oud-gel-droplet oud-3d-droplet-skin" />
        </motion.span>
      ) : null}

      <span className="oud-3d-nav-icon relative z-10 grid size-7 place-items-center">
        <Icon
          className={cn("size-[22px] transition-transform duration-200", active && "scale-105")}
          strokeWidth={active ? 2.1 : 1.75}
          aria-hidden
        />
      </span>
      <span
        className={cn(
          "relative z-10 truncate text-[11px] leading-none",
          active ? "font-bold" : "font-medium",
        )}
      >
        {label}
      </span>
      {/* A second, non-colour signal: the label alone is not enough when
          the droplet is a pale material. */}
      <span
        aria-hidden
        className={cn(
          "relative z-10 size-1 shrink-0 rounded-full transition-opacity duration-200",
          active ? "bg-primary opacity-100" : "bg-transparent opacity-0",
        )}
      />
      <span className="sr-only">{`${label} — ${zoneKey}`}</span>
    </button>
  );
}
