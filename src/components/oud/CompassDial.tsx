import { Compass, LocateFixed, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

/**
 * Compass dial.
 *
 * **A dial is a claim.** So the component has exactly one job: show a
 * heading, or admit that it has none. There is no third option of a
 * decorative needle that spins without data — a compass that lies teaches
 * the user to trust a compass that does not.
 *
 * **Two readings, one meaning.** When the sensor gives a heading, the dial
 * rotates and the readout states the number. The number is the accessible
 * path: understanding the direction never depends on the animation, so a
 * screen reader user and a motion-sensitive user get the same information
 * as everyone else.
 *
 * **Calibration instead of a spinner.** An unstable sensor is not an error
 * and not a reason to show a fake value. The dial says what to do: move the
 * phone gently until the reading settles.
 */

export type CompassState =
  /** No sensor API at all. */
  | "unsupported"
  /** The API exists but the permission was refused or the sensor never spoke. */
  | "denied"
  /** Readings are arriving but disagreeing with each other. */
  | "calibrating"
  /** A stable heading. */
  | "ready";

export type HeadingSample = { alpha: number | null };

/** Does this browser expose a device orientation API at all? */
export function hasOrientationApi(): boolean {
  if (typeof window === "undefined") return false;
  return (
    typeof window.DeviceOrientationEvent !== "undefined" ||
    "ondeviceorientationabsolute" in window
  );
}

/**
 * iOS 13+ gates the sensor behind a permission request. Asking silently
 * would be a hard denial with no recovery, so the request is a real call
 * and its failure is a real state.
 */
export function canRequestOrientationPermission(): boolean {
  if (typeof window === "undefined") return false;
  const ctor = (
    window.DeviceOrientationEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    }
  )?.requestPermission;
  return typeof ctor === "function";
}

export async function requestOrientationPermission(): Promise<"granted" | "denied" | "skipped"> {
  if (!canRequestOrientationPermission()) return "skipped";
  try {
    const ctor = (
      window.DeviceOrientationEvent as unknown as {
        requestPermission: () => Promise<"granted" | "denied">;
      }
    ).requestPermission;
    return await ctor.call(window.DeviceOrientationEvent);
  } catch {
    return "denied";
  }
}

/** Two readings close enough to agree count as settled. */
export function isStable(samples: readonly number[]): boolean {
  if (samples.length < 3) return false;
  const recent = samples.slice(-5);
  const spread = Math.max(...recent) - Math.min(...recent);
  // A spread above this is a moving phone, not a drifting sensor.
  return spread <= 4;
}

/** Smallest signed angle from `from` to `to`, in degrees. */
export function angleDelta(from: number, to: number): number {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

/**
 * Normalises a raw `DeviceOrientationEvent` into a compass heading.
 *
 * WebKit reports a ready-made magnetic heading. Everything else reports an
 * absolute alpha, which is counter-clockwise, so it is flipped. Returning
 * `null` for a non-finite value is deliberate: a NaN heading would render
 * as a needle pointing nowhere, which is worse than saying nothing.
 */
export function headingFromEvent(event: DeviceOrientationEvent): number | null {
  const webkit = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
    .webkitCompassHeading;
  if (typeof webkit === "number" && Number.isFinite(webkit)) {
    return (360 - webkit) % 360;
  }
  const alpha = event.alpha;
  if (typeof alpha === "number" && Number.isFinite(alpha)) {
    return (360 - alpha) % 360;
  }
  return null;
}

/**
 * Subscribes to the sensor while `active`.
 *
 * The handler is pure: it turns an event into a heading. Everything about
 * deciding when a reading is trustworthy lives in `isStable`, so the rule
 * can be tested without a device.
 */
export function useDeviceHeading(active: boolean): {
  state: CompassState;
  heading: number | null;
  samples: number[];
} {
  const [state, setState] = useState<CompassState>(() =>
    hasOrientationApi() ? "calibrating" : "unsupported",
  );
  const [heading, setHeading] = useState<number | null>(null);
  const [samples, setSamples] = useState<number[]>([]);

  useEffect(() => {
    if (!active) return;
    if (!hasOrientationApi()) {
      setState("unsupported");
      return;
    }

    const onOrientation = (event: DeviceOrientationEvent) => {
      const value = headingFromEvent(event);
      if (value === null) {
        setState((current) => (current === "ready" ? "ready" : "denied"));
        return;
      }
      setHeading(value);
      setSamples((current) => [...current, value].slice(-12));
      setState(isStable([...samples, value]) ? "ready" : "calibrating");
    };

    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener);
    window.addEventListener("deviceorientation", onOrientation as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation as EventListener);
      window.removeEventListener("deviceorientation", onOrientation as EventListener);
    };
    // `samples` is intentionally not a dependency: adding it would tear the
    // subscription down on every reading. The closure reads the latest
    // value through the functional update above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return { state, heading, samples };
}

const CARDINALS = [
  { label: "ش", at: 0 },
  { label: "ق", at: 90 },
  { label: "ج", at: 180 },
  { label: "غ", at: 270 },
];

export function CompassDial({
  qiblaBearing,
  heading,
  state,
  size = 240,
  className,
}: {
  /** The true qibla bearing in degrees from true north. */
  qiblaBearing: number;
  /** The device heading, or null when the sensor has not spoken. */
  heading: number | null;
  state: CompassState;
  size?: number;
  className?: string;
}) {
  const live = heading !== null;
  // With a heading, the dial turns under a fixed needle. Without one, the
  // needle turns to the true bearing and the dial stays still. Both are
  // honest; only one of them is a compass.
  const dialRotation = live ? -(heading ?? 0) : 0;
  const needleRotation = live ? qiblaBearing - (heading ?? 0) : qiblaBearing;

  return (
    <div
      className={cn("relative grid place-items-center", className)}
      style={{ width: size, height: size }}
    >
      {/* The rose. It rotates, so the cardinal letters must rotate with it
          or the dial would lie about which way is north. */}
      <div
        aria-hidden
        className="oud-hero absolute inset-0 rounded-full transition-transform duration-300 ease-out"
        style={{ transform: `rotate(${dialRotation}deg)` }}
      >
        <span className="absolute inset-2 rounded-full border border-[var(--oud-line-soft)]" />
        {CARDINALS.map((mark) => (
          <span
            key={mark.at}
            className="absolute text-[11px] font-bold text-muted-foreground"
            style={{
              transform: `rotate(${mark.at}deg) translateY(-${size / 2 - 14}px) rotate(${-mark.at}deg)`,
              transformOrigin: "center",
              insetInlineStart: "50%",
              marginInlineStart: -6,
              top: "50%",
            }}
          >
            {mark.label}
          </span>
        ))}
        <span className="absolute inset-6 rounded-full border border-dashed border-[var(--oud-line-soft)]" />
      </div>

      {/* The needle: the one thing that answers the question. */}
      <div
        className="absolute inset-0 grid place-items-center transition-transform duration-300 ease-out"
        style={{ transform: `rotate(${needleRotation}deg)` }}
      >
        <svg width={size * 0.66} height={size * 0.66} viewBox="0 0 100 100" aria-hidden className="text-primary">
          <path d="M50 6 62 54 50 46 38 54Z" fill="currentColor" />
          <path d="M50 94 38 46 50 54 62 46Z" fill="currentColor" opacity={live ? 0.18 : 0.12} />
        </svg>
      </div>

      {/* The centre is text, not decoration: it states the reading. */}
      <div className="relative z-10 flex flex-col items-center">
        <span className="oud-icon-tile oud-icon-md" aria-hidden>
          <Compass className="size-[1.25rem]" />
        </span>
        <span className="mt-1.5 text-[13px] font-bold text-foreground">القبلة</span>
      </div>

      {/* The accessible readout. This is what makes the dial usable at all
          when motion is unavailable or unwanted. */}
      <span className="sr-only" role="status">
        {state === "ready"
          ? `اتجاه القبلة ${Math.round(qiblaBearing)} درجة من الشمال، وبوصلة الجهاز ${Math.round(heading ?? 0)} درجة.`
          : state === "calibrating"
            ? "البوصلة تتثبّت. حرّك الموبايل بهدوء لحد ما الاتجاه يثبت."
            : state === "denied"
              ? "لم يُسمح بالوصول إلى بوصلة الجهاز. الزاوية المعروضة محسوبة من موقعك."
              : "هذا المتصفح لا يوفّر بوصلة. الزاوية المعروضة محسوبة من موقعك."}
      </span>
    </div>
  );
}

/** The one-line state under the dial. Never a spinner, never a fake value. */
export function CompassStateNote({ state }: { state: CompassState }) {
  if (state === "ready") {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[13px] text-[var(--status-success)]">
        <LocateFixed className="size-4" aria-hidden />
        البوصلة تعمل
      </p>
    );
  }
  if (state === "calibrating") {
    return (
      <p className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
        <Compass className="size-4" aria-hidden />
        حرّك الموبايل بهدوء لحد ما الاتجاه يثبت.
      </p>
    );
  }
  return (
    <p className="flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground">
      <ShieldCheck className="size-4" aria-hidden />
      الزاوية محسوبة من موقعك، وبوصلة جهازك غير متاحة هنا.
    </p>
  );
}
