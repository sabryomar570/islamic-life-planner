/**
 * مركز التذكيرات: يبني جدول تذكيرات اليوم (الصلاة وقبلها، أذكار الصباح والمساء
 * والنوم، ورد القرآن، الجمعة، ورمضان) ثم يُطلقها في وقتها كإشعار نظام وإشعار داخل
 * التطبيق، ولا يكرّر الإشعار نفسه في اليوم نفسه.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  askNotificationPermission,
  notificationPermission,
  notificationsSupported,
  playChime,
  playRingTone,
  showNotification,
  vibrate,
} from "@/lib/notify";
import { isOddNightOfLastTen, isRamadan } from "@/lib/hijri";
import { PRAYERS, currentPrayer, nextPrayer, type Timings } from "@/lib/prayers";
import { prioritizeNotifications } from "@/lib/notification-intelligence";
import { dateKey, formatDuration, toMinutes } from "@/lib/time";
import { needsGentlePrayerReminders } from "@/data/questions";
import type { Preferences } from "@/hooks/use-preferences";

/** أقل صلاة تفوت المستخدم — نُشدّد تنبيهها. */
const MISSED_LEAD_MINUTES = 25;

export type ReminderEvent = {
  id: string;
  at: Date;
  kind: "prayer" | "lead" | "adhkar" | "wird" | "sleep" | "friday" | "ramadan";
  title: string;
  body: string;
  url?: string;
};

const FIRED_PREFIX = "sakinah:fired:";
/** نافذة الإطلاق: نُطلق التذكير إن فات وقته أقل من عشر دقائق فقط. */
const FIRE_WINDOW_MS = 10 * 60 * 1000;

function timeToDate(hhmm: string, base: Date) {
  const minutes = toMinutes(hhmm);
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  date.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
  return date;
}

function shift(hhmm: string, delta: number) {
  const total = ((toMinutes(hhmm) + delta) % 1440 + 1440) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
}

function readFired(day: string): string[] {
  try {
    const raw = window.localStorage.getItem(`${FIRED_PREFIX}${day}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed.slice(-80) : [];
  } catch {
    return [];
  }
}

function writeFired(day: string, ids: string[]) {
  try {
    window.localStorage.setItem(`${FIRED_PREFIX}${day}`, JSON.stringify(ids.slice(-80)));
  } catch {
    /* لا شيء */
  }
}

export function buildReminderSchedule(input: {
  now: Date;
  timings: Timings;
  prefs: Preferences;
  sleepTime?: string;
  mostMissedPrayer?: string;
  prayerCommitment?: string;
  prayers: Record<string, string>;
  adhkarDone: string[];
}): ReminderEvent[] {
  const {
    now,
    timings,
    prefs,
    sleepTime,
    mostMissedPrayer,
    prayerCommitment,
    prayers,
    adhkarDone,
  } = input;
  const gentle = prayerCommitment ? needsGentlePrayerReminders(prayerCommitment) : false;
  // من يصلّي بانتظام لا يحتاج تنبيهًا قبل الوقت؛ ومن يتأخر أو يبدأ يحتاجه.
  const wantsLead = prayerCommitment !== "always" && prefs.leadMinutes > 0;
  const day = dateKey(now);
  const events: ReminderEvent[] = [];

  if (prefs.prayerAlerts) {
    for (const prayer of PRAYERS) {
      const at = timeToDate(timings[prayer.key], now);
      events.push({
        id: `${day}:prayer:${prayer.key}`,
        at,
        kind: "prayer",
        title: `حان وقت صلاة ${prayer.name}`,
        body: `${prayer.hint} • ﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾`,
        url: "/dashboard?view=prayers",
      });
      if (wantsLead) {
        events.push({
          id: `${day}:lead:${prayer.key}`,
          at: new Date(at.getTime() - prefs.leadMinutes * 60_000),
          kind: "lead",
          title: `باقٍ ${prefs.leadMinutes} دقيقة على ${prayer.name}`,
          body: "توضّأ وتهيّأ؛ أفضل ما تكون حين تُقبل على الله بقلب فارغ.",
          url: "/dashboard?view=prayers",
        });
      }

      // الصلاة التي تفوت أكثر: تنبيه أبكر وأوضح.
      if (mostMissedPrayer === prayer.key) {
        events.push({
          id: `${day}:missed:${prayer.key}`,
          at: new Date(at.getTime() - MISSED_LEAD_MINUTES * 60_000),
          kind: "lead",
          title: `باقٍ ${MISSED_LEAD_MINUTES} دقيقة على ${prayer.name} — وهي أكثر ما تفوتك`,
          body: "اجعلها موعدًا ثابتًا: توضّأ الآن، ولا تؤجّلها.",
          url: "/dashboard?view=prayers",
        });
      }

      // من يبدأ الالتزام أو يصلّي أحيانًا: تذكير بعد الوقت للاستدراك.
      if (gentle && !prayers[prayer.key]) {
        events.push({
          id: `${day}:after:${prayer.key}`,
          at: new Date(at.getTime() + MISSED_LEAD_MINUTES * 60_000),
          kind: "lead",
          title: `هل صلّيت ${prayer.name}؟`,
          body: "إن كنت نسيت فالوقت باقٍ؛ قُم الآن وسجّلها.",
          url: "/dashboard?view=prayers",
        });
      }
    }
  }

  if (prefs.adhkarReminders) {
    if (!adhkarDone.includes("morning")) {
      events.push({
        id: `${day}:adhkar:morning`,
        at: timeToDate(prefs.morningTime, now),
        kind: "adhkar",
        title: "أذكار الصباح في انتظارك",
        body: "دقيقة واحدة تكفي للبداية: آية الكرسي والمعوذات وسيد الاستغفار.",
        url: "/dashboard?adhkar=morning",
      });
    }
    if (!adhkarDone.includes("evening")) {
      events.push({
        id: `${day}:adhkar:evening`,
        at: timeToDate(prefs.eveningTime, now),
        kind: "adhkar",
        title: "أذكار المساء",
        body: "اختم نهارك بذكر: سيد الاستغفار والمعوذات والرضا بالإسلام.",
        url: "/dashboard?adhkar=evening",
      });
    }
  }

  if (prefs.sleepReminder && sleepTime && !adhkarDone.includes("sleep")) {
    events.push({
      id: `${day}:adhkar:sleep`,
      at: timeToDate(shift(sleepTime, -20), now),
      kind: "sleep",
      title: "قبل الفراش: أذكار النوم",
      body: "آية الكرسي، المعوذات، وتسبيح ٣٣/٣٣/٣٣ ثم نم على وضوء.",
      url: "/dashboard?adhkar=sleep",
    });
  }

  if (prefs.wirdReminder) {
    events.push({
      id: `${day}:wird`,
      at: timeToDate(prefs.wirdTime, now),
      kind: "wird",
      title: "ورد القرآن اليومي",
      body: "لا تترك وردك؛ صفحة واحدة بحضور قلب خير من كثير بلا تدبّر.",
      url: "/dashboard?view=quran",
    });
  }

  if (prefs.fridayReminder && now.getDay() === 5) {
    events.push({
      id: `${day}:friday`,
      at: timeToDate("09:00", now),
      kind: "friday",
      title: "يوم الجمعة",
      body: "سورة الكهف، والتبكير إلى المسجد، والإكثار من الصلاة على النبي ﷺ.",
      url: "/dashboard?view=occasions",
    });
  }

  if (prefs.ramadanReminders && isRamadan(now)) {
    events.push({
      id: `${day}:ramadan:suhoor`,
      at: timeToDate(shift(timings.fajr, -45), now),
      kind: "ramadan",
      title: "وقت السحور",
      body: "تسحّر ولو بتمر وماء؛ «فإن في السحور بركة».",
      url: "/dashboard?view=occasions",
    });
    events.push({
      id: `${day}:ramadan:iftar`,
      at: timeToDate(timings.maghrib, now),
      kind: "ramadan",
      title: "أفطر الآن",
      body: "«ذهب الظمأ وابتلّت العروق وثبت الأجر إن شاء الله» — رواه أبو داود.",
      url: "/dashboard?view=occasions",
    });
    if (isOddNightOfLastTen(now)) {
      events.push({
        id: `${day}:ramadan:qadr`,
        at: timeToDate("21:30", now),
        kind: "ramadan",
        title: "ليلة وترية من العشر الأواخر",
        body: "قُم وادعُ: «اللهم إنك عفو تحب العفو فاعف عني».",
        url: "/dashboard?view=occasions",
      });
    }
  }

  return events.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export function useReminderCenter(options: {
  timings: Timings;
  prefs: Preferences;
  sleepTime?: string;
  mostMissedPrayer?: string;
  prayerCommitment?: string;
  prayers: Record<string, string>;
  adhkarDone: string[];
}) {
  const { timings, prefs, sleepTime, mostMissedPrayer, prayerCommitment, prayers, adhkarDone } =
    options;
  const [now, setNow] = useState(() => new Date());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(() =>
    notificationPermission(),
  );
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const day = dateKey();
    firedRef.current = new Set(readFired(day));
  }, []);

  useEffect(() => {
    // كل دقيقة تكفي للتذكيرات، وتُقلّل إعادة تصيير الصفحة (سبب رئيس للتأخّر).
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") setNow(new Date());
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const schedule = useMemo(
    () =>
      prioritizeNotifications(
        buildReminderSchedule({
          now,
          timings,
          prefs,
          sleepTime,
          mostMissedPrayer,
          prayerCommitment,
          prayers,
          adhkarDone,
        }),
        { now },
      ),
    [now, timings, prefs, sleepTime, mostMissedPrayer, prayerCommitment, prayers, adhkarDone],
  );

  const requestPermission = useCallback(async () => {
    const result = await askNotificationPermission();
    setPermission(result);
    if (result === "granted") {
      toast.success("تم تفعيل الإشعارات، سيصلك التذكير في وقته.");
      void showNotification({
        title: "عود",
        body: "الإشعارات مفعّلة. هذا أول تذكير لك.",
        tag: "oud-welcome",
      });
    } else if (result === "denied") {
      toast.error("المتصفح رفض الإشعارات. يمكنك تفعيلها من إعدادات الموقع.");
    } else if (result === "unsupported") {
      toast.error("متصفحك لا يدعم الإشعارات؛ ستعمل التذكيرات داخل التطبيق فقط.");
    }
    return result;
  }, []);

  const dispatch = useCallback(
    (event: ReminderEvent) => {
      const isPrayerTime = event.kind === "prayer";
      const body = isPrayerTime && prefs.postPrayerPrompt
        ? `${event.body}\nبعد الصلاة سنفحص معك: هل صلّيت؟ الصدق هنا سجلّك أمام نفسك — فلا تكذب عليه.`
        : event.body;
      toast(event.title, { description: body, duration: isPrayerTime ? 16_000 : 12_000 });
      vibrate([30, 50, 30]);
      if (isPrayerTime && prefs.prayerRing) playRingTone(prefs.ringTone);
      else if (prefs.soundOn) playChime();
      if (notificationPermission() === "granted") {
        void showNotification({
          title: event.title,
          body,
          tag: event.id,
          url: event.url,
        });
      }
    },
    [prefs.soundOn, prefs.prayerRing, prefs.ringTone, prefs.postPrayerPrompt],
  );

  // إطلاق التذكيرات المستحقة دون تكرار.
  useEffect(() => {
    const day = dateKey(now);
    for (const event of schedule) {
      const delta = now.getTime() - event.at.getTime();
      if (delta < 0 || delta > FIRE_WINDOW_MS) continue;
      if (firedRef.current.has(event.id)) continue;
      firedRef.current.add(event.id);
      writeFired(day, [...firedRef.current]);
      dispatch(event);
    }
  }, [schedule, now, dispatch]);

  /** رسالة «هل صلّيت؟» تظهر بعد دقائق من دخول وقت الصلاة. */
  const [postPrayerCheck, setPostPrayerCheck] = useState<string | null>(null);
  const checkedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!prefs.postPrayerPrompt) return;
    const minutes = now.getHours() * 60 + now.getMinutes();
    for (const prayer of PRAYERS) {
      const prayerMinutes = toMinutes(timings[prayer.key]);
      const passed = minutes - prayerMinutes;
      const id = `${dateKey(now)}:${prayer.key}`;
      if (passed >= 12 && passed <= 120 && !checkedRef.current.has(id)) {
        checkedRef.current.add(id);
        setPostPrayerCheck(prayer.key);
        break;
      }
    }
  }, [now, timings, prefs.postPrayerPrompt]);

  const clearPostPrayerCheck = useCallback(() => setPostPrayerCheck(null), []);

  const upcoming = nextPrayer(timings, now);
  const current = currentPrayer(timings, now);
  const nextEvent = schedule.find(
    (event) => event.at.getTime() > now.getTime() && event.kind !== "lead",
  );

  const testNotification = useCallback(async () => {
    if (notificationPermission() !== "granted") {
      const result = await requestPermission();
      if (result !== "granted") return;
    }
    playChime();
    vibrate([40, 60, 40]);
    toast("هذا تذكير تجريبي", { description: "سيصلك مثل هذا في وقت الصلاة ووقت وردك." });
    void showNotification({
      title: "تذكير تجريبي من عود",
      body: "إن وصلتك هذه الرسالة فالإشعارات تعمل بشكل صحيح.",
      tag: "oud-test",
    });
  }, [requestPermission]);

  return {
    now,
    upcoming,
    current,
    permission,
    supported: notificationsSupported(),
    requestPermission,
    testNotification,
    nextEvent,
    schedule,
    postPrayerCheck,
    clearPostPrayerCheck,
    upcomingLabel: nextEvent
      ? `${nextEvent.title} • بعد ${formatDuration(
          Math.max(Math.round((nextEvent.at.getTime() - now.getTime()) / 60_000), 0),
        )}`
      : null,
  };
}
