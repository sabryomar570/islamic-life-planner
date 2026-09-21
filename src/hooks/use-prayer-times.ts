import { useCallback, useEffect, useState } from "react";
import { FALLBACK_TIMINGS, type Timings } from "@/lib/prayers";
import { dateKey } from "@/lib/time";

type PrayerTimesResult = {
  timings: Timings;
  loading: boolean;
  error: string | null;
  usingFallback: boolean;
  hijri: string | null;
  city: string;
  refresh: () => void;
};

type AladhanResponse = {
  code: number;
  data?: {
    timings?: Record<string, string>;
    date?: {
      hijri?: { day?: string; month?: { ar?: string }; year?: string };
    };
    meta?: { timezone?: string };
  };
};

const CACHE_PREFIX = "sakinah:timings";
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

function readCache(key: string): { timings: Timings; hijri: string | null; at: number } | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { timings: Timings; hijri: string | null; at: number };
    if (!parsed?.timings || Date.now() - parsed.at > CACHE_TTL_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * مواقيت الصلاة لمدينة المستخدم من خدمة Aladhan، مع تخزين مؤقت ٦ ساعات
 * ومواقيت تقريبية إن تعذّر الاتصال حتى لا تتوقف خطّتك.
 */
export function usePrayerTimes(city: string): PrayerTimesResult {
  const today = dateKey();
  const cacheKey = `${CACHE_PREFIX}:${city}:${today}`;
  const [timings, setTimings] = useState<Timings>(FALLBACK_TIMINGS);
  const [hijri, setHijri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((value) => value + 1), []);

  useEffect(() => {
    let cancelled = false;

    const cached = readCache(cacheKey);
    if (cached) {
      setTimings(cached.timings);
      setHijri(cached.hijri);
      setUsingFallback(false);
      setError(null);
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      try {
        const address = city.trim() || "مكة المكرمة";
        const url = `https://api.aladhan.com/v1/timingsByAddress/${ddmmyyyy(
          new Date(),
        )}?address=${encodeURIComponent(address)}&method=3`;
        const response = await fetch(url);
        if (!response.ok) throw new Error("bad response");
        const payload = (await response.json()) as AladhanResponse;
        if (!payload.data?.timings) throw new Error("no timings");

        const parsed = parseTimings(payload.data.timings);
        const hijriLabel = payload.data.date?.hijri
          ? `${payload.data.date.hijri.day} ${payload.data.date.hijri.month?.ar} ${
              payload.data.date.hijri.year
            } هـ`
          : null;

        if (cancelled) return;
        setTimings(parsed);
        setHijri(hijriLabel);
        setUsingFallback(false);
        setError(null);
        try {
          window.localStorage.setItem(
            cacheKey,
            JSON.stringify({ timings: parsed, hijri: hijriLabel, at: Date.now() }),
          );
        } catch {
          /* تجاهل امتلاء الحافظة */
        }
      } catch {
        if (cancelled) return;
        setTimings(FALLBACK_TIMINGS);
        setUsingFallback(true);
        setError("تعذّر جلب مواقيت مدينتك الآن، نعرض مواقيت تقريبية.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [cacheKey, city, nonce]);

  return { timings, loading, error, usingFallback, hijri, city, refresh };
}
