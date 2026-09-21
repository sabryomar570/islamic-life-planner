/**
 * طبقة الـ PWA: تسجيل عامل الخدمة، زر «أضف إلى الشاشة»، حالة الاتصال،
 * وتنزيل المحتوى للعمل دون إنترنت.
 */
import { useCallback, useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let registration: ServiceWorkerRegistration | null = null;
const listeners = new Set<(data: Record<string, unknown>) => void>();

export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;

  const start = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        registration = reg;
        if (reg.waiting) reg.waiting.postMessage({ type: "SKIP_WAITING" });
      })
      .catch(() => {
        /* بعض البيئات تمنع عامل الخدمة (iframe بلا ملفات تعريف مثلًا) */
      });
  };

  if (document.readyState === "complete") start();
  else window.addEventListener("load", start, { once: true });

  navigator.serviceWorker.addEventListener("message", (event) => {
    const data = event.data as Record<string, unknown> | undefined;
    if (!data) return;
    for (const listener of listeners) listener(data);
  });
}

export function onServiceWorkerMessage(handler: (data: Record<string, unknown>) => void) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export async function getServiceWorker() {
  if (registration) return registration;
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  registration = (await navigator.serviceWorker.getRegistration()) ?? null;
  return registration;
}

export function isStandalone() {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  return window.matchMedia("(display-mode: standalone)").matches || iosStandalone === true;
}

export function useOnlineStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => {
      window.removeEventListener("online", up);
      window.removeEventListener("offline", down);
    };
  }, []);

  return online;
}

/** يجمع حدث التثبيت في أندرويد/سطح المكتب، ويكشف حالة «مثبّت مسبقًا». */
export function useInstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(() => isStandalone());
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    const ua = window.navigator.userAgent;
    setIsIos(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferred) return "unavailable" as const;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    if (choice.outcome === "accepted") setInstalled(true);
    setDeferred(null);
    return choice.outcome;
  }, [deferred]);

  return {
    canInstall: deferred !== null,
    installed,
    isIos,
    promptInstall,
  };
}

export async function storageEstimate() {
  if (typeof navigator === "undefined" || !navigator.storage?.estimate) return null;
  try {
    const estimate = await navigator.storage.estimate();
    return { usage: estimate.usage ?? 0, quota: estimate.quota ?? 0 };
  } catch {
    return null;
  }
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "٠";
  const units = ["بايت", "كيلوبايت", "ميجابايت", "جيجابايت"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toLocaleString("ar-EG", { maximumFractionDigits: index === 0 ? 0 : 1 })} ${units[index]}`;
}

export async function clearOfflineCaches() {
  const reg = await getServiceWorker();
  reg?.active?.postMessage({ type: "CLEAR_CACHES" });
  if (typeof caches !== "undefined") {
    const keys = await caches.keys();
    await Promise.all(keys.map((key) => caches.delete(key)));
  }
}
