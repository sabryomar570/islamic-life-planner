/* سكينة — Service Worker
 * - قشرة التطبيق (App Shell) تُجلب من الشبكة أولًا ثم من الحافظة عند انقطاعها.
 * - نصوص القرآن ومواقيت الصلاة والخطوط تُحفظ من أول نجاح لتُقرأ دون إنترنت.
 * - يدعم رسائل: CACHE_URLS (تنزيل مسبق)، NOTIFY (إشعار)، SKIP_WAITING، CLEAR_CACHES.
 */

const VERSION = "sakinah-2026-09-a";
const SHELL_CACHE = `${VERSION}:shell`;
const RUNTIME_CACHE = `${VERSION}:runtime`;
const API_CACHE = `${VERSION}:api`;

const SHELL_ASSETS = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/logo.svg",
  "/icon.svg",
  "/icon-maskable.svg",
];

/* نطاقات تُخزَّن أولًا (cache-first) لأنها نصوص ثابتة لا تتغيّر. */
const STATIC_API_HOSTS = [
  "api.alquran.cloud",
  "cdn.jsdelivr.net",
  "raw.githubusercontent.com",
  "fonts.googleapis.com",
  "fonts.gstatic.com",
];

/* نطاق المواقيت: نُخزّنه أيضًا لكن نُفضّل الشبكة عند توفّرها. */
const TIMINGS_HOST = "api.aladhan.com";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.all(
        SHELL_ASSETS.map((url) =>
          cache.add(new Request(url, { cache: "reload" })).catch(() => undefined),
        ),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => !key.startsWith(VERSION))
          .map((key) => caches.delete(key)),
      );
      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.disable();
        } catch {
          /* غير مدعوم */
        }
      }
      await self.clients.claim();
    })(),
  );
});

function isStaticApi(url) {
  return STATIC_API_HOSTS.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`));
}

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    // تحديث صامت في الخلفية ليبقى النص محدثًا دون إبطاء القراءة.
    fetch(request)
      .then((response) => {
        if (response && response.ok) cache.put(request, response.clone());
      })
      .catch(() => undefined);
    return cached;
  }
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put("/index.html", response.clone());
    return response;
  } catch {
    const cached =
      (await cache.match(request)) ||
      (await cache.match("/index.html")) ||
      (await cache.match("/"));
    if (cached) return cached;
    return new Response(
      `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>سكينة</title></head><body style="font-family:sans-serif;padding:2rem;text-align:center"><h1>لا يوجد اتصال بالإنترنت</h1><p>افتح التطبيق مرة واحدة مع اتصال لتُحفظ كل صفحاته، ثم يعمل بعدها دون إنترنت.</p></body></html>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.pathname === "/sw.js") return;

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  if (url.origin === self.location.origin) {
    // ملفات التطبيق: الشبكة أولًا حتى لا يظهر بناء قديم بعد أي تعديل.
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE).catch(() => Response.error()),
    );
    return;
  }

  if (isStaticApi(url)) {
    event.respondWith(cacheFirst(request, API_CACHE));
    return;
  }

  if (url.hostname.endsWith(TIMINGS_HOST)) {
    event.respondWith(networkFirst(request, API_CACHE));
  }
});

self.addEventListener("message", (event) => {
  const data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (data.type === "CACHE_URLS" && Array.isArray(data.urls)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(API_CACHE);
        let done = 0;
        for (const url of data.urls.slice(0, 400)) {
          try {
            const response = await fetch(url, { cache: "reload" });
            if (response && response.ok) {
              await cache.put(url, response.clone());
              done += 1;
            }
          } catch {
            /* نتجاهل الفشل الفردي ونكمل */
          }
        }
        const clientList = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({ type: "CACHE_URLS_DONE", done, total: data.urls.length });
        }
      })(),
    );
    return;
  }

  if (data.type === "NOTIFY") {
    const { title, body, tag, url } = data;
    event.waitUntil(
      self.registration.showNotification(title || "سكينة", {
        body: body || "",
        tag: tag || `sakinah-${Date.now()}`,
        lang: "ar",
        dir: "rtl",
        badge: "/icon.svg",
        icon: "/icon.svg",
        vibrate: [40, 60, 40],
        data: { url: url || "/dashboard" },
      }),
    );
    return;
  }

  if (data.type === "CLEAR_CACHES") {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        const clientList = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of clientList) client.postMessage({ type: "CACHES_CLEARED" });
      })(),
    );
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/dashboard";
  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clientList) {
        if ("focus" in client) {
          client.postMessage({ type: "NAVIGATE", url: target });
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
      return undefined;
    })(),
  );
});
