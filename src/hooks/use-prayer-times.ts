import { useCallback, useEffect, useState } from "react";
import { FALLBACK_TIMINGS, type Timings } from "@/lib/prayers";
import { dateKey } from "@/lib/time";

export type Coords = { latitude: number; longitude: number };

type Options = {
  city: string;
  coords?: Coords | null;
  method?: number;
};

export type PrayerTimesResult = {
  timings: Timings;
  hijri: string | null;
  timezone: string | null;
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  /** المواقيت معروضة من نسخة محفوظة (بدون شبكة) وقد تختلف بدقائق. */
  offlineSaved: boolean;
  savedAt: number | null;
  refresh: () => void;
};

export type SavedTimings = {
  timings: Timings;
  hijri: string | null;
  timezone: string | null;
  at: number;
};

type AladhanResponse = {
  code: number;
  data?: {
    timings?: Record<string, string>;
    date?: {
      hijri?: { day?: string; month?: { ar?: string }; year?: string };
      gregorian?: { date?: string };
    };
    meta?: { timezone?: string; method?: { id?: number; name?: string } };
  };
};

const CACHE_PREFIX = "sakinah:timings";
const LAST_PREFIX = "sakinah:timings:last";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

function ddmmyyyy(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}-${month}-${date.getFullYear()}`;
}

function parseTimings(raw: Record<string, string>): Timings {
  const pick = (key: string, fallback: string) => (raw[key] ?? fallback).slice(0, 5);
  return {
    fajr: pick("Fajr", FALLBACK_TIMINGS.fajr),
    sunrise: pick("Sunrise", FALLBACK_TIMINGS.sunrise),
    dhuhr: pick("Dhuhr", FALLBACK_TIMINGS.dhuhr),
    asr: pick("Asr", FALLBACK_TIMINGS.asr),
    maghrib: pick("Maghrib", FALLBACK_TIMINGS.maghrib),
    isha: pick("Isha", FALLBACK_TIMINGS.isha),
  };
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* الحافظة ممتلئة أو غير متاحة */
  }
}

/** مواقيت محفوظة من آخر جلسة (تعمل دون إنترنت). */
export function readSavedTimings(cacheKey: string): SavedTimings | null {
  return readJson<SavedTimings>(`${LAST_PREFIX}:${cacheKey}`);
}

function buildCacheKey(city: string, coords: Coords | null | undefined, method: number) {
  if (coords) {
    return `geo:${coords.latitude.toFixed(3)}:${coords.longitude.toFixed(3)}:${method}`;
  }
  return `city:${city.trim().toLowerCase() || "مكة المكرمة"}:${method}`;
}

function buildUrl(cacheKey: string, city: string, coords: Coords | null | undefined, method: number) {
  const date = ddmmyyyy(new Date());
  if (coords) {
    return `https://api.aladhan.com/v1/timings/${date}?latitude=${coords.latitude.toFixed(
      4,
    )}&longitude=${coords.longitude.toFixed(4)}&method=${method}`;
  }
  const address = city.trim() || "مكة المكرمة";
  void cacheKey;
  return `https://api.aladhan.com/v1/timingsByAddress/${date}?address=${encodeURIComponent(
    address,
  )}&method=${method}`;
}

/**
 * مواقيت الصلاة بدقة: من إحداثياتك إن سمحت بالموقع، وإلا من مدينتك.
 * تُحفظ النتيجة على الجهاز (٦ ساعات لليوم الحالي، ونسخة دائمة للعمل دون إنترنت).
 */
export function usePrayerTimes({ city, coords, method = 3 }: Options): PrayerTimesResult {
  const today = dateKey();
  const latitude = coords?.latitude ?? null;
  const longitude = coords?.longitude ?? null;
  const cacheKey = buildCacheKey(city, coords, method);
  const todayKey = `${CACHE_PREFIX}:${cacheKey}:${today}`;

  const [timings, setTimings] = useState<Timings>(() => {
    const cached = readJson<SavedTimings>(todayKey);
    if (cached) return cached.timings;
    return readSavedTimings(cacheKey)?.timings ?? FALLBACK_TIMINGS;
  });
  const [hijri, setHijri] = useState<string | null>(
    () => readJson<SavedTimings>(todayKey)?.hijri ?? readSavedTimings(cacheKey)?.hijri ?? null,
  );
  const [timezone, setTimezone] = useState<string | null>(
    () => readJson<SavedTimings>(todayKey)?.timezone ?? null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [offlineSaved, setOfflineSaved] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(
    () => readJson<SavedTimings>(todayKey)?.at ?? readSavedTimings(cacheKey)?.at ?? null,
  );
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;
    const cached = readJson<SavedTimings>(todayKey);
    const saved = readSavedTimings(cacheKey);

    if (cached && Date.now() - cached.at < CACHE_TTL_MS && nonce === 0) {
      setTimings(cached.timings);
      setHijri(cached.hijri);
      setTimezone(cached.timezone);
      setUsingFallback(false);
      setOfflineSaved(false);
      setSavedAt(cached.at);
      setError(null);
      setLoading(false);
      return;
    }

    if (saved) {
      setTimings(saved.timings);
      setHijri(saved.hijri);
      setTimezone(saved.timezone);
      setSavedAt(saved.at);
      setOfflineSaved(true);
    }

    async function load() {
      setLoading(true);
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 12_000);
      try {
        const response = await fetch(buildUrl(cacheKey, city, coords, method), {
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`حالة ${response.status}`);
        const payload = (await response.json()) as AladhanResponse;
        if (!payload.data?.timings) throw new Error("لا توجد مواقيت");

        const parsed = parseTimings(payload.data.timings);
        const hijriLabel = payload.data.date?.hijri
          ? `${payload.data.date.hijri.day} ${payload.data.date.hijri.month?.ar} ${payload.data.date.hijri.year} هـ`
          : null;
        const zone = payload.data.meta?.timezone ?? null;

        if (cancelled) return;
        setTimings(parsed);
        setHijri(hijriLabel);
        setTimezone(zone);
        setUsingFallback(false);
        setOfflineSaved(false);
        setError(null);
        const record: SavedTimings = {
          timings: parsed,
          hijri: hijriLabel,
          timezone: zone,
          at: Date.now(),
        };
        setSavedAt(record.at);
        writeJson(todayKey, record);
        writeJson(`${LAST_PREFIX}:${cacheKey}`, record);
      } catch (err) {
        if (cancelled) return;
        if (saved) {
          // لدينا نسخة محفوظة: نعرضها ونوضّح أنها ليست لحظية.
          setUsingFallback(false);
          setOfflineSaved(true);
          setError(null);
        } else {
          setTimings(FALLBACK_TIMINGS);
          setUsingFallback(true);
          setOfflineSaved(false);
          setError(
            err instanceof DOMException && err.name === "AbortError"
              ? "تأخّر الاتصال بخدمة المواقيت، نعرض مواقيت تقريبية."
              : "تعذّر جلب المواقيت الآن، نعرض مواقيت تقريبية.",
          );
        }
      } finally {
        window.clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [cacheKey, city, latitude, longitude, method, nonce, todayKey]);

  return {
    timings,
    hijri,
    timezone,
    loading,
    error,
    usingFallback,
    offlineSaved,
    savedAt,
    refresh,
  };
}
