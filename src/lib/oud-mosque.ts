/**
 * PHASE NEXT — المسجد القريب.
 *
 * **قاعدة أمانة، وهي أهم ما في هذا الملف:**
 * الموقع **لا يثبت** أن المستخدم صلّى، ولا يثبت أنه دخل المسجد. كل ما
 * نقوله «أنت قريب من مسجد بمسافة كذا الآن»، ولا شيء غير ذلك. من يظن أن
 * عود يتابع صلاته، فيفهم عود غلط.
 *
 * **قاعدة الخصوصية، وهي الثانية:**
 * لا نرسم خطا للحركة، ولا نحفظ تاريخ مواقع، ولا نطلب تتبعا في الخلفية.
 * لقطة واحدة للإحداثيات موجودة أصلًا لحساب المواقيت، ونضيف هنا **قائمة
 * مساجد عامة** من مصدر مفتوح، تُمسح مع بيانات الجهاز كأي مفتاح.
 *
 * **مصدر البيانات:** Overpass (واجهة OpenStreetMap). مفتوح، بلا مفتاح، بلا
 * حساب. وهو بنفسه يعلن أنه قد يكون بطيئا أو محجوبا في بعض الشبكات، فلا
 * نُظهر «أقرب مسجد» إذا لم يجب فعلا. الفشل يظهر صدقا: «ما عرفتش».
 */

import { arabicNumber } from "./time";

export type MosquePlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceMeters: number;
};

const OVERPASS_ENDPOINT = "https://overpass-api.de/api/interpreter";
const RADIUS_METERS = 1_500;
const REQUEST_TIMEOUT_MS = 8_000;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const MOSQUE_CACHE_KEY = "oud:mosque:near:v1";

/** نصف قطر البحث بالمتر. ثابت، لا يضخّم الطلب ولا يفوّت المسجد المجاور. */
export const MOSQUE_SEARCH_RADIUS = RADIUS_METERS;

/* ————————————————————— رياضيات المسافة ————————————————————— */

const EARTH_RADIUS_METERS = 6_371_000;

const toRadians = (degrees: number) => (degrees * Math.PI) / 180;

/** مسافة الدائرة العظمى بين نقطتين بالمتر. */
export function distanceMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return Math.round(2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(h))));
}

/** «١٨٠ متر» أو «٢٫٤ كيلومتر». الأرقام عربية لاتجاه عربي. */
export function formatDistance(meters: number): string {
  const value = Math.max(0, Math.round(meters));
  if (value < 1000) return `${arabicNumber(value)} متر`;
  const km = Math.round((value / 1000) * 10) / 10;
  return `${arabicNumber(km)} كيلومتر`;
}

/* ————————————————————— الاستعلام ————————————————————— */

function overpassQuery(latitude: number, longitude: number): string {
  const around = `${RADIUS_METERS},${latitude.toFixed(5)},${longitude.toFixed(5)}`;
  return `[out:json][timeout:8];
(
  node["amenity"="place_of_worship"]["religion"="muslim"](around:${around});
  way["amenity"="place_of_worship"]["religion"="muslim"](around:${around});
  relation["amenity"="place_of_worship"]["religion"="muslim"](around:${around});
  node["building"="mosque"](around:${around});
  way["building"="mosque"](around:${around});
);
out center 40;`;
}

type OverpassElement = {
  type?: string;
  id?: number;
  lat?: number;
  lon?: number;
  center?: { lat?: number; lon?: number };
  tags?: Record<string, string>;
};

/** اسم عربي إن وُجد، وإلا الاسم المطبوع، وإلا وصف صادق لا اسمًا مخترعًا. */
function nameOf(tags: Record<string, string> | undefined): string {
  if (!tags) return "مسجد";
  return tags["name:ar"] || tags.name || "مسجد";
}

/** يحوّل ردّ Overpass إلى قائمة مساجد مرتّبة بالأقرب. نقيّ: يتجاهل ما لا إحداثيات له. */
export function parseMosques(
  payload: unknown,
  origin: { latitude: number; longitude: number },
  limit = 3,
): MosquePlace[] {
  const elements = (payload as { elements?: OverpassElement[] } | null)?.elements;
  if (!Array.isArray(elements)) return [];

  const seen = new Set<string>();
  const places: MosquePlace[] = [];
  for (const element of elements) {
    const lat = element.lat ?? element.center?.lat;
    const lon = element.lon ?? element.center?.lon;
    if (typeof lat !== "number" || typeof lon !== "number") continue;
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const key = `${lat.toFixed(4)}:${lon.toFixed(4)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      id: `${element.type ?? "node"}-${element.id ?? key}`,
      name: nameOf(element.tags),
      latitude: lat,
      longitude: lon,
      distanceMeters: distanceMeters(origin, { latitude: lat, longitude: lon }),
    });
  }
  return places.sort((a, b) => a.distanceMeters - b.distanceMeters).slice(0, limit);
}

/* ————————————————————— الحافة والخزين ————————————————————— */

export type MosqueLookup = {
  places: MosquePlace[];
  /** مصدر البيانات وقت الجلب، حتى يقدر المستخدم أن يعرف أنه تقديري. */
  fetchedAt: number;
};

export function isFreshCache(entry: unknown, now: number): entry is MosqueLookup {
  if (!entry || typeof entry !== "object") return false;
  const value = entry as Partial<MosqueLookup>;
  if (!Array.isArray(value.places) || typeof value.fetchedAt !== "number") return false;
  return now - value.fetchedAt < CACHE_TTL_MS;
}

type Store = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export function readMosqueCache(
  store: Store | null = typeof window === "undefined" ? null : window.localStorage,
): MosqueLookup | null {
  if (!store) return null;
  try {
    const raw = store.getItem(MOSQUE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isFreshCache(parsed, Date.now()) ? parsed : null;
  } catch {
    return null;
  }
}

export function writeMosqueCache(
  lookup: MosqueLookup,
  store: Store | null = typeof window === "undefined" ? null : window.localStorage,
): void {
  if (!store) return;
  try {
    store.setItem(MOSQUE_CACHE_KEY, JSON.stringify(lookup));
  } catch {
    /* لا شيء */
  }
}

/**
 * يجلب المساجد القريبة. يعيد `[]` عند الفشل **بلا استثناء**:
 * الشبكة قد تحجب الخدمة، والواجهة ستعرض «ما عرفتش» لا شاشة حمراء.
 */
export async function fetchNearbyMosques(
  origin: { latitude: number; longitude: number },
  signal?: AbortSignal,
): Promise<MosquePlace[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort();
  signal?.addEventListener("abort", onAbort, { once: true });

  try {
    const response = await fetch(OVERPASS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ data: overpassQuery(origin.latitude, origin.longitude) }),
      signal: controller.signal,
    });
    if (!response.ok) return [];
    return parseMosques(await response.json(), origin);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  }
}

/* ————————————————————— روابط الاتجاهات ————————————————————— */

const SAFE_PROTOCOLS = new Set(["https:", "http:"]);

export function isSafeMapsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return SAFE_PROTOCOLS.has(url.protocol);
  } catch {
    return false;
  }
}

/** رابط يفتح تطبيق الخرائط على الهاتف، أو خرائط المتصفح على الحاسب. */
export function mapsDirectionsHref(place: MosquePlace): string {
  const destination = `${place.latitude.toFixed(5)},${place.longitude.toFixed(5)}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

/* ————————————————————— البقاء القريب ————————————————————— */

/**
 * مدّة البقاء القريب — **وأنت داخل التطبيق فقط**.
 *
 * لا `watchPosition` في الخلفية، ولا إذن تتبّع دائم، ولا سجل. ما نجمعه هو
 * ثوانٍ قضاءها المستخدم قرب مسجد في جلسة مفتوحة. من لم يفتح التطبيق فلا
 * يُحسب له شيء، وهذا مقصود: قيمة الخصوصية أعلى من قيمة الرقم.
 */
export type DwellState = {
  /** ثوانٍ مراكمة داخل النطاق. */
  seconds: number;
  /** آخر قراءة، لئلا نحسب الزمن مرتين. */
  lastAt: number | null;
};

export const DWELL_RADIUS_METERS = 250;

export const EMPTY_DWELL: DwellState = { seconds: 0, lastAt: null };

/** يضيف الزمن المنقضي بين قراءتين إن كانتا داخل النطاق. */
export function bumpDwell(
  state: DwellState,
  distance: number | null,
  now: number,
  radius = DWELL_RADIUS_METERS,
): DwellState {
  if (state.lastAt === null || distance === null || distance > radius) {
    return { seconds: state.seconds, lastAt: now };
  }
  // فارق معقول فقط: لا نجمع ساعات لأن التابب كان مغلقا.
  const delta = Math.floor((now - state.lastAt) / 1000);
  if (delta <= 0 || delta > 120) return { seconds: state.seconds, lastAt: now };
  return { seconds: state.seconds + delta, lastAt: now };
}

export function dwellLabel(seconds: number): string {
  if (seconds < 60) return "لسه واقف قريب";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `قريب من المسجد ${minutes} دقيقة`;
  return `قريب من المسجد ${Math.floor(minutes / 60)} ساعة`;
}
