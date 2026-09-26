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
  /**
   * أزرار الإشعار.
   *
   * **حقيقة المنصة، لا أمنية:** سمة `actions` تعمل على Chromium
   * (Chrome و Edge و Opera) وعلى Firefox في أندرويد، ولا تعمل على Safari
   * ولا على Firefox سطح المكتب. **ولا يوجد في الويب ردّ نصّي داخل الإشعار
   * أصلا** — تلك سمة `RemoteInput` وهي لأندرويد أصلي وحده.
   * فحين لا تعمل الأزرار يتجاهلها المتصفح بصمت، ونكمل بالضغط العادي.
   * لذلك «الردّ من الإشعار» عندنا = زرّان يفتحان التطبيق في المكان
   * الصحيح، لا صندوق كتابة يطفو فوق الشاشة.
   */
  actions?: { action: string; title: string }[];
};

/** هل هذه المنصة تعرض أزرار الإشعار؟ نفحص قبل أن ندّعي. */
export function notificationActionsSupported(): boolean {
  if (typeof Notification === "undefined") return false;
  try {
    return "actions" in Notification.prototype;
  } catch {
    return false;
  }
}

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

export async function showNotification({ title, body, tag, url, actions }: NotifyPayload) {
  if (notificationPermission() !== "granted") return false;

  // نُفضّل المرور بعامل الخدمة: يظهر الإشعار حتى لو كان التبويب في الخلفية.
  try {
    const registration = await getServiceWorker();
    if (registration) {
      if (registration.active) {
        registration.active.postMessage({ type: "NOTIFY", title, body, tag, url, actions });
        return true;
      }
      // `actions` سمة من المواصفةفعلتستعملها الأنواعالمحلية: نمررها
      // كما هي، ومن يتجاهلها يتجاهلها بصمت ولا يكسر شيئا.
      await registration.showNotification(title, {
        body,
        tag: tag ?? `sakinah-${Date.now()}`,
        lang: "ar",
        dir: "rtl",
        icon: "/icon.svg",
        badge: "/icon.svg",
        actions,
        data: { url: url ?? "/dashboard" },
      } as NotificationOptions);
      return true;
    }
  } catch {
    /* ننتقل للطريقة المباشرة */
  }

  try {
    new Notification(title, {
      body,
      lang: "ar",
      dir: "rtl",
      tag,
      icon: "/icon.svg",
      actions,
    } as NotificationOptions);
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

/** أنواع الرنين المتاحة عند الصلاة — كلها مولّدة محليًا بلا ملفات صوت. */
export type RingTone = "chime" | "rain" | "nature" | "deep";

export const RING_TONES: { value: RingTone; label: string }[] = [
  { value: "chime", label: "نغمة هادئة" },
  { value: "rain", label: "مطر خفيف" },
  { value: "nature", label: "طبيعة" },
  { value: "deep", label: "رنين عميق" },
];

function ensureContext(): AudioContext | null {
  try {
    const Ctor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    audioContext = audioContext ?? new Ctor();
    if (audioContext.state === "suspended") void audioContext.resume();
    return audioContext;
  } catch {
    return null;
  }
}

/** نغمة مطر خفيفة: ضجيج أبيض مُرشَّح بسرعة تلاشٍ هادئة. */
function playRain(context: AudioContext) {
  const duration = 1.6;
  const sampleRate = context.sampleRate;
  const buffer = context.createBuffer(1, sampleRate * duration, sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) {
    const fade = Math.min(index / (sampleRate * 0.3), 1) *
      Math.min((data.length - index) / (sampleRate * 0.5), 1);
    data[index] = (Math.random() * 2 - 1) * 0.05 * fade;
  }
  const source = context.createBufferSource();
  source.buffer = buffer;
  const filter = context.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = 900;
  const gain = context.createGain();
  gain.gain.value = 0.8;
  source.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  source.start();
}

/** نغمة طبيعة: نغمات متتابعة هابطة كأنها طيور. */
function playNature(context: AudioContext) {
  const now = context.currentTime;
  [
    { f: 1046, t: 0 },
    { f: 1318, t: 0.18 },
    { f: 988, t: 0.4 },
  ].forEach(({ f, t }) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = f;
    gain.gain.setValueAtTime(0.0001, now + t);
    gain.gain.exponentialRampToValueAtTime(0.05, now + t + 0.04);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + t + 0.4);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + t);
    oscillator.stop(now + t + 0.45);
  });
}

/** رنين عميق: نغمتان منخفضتان كأذان حديث مطمئن. */
function playDeep(context: AudioContext) {
  const now = context.currentTime;
  [220, 277.2].forEach((frequency, index) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, now + index * 0.35);
    gain.gain.exponentialRampToValueAtTime(0.09, now + index * 0.35 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.35 + 0.7);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now + index * 0.35);
    oscillator.stop(now + index * 0.35 + 0.75);
  });
}

/** يشغّل نغمة رنين محددة. */
export function playRingTone(tone: RingTone = "chime") {
  const context = ensureContext();
  if (!context) return;
  try {
    switch (tone) {
      case "rain":
        playRain(context);
        break;
      case "nature":
        playNature(context);
        break;
      case "deep":
        playDeep(context);
        break;
      default:
        playChime();
    }
  } catch {
    /* الصوت غير متاح */
  }
}

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
