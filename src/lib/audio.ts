/**
 * PHASE 3 — تفضيلات الصوت.
 *
 * لا موسيقى ولا مؤثرات ولا ملفات صوتية. كل نغمة مولّدة من Web Audio
 * ومدة أقصر من ثانية. صوت التطبيق جزء من الهدوء لا يزيده.
 *
 * البوابة نقية قابلة للاختبار: الدالة `cueAllowed` لا تلمس المتصفح إطلاقا،
 * ولذلك يمكن اختبار كل قاعدة منع الصوت آليا دون تشغيل صوت حقيقي.
 */

/** أصوات التطبيق. كلها قصيرة وهادئة. */
export type AudioCue = "tap" | "toggle-on" | "toggle-off" | "complete" | "reminder" | "prayer";

/** مفتاح التفضيل الذي يتحكم في كل نوع. */
export type AudioChannel = "notification" | "prayer" | "completion" | "feedback";

export type AudioPreferences = {
  /** المفتاح العام. إيقافه يوقف كل شيء بلا استثناء. */
  appSounds: boolean;
  notificationSound: boolean;
  prayerReminderSound: boolean;
  completionSound: boolean;
  gentleFeedback: boolean;
  /** من 0 إلى 1. الصفر يعني صمتا كاملا حتى لو كانت المفاتيح مفعّلة. */
  volume: number;
};

export const DEFAULT_AUDIO_PREFERENCES: AudioPreferences = {
  // الصامت افتراضيا: تطبيق يحترم المستخدم لا يفرض صوتا على أول تشغيل.
  appSounds: false,
  notificationSound: true,
  prayerReminderSound: true,
  completionSound: true,
  gentleFeedback: true,
  volume: 0.5,
};

export const AUDIO_CHANNELS: {
  key: AudioChannel;
  label: string;
  hint: string;
}[] = [
  { key: "notification", label: "صوت التنبيه", hint: "عند وصول إشعار داخل التطبيق" },
  { key: "prayer", label: "صوت تنبيه الصلاة", hint: "نغمة مستقلة عند دخول وقت الصلاة" },
  { key: "completion", label: "صوت الإنجاز", hint: "عند إتمام مهمة أو صلاة أو ورد" },
  { key: "feedback", label: "رد الفعل الخفيف", hint: "لمسة هادئة عند الضغط والحفظ" },
];

/** أي قناة يملكها كل نوع. اللمسة والتبديل يتبعان قناة رد الفعل الخفيف. */
const CUE_CHANNEL: Record<AudioCue, AudioChannel> = {
  tap: "feedback",
  "toggle-on": "feedback",
  "toggle-off": "feedback",
  complete: "completion",
  reminder: "notification",
  prayer: "prayer",
};

/** مدة كل نغمة بالمللي ثانية. قصيرة عمدا حتى لا يتحول التنبيه إلى إزعاج. */
const CUE_DURATION_MS: Record<AudioCue, number> = {
  tap: 90,
  "toggle-on": 150,
  "toggle-off": 110,
  complete: 620,
  reminder: 700,
  prayer: 1_500,
};

export function cueDuration(cue: AudioCue): number {
  return CUE_DURATION_MS[cue];
}

export function channelOf(cue: AudioCue): AudioChannel {
  return CUE_CHANNEL[cue];
}

function clampVolume(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

/** مستوى الصوت الفعلي بعد كل القواعد. النتيجة الأخيرة قبل أي مولّد نغمة. */
export function effectiveVolume(prefs: AudioPreferences): number {
  if (!prefs.appSounds) return 0;
  return clampVolume(prefs.volume);
}

/**
 * البوابة الوحيدة لتشغيل أي نغمة. الترتيب مقصود:
 * المفتاح العام أولا، ثم قناة النغمة، ثم الحجم.
 */
export function cueAllowed(cue: AudioCue, prefs: AudioPreferences): boolean {
  if (!prefs.appSounds) return false;
  if (clampVolume(prefs.volume) === 0) return false;
  const channel = CUE_CHANNEL[cue];
  if (channel === "notification") return prefs.notificationSound;
  if (channel === "prayer") return prefs.prayerReminderSound;
  if (channel === "completion") return prefs.completionSound;
  return prefs.gentleFeedback;
}

/** أطول نغمة مسموح بها. يمنع أي تحوّل مستقبلي إلى صوت طويل. */
export const MAX_CUE_DURATION_MS = 1_500;

export function cueWithinSafetyLimit(cue: AudioCue): boolean {
  return CUE_DURATION_MS[cue] <= MAX_CUE_DURATION_MS;
}

/* ————————————————————— التشغيل ————————————————————— */

let context: AudioContext | null = null;
let unlocked = false;

function audioCtor(): typeof AudioContext | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext ??
    null
  );
}

function getContext(): AudioContext | null {
  const Ctor = audioCtor();
  if (!Ctor) return null;
  if (!context) {
    // بعض البيئات ترمي من المُنشئ نفسها (سياسة مقيّدة، جهاز بلا صوت).
    // المولّد نعمة، ورميه هنا كان يسقط التطبيق.
    try {
      context = new Ctor();
    } catch {
      return null;
    }
  }
  if (context.state === "suspended") resumeSafely(context);
  return context;
}

/**
 * `resume()` وعد يرفض حين ترفض سياسة المتصفح الاستئناف. بلا التقاط
 * الرفض يصير رفضًا غير معالَج يظهر في الطرفية، وقد يبتلع في بعض
 * البيئات ما حوله. الصوت لا يستحق استثناء.
 */
function resumeSafely(ctx: AudioContext) {
  try {
    void ctx.resume().catch(() => {});
  } catch {
    // متصفح لا يدعم الوعد على resume: نترك السياق معلَّقًا ونسكت.
  }
}

/**
 * المتصفح يمنع الصوت قبل أول تفاعل. نستدعيها من أول نقرة في التطبيق
 * فلا يبدأ الصوت من تلقاء نفسه ولا تخالف السياسة.
 */
export function unlockAudio() {
  unlocked = true;
  const ctx = getContext();
  if (ctx && ctx.state === "suspended") resumeSafely(ctx);
}

export function isAudioUnlocked(): boolean {
  return unlocked;
}

/** موجة واحدة قصيرة. لا ملف ولا عيّنة ولا حلقة. */
function tone(
  ctx: AudioContext,
  frequency: number,
  startAt: number,
  durationSeconds: number,
  peak: number,
  type: OscillatorType,
) {
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.value = frequency;
  // صعود بطيء يمنع طقطقة البداية، وهبوط أطول يمنع الطقطقة عند القطع.
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), startAt + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + durationSeconds);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + durationSeconds + 0.02);
}

/** مقاطع النغمات لكل نوع. كلها نغمات، ولا واحدة منها موسيقى. */
const CUE_SHAPE: Record<
  AudioCue,
  { frequency: number; offsetMs: number; type: OscillatorType }[]
> = {
  tap: [{ frequency: 660, offsetMs: 0, type: "sine" }],
  "toggle-on": [{ frequency: 587.3, offsetMs: 0, type: "sine" }],
  "toggle-off": [{ frequency: 440, offsetMs: 0, type: "sine" }],
  complete: [
    { frequency: 587.3, offsetMs: 0, type: "sine" },
    { frequency: 880, offsetMs: 90, type: "sine" },
  ],
  reminder: [
    { frequency: 523.3, offsetMs: 0, type: "sine" },
    { frequency: 659.3, offsetMs: 140, type: "sine" },
  ],
  // نغمة الصلاة أطول قليلا وأثقل حتى تميز بالسمع وحده.
  prayer: [
    { frequency: 440, offsetMs: 0, type: "sine" },
    { frequency: 587.3, offsetMs: 320, type: "sine" },
    { frequency: 440, offsetMs: 640, type: "sine" },
  ],
};

/** أعلى ذروة مسموحة. تحفظ للصوت الهادئ. */
const MAX_PEAK = 0.09;

/** فئة الإشعار إلى نغمتها. صلاة لها نغمة مستقلة عمدا. */
export type NotificationCategoryKey =
  | "prayer"
  | "task"
  | "commitment"
  | "review"
  | "dhikr"
  | "recovery"
  | "occasion"
  | "hadith";

/**
 * قاعدة واحدة: **ما دام الإشعار إشعارا، فصوته يتبع مفتاح التنبيه.**
 *
 * كانت الفئات توزّع على قنوات أخرى — «المهمة» على قناة الإنجاز و«العودة
 * بلطف» على قناة اللمس — فكان إطفاء «رد الفعل الخفيف» يُسكت إشعارًا لم
 * يسأل المستخدم إسكاته. فلم يبقَ إلا فرقان: الصلاة لها نغمة مستقلة،
 * وما عداها تنبيه يتبع مفتاح التنبيه وحده.
 */
const CUE_BY_CATEGORY: Record<NotificationCategoryKey, AudioCue> = {
  prayer: "prayer",
  task: "reminder",
  commitment: "reminder",
  review: "reminder",
  dhikr: "reminder",
  recovery: "reminder",
  occasion: "reminder",
  hadith: "reminder",
};

/** النغمة التي تخص فئة إشعار معينة. */
export function cueForCategory(category: NotificationCategoryKey): AudioCue {
  return CUE_BY_CATEGORY[category];
}

/**
 * يشغّل نغمة إن سمحت القواعد. يرجع true إن اشتغل فعلا وfalse إن منع.
 * الفشل الصامت مقصود: الصوت رفاهية، ولا يجوز أن يفسد تجربة من أوقفه.
 */
export function playCue(cue: AudioCue, prefs: AudioPreferences): boolean {
  if (!cueAllowed(cue, prefs)) return false;
  const ctx = getContext();
  if (!ctx) return false;
  const peak = MAX_PEAK * effectiveVolume(prefs);
  if (peak <= 0) return false;
  const now = ctx.currentTime;
  try {
    for (const part of CUE_SHAPE[cue]) {
      const start = now + part.offsetMs / 1000;
      const remaining = (CUE_DURATION_MS[cue] - part.offsetMs) / 1000;
      if (remaining <= 0) continue;
      tone(ctx, part.frequency, start, remaining, peak, part.type);
    }
    return true;
  } catch {
    return false;
  }
}
