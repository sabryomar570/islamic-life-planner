import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PRAYERS, currentPrayer, nextPrayer, type Timings } from "@/lib/prayers";
import { dateKey } from "@/lib/time";

/** تذكير لحظي: شريط العدّ التنازلي للصلاة القادمة + تنبيه في الوقت نفسه. */
export function usePrayerReminders(timings: Timings) {
  const [now, setNow] = useState(() => new Date());
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "unsupported",
  );
  const firedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 20_000);
    return () => window.clearInterval(id);
  }, []);

  const upcoming = nextPrayer(timings, now);
  const current = currentPrayer(timings, now);

  const requestPermission = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
    } catch {
      /* المستخدم رفض أو المتصفح لا يدعم */
    }
  }, []);

  // تنبيه عند دخول وقت الصلاة (مرة واحدة لكل صلاة في اليوم).
  useEffect(() => {
    const key = dateKey(now);
    for (const prayer of PRAYERS) {
      const [hours, minutes] = timings[prayer.key].split(":").map(Number);
      const target = new Date(now);
      target.setHours(hours, minutes, 0, 0);
      const delta = Math.round((now.getTime() - target.getTime()) / 60_000);
      const fireKey = `${key}:${prayer.key}`;
      if (delta >= 0 && delta <= 1 && !firedRef.current.has(fireKey)) {
        firedRef.current.add(fireKey);
        toast(`حان وقت صلاة ${prayer.name}`, {
          description: "قم إلى صلاتك، وابدأ بأذكار ما بعد الصلاة.",
          duration: 15_000,
        });
        if (
          typeof window !== "undefined" &&
          "Notification" in window &&
          Notification.permission === "granted"
        ) {
          try {
            new Notification(`حان وقت صلاة ${prayer.name}`, {
              body: "﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾",
              lang: "ar",
            });
          } catch {
            /* تجاهل أخطاء التنبيه */
          }
        }
      }
    }
  }, [now, timings]);

  return { now, upcoming, current, permission, requestPermission };
}
