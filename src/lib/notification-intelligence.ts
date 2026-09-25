/** Notification Intelligence — classify by value, explain the reason, and suppress low-value bursts. */
export type NotificationCategory =
  | "prayer"
  | "dhikr"
  | "important-task"
  | "commitment"
  | "review"
  | "gentle-recovery"
  | "occasion"
  | "hadith";

export type NotificationCandidate = {
  id: string;
  at: Date;
  kind: string;
  title: string;
};

export type ClassifiedNotification<T extends NotificationCandidate> = T & {
  category: NotificationCategory;
  reason: string;
  priority: number;
};

const REASONS: Record<NotificationCategory, string> = {
  prayer: "مرتبط بمواقيت الصلاة التي اخترها المستخدم",
  dhikr: "لحظة الأذكار المرتبطة بختام اليوم أو بدايته",
  "important-task": "لحظة مهمة اختارها المستخدم وأهميتها أعلى من التذكيرات العامة",
  commitment: "اقتراب التزام اختاره المستخدم",
  review: "لحظة مراجعة اليوم أو الأسبوع",
  "gentle-recovery": "استدراك هادئ بعد انقطاع، بلا لوم",
  occasion: "مناسبة مناخرة عبر إعدادات المستخدم",
  // حديث اليوم: إضافة PHASE 3. أولوية دنيا عمدا، فهو دعوة للقراءة لا مهمة يوم.
  hadith: "حديث اليوم الذي يقرأه المستخدم حين يشاء",
};

export function classifyNotification<T extends NotificationCandidate>(event: T): ClassifiedNotification<T> {
  const value = event.kind;
  const category: NotificationCategory =
    value === "prayer" || value === "lead" ? "prayer"
      : value === "adhkar" || value === "sleep" ? "dhikr"
        : value === "wird" || value === "important-task" || value === "task" ? "important-task"
          : value === "commitment" ? "commitment"
            : value === "review" ? "review"
            : value === "recovery" ? "gentle-recovery"
              : value === "hadith" ? "hadith"
                : "occasion";
  return {
    ...event,
    category,
    reason: REASONS[category],
    priority:
      category === "prayer" ? 100
        : category === "important-task" ? 90
          : category === "commitment" ? 85
            : category === "review" ? 75
        : category === "dhikr" ? 65
          : category === "gentle-recovery" ? 35
            : category === "hadith" ? 25
              : 55,
  };
}

export function prioritizeNotifications<T extends NotificationCandidate>(
  events: readonly T[],
  input: { now: Date; recentIds?: readonly string[]; burstWindowMinutes?: number },
): ClassifiedNotification<T>[] {
  const burstMs = Math.max(5, input.burstWindowMinutes ?? 20) * 60_000;
  const recent = new Set(input.recentIds ?? []);
  const unique = new Map<string, ClassifiedNotification<T>>();
  for (const event of events) {
    if (!unique.has(event.id)) unique.set(event.id, classifyNotification(event));
  }
  const sorted = [...unique.values()]
    .filter((event) => !recent.has(event.id) && event.at.getTime() >= input.now.getTime() - 10 * 60_000)
    .sort((a, b) => a.at.getTime() - b.at.getTime() || b.priority - a.priority);
  const accepted: ClassifiedNotification<T>[] = [];
  for (const event of sorted) {
    const strongerNearby = accepted.some((chosen) =>
      chosen.category === event.category &&
      Math.abs(chosen.at.getTime() - event.at.getTime()) <= burstMs &&
      chosen.priority >= event.priority,
    );
    const blockedByImportant = event.priority < 60 && sorted.some((candidate) =>
      candidate.id !== event.id &&
      candidate.priority >= 75 &&
      Math.abs(candidate.at.getTime() - event.at.getTime()) <= burstMs,
    );
    if (!strongerNearby && !blockedByImportant) accepted.push(event);
  }
  return accepted;
}
