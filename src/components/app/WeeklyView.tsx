import {
  Meter,
  Panel,
  PrimaryButton,
  QuietButton,
  SectionHead,
  StatusDot,
  Sunken,
} from "@/components/app/Surfaces";
import type { AdaptiveSuggestion } from "@/lib/adaptive-planning";
import { arabicNumber, dateKey, formatArabicTime, weekdayShort } from "@/lib/time";
import type { WeeklyPlan, WeeklyPlanItem } from "@/lib/weekly-plan";
import type { WeeklyReview } from "@/lib/weekly-review";
import { cn } from "@/lib/utils";
import {
  CalendarRange,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

/**
 * PHASE 2J — الخطة الأسبوعية.
 *
 * ليست جدولًا: أيام متتابعة تُقرأ كسطر، وعناصرها تُعدَّل في مكانها.
 * المستخدم صاحب القرار النهائي في وقته — لا رتابة مفروضة ولا تراجع صامت.
 */

const KIND_LABEL: Record<string, string> = {
  prayer: "صلاة",
  dhikr: "ذكر",
  quran: "قرآن",
  work: "عمل",
  sleep: "نوم",
  habit: "عادة",
  goal: "هدف",
  focus: "تركيز",
  rest: "راحة",
  commitment: "التزام",
};

const IMPORTANCE_LABEL: Record<string, string> = {
  foundation: "أساس",
  core: "أساسي",
  supporting: "مساند",
  optional: "اختياري",
};

function shiftWeek(weekStart: string, days: number) {
  const date = new Date(`${weekStart}T00:00:00`);
  date.setDate(date.getDate() + days);
  return dateKey(date);
}

export function WeeklyView({
  plan,
  weekStart,
  today,
  progress,
  weeklyReview,
  suggestions,
  applyingSuggestion,
  reviewing,
  savingItemId,
  onWeekChange,
  onPatchItem,
  onApplySuggestion,
  onSaveWeeklyReview,
}: {
  plan: WeeklyPlan | null;
  weekStart: string;
  today: string;
  progress: { completed: number; total: number; reviewedDays: number } | null;
  weeklyReview: WeeklyReview | null;
  suggestions: readonly AdaptiveSuggestion[];
  applyingSuggestion: boolean;
  reviewing: boolean;
  savingItemId: string | null;
  onWeekChange: (weekStart: string) => void;
  onPatchItem: (itemId: string, patch: { title?: string; enabled?: boolean }) => void;
  onApplySuggestion: (suggestion: AdaptiveSuggestion) => void;
  onSaveWeeklyReview: () => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");

  const days = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const date = new Date(`${weekStart}T00:00:00`);
        date.setDate(date.getDate() + index);
        return dateKey(date);
      }),
    [weekStart],
  );

  const itemsByDay = useMemo(() => {
    const map = new Map<string, WeeklyPlanItem[]>();
    for (const day of days) map.set(day, []);
    for (const item of plan?.items ?? []) {
      if (!map.has(item.date)) continue;
      map.get(item.date)!.push(item);
    }
    for (const list of map.values()) {
      list.sort((a, b) => (a.startTime ?? "99:99").localeCompare(b.startTime ?? "99:99"));
    }
    return map;
  }, [days, plan?.items]);

  const isCurrentWeek = weekStart === today.slice(0, 8) + "01" || days.includes(today);
  const actionable = suggestions.find((item) => item.kind === "move" || item.kind === "reduce");
  const completion = progress && progress.total > 0 ? progress.completed / progress.total : 0;

  /** أسطر تُقرأ في جملة واحدة، لا لوحة أرقام. */
  const weeklyFacts = useMemo(() => {
    if (!weeklyReview) return [];
    const facts: string[] = [];
    if (weeklyReview.mostConsistentHabit) {
      facts.push(
        `أكثر ما ثبت: ${KIND_LABEL[weeklyReview.mostConsistentHabit.kind] ?? weeklyReview.mostConsistentHabit.kind} (${arabicNumber(weeklyReview.mostConsistentHabit.count)} مرة).`,
      );
    }
    if (weeklyReview.mostPostponed) {
      facts.push(
        `أكثر ما تأجّل: ${KIND_LABEL[weeklyReview.mostPostponed.kind] ?? weeklyReview.mostPostponed.kind} (${arabicNumber(weeklyReview.mostPostponed.count)} مرة).`,
      );
    }
    if (weeklyReview.successfulPeriods.length > 0) {
      facts.push(`نوافذ التزمت بها: ${weeklyReview.successfulPeriods.join("، ")}.`);
    }
    if (weeklyReview.difficultPeriods.length > 0) {
      facts.push(`نوافذ تعثّرت: ${weeklyReview.difficultPeriods.join("، ")}.`);
    }
    return facts;
  }, [weeklyReview]);

  return (
    <div className="stack">
      {/* ——— رأس الخطة: أي أسبوع، وأين نضع جهدنا ——— */}
      <Panel className="p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => onWeekChange(shiftWeek(weekStart, -7))}
            aria-label="الأسبوع السابق"
            className="btn-edge touch-target flex items-center justify-center rounded-2xl"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="min-w-0 flex-1 text-center">
            <p className="eyebrow flex items-center justify-center gap-1.5">
              <CalendarRange className="size-3.5" />
              {isCurrentWeek ? "أسبوعك الحالي" : "أسبوع آخر"}
            </p>
            <p className="label-section mt-1">
              {weekdayShort(new Date(`${weekStart}T00:00:00`))} {weekStart}
            </p>
          </div>
          <button
            type="button"
            onClick={() => onWeekChange(shiftWeek(weekStart, 7))}
            aria-label="الأسبوع التالي"
            className="btn-edge touch-target flex items-center justify-center rounded-2xl"
          >
            <ChevronLeft className="size-4" />
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <p className="label-meta text-muted-foreground">تركيز هذا الأسبوع</p>
            <p className="mt-0.5 text-[15px] font-semibold">{plan?.weeklyFocus ?? "لم يُحدَّد بعد"}</p>
          </div>
          {progress && progress.total > 0 ? (
            <div className="sm:text-end">
              <p className="text-[15px] font-bold text-primary">
                {arabicNumber(progress.completed)} / {arabicNumber(progress.total)}
              </p>
              <p className="label-meta text-muted-foreground">خطوة منفَّذة</p>
            </div>
          ) : null}
        </div>
        {progress && progress.total > 0 ? (
          <Meter className="mt-3" value={completion * 100} tone="success" label="نسبة إنجاز الأسبوع" />
        ) : null}
      </Panel>

      {/* ——— اقتراح التكيّف: قبل الأيام، لأنه يغيّر ما سنعرضه ——— */}
      {actionable ? (
        <Panel className="p-5 sm:p-6">
          <SectionHead
            eyebrow="تكيّف"
            title="اقتراح مبنيّ على تنفيذك"
            hint={actionable.reason}
          />
          <p className="label-meta mt-2 text-muted-foreground">
            {actionable.evidence.join(" · ")}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <PrimaryButton
              onClick={() => onApplySuggestion(actionable)}
              disabled={applyingSuggestion}
              className="h-10 px-4 text-[12px]"
            >
              {applyingSuggestion ? (
                <Loader2 className="size-3.5 animate-spin" />
              ) : (
                <Check className="size-3.5" />
              )}
              موافقتي وتطبيقه
            </PrimaryButton>
          </div>
        </Panel>
      ) : null}

      {/* ——— الأيام: سطر لكل يوم، عناصره تُعدَّل في مكانها ——— */}
      {days.map((day) => {
        const items = itemsByDay.get(day) ?? [];
        const date = new Date(`${day}T00:00:00`);
        const isToday = day === today;
        return (
          <section key={day} aria-label={weekdayShort(date)}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3 px-1">
              <h3 className={cn("label-section", isToday && "text-primary")}>
                {weekdayShort(date)}
                <span className="label-meta me-2 font-normal text-muted-foreground">{day.slice(5)}</span>
                {isToday ? <span className="label-meta me-2 font-normal">اليوم</span> : null}
              </h3>
              <span className="label-meta text-muted-foreground">
                {arabicNumber(items.filter((item) => item.enabled).length)} خطوة
              </span>
            </div>

            {items.length === 0 ? (
              <Sunken className="px-4 py-3">
                <p className="label-meta text-muted-foreground">
                  لا خطوات مفعّلة في هذا اليوم.
                </p>
              </Sunken>
            ) : (
              <ul className="stack-sm">
                {items.map((item) => (
                  <li key={item.id}>
                    <WeekItemRow
                      item={item}
                      busy={savingItemId === item.id}
                      editing={editingId === item.id}
                      draftTitle={draftTitle}
                      onDraftChange={setDraftTitle}
                      onStartEdit={() => {
                        setEditingId(item.id);
                        setDraftTitle(item.title);
                      }}
                      onCancelEdit={() => setEditingId(null)}
                      onCommit={() => {
                        const title = draftTitle.trim();
                        if (title && title !== item.title) onPatchItem(item.id, { title });
                        setEditingId(null);
                      }}
                      onToggle={() => onPatchItem(item.id, { enabled: !item.enabled })}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}

      {/* ——— مراجعة الأسبوع ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="متابعتي"
          title="مراجعة الأسبوع"
          hint="تُبنى من تنفيذك الفعلي، ولا تغيّر الخطة قبل موافقتك."
        />
        {weeklyReview ? (
          <>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Sunken className="px-3.5 py-3">
                <p className="label-meta text-muted-foreground">الالتزام العام</p>
                <p className="mt-0.5 text-[15px] font-bold text-primary">
                  {arabicNumber(weeklyReview.adherence)}٪
                </p>
              </Sunken>
              <Sunken className="px-3.5 py-3">
                <p className="label-meta text-muted-foreground">أيام مراجَعة</p>
                <p className="mt-0.5 text-[15px] font-bold">
                  {arabicNumber(weeklyReview.reviewedDays)} / ٧
                </p>
              </Sunken>
            </div>

            {/* ما علّمت به المراجعة: ثبات habit، تأجّل عنصر، ونوافذ نجحت وأخرى تعثّرت.
                كانت محسوبة ومخزّنة بلا قارئ — فالحلقة كانت تنتهي عند التخزين. */}
            {weeklyFacts.length > 0 ? (
              <ul className="mt-3 space-y-1.5">
                {weeklyFacts.map((fact) => (
                  <li key={fact} className="label-body flex items-start gap-2 text-muted-foreground">
                    <span aria-hidden className="mt-[0.45rem] size-1 shrink-0 rounded-full bg-primary/45" />
                    <span>{fact}</span>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <p className="label-body mt-3 text-muted-foreground">
            لم تُنشأ مراجعة لهذا الأسبوع بعد. تتطلب بيانات تنفيذ كافية لتكون ذات معنى.
          </p>
        )}
        <div className="mt-4">
          <QuietButton onClick={onSaveWeeklyReview} disabled={reviewing}>
            {reviewing ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
            {weeklyReview ? "تحديث المراجعة" : "إنشاء مراجعة الأسبوع"}
          </QuietButton>
        </div>
      </Panel>
    </div>
  );
}

function WeekItemRow({
  item,
  busy,
  editing,
  draftTitle,
  onDraftChange,
  onStartEdit,
  onCancelEdit,
  onCommit,
  onToggle,
}: {
  item: WeeklyPlanItem;
  busy: boolean;
  editing: boolean;
  draftTitle: string;
  onDraftChange: (value: string) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onCommit: () => void;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "surface-secondary flex items-center gap-3 rounded-2xl px-3.5 py-2.5",
        !item.enabled && "opacity-55",
      )}
    >
      <StatusDot state={item.enabled ? "primary" : "idle"} />

      {editing ? (
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            onCommit();
          }}
        >
          <input
            value={draftTitle}
            onChange={(event) => onDraftChange(event.target.value)}
            maxLength={160}
            aria-label="عنوان الخطوة"
            autoFocus
            className="min-w-0 flex-1 rounded-xl border border-[var(--rule)] bg-white px-2.5 py-1.5 text-[12.5px] outline-none focus-visible:border-primary"
          />
          <button
            type="submit"
            aria-label="حفظ العنوان"
            className="motion-press flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground"
          >
            <Check className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={onCancelEdit}
            aria-label="إلغاء التعديل"
            className="motion-press flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-white"
          >
            <X className="size-3.5" />
          </button>
        </form>
      ) : (
        <>
          <div className="min-w-0 flex-1">
            <p className={cn("truncate text-[12.5px] font-medium", !item.enabled && "line-through")}>
              {item.title}
            </p>
            <p className="label-meta flex flex-wrap items-center gap-x-2 text-muted-foreground">
              <span>{KIND_LABEL[item.kind] ?? item.kind}</span>
              <span>· {IMPORTANCE_LABEL[item.importance] ?? item.importance}</span>
              {item.startTime ? (
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatArabicTime(item.startTime)}
                </span>
              ) : null}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-0.5">
            <button
              type="button"
              onClick={onStartEdit}
              disabled={busy}
              aria-label={`تعديل ${item.title}`}
              className="motion-press flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-50"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={onToggle}
              disabled={busy}
              aria-label={item.enabled ? `تعطيل ${item.title}` : `تفعيل ${item.title}`}
              className="motion-press flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-50"
            >
              {item.enabled ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
