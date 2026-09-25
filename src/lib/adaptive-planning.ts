/**
 * Adaptive Planning Foundation — rule-based suggestions from real plan outcomes.
 * It never changes a plan implicitly: every actionable suggestion requires approval.
 */
import type { PlanItemOutcome, PlanItemStatus } from "./accountability";
import type {
  PlanImportance,
  PlanItemKind,
  WeeklyPlanItem,
  WeeklyPlanItemPatch,
} from "./weekly-plan";

export type AdaptiveObservation = {
  itemId: string;
  date: string;
  kind: PlanItemKind;
  importance: PlanImportance;
  startTime?: string;
  status: PlanItemStatus;
};

export type AdaptiveSuggestion = {
  id: string;
  kind: "move" | "reduce" | "protect" | "keep";
  target: string;
  reason: string;
  evidence: string[];
  confidence: "low" | "medium" | "high";
  requiresApproval: true;
  itemIds: string[];
  patch?: WeeklyPlanItemPatch;
};

const IMPORTANCE_RANK: Record<PlanImportance, number> = {
  foundation: 0,
  core: 1,
  supporting: 2,
  optional: 3,
};

function success(status: PlanItemStatus) {
  return status === "completed" || status === "partial";
}

/** Uses at least two postponements and a demonstrably better observed window. */
function moveSuggestions(
  currentItems: readonly WeeklyPlanItem[],
  observations: readonly AdaptiveObservation[],
): AdaptiveSuggestion[] {
  const byKind = new Map<PlanItemKind, AdaptiveObservation[]>();
  for (const observation of observations) {
    if (!observation.startTime) continue;
    byKind.set(observation.kind, [...(byKind.get(observation.kind) ?? []), observation]);
  }

  const suggestions: AdaptiveSuggestion[] = [];
  for (const [kind, entries] of byKind) {
    const byTime = new Map<string, AdaptiveObservation[]>();
    for (const entry of entries) {
      byTime.set(entry.startTime!, [...(byTime.get(entry.startTime!) ?? []), entry]);
    }
    const ranked = [...byTime.entries()]
      .map(([time, values]) => ({
        time,
        values,
        successRate: values.filter((entry) => success(entry.status)).length / values.length,
        postponements: values.filter((entry) => entry.status === "postponed").length,
      }))
      .sort((a, b) => b.successRate - a.successRate || b.postponements - a.postponements);

    const poor = ranked.find(
      (slot) => slot.postponements >= 2 && slot.successRate <= 0.5,
    );
    const better = ranked.find(
      (slot) => slot.time !== poor?.time && slot.successRate >= 0.7,
    );
    if (!poor || !better) continue;
    const affected = currentItems
      .filter((item) => item.enabled && item.kind === kind && item.startTime === poor.time)
      .map((item) => item.id);
    if (affected.length === 0) continue;
    suggestions.push({
      id: `move:${kind}:${poor.time}:${better.time}`,
      kind: "move",
      target: kind,
      reason: "هذا الموعد تكرّر تأجيله، وظهر وقت آخر نجح أعلى في السجل نفسه.",
      evidence: [
        `${poor.postponements} تأجيلات في ${poor.time}`,
        `نجاح ${Math.round(better.successRate * 100)}٪ في ${better.time}`,
      ],
      confidence: poor.postponements >= 3 ? "high" : "medium",
      requiresApproval: true,
      itemIds: affected,
      patch: { startTime: better.time },
    });
  }
  return suggestions;
}

function reduceSuggestion(
  currentItems: readonly WeeklyPlanItem[],
  observations: readonly AdaptiveObservation[],
): AdaptiveSuggestion | null {
  const days = new Set(observations.map((entry) => entry.date));
  if (days.size < 5) return null;
  const successRate = observations.filter((entry) => success(entry.status)).length /
    Math.max(1, observations.length);
  if (successRate >= 0.55) return null;
  const candidate = [...currentItems]
    .filter((item) => item.enabled)
    .sort((a, b) => IMPORTANCE_RANK[b.importance] - IMPORTANCE_RANK[a.importance])[0];
  if (!candidate || candidate.importance === "foundation") return null;
  return {
    id: `reduce:${candidate.kind}:${candidate.importance}`,
    kind: "reduce",
    target: candidate.id,
    reason: "الحمل المتكرر أكبر من الطاقة المسجلة؛ اقتراح的问题是 تخفيف عنصر اختياري أولًا.",
    evidence: [
      `${days.size} أيام ملحوظة`,
      `التزام أقل من 55٪ (${Math.round(successRate * 100)}٪)`,
    ],
    confidence: days.size >= 7 ? "high" : "medium",
    requiresApproval: true,
    itemIds: [candidate.id],
    patch: { enabled: false },
  };
}

export function buildAdaptiveSuggestions(input: {
  currentItems: readonly WeeklyPlanItem[];
  outcomes: readonly PlanItemOutcome[];
  observations?: readonly AdaptiveObservation[];
}): AdaptiveSuggestion[] {
  const observations = input.observations ?? input.outcomes.map((outcome) => {
    const item = input.currentItems.find((entry) => entry.id === outcome.itemId);
    return {
      itemId: outcome.itemId,
      date: outcome.date,
      kind: item?.kind ?? "habit",
      importance: item?.importance ?? "optional",
      ...(item?.startTime ? { startTime: item.startTime } : {}),
      status: outcome.status,
    } satisfies AdaptiveObservation;
  });
  const move = moveSuggestions(input.currentItems, observations);
  const reduce = reduceSuggestion(input.currentItems, observations);
  const suggestions = [...move, ...(reduce ? [reduce] : [])];

  const successfulTimes = new Map<string, { earned: number; total: number }>();
  for (const entry of observations) {
    if (!entry.startTime) continue;
    const bucket = successfulTimes.get(entry.startTime) ?? { earned: 0, total: 0 };
    bucket.total += 1;
    if (success(entry.status)) bucket.earned += 1;
    successfulTimes.set(entry.startTime, bucket);
  }
  const protectedTime = [...successfulTimes.entries()]
    .filter(([, value]) => value.total >= 2 && value.earned / value.total >= 0.75)
    .sort((a, b) => b[1].earned / b[1].total - a[1].earned / a[1].total)[0];
  if (protectedTime) {
    suggestions.push({
      id: `protect:${protectedTime[0]}`,
      kind: "protect",
      target: protectedTime[0],
      reason: "هذه النافذة أعلى التزامًا في السجل؛ يستحق حمايتها في الخطة.",
      evidence: [`${protectedTime[1].earned} من ${protectedTime[1].total} خطوات ناجحة`],
      confidence: "medium",
      requiresApproval: true,
      itemIds: [],
    });
  }

  if (suggestions.length === 0) {
    suggestions.push({
      id: "keep:current-plan",
      kind: "keep",
      target: "current-plan",
      reason: "البيانات الحالية لا تكفي لتغيير الخطة؛ نُبقي اختيارك كما هو.",
      evidence: [],
      confidence: "low",
      requiresApproval: true,
      itemIds: [],
    });
  }
  return suggestions;
}

/** Applies only an explicitly selected suggestion to a concrete current item set. */
export function applyApprovedSuggestion(
  items: readonly WeeklyPlanItem[],
  suggestion: AdaptiveSuggestion,
): { items: WeeklyPlanItem[]; changed: boolean } {
  if (!suggestion.requiresApproval || suggestion.kind === "keep" || suggestion.kind === "protect" || !suggestion.patch) {
    return { items: [...items], changed: false };
  }
  const ids = new Set(suggestion.itemIds);
  if (ids.size === 0 || items.some((item) => ids.has(item.id) && !item.enabled)) {
    return { items: [...items], changed: false };
  }
  let changed = false;
  const next = items.map((item) => {
    if (!ids.has(item.id)) return item;
    const updated = { ...item, ...suggestion.patch } as WeeklyPlanItem;
    if (JSON.stringify(updated) === JSON.stringify(item)) return item;
    changed = true;
    return updated;
  });
  return { items: next, changed };
}
