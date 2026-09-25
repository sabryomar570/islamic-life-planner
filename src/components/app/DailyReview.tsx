import { Panel, PrimaryButton, QuietButton, SectionHead, StatusDot, Sunken } from "@/components/app/Surfaces";
import {
  BLOCKER_LABELS,
  MOOD_LABELS,
  REVIEW_TIPS,
  reviewSummaryLine,
  type ReviewBlocker,
  type ReviewMood,
} from "@/lib/coach";
import { cn } from "@/lib/utils";
import { ArrowLeft, Check, CheckCircle2, Loader2 } from "lucide-react";
import { useState, lazy, Suspense } from "react";

// PHASE 3: كسول عمدا حتى لا تدخل قاعدة الأحاديث المسار الحرج.
// **بعد كل الاستيراد لا قبله:** تسمية ثابتة بين الاستيرادات تعمل في
// البناء، وتترنّح في خادم التطوير حين لا يُرفع ترتيب التنفيذ كما هو.
const InsightSlot = lazy(() =>
  import("@/components/app/InsightSlot").then((module) => ({ default: module.InsightSlot })),
);

/**
 * PHASE 2K — مراجعة اليوم.
 *
 * طقس قصير: سؤال ← اختيار ← تأمّل ← إنهاء هادئ.
 * لا حقل يُملأ بلا سبب، وكل سؤال يُبنى على ما سبق — والإجابات كلها اختيارية بعد الأولين.
 */

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

const MOODS: { value: ReviewMood; label: string; hint: string }[] = [
  { value: "bad", label: "صعب", hint: "يوم أرهقك" },
  { value: "ok", label: "عادي", hint: "مرّ دون انفعال" },
  { value: "good", label: "جيد", hint: "أنجزت أكثر مما توقعت" },
  { value: "great", label: "ممتاز", hint: "يوم تحب أن تستعيده" },
];

const BLOCKERS: { value: ReviewBlocker; label: string; hint: string }[] = [
  { value: "none", label: "لا شيء", hint: "لا عائق حقيقي" },
  { value: "busy", label: "انشغال", hint: "الوقت ضاق" },
  { value: "tired", label: "إرهاق", hint: "طاقتك لم تكفِ" },
  { value: "forgot", label: "نسيان", hint: "لم أتذكّر" },
  { value: "mood", label: "حالة نفسية", hint: "لم أكن مرتاحًا" },
];

const STEPS = ["الحال", "العائق", "التأمّل", "الخلاصة"] as const;

export function DailyReview({
  visible,
  review,
  prayedToday,
  saving,
  onSave,
  /** موسّع: يُعرض كمهمة مستقلة في «متابعتي» لا كطسق مصغّر في الرئيسية. */
  expanded = false,
}: {
  visible: boolean;
  review: DayReviewRecord | null;
  prayedToday: number;
  saving: boolean;
  onSave: (input: DayReviewRecord) => void;
  expanded?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [mood, setMood] = useState<ReviewMood | null>(null);
  const [blocker, setBlocker] = useState<ReviewBlocker | null>(null);
  const [succeeded, setSucceeded] = useState("");
  const [failed, setFailed] = useState("");
  const [why, setWhy] = useState("");
  const [tomorrowAdjustment, setTomorrowAdjustment] = useState("");
  const [note, setNote] = useState("");
  const [postponed, setPostponed] = useState(false);

  if (!visible) return null;
  if (postponed && !review) return null;

  /* ——————————— الحالة المكتملة: خلاصة هادئة لا جدول ——————————— */
  if (review) {
    return (
      <Panel className={expanded ? "p-5 sm:p-6" : "p-4 sm:p-5"}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="flex items-center gap-1.5 text-[12px] font-semibold">
            <CheckCircle2 className="size-4 text-[var(--status-success)]" />
            مراجعة اليوم
          </p>
          <span className="flex items-center gap-1.5 rounded-full bg-[var(--status-success)]/10 px-2.5 py-1 text-[11px] font-semibold text-[var(--status-success)]">
            <StatusDot state="success" />
            {MOOD_LABELS[review.mood]}
          </span>
        </div>

        <p className="label-body mt-2 text-muted-foreground">
          أكبر عائق: <span className="font-semibold text-foreground">{BLOCKER_LABELS[review.blocker]}</span> —{" "}
          {reviewSummaryLine(prayedToday)}
        </p>

        <dl className="mt-3 grid grid-cols-5 gap-1 text-center">
          {[
            ["مخطط", review.plannedCount],
            ["تم", review.completedCount],
            ["جزئي", review.partialCount],
            ["مؤجل", review.postponedCount],
            ["لم يتم", review.skippedCount],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl surface-sunken px-1 py-2">
              <dd className="text-[13px] font-bold">{value}</dd>
              <dt className="label-meta text-muted-foreground">{label}</dt>
            </div>
          ))}
        </dl>

        {review.succeeded ? (
          <p className="label-body mt-3">
            <span className="font-semibold">ما نجح:</span> {review.succeeded}
          </p>
        ) : null}
        {review.failed ? (
          <p className="label-body mt-1">
            <span className="font-semibold">ما تعثر:</span> {review.failed}
          </p>
        ) : null}
        {review.why ? (
          <p className="label-body mt-1">
            <span className="font-semibold">السبب:</span> {review.why}
          </p>
        ) : null}

        <Sunken className="mt-3 px-3.5 py-2.5">
          <p className="label-body text-foreground/85">
            <span className="font-semibold">غدًا:</span>{" "}
            {review.tomorrowAdjustment || REVIEW_TIPS[review.blocker]}
          </p>
        </Sunken>

        {review.note ? (
          <p className="label-meta mt-2 text-muted-foreground">«{review.note}»</p>
        ) : null}
      </Panel>
    );
  }

  /* ——————————— الطقس: خطوة واحدة على الشاشة ——————————— */
  const canAdvance =
    step === 0 ? mood !== null : step === 1 ? blocker !== null : true;

  const commit = () => {
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
  };

  return (
    <Panel className={cn("overflow-hidden", expanded ? "p-0" : "")}>
      {expanded ? (
        /* اقتباس المحاسبة: يظهر عند فتح المراجعة، لا يزعج مطويّة. */
        <div className="px-5 pt-5 sm:px-6 sm:pt-6">
          <Suspense fallback={null}>
            <InsightSlot area="review" />
          </Suspense>
        </div>
      ) : null}
      <div className={cn(expanded ? "p-5 sm:p-6" : "p-4 sm:p-5")}>
        <div className="flex items-center justify-between gap-3">
          <SectionHead
            eyebrow="طقس المساء"
            title="مراجعة اليوم"
            hint={reviewSummaryLine(prayedToday)}
            className="min-w-0"
          />
          <span className="shrink-0 text-[11px] text-muted-foreground">
            {arabicStep(step + 1)} من {arabicStep(STEPS.length)}
          </span>
        </div>

        {/* تقدّم هادئ: أربع شرطات، لا رقم كبير. */}
        <div className="mt-3 flex gap-1" aria-hidden>
          {STEPS.map((name, index) => (
            <span
              key={name}
              className={cn(
                "h-1 flex-1 rounded-full transition-colors",
                index <= step ? "bg-primary" : "bg-[var(--status-idle)]",
              )}
            />
          ))}
        </div>
      </div>

      <div className={cn("rule-t", expanded ? "px-5 py-5 sm:px-6" : "px-4 py-4 sm:px-5")}>
        {step === 0 ? (
          <fieldset>
            <legend className="label-section">كيف كان يومك؟</legend>
            <p className="label-meta mt-1 text-muted-foreground">سؤال واحد، بلا رقم ولا حساب.</p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {MOODS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMood(option.value)}
                  aria-pressed={mood === option.value}
                  className={cn(
                    "motion-press flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center",
                    mood === option.value
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "surface-secondary text-foreground/80 hover:bg-white/80",
                  )}
                >
                  <span className="text-[13px] font-semibold">{option.label}</span>
                  <span
                    className={cn(
                      "text-[11px] leading-4",
                      mood === option.value ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 1 ? (
          <fieldset>
            <legend className="label-section">ما أكبر عائق اليوم؟</legend>
            <p className="label-meta mt-1 text-muted-foreground">
              صراحتك هنا هي ما يجعل الاقتراحات التي ستأتي صادقة.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
              {BLOCKERS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setBlocker(option.value)}
                  aria-pressed={blocker === option.value}
                  className={cn(
                    "motion-press flex min-h-[68px] flex-col items-center justify-center gap-0.5 rounded-2xl px-2 py-2 text-center",
                    blocker === option.value
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "surface-secondary text-foreground/80 hover:bg-white/80",
                  )}
                >
                  <span className="text-[13px] font-semibold">{option.label}</span>
                  <span
                    className={cn(
                      "text-[11px] leading-4",
                      blocker === option.value ? "text-primary-foreground/80" : "text-muted-foreground",
                    )}
                  >
                    {option.hint}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
        ) : null}

        {step === 2 ? (
          <div>
            <p className="label-section">سطران لنفسك — كلٌّ منهما اختياري</p>
            <div className="mt-3 space-y-2">
              <ReflectionField
                label="ما الذي نجح اليوم؟"
                value={succeeded}
                onChange={setSucceeded}
                maxLength={240}
              />
              <ReflectionField
                label="ما الذي تعثر؟"
                value={failed}
                onChange={setFailed}
                maxLength={240}
              />
              <ReflectionField
                label="لماذا؟"
                value={why}
                onChange={setWhy}
                maxLength={240}
              />
            </div>
          </div>
        ) : null}

        {step === 3 ? (
          <div>
            <p className="label-section">تعديل واحد واضح للغد</p>
            <p className="label-meta mt-1 text-muted-foreground">
              {blocker ? REVIEW_TIPS[blocker] : "اكتب شيئًا واحدًا تغيّره غدًا."}
            </p>
            <div className="mt-3 space-y-2">
              <ReflectionField
                label="ما التعديل؟"
                value={tomorrowAdjustment}
                onChange={setTomorrowAdjustment}
                maxLength={240}
                placeholder="مثال: أبدأ أول قفزة بعد صلاة الفجر مباشرة"
              />
              <ReflectionField
                label="ملاحظة لنفسك (اختياري)"
                value={note}
                onChange={setNote}
                maxLength={160}
              />
            </div>
            <Sunken className="mt-3 px-3.5 py-2.5">
              <p className="label-body text-foreground/85">
                <span className="font-semibold">غدًا:</span>{" "}
                {tomorrowAdjustment.trim() || (blocker ? REVIEW_TIPS[blocker] : "خطوة واحدة ثابتة.")}
              </p>
            </Sunken>
          </div>
        ) : null}
      </div>

      {/* ——— التنقّل بين الخطوات: إجراء واحد صريح في كل مرة ——— */}
      <div
        className={cn(
          "rule-t flex items-center justify-between gap-2",
          expanded ? "px-5 py-4 sm:px-6" : "px-4 py-3.5 sm:px-5",
        )}
      >
        {step === 0 ? (
          <button
            type="button"
            onClick={() => setPostponed(true)}
            className="touch-target text-[12px] text-muted-foreground underline-offset-4 hover:underline"
          >
            لاحقًا
          </button>
        ) : (
          <QuietButton onClick={() => setStep((value) => Math.max(0, value - 1))} className="px-4">
            <ArrowLeft className="size-3.5" />
            رجوع
          </QuietButton>
        )}

        {step < STEPS.length - 1 ? (
          <PrimaryButton
            onClick={() => setStep((value) => value + 1)}
            disabled={!canAdvance}
            className="px-5 text-[12px]"
          >
            التالي
            <ArrowLeft className="size-3.5" />
          </PrimaryButton>
        ) : (
          <PrimaryButton
            onClick={commit}
            disabled={saving}
            className="px-5 text-[12px]"
          >
            {saving ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Check className="size-3.5" />
            )}
            إنهاء المراجعة
          </PrimaryButton>
        )}
      </div>
    </Panel>
  );
}

function ReflectionField({
  label,
  value,
  onChange,
  maxLength,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="label-meta text-muted-foreground">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, maxLength))}
        maxLength={maxLength}
        placeholder={placeholder}
        className="mt-1 h-11 w-full rounded-2xl border border-[var(--rule)] bg-white/80 px-3.5 text-[12.5px] outline-none transition-colors placeholder:text-muted-foreground/60 focus-visible:border-primary"
      />
    </label>
  );
}

const ARABIC_STEPS = ["١", "٢", "٣", "٤"];

function arabicStep(value: number) {
  return ARABIC_STEPS[value - 1] ?? String(value);
}
