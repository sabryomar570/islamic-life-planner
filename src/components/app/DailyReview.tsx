import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  BLOCKER_LABELS,
  MOOD_LABELS,
  REVIEW_TIPS,
  reviewSummaryLine,
  type ReviewBlocker,
  type ReviewMood,
} from "@/lib/coach";
import { cn } from "@/lib/utils";
import { CheckCircle2, ClipboardCheck, Loader2 } from "lucide-react";
import { useState } from "react";

export type DayReviewRecord = {
  mood: ReviewMood;
  blocker: ReviewBlocker;
  note: string;
  plannedCount: number;
  completedCount: number;
  partialCount: number;
  postponedCount: number;
  skippedCount: number;
  succeeded: string;
  failed: string;
  why: string;
  tomorrowAdjustment: string;
};

const MOODS: ReviewMood[] = ["bad", "ok", "good", "great"];
const BLOCKERS: ReviewBlocker[] = ["none", "busy", "tired", "forgot", "mood"];

/**
 * مراجعة اليوم: مزاج اليوم وخلاصته، ثم ما نجح وتعثر وسببه وتعديل الغد.
 * تُغلق المراجعة اليوم نفسه، وتُشتق عدادات الخطة من سجلاتها لا من أرقام يدوية.
 */
export function DailyReview({
  visible,
  review,
  prayedToday,
  saving,
  onSave,
}: {
  visible: boolean;
  review: DayReviewRecord | null;
  prayedToday: number;
  saving: boolean;
  onSave: (input: DayReviewRecord) => void;
}) {
  const [mood, setMood] = useState<ReviewMood | null>(null);
  const [blocker, setBlocker] = useState<ReviewBlocker | null>(null);
  const [note, setNote] = useState("");
  const [succeeded, setSucceeded] = useState("");
  const [failed, setFailed] = useState("");
  const [why, setWhy] = useState("");
  const [tomorrowAdjustment, setTomorrowAdjustment] = useState("");
  const [postponed, setPostponed] = useState(false);

  if (!visible) return null;
  if (postponed && !review) return null;

  if (review) {
    return (
      <GlassCard className="p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
            <ClipboardCheck className="size-3.5 text-emerald-600" />
            مراجعة اليوم — تمّت
          </p>
          <span className="rounded-full bg-emerald-500/12 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700">
            {MOOD_LABELS[review.mood]}
          </span>
        </div>
        <p className="mt-2 text-[12px] leading-6">
          أكبر عائق: <span className="font-semibold">{BLOCKER_LABELS[review.blocker]}</span>
          {" — "}
          {reviewSummaryLine(prayedToday)}
        </p>
        <div className="mt-3 grid grid-cols-5 gap-1.5 text-center text-[10px] text-muted-foreground">
          {[
            ["مخطط", review.plannedCount],
            ["تم", review.completedCount],
            ["جزئي", review.partialCount],
            ["مؤجل", review.postponedCount],
            ["لم يتم", review.skippedCount],
          ].map(([label, value]) => (
            <span key={label} className="rounded-xl bg-white/65 px-1 py-2">
              <strong className="block text-sm text-foreground">{value}</strong>
              {label}
            </span>
          ))}
        </div>
        {review.succeeded ? (
          <p className="mt-2 text-[11px] leading-5"><strong>ما نجح:</strong> {review.succeeded}</p>
        ) : null}
        {review.failed ? (
          <p className="mt-1 text-[11px] leading-5"><strong>ما تعثر:</strong> {review.failed}</p>
        ) : null}
        {review.why ? (
          <p className="mt-1 text-[11px] leading-5"><strong>السبب:</strong> {review.why}</p>
        ) : null}
        <p className="mt-2 rounded-xl bg-primary/8 px-3 py-2 text-[11px] leading-5 text-foreground/85">
          غدًا: {review.tomorrowAdjustment || REVIEW_TIPS[review.blocker]}
        </p>
        {review.note ? (
          <p className="mt-2 rounded-xl bg-white/70 px-3 py-2 text-[11px] text-muted-foreground">
            «{review.note}»
          </p>
        ) : null}
      </GlassCard>
    );
  }

  const canSave = mood !== null && blocker !== null && !saving;

  return (
    <GlassCard strong className="p-4">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
        <ClipboardCheck className="size-3.5 text-primary" />
        مراجعة يومك — دقيقة واحدة
      </p>
      <p className="mt-1 text-[11px] leading-5 text-muted-foreground">{reviewSummaryLine(prayedToday)}</p>

      <div className="mt-3">
        <p className="text-[11px] font-medium">كيف كان يومك؟</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {MOODS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMood(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
                mood === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/70 text-foreground/70 hover:bg-white ring-1 ring-white/80",
              )}
            >
              {MOOD_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-medium">ما أكبر عائق اليوم؟</p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {BLOCKERS.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setBlocker(value)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-medium transition-all",
                blocker === value
                  ? "bg-primary text-primary-foreground"
                  : "bg-white/70 text-foreground/70 hover:bg-white ring-1 ring-white/80",
              )}
            >
              {BLOCKER_LABELS[value]}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        <Input
          value={succeeded}
          onChange={(event) => setSucceeded(event.target.value.slice(0, 240))}
          placeholder="ما الذي نجح اليوم؟ (اختياري)"
          className="glass-tile h-10 rounded-2xl border-white/70 text-[12px]"
          maxLength={240}
        />
        <Input
          value={failed}
          onChange={(event) => setFailed(event.target.value.slice(0, 240))}
          placeholder="ما الذي تعثر؟ (اختياري)"
          className="glass-tile h-10 rounded-2xl border-white/70 text-[12px]"
          maxLength={240}
        />
        <Input
          value={why}
          onChange={(event) => setWhy(event.target.value.slice(0, 240))}
          placeholder="لماذا؟ (اختياري)"
          className="glass-tile h-10 rounded-2xl border-white/70 text-[12px]"
          maxLength={240}
        />
        <Input
          value={tomorrowAdjustment}
          onChange={(event) => setTomorrowAdjustment(event.target.value.slice(0, 240))}
          placeholder="تعديل واحد واضح للغد (اختياري)"
          className="glass-tile h-10 rounded-2xl border-white/70 text-[12px]"
          maxLength={240}
        />
        <Input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 160))}
          placeholder="ملاحظة لنفسك (اختياري)"
          className="glass-tile h-10 rounded-2xl border-white/70 text-[12px]"
          maxLength={160}
        />
      </div>

      <div className="mt-3.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setPostponed(true)}
          className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
        >
          لاحقًا
        </button>
        <Button
          type="button"
          className="btn-edge rounded-full px-5"
          disabled={!canSave}
          onClick={() => {
            if (!mood || !blocker) return;
            onSave({
              mood,
              blocker,
              note: note.trim(),
              plannedCount: 0,
              completedCount: 0,
              partialCount: 0,
              postponedCount: 0,
              skippedCount: 0,
              succeeded: succeeded.trim(),
              failed: failed.trim(),
              why: why.trim(),
              tomorrowAdjustment: tomorrowAdjustment.trim(),
            });
          }}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
          حفظ المراجعة
        </Button>
      </div>
    </GlassCard>
  );
}
