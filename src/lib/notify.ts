/**
 * إشعارات المتصفح: طلب الإذن، الإرسال عبر عامل الخدمة (يبقى حتى لو كان التطبيق
 * في الخلفية)، نغمة تنبيه قصيرة، واهتزاز على الجوال.
 */
import { getServiceWorker } from "@/lib/pwa";

export type NotifyPayload = {
  title: string;
  body?: string;
  tag?: string;
  url?: string;
};

export function notificationsSupported() {
  return typeof window !== "undefined" && "Notification" in window;
}

export function notificationPermission(): NotificationPermission | "unsupported" {
  if (!notificationsSupported()) return "unsupported";
  return Notification.permission;
}

export async function askNotificationPermission(): Promise<
  NotificationPermission | "unsupported"
> {
  if (!notificationsSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  try {
    const result = await Notification.requestPermission();
    return result;
  } catch {
    return Notification.permission;
  }
}

export async function showNotification({ title, body, tag, url }: NotifyPayload) {
  if (notificationPermission() !== "granted") return false;

  // نُفضّل المرور بعامل الخدمة: يظهر الإشعار حتى لو كان التبويب في الخلفية.
  try {
    const registration = await getServiceWorker();
    if (registration) {
      if (registration.active) {
        registration.active.postMessage({ type: "NOTIFY", title, body, tag, url });
        return true;
      }
      await registration.showNotification(title, {
        body,
        tag: tag ?? `sakinah-${Date.now()}`,
        lang: "ar",
        dir: "rtl",
        icon: "/icon.svg",
        badge: "/icon.svg",
        data: { url: url ?? "/dashboard" },
      });
      return true;
    }
  } catch {
    /* ننتقل للطريقة المباشرة */
  }

  try {
    new Notification(title, { body, lang: "ar", dir: "rtl", tag, icon: "/icon.svg" });
    return true;
  } catch {
    return false;
  }
}

export function vibrate(pattern: number | number[]) {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    /* غير مدعوم */
  }
}

let audioContext: AudioContext | null = null;

/** نغمة تنبيه قصيرة وهادئة (تحتاج تفاعلًا واحدًا من المستخدم على الأقل). */
export function playChime() {
  try {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    audioContext = audioContext ?? new Ctor();
    const context = audioContext;
    if (context.state === "suspended") void context.resume();
    const now = context.currentTime;
    [880, 1174.7].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.06, now + index * 0.22 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.22 + 0.35);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(now + index * 0.22);
      oscillator.stop(now + index * 0.22 + 0.4);
    });
  } catch {
    /* الصوت غير متاح */
  }
}
