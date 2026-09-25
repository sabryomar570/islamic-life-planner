import { describe, expect, test } from "bun:test";
import {
  classifyNotification,
  prioritizeNotifications,
  type NotificationCandidate,
} from "../src/lib/notification-intelligence";

const now = new Date(2026, 8, 25, 8, 0);

function event(id: string, minutes: number, kind: string): NotificationCandidate {
  return {
    id,
    at: new Date(now.getTime() + minutes * 60_000),
    kind,
    title: id,
  };
}

describe("Notification Intelligence", () => {
  test("كل فئة تحمل سببًا وأولوية القيمة قبل عدد الإشعارات", () => {
    const prayer = classifyNotification(event("prayer", 0, "prayer"));
    const task = classifyNotification(event("task", 1, "important-task"));
    const recovery = classifyNotification(event("recovery", 2, "recovery"));

    expect(prayer.category).toBe("prayer");
    expect(prayer.reason).toContain("الصلاة");
    expect(prayer.priority).toBeGreaterThan(task.priority);
    expect(task.priority).toBeGreaterThan(recovery.priority);
    expect(recovery.reason).toContain("بلا لوم");
  });

  test("يزيل المكرر ويطوي burst نفسه في نافذة واحدة", () => {
    const result = prioritizeNotifications(
      [
        event("adhkar-1", 1, "adhkar"),
        event("adhkar-1", 1, "adhkar"),
        event("adhkar-2", 10, "adhkar"),
        event("sleep", 18, "sleep"),
      ],
      { now, burstWindowMinutes: 20 },
    );

    expect(result.map((item) => item.id)).toEqual(["adhkar-1"]);
  });

  test("لا يحجب تذكيرًا مهمًا بسبب تذكير ثانوي", () => {
    const result = prioritizeNotifications(
      [event("recovery", 2, "recovery"), event("task", 3, "important-task")],
      { now },
    );

    expect(result.map((item) => item.id)).toEqual(["task"]);
  });

  test("يحترم سجلًا حديثًا ولا يعيد إشعارًا اختفى", () => {
    const result = prioritizeNotifications(
      [event("old", -1, "wird"), event("new", 10, "wird")],
      { now, recentIds: ["old"] },
    );
    expect(result.map((item) => item.id)).toEqual(["new"]);
  });
});
