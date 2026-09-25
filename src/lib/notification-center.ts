/**
 * PHASE 3 — سجل الإشعارات داخل التطبيق.
 *
 * **ليس شبكة اجتماعية ولا صندوق وارد.** قائمة قصيرة عمّا حدث اليوم،
 * للرجوع إليه لا تصفح لا نهائي فيه. الحد الأقصى خمسون عنصرا، ولكل قالب تهدئة
 * قبل أن يتكرر. من تجاوز ذلك يكون التطبيق قد تحوّل إلى إزعاج.
 *
 * التخزين محلي على الجهاز، ويُمسح ضمن `clearLocalData` عبر بادئة مملوكة.
 */

import type { NotificationTemplate } from "./notification-templates";
import { inCooldown } from "./notification-templates";

export type StoredNotification = {
  /** معرّف فريد: القالب + وقت الوصول. */
  id: string;
  templateId: string;
  category: NotificationTemplate["category"];
  title: string;
  body: string;
  action: string;
  view?: string;
  tone: NotificationTemplate["tone"];
  at: number;
  read: boolean;
};

export const NOTIFICATION_STORE_KEY = "oud:notifications:v1";

/** سقف صريح. قائمة أطول من ذلك ليست سجلا، بل إزعاج. */
export const MAX_STORED_NOTIFICATIONS = 50;

export function isValidNotification(value: unknown): value is StoredNotification {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<StoredNotification>;
  return (
    typeof item.id === "string" &&
    item.id.length > 0 &&
    typeof item.templateId === "string" &&
    typeof item.title === "string" &&
    item.title.length > 0 &&
    typeof item.body === "string" &&
    typeof item.at === "number" &&
    Number.isFinite(item.at) &&
    typeof item.read === "boolean" &&
    typeof item.action === "string"
  );
}

export function makeNotificationId(templateId: string, at: number): string {
  return `${templateId}:${at}`;
}

/**
 * يضيف إشعارا. يرفض المكرّر داخل فترة التهدئة، ويحترم السقف.
 * **لا يرمي استثناء:** فشل التخزين يجب ألّا يوقف ما يفعله المستخدم.
 */
export function appendNotification(
  current: readonly StoredNotification[],
  template: NotificationTemplate,
  at: number,
): StoredNotification[] {
  const now = new Date(at);
  const lastFired: Record<string, number> = {};
  for (const item of current) {
    // نأخذ آخر ظهور للقالب، لا أوله.
    const seen = lastFired[item.templateId];
    if (seen === undefined || item.at > seen) lastFired[item.templateId] = item.at;
  }
  if (inCooldown(template, lastFired, now)) return [...current];

  const entry: StoredNotification = {
    id: makeNotificationId(template.id, at),
    templateId: template.id,
    category: template.category,
    title: template.title,
    body: template.body,
    action: template.action,
    view: template.view,
    tone: template.tone,
    at,
    read: false,
  };
  const deduped = current.filter((item) => item.id !== entry.id);
  return [entry, ...deduped].slice(0, MAX_STORED_NOTIFICATIONS);
}

export function markRead(
  current: readonly StoredNotification[],
  id: string,
  read = true,
): StoredNotification[] {
  return current.map((item) => (item.id === id ? { ...item, read } : item));
}

export function markAllRead(current: readonly StoredNotification[]): StoredNotification[] {
  return current.map((item) => (item.read ? item : { ...item, read: true }));
}

export function clearNotifications(): StoredNotification[] {
  return [];
}

export function unreadCount(current: readonly StoredNotification[]): number {
  return current.reduce((total, item) => (item.read ? total : total + 1), 0);
}

/** بداية اليوم المحلي. المقارنة بالساعة المحلية لا بـUTC. */
export function startOfLocalDay(now: Date): number {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
}

export type NotificationGroups = {
  today: StoredNotification[];
  earlier: StoredNotification[];
};

/** يفصل ما حدث اليوم عمّا قبله. الأحدث أولا داخل كل مجموعة. */
export function groupNotifications(
  current: readonly StoredNotification[],
  now: Date,
): NotificationGroups {
  const boundary = startOfLocalDay(now);
  const sorted = [...current].sort((a, b) => b.at - a.at);
  return {
    today: sorted.filter((item) => item.at >= boundary),
    earlier: sorted.filter((item) => item.at < boundary),
  };
}

/** يقرأ السجل ويتجاهل كل ما هو تالف بدل تعطيل الشاشة. */
export function readNotifications(): StoredNotification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(NOTIFICATION_STORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const list = Array.isArray(parsed) ? parsed : [];
    return list.filter(isValidNotification).slice(0, MAX_STORED_NOTIFICATIONS);
  } catch {
    return [];
  }
}

export function writeNotifications(items: readonly StoredNotification[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      NOTIFICATION_STORE_KEY,
      JSON.stringify(items.slice(0, MAX_STORED_NOTIFICATIONS)),
    );
  } catch {
    // الحافظة ممتلئة أو محظورة: السجل زينة، ولا يجوز أن يفسد الجلسة.
  }
}
