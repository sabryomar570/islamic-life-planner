import { describe, expect, test } from "bun:test";
import {
  applyApprovedSuggestion,
  buildAdaptiveSuggestions,
  type AdaptiveObservation,
} from "../src/lib/adaptive-planning";
import type { WeeklyPlanItem } from "../src/lib/weekly-plan";

function item(id: string, patch: Partial<WeeklyPlanItem> = {}): WeeklyPlanItem {
  return {
    id,
    date: "2026-09-21",
    day: 0,
    kind: "habit",
    title: "قراءة",
    importance: "supporting",
    recurrence: "daily",
    origin: "profile",
    enabled: true,
    startTime: "07:00",
    ...patch,
  };
}

function observation(
  id: string,
  date: string,
  status: AdaptiveObservation["status"],
  startTime: string,
): AdaptiveObservation {
  return {
    itemId: id,
    date,
    kind: "habit",
    importance: "supporting",
    startTime,
    status,
  };
}

describe("Adaptive Planning Foundation", () => {
  test("يقترح نقل نافذة متعثرة إلى نافذة ناجحة فقط بدليل متكرر", () => {
    const current = [item("2026-09-21:habit")];
    const observations = [
      observation("a", "2026-09-01", "postponed", "07:00"),
      observation("b", "2026-09-02", "postponed", "07:00"),
      observation("c", "2026-09-03", "postponed", "07:00"),
      observation("d", "2026-09-01", "completed", "09:00"),
      observation("e", "2026-09-02", "completed", "09:00"),
      observation("f", "2026-09-03", "partial", "09:00"),
    ];
    const move = buildAdaptiveSuggestions({ currentItems: current, outcomes: [], observations })
      .find((suggestion) => suggestion.kind === "move");

    expect(move).toBeDefined();
    expect(move?.itemIds).toEqual(["2026-09-21:habit"]);
    expect(move?.patch?.startTime).toBe("09:00");
    expect(move?.confidence).toBe("high");
    expect(move?.requiresApproval).toBe(true);
  });

  test("يخفف الحمل عند تكرار عدم الالتزام ولا يقترح زيادة الضغط", () => {
    const current = [
      item("2026-09-21:habit"),
      item("2026-09-21:rest", { kind: "rest", importance: "optional", startTime: "20:00" }),
    ];
    const observations = Array.from({ length: 6 }, (_, index) =>
      observation(`x-${index}`, `2026-09-${15 + index}`, "skipped", "07:00"),
    );
    const suggestions = buildAdaptiveSuggestions({ currentItems: current, outcomes: [], observations });
    const reduce = suggestions.find((suggestion) => suggestion.kind === "reduce");

    expect(reduce?.itemIds).toEqual(["2026-09-21:rest"]);
    expect(reduce?.patch).toEqual({ enabled: false });
    expect(suggestions.some((suggestion) => suggestion.kind === "protect")).toBe(false);
  });

  test("يحمي نافذة ذات نجاح متكرر لكنه لا يغير الخطة تلقائيًا", () => {
    const current = [item("2026-09-21:habit")];
    const observations = [
      observation("a", "2026-09-01", "completed", "07:00"),
      observation("b", "2026-09-02", "completed", "07:00"),
      observation("c", "2026-09-03", "completed", "07:00"),
    ];
    const protect = buildAdaptiveSuggestions({ currentItems: current, outcomes: [], observations })
      .find((suggestion) => suggestion.kind === "protect");

    expect(protect?.target).toBe("07:00");
    expect(protect?.itemIds).toEqual([]);
    expect(current[0].startTime).toBe("07:00");
  });

  test("البيانات غير الكافية تنتج keep بلا ادعاء نمط", () => {
    const result = buildAdaptiveSuggestions({ currentItems: [item("a")], outcomes: [] });
    expect(result).toHaveLength(1);
    expect(result[0].kind).toBe("keep");
    expect(result[0].evidence).toEqual([]);
  });

  test("التطبيق يتطلب اقتراحًا معتمدًا ويحدث نسخة الخطة مرة واحدة", () => {
    const current = [item("a"), item("b")];
    const suggestion = {
      id: "move:habit:07:00:09:00",
      kind: "move" as const,
      target: "habit",
      reason: "دليل",
      evidence: [],
      confidence: "medium" as const,
      requiresApproval: true as const,
      itemIds: ["a"],
      patch: { startTime: "09:00" },
    };
    const first = applyApprovedSuggestion(current, suggestion);
    const second = applyApprovedSuggestion(first.items, suggestion);

    expect(first.changed).toBe(true);
    expect(first.items[0].startTime).toBe("09:00");
    expect(first.items[1].startTime).toBe("07:00");
    expect(second.changed).toBe(false);
  });
});
