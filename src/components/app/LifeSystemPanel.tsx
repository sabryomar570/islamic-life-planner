import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import type { DailyPlan } from "@/lib/daily-plan";
import type { PlanItemOutcome, PlanItemStatus, DailyScore } from "@/lib/accountability";
import type { AdaptiveSuggestion } from "@/lib/adaptive-planning";
import type { ProgressSummary } from "@/lib/progress";
import type { WeeklyReview } from "@/lib/weekly-review";
import { Check, ChevronDown, Loader2, Minus, RotateCcw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

const STATUS_LABELS: Record<PlanItemStatus, string> = {
  completed: "تم",
  partial: "جزئي",
  postponed: "تأجيل",
  skipped: "لم يتم",
};

export function LifeSystemPanel(props: {
  plan: DailyPlan | null;
  outcomes: readonly PlanItemOutcome[];
  score: DailyScore | null;
  progress: ProgressSummary | null;
  weeklyReview: WeeklyReview | null;
  suggestions: readonly AdaptiveSuggestion[];
  savingItemId: string | null;
  applyingSuggestion: boolean;
  reviewing: boolean;
  onSetOutcome: (itemId: string, status: PlanItemStatus) => void;
  onResetOutcome: (itemId: string) => void;
  onSaveWeeklyReview: () => void;
  onApplySuggestion: (suggestion: AdaptiveSuggestion) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const byId = useMemo(
    () => new Map(props.outcomes.map((outcome) => [outcome.itemId, outcome])),
    [props.outcomes],
  );
  const actionable = props.suggestions.find((item) => item.kind === "move" || item.kind === "reduce");

  if (!props.plan) {
    return (
      <GlassCard className="p-4">
        <p className="text-sm font-semibold">نجهّز خطتك من نموذج حياتك</p>
        <p className="mt-1 text-xs text-muted-foreground">لن نضيف مهمة لم تخترها؛ انتظر لحظة واحدة.</p>
      </GlassCard>
    );
  }

  return (
    <GlassCard strong className="overflow-hidden p-0">
      <div className="p-5 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-primary">{props.plan.currentAnchor.title}</p>
            <h2 className="mt-1 text-xl font-bold">مهمتك الآن</h2>
            <p className="mt-2 text-sm font-semibold text-foreground/85">
              {props.plan.primaryAction?.item.title ?? "لا توجد خطوة مفعّلة الآن"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {props.plan.nextAnchor.prompt} ({props.plan.nextAnchor.title})
            </p>
          </div>
          <div className="rounded-2xl bg-primary/8 px-4 py-3 text-center">
            <p className="text-2xl font-bold text-primary">{props.score?.score ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground">تقدم اليوم</p>
          </div>
        </div>

        {props.score ? (
          <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
            {props.score.explanation[0]}
          </p>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2 text-[11px]">
          <span className="rounded-full bg-white/70 px-3 py-1.5">
            سجل نشط: {props.progress?.currentStreak ?? 0} يوم
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1.5">
            هذا الأسبوع: {props.progress?.weekly.completed ?? 0} خطوة
          </span>
          <span className="rounded-full bg-white/70 px-3 py-1.5">
            مراجعات: {props.progress?.weekly.reviewedDays ?? 0}
          </span>
        </div>
      </div>

      <div className="border-t border-border/55">
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="flex min-h-12 w-full items-center justify-between px-5 text-xs font-semibold text-primary sm:px-6"
        >
          تفاصيل خطة اليوم
          <ChevronDown className={`size-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
        {expanded ? (
          <div className="space-y-4 border-t border-border/55 px-5 py-4 sm:px-6">
            {props.plan.sections.map((section) => (
              <div key={section.key}>
                <p className="mb-2 text-xs font-bold text-muted-foreground">{section.title}</p>
                <div className="space-y-2">
                  {section.items.map(({ item, scheduledTime }) => {
                    const status = byId.get(item.id)?.status;
                    return (
                      <div key={item.id} className="rounded-2xl bg-white/65 p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-semibold">{item.title}</p>
                          {scheduledTime ? <span className="text-[10px] text-muted-foreground">{scheduledTime}</span> : null}
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(Object.keys(STATUS_LABELS) as PlanItemStatus[]).map((value) => (
                            <button
                              key={value}
                              type="button"
                              disabled={props.savingItemId === item.id}
                              onClick={() => props.onSetOutcome(item.id, value)}
                              className={`rounded-full px-2.5 py-1 text-[10px] font-medium transition-colors disabled:opacity-50 ${
                                status === value ? "bg-primary text-primary-foreground" : "bg-white/80 hover:bg-primary/8"
                              }`}
                            >
                              {STATUS_LABELS[value]}
                            </button>
                          ))}
                          {status ? (
                            <button
                              type="button"
                              onClick={() => props.onResetOutcome(item.id)}
                              className="mr-auto flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                            >
                              <RotateCcw className="size-3" /> تراجع
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <div className="grid gap-3 border-t border-border/55 p-4 sm:grid-cols-2 sm:p-5">
        <div className="rounded-2xl bg-primary/6 p-3">
          <p className="flex items-center gap-1.5 text-xs font-bold">
            <Sparkles className="size-3.5 text-primary" /> اقتراح تكيّف
          </p>
          {actionable ? (
            <>
              <p className="mt-2 text-[11px] leading-5">{actionable.reason}</p>
              <p className="mt-1 text-[10px] text-muted-foreground">{actionable.evidence.join(" • ")}</p>
              <Button
                type="button"
                size="sm"
                className="mt-3 rounded-full"
                disabled={props.applyingSuggestion}
                onClick={() => props.onApplySuggestion(actionable)}
              >
                {props.applyingSuggestion ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                موافقتي وتطبيقه
              </Button>
            </>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              {props.suggestions[0]?.reason ?? "لا توجد بيانات كافية لتغيير الخطة."}
            </p>
          )}
        </div>

        <div className="rounded-2xl bg-white/65 p-3">
          <p className="text-xs font-bold">مراجعة الأسبوع</p>
          {props.weeklyReview ? (
            <>
              <p className="mt-2 text-[11px] leading-5">
                الالتزام العام {props.weeklyReview.adherence}٪، وراجع {props.weeklyReview.reviewedDays} أيام.
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">{props.weeklyReview.weeklyFocus}</p>
            </>
          ) : (
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">لخّص أسبوعًا من التنفيذ قبل اقتراح التغيير.</p>
          )}
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 rounded-full"
            disabled={props.reviewing}
            onClick={props.onSaveWeeklyReview}
          >
            {props.reviewing ? <Loader2 className="size-3.5 animate-spin" /> : <Minus className="size-3.5" />}
            {props.weeklyReview ? "تحديث المراجعة" : "إنشاء المراجعة"}
          </Button>
        </div>
      </div>
    </GlassCard>
  );
}
