/**
 * نسخة محلية من بياناتك الأساسية (إجاباتك وحالة يومك) حتى يفتح التطبيق ويعمل
 * بشكل مفيد دون إنترنت. تُكتب هذه النسخة عند كل قراءة ناجحة من الخادم.
 */
export type OfflineDayState = {
  prayers: Record<string, string>;
  adhkar: string[];
  favorites: string[];
};

export const EMPTY_DAY_STATE: OfflineDayState = { prayers: {}, adhkar: [], favorites: [] };

const PROFILE_KEY = "sakinah:offline:profile:v1";
const DAY_KEY = "sakinah:offline:day:v1";

function write(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify({ value, at: Date.now() }));
  } catch {
    /* الحافظة ممتلئة أو غير متاحة */
  }
}

function read<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { value?: T };
    return parsed?.value ?? null;
  } catch {
    return null;
  }
}

export function saveOfflineProfile(profile: unknown) {
  write(PROFILE_KEY, profile);
}

export function readOfflineProfile<T>(): T | null {
  return read<T>(PROFILE_KEY);
}

export function clearOfflineProfile() {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
    window.localStorage.removeItem(DAY_KEY);
  } catch {
    /* لا شيء */
  }
}

export function saveOfflineDayState(date: string, state: OfflineDayState) {
  write(DAY_KEY, { date, ...state });
}

export function readOfflineDayState(date: string): OfflineDayState | null {
  const stored = read<OfflineDayState & { date?: string }>(DAY_KEY);
  if (!stored || stored.date !== date) return null;
  return {
    prayers: stored.prayers ?? {},
    adhkar: stored.adhkar ?? [],
    favorites: stored.favorites ?? [],
  };
}
