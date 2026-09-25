/** Daily Review learning summary — derives facts from plan/outcome records without judging the user. */
import type { PlanItemOutcome, PlanItemStatus } from "./accountability";
import type { WeeklyPlanItem } from "./weekly-plan";

export type DailyReviewLearning = {
  planned: number;
  completed: number;
  partial: number;
  postponed: number;
  skipped: number;
  succeeded: string[];
  failed: string[];
  why: string;
  tomorrowAdjustment: string;
};

function clean(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function buildDailyReviewLearning(input: {
  items: readonly WeeklyPlanItem[];
  outcomes: readonly PlanItemOutcome[];
  succeeded?: string;
  failed?: string;
  why?: string;
  tomorrowAdjustment?: string;
}): DailyReviewLearning {
  const enabled = input.items.filter((item) => item.enabled);
  const byId = new Map(input.outcomes.map((outcome) => [outcome.itemId, outcome]));
  const counts: Record<PlanItemStatus, number> = {
    completed: 0,
    partial: 0,
    postponed: 0,
    skipped: 0,
  };
  const succeeded: string[] = [];
  const failed: string[] = [];

  for (const item of enabled) {
    const status = byId.get(item.id)?.status;
    if (status) counts[status] += 1;
    if (status === "completed") succeeded.push(item.title);
    if (status === "skipped") failed.push(item.title);
  }

  const userSucceeded = clean(input.succeeded ?? "", 240);
  const userFailed = clean(input.failed ?? "", 240);
  return {
    planned: enabled.length,
    ...counts,
    succeeded: userSucceeded ? [userSucceeded] : succeeded.slice(0, 3),
    failed: userFailed ? [userFailed] : failed.slice(0, 3),
    why: clean(input.why ?? "", 240),
    tomorrowAdjustment: clean(input.tomorrowAdjustment ?? "", 240),
  };
}
