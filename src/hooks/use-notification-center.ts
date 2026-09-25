/**
 * PHASE 3 — محرّك مركز الإشعارات.
 *
 * **مؤقّت بطيء عمدا:** دقيقة واحدة بين التقييمات. إشعار يتأخر دقائق
 * أفضل من إشعار يسبق اللحظة التي يتحدث عنها.
 *
 * ولا إشعار في أول خمس ثوان من فتح التطبيق: المستخدم هو من شغّله،
 * فلا يحتاج إلى أن ننبّهه بأنه شغّله.
 */

import { cueForCategory, playCue, type AudioPreferences } from "@/lib/audio";
import { isLocalDataCurrent, localDataEpoch } from "@/lib/local-data";
import {
  appendNotification,
  clearNotifications,
  groupNotifications,
  markAllRead as markAllReadIn,
  markRead as markReadIn,
  readNotifications,
  unreadCount,
  writeNotifications,
  type StoredNotification,
} from "@/lib/notification-center";
import {
  NOTIFICATION_TEMPLATES,
  resolveApplicableTemplates,
  selectNotifications,
  type AppSnapshot,
} from "@/lib/notification-templates";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

/** مهلة قبل أول تقييم: لا إشعار على شاشة الافتتاح. */
const WARMUP_MS = 5_000;
const TICK_MS = 60_000;

export type NotificationCenterController = {
  items: StoredNotification[];
  today: StoredNotification[];
  earlier: StoredNotification[];
  unread: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clear: () => void;
};

export function useNotificationCenter({
  enabled,
  getSnapshot,
  audio,
}: {
  enabled: boolean;
  getSnapshot: () => AppSnapshot;
  audio: AudioPreferences;
}): NotificationCenterController {
  const [items, setItems] = useState<StoredNotification[]>(readNotifications);

  // مرآة للقيم المتغيّرة حتى لا تُعاد المؤقتات مع كل رسم.
  // التحديث في `useEffect` لا في جسم الرسم: الكتابة على ref أثناء
  // الرسم تخالف قواعد React وقد تعطي قيمة نصف محدّثة.
  const snapshotRef = useRef(getSnapshot);
  const audioRef = useRef(audio);
  // سجلّ التهدئة يُقرأ من القيمة الحيّة لا من نسخة أول رسم. لولا هذا
  // لبقيت التهدئة مجمّدة عند التركيب: يختار المحرّك قالبا نُبّه عليه
  // فعلا، فيسقطه `appendNotification`، ويضيع تذكيره بتلك الدقيقة بصمت.
  const itemsRef = useRef(items);
  useEffect(() => {
    snapshotRef.current = getSnapshot;
    audioRef.current = audio;
    itemsRef.current = items;
  });

  const replace = useCallback((next: StoredNotification[]) => {
    setItems(next);
    writeNotifications(next);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    // نلتزم بعهد الجهاز عند التركيب: إن مُسحت البيانات بعده — تسجيل
    // خروج أو حذف حساب — لا يجوز أن يعيد هذا المؤقّت كتابتها.
    const epoch = localDataEpoch();

    const tick = () => {
      if (cancelled) return;
      if (!isLocalDataCurrent(epoch)) {
        cancelled = true;
        return;
      }
      // المؤقّت لا يسقط التطبيق: لقطة ناقصة أو مرفوضة تُتجاهل هذه الدقيقة
      // ويأتي التقييم التالي بمعلومة سليمة.
      try {
        const snapshot = snapshotRef.current();
        const applicable = resolveApplicableTemplates(NOTIFICATION_TEMPLATES, snapshot);
        const chosen = selectNotifications(applicable, {
          now: snapshot.now,
          lastFiredAt: Object.fromEntries(
            itemsRef.current.map((item) => [item.templateId, item.at]),
          ),
          limit: 1,
        });
        if (chosen.length === 0) return;

        const picked = chosen[0].template;
        setItems((current) => {
          const next = appendNotification(current, picked, snapshot.now.getTime());
          writeNotifications(next);
          return next;
        });
        playCue(cueForCategory(picked.category), audioRef.current);
      } catch {
        // لا نكتب ولا نُصدر صوتا: التقييم التالي فرصته.
      }
    };

    const warmup = window.setTimeout(tick, WARMUP_MS);
    const repeat = window.setInterval(tick, TICK_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(warmup);
      window.clearInterval(repeat);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const groups = useMemo(() => groupNotifications(items, new Date()), [items]);

  return {
    items,
    today: groups.today,
    earlier: groups.earlier,
    unread: unreadCount(items),
    markRead: (id: string) => replace(markReadIn(items, id)),
    markAllRead: () => replace(markAllReadIn(items)),
    clear: () => replace(clearNotifications()),
  };
}
