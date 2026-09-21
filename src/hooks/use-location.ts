/** إذن الموقع: يُستخدم لحساب مواقيت دقيقة لإحداثياتك بدل اسم المدينة. */
import { useCallback, useEffect, useState } from "react";
import type { Coords } from "@/hooks/use-prayer-times";

const COORDS_KEY = "sakinah:coords:v1";
const LABEL_KEY = "sakinah:coords:label:v1";

export type GeoStatus = "unsupported" | "prompt" | "granted" | "denied" | "loading";

type StoredCoords = Coords & { label?: string | null; at?: number };

function readStored(): StoredCoords | null {
  try {
    const raw = window.localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCoords;
    if (
      typeof parsed.latitude !== "number" ||
      typeof parsed.longitude !== "number" ||
      Number.isNaN(parsed.latitude) ||
      Number.isNaN(parsed.longitude)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeStored(coords: StoredCoords | null) {
  try {
    if (!coords) window.localStorage.removeItem(COORDS_KEY);
    else window.localStorage.setItem(COORDS_KEY, JSON.stringify(coords));
  } catch {
    /* لا شيء */
  }
}

/** يحوّل الإحداثيات إلى اسم مدينة للعرض فقط، وإن فشل نكتفي بالمنطقة الزمنية. */
async function reverseGeocode(coords: Coords): Promise<string | null> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=ar&zoom=10`,
      { signal: controller.signal, headers: { Accept: "application/json" } },
    );
    if (!response.ok) throw new Error("bad response");
    const payload = (await response.json()) as {
      address?: Record<string, string>;
    };
    const address = payload.address ?? {};
    const city =
      address.city ??
      address.town ??
      address.village ??
      address.municipality ??
      address.state ??
      address.county;
    return city ?? null;
  } catch {
    return null;
  } finally {
    window.clearTimeout(timer);
  }
}

export function useGeolocation() {
  const [status, setStatus] = useState<GeoStatus>(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return "unsupported";
    return "prompt";
  });
  const [coords, setCoords] = useState<Coords | null>(() => {
    const stored = readStored();
    return stored ? { latitude: stored.latitude, longitude: stored.longitude } : null;
  });
  const [label, setLabel] = useState<string | null>(() => readStored()?.label ?? null);
  const [error, setError] = useState<string | null>(null);

  // نعرف الحالة الفعلية للإذن من المتصفح دون إزعاج المستخدم.
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) return;
    let cancelled = false;
    navigator.permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (cancelled) return;
        if (result.state === "granted") setStatus("granted");
        if (result.state === "denied") setStatus("denied");
        result.onchange = () => {
          setStatus(result.state === "granted" ? "granted" : result.state === "denied" ? "denied" : "prompt");
        };
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const request = useCallback(async (): Promise<Coords | null> => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      setError("متصفحك لا يدعم تحديد الموقع، اكتب اسم مدينتك بدلًا من ذلك.");
      return null;
    }
    setStatus("loading");
    setError(null);
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const next: Coords = {
            latitude: Number(position.coords.latitude.toFixed(4)),
            longitude: Number(position.coords.longitude.toFixed(4)),
          };
          const cityLabel = await reverseGeocode(next);
          setCoords(next);
          setLabel(cityLabel);
          setStatus("granted");
          writeStored({ ...next, label: cityLabel, at: Date.now() });
          resolve(next);
        },
        (err) => {
          setStatus(err.code === err.PERMISSION_DENIED ? "denied" : "prompt");
          setError(
            err.code === err.PERMISSION_DENIED
              ? "رفضت إذن الموقع. يمكنك تفعيله من إعدادات المتصفح أو الاعتماد على اسم مدينتك."
              : err.code === err.TIMEOUT
                ? "تأخّر تحديد موقعك، حاول مرة أخرى أو استخدم اسم المدينة."
                : "تعذّر تحديد موقعك الآن.",
          );
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 12_000, maximumAge: 10 * 60 * 1000 },
      );
    });
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setLabel(null);
    writeStored(null);
    try {
      window.localStorage.removeItem(LABEL_KEY);
    } catch {
      /* لا شيء */
    }
  }, []);

  const timezone =
    typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;

  return { status, coords, label, error, request, clear, timezone };
}
