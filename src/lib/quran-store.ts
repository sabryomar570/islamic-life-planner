/**
 * مخزن المصحف: يقرأ من الذاكرة ثم من قاعدة بيانات المتصفح (IndexedDB)
 * ثم من السور المحفوظة داخل التطبيق، وأخيرًا من الشبكة.
 * بهذا الترتيب يعمل المصحف كاملًا دون إنترنت بعد تنزيل واحد.
 */
import { BUNDLED_SURAH_NUMBERS, OFFLINE_SURAH_MAP } from "@/data/quran-offline";

export type Ayah = {
  number: number;
  text: string;
};

export type SurahSource = "bundled" | "cache" | "network";

export type LoadedSurah = {
  ayahs: Ayah[];
  source: SurahSource;
};

const DB_NAME = "sakinah-quran";
const DB_VERSION = 1;
const STORE = "surahs";
const LEGACY_PREFIX = "sakinah:quran:";

const memory = new Map<number, Ayah[]>();
const inflight = new Map<number, Promise<LoadedSurah>>();

let dbPromise: Promise<IDBDatabase | null> | null = null;

function openDb(): Promise<IDBDatabase | null> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    if (typeof indexedDB === "undefined") {
      resolve(null);
      return;
    }
    try {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "number" });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
      request.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

async function readFromDb(number: number): Promise<Ayah[] | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const request = tx.objectStore(STORE).get(number);
      request.onsuccess = () => {
        const row = request.result as { number: number; ayahs: Ayah[] } | undefined;
        resolve(row?.ayahs?.length ? row.ayahs : null);
      };
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function writeToDb(number: number, ayahs: Ayah[]): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put({ number, ayahs, savedAt: Date.now() });
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

async function clearDb(): Promise<void> {
  const db = await openDb();
  memory.clear();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
}

/** يحذف النسخة القديمة من الحافظة (كانت تُستخدم قبل قاعدة البيانات). */
function cleanupLegacyStorage() {
  try {
    const keys: string[] = [];
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index);
      if (key?.startsWith(LEGACY_PREFIX)) keys.push(key);
    }
    for (const key of keys) window.localStorage.removeItem(key);
  } catch {
    /* لا شيء */
  }
}

type ApiPayload = {
  data?: { ayahs?: { numberInSurah?: number; text?: string }[] };
  chapter?: { verse?: number; text?: string }[];
};

const ENDPOINTS: ((surah: number) => string)[] = [
  (surah) => `https://api.alquran.cloud/v1/surah/${surah}/quran-uthmani`,
  (surah) =>
    `https://cdn.jsdelivr.net/gh/fawazahmed0/quran-api@1/editions/ara-quranuthmani/${surah}.json`,
];

function parsePayload(payload: ApiPayload): Ayah[] {
  const primary = payload.data?.ayahs;
  if (Array.isArray(primary) && primary.length > 0) {
    return primary.map((ayah, index) => ({
      number: ayah.numberInSurah ?? index + 1,
      text: (ayah.text ?? "").trim(),
    }));
  }
  const secondary = payload.chapter;
  if (Array.isArray(secondary) && secondary.length > 0) {
    return secondary.map((ayah, index) => ({
      number: ayah.verse ?? index + 1,
      text: (ayah.text ?? "").trim(),
    }));
  }
  return [];
}

async function fetchFromNetwork(number: number): Promise<Ayah[]> {
  let lastError: unknown = null;
  for (const build of ENDPOINTS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 12_000);
    try {
      const response = await fetch(build(number), { signal: controller.signal });
      if (!response.ok) throw new Error(`حالة غير متوقعة: ${response.status}`);
      const payload = (await response.json()) as ApiPayload;
      const ayahs = parsePayload(payload);
      if (ayahs.length > 0) return ayahs;
      throw new Error("استجابة فارغة");
    } catch (error) {
      lastError = error;
    } finally {
      window.clearTimeout(timer);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("تعذّر تحميل السورة، تأكد من الاتصال وحاول مرة أخرى");
}

function bundledSurah(number: number): Ayah[] | null {
  const texts = OFFLINE_SURAH_MAP[number];
  if (!texts) return null;
  return texts.map((text, index) => ({ number: index + 1, text }));
}

export function isBundled(number: number) {
  return BUNDLED_SURAH_NUMBERS.includes(number);
}

export async function getSurahAyahs(number: number): Promise<LoadedSurah | null> {
  const memoryHit = memory.get(number);
  if (memoryHit) return { ayahs: memoryHit, source: "cache" };

  const fromDb = await readFromDb(number);
  if (fromDb) {
    memory.set(number, fromDb);
    return { ayahs: fromDb, source: "cache" };
  }

  const bundled = bundledSurah(number);
  if (bundled) {
    memory.set(number, bundled);
    return { ayahs: bundled, source: "bundled" };
  }

  return null;
}

/** التحميل الكامل: ذاكرة ← قاعدة بيانات ← محفوظ ← شبكة (مع تخزين الناتج). */
export async function loadSurah(number: number, options?: { forceNetwork?: boolean }) {
  if (options?.forceNetwork) {
    inflight.delete(number);
  }
  const pending = inflight.get(number);
  if (pending) return pending;

  const task = (async (): Promise<LoadedSurah> => {
    if (!options?.forceNetwork) {
      const stored = await getSurahAyahs(number);
      if (stored) return stored;
    }

    try {
      const ayahs = await fetchFromNetwork(number);
      memory.set(number, ayahs);
      void writeToDb(number, ayahs);
      return { ayahs, source: "network" };
    } catch (error) {
      const bundled = bundledSurah(number);
      if (bundled) return { ayahs: bundled, source: "bundled" };
      throw error;
    } finally {
      inflight.delete(number);
    }
  })();

  inflight.set(number, task);
  return task;
}

/** عدد السور المحفوظة فعليًا على الجهاز (قاعدة البيانات + المحفوظ داخل التطبيق). */
export async function cachedSurahNumbers(): Promise<number[]> {
  const numbers = new Set<number>(BUNDLED_SURAH_NUMBERS);
  const db = await openDb();
  if (db) {
    await new Promise<void>((resolve) => {
      try {
        const tx = db.transaction(STORE, "readonly");
        const request = tx.objectStore(STORE).getAllKeys();
        request.onsuccess = () => {
          for (const key of request.result as number[]) numbers.add(Number(key));
          resolve();
        };
        request.onerror = () => resolve();
      } catch {
        resolve();
      }
    });
  }
  return [...numbers].sort((a, b) => a - b);
}

export type DownloadProgress = {
  done: number;
  total: number;
  currentSurah: number;
};

/**
 * ينزّل المصحف كاملًا (١١٤ سورة) ويحفظه على الجهاز ليُقرأ دون إنترنت.
 * يعمل بأربع طلبات متوازية ويقبل الإلغاء.
 */
export async function downloadFullQuran(
  onProgress: (progress: DownloadProgress) => void,
  options?: { signal?: AbortSignal; concurrency?: number },
): Promise<{ done: number; failed: number[] }> {
  const already = new Set(await cachedSurahNumbers());
  const queue = Array.from({ length: 114 }, (_, index) => index + 1).filter(
    (number) => !already.has(number),
  );

  const total = 114;
  let done = total - queue.length;
  const failed: number[] = [];
  let cursor = 0;
  const concurrency = Math.min(Math.max(options?.concurrency ?? 4, 1), 8);

  onProgress({ done, total, currentSurah: 0 });

  const worker = async () => {
    while (queue.length > 0) {
      if (options?.signal?.aborted) return;
      const number = queue[cursor];
      cursor += 1;
      if (number === undefined) return;
      try {
        const result = await loadSurah(number, { forceNetwork: true });
        memory.set(number, result.ayahs);
      } catch {
        failed.push(number);
      }
      done += 1;
      onProgress({ done, total, currentSurah: number });
    }
  };

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { done, failed };
}

export async function clearQuranCache() {
  cleanupLegacyStorage();
  await clearDb();
}

/** إزالة التشكيل لتسهيل المقارنة (تُستخدم لفصل البسملة عن السورة). */
export function normalizeArabic(text: string) {
  return text
    .replace(/[\u064B-\u0652\u0670\u0640\u06D6-\u06ED]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/\s+/g, " ")
    .trim();
}

export const BASMALA = "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ";

/**
 * يفصل «بسم الله الرحمن الرحيم» عن أول آية لأن بعض المصادر تُدمجها مع الآية.
 * سورة الفاتحة وسورة التوبة لهما حكم خاص: الأولى البسملة فيها آية، والثانية بلا بسملة.
 */
export function splitBasmala(number: number, ayahs: Ayah[]) {
  const needsSeparateBasmala = number !== 1 && number !== 9;
  if (!needsSeparateBasmala || ayahs.length === 0) {
    return { ayahs, basmalaShown: false };
  }
  const first = ayahs[0];
  const normalizedBasmala = normalizeArabic(BASMALA);
  const normalizedFirst = normalizeArabic(first.text);
  if (
    normalizedFirst.startsWith(normalizedBasmala) &&
    normalizedFirst.length > normalizedBasmala.length + 2
  ) {
    const stripped = first.text
      .replace(/^[\s]*بِ?سْ?مِ?\s*اللَّهِ\s*الرَّحْمَ[ٰا]?نِ\s*الرَّحِيمِ\s*/u, "")
      .trim();
    return {
      ayahs: [{ ...first, text: stripped.length > 0 ? stripped : first.text }, ...ayahs.slice(1)],
      basmalaShown: true,
    };
  }
  return { ayahs, basmalaShown: true };
}
