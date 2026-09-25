import { Panel, SectionHead, StatusDot } from "@/components/app/Surfaces";
import type { PlanItemOutcome, PlanItemStatus } from "@/lib/accountability";
import type { DailyPlan, DailyPlanItem, PrayerPhase } from "@/lib/daily-plan";
import { formatArabicTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Check, Circle, Minus, PauseCircle, RotateCcw, X } from "lucide-react";
import { useMemo } from "react";

/**
 * PHASE 2A — خط اليوم المُرسي بالصلاة.
 *
 * الصلاة هي محور اليوم لا عنصرًا فيه: كل خطوة تقع تحت نافذة صلاة حقيقية
 * (الفجر ← الظهر ← العصر ← المغرب ← العشاء)، فما لا موعد له يُحط في «متى شئت».
 * صف واحد مضغوط، لا عشر بطاقات.
 */

type TimelineGroup = {
  anchor: PrayerPhase | null;
  items: DailyPlanItem[];
};

const STATUS_LABELS: Record<PlanItemStatus, string> = {
  completed: "تم",
  partial: "جزئي",
  postponed: "تأجيل",
  skipped: "لم يتم",
};

const STATUS_ICON: Record<PlanItemStatus, typeof Check> = {
  completed: Check,
  partial: Minus,
  postponed: PauseCircle,
  skipped: X,
};

const STATUS_TONE: Record<PlanItemStatus, "success" | "attention" | "missed" | "neutral"> = {
  completed: "success",
  partial: "neutral",
  postponed: "attention",
  skipped: "missed",
};

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * يربط كل خطوة بالصلاة التي تفتح نافذتها.
 *
 * القاعدة: أوّل صلاة دخل وقتها تسبق الخطوة تسبق الصلاة التالية.
 * ما بلا وقت لا يُخمَّع تحت صلاة — يذهب إلى «متى شئت» كما اختره المستخدم.
 * كل خطوة تنتمي لمجموعة واحدة بالضبط؛ لا شيء يُفقد ولا يُكرَّر.
 */
export function groupByPrayerAnchor(plan: DailyPlan): TimelineGroup[] {
  const anchors = plan.prayerAnchors;
  const buckets = new Map<typeof anchors[number]["key"], DailyPlanItem[]>(
    anchors.map((anchor) => [anchor.key, []]),
  );
  const loose: DailyPlanItem[] = [];

  for (const entry of plan.sections.flatMap((section) => section.items)) {
    // الصلاة نفسها تُعرض كعقدة على المحور، لا كخطوة داخل الخطة.
    if (entry.item.kind === "prayer") continue;

    if (entry.item.prayerAnchor) {
      buckets.get(entry.item.prayerAnchor)?.push(entry);
      continue;
    }
    if (!entry.scheduledTime) {
      loose.push(entry);
      continue;
    }
    const time = toMinutes(entry.scheduledTime);
    // آخر صلاة دخلت وقتها قبل هذه الخطوة؛ فإن سبقت كلها فالنافذة القادمة هي الفجر.
    let owner = anchors[0].key;
    for (const anchor of anchors) {
      if (toMinutes(anchor.time) <= time) owner = anchor.key;
    }
    buckets.get(owner)?.push(entry);
  }

  const groups: TimelineGroup[] = [];
  for (const anchor of anchors) {
    const items = buckets.get(anchor.key) ?? [];
    if (items.length === 0) continue;
    items.sort(compareByTimeThenTitle);
    groups.push({ anchor, items });
  }
  if (loose.length > 0) {
    loose.sort(compareByTimeThenTitle);
    groups.push({ anchor: null, items: loose });
  }
  return groups;
}

function compareByTimeThenTitle(a: DailyPlanItem, b: DailyPlanItem) {
  const aTime = a.scheduledTime ? toMinutes(a.scheduledTime) : Number.MAX_SAFE_INTEGER;
  const bTime = b.scheduledTime ? toMinutes(b.scheduledTime) : Number.MAX_SAFE_INTEGER;
  if (aTime !== bTime) return aTime - bTime;
  return a.item.title.localeCompare(b.item.title, "ar");
}

export function DayTimeline({
  plan,
  outcomes,
  currentTime,
  savingItemId,
  onSetOutcome,
  onResetOutcome,
}: {
  plan: DailyPlan;
  outcomes: readonly PlanItemOutcome[];
  currentTime: string;
  savingItemId: string | null;
  onSetOutcome: (itemId: string, status: PlanItemStatus) => void;
  onResetOutcome: (itemId: string) => void;
}) {
  const byId = useMemo(() => new Map(outcomes.map((outcome) => [outcome.itemId, outcome])), [outcomes]);
  const groups = useMemo(() => groupByPrayerAnchor(plan), [plan]);
  const nowMinutes = toMinutes(currentTime);

  const totalItems = groups.reduce((sum, group) => sum + group.items.length, 0);
  const doneItems = groups.reduce(
    (sum, group) =>
      sum + group.items.filter((entry) => byId.get(entry.item.id)?.status === "completed").length,
    0,
  );

  return (
    <Panel className="overflow-hidden">
      <div className="p-5 sm:p-6">
        <SectionHead
          eyebrow="خطة اليوم"
          title="يومك مرتّب حول الصلاة"
          hint={
            totalItems > 0
              ? `${doneItems} من ${totalItems} خطوة مكتملة — اضغط الحالة لتحديثها فورًا.`
              : "لا توجد خطوات مفعّلة اليوم. عدّلها من الخطة الأسبوعية."
          }
        />
      </div>

      {totalItems === 0 ? (
        <p className="rule-t px-5 py-6 text-center text-[12px] leading-6 text-muted-foreground sm:px-6">
          لم تُفعّل أي خطوة لهذا اليوم بعد. افتح الخطة الأسبوعية لتختار ما يناسبك.
        </p>
      ) : (
        <div className="rule-t px-5 py-4 sm:px-6">
          <ol className="stack-sm">
            {groups.map((group) => {
              const anchor = group.anchor;
              const isPast = anchor ? toMinutes(anchor.time) < nowMinutes : true;
              const isActive = anchor ? anchor.key === plan.currentAnchor.key : false;
              return (
                <li key={anchor?.key ?? "unscheduled"} className="timeline-spine ps-6 pe-1 pt-1 pb-1">
                  {anchor ? (
                    <div className="relative -ms-6 mb-1.5 flex items-center gap-2">
                      <span className="timeline-node" data-state={isActive ? "active" : isPast ? "past" : undefined} />
                      <span className="flex flex-wrap items-baseline gap-x-2">
                        <span className={cn("text-[12px] font-bold", isActive && "text-primary")}>
                          {anchor.title}
                        </span>
                        <span className="label-meta text-muted-foreground">
                          {formatArabicTime(anchor.time)}
                        </span>
                      </span>
                      {isActive ? (
                        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-semibold text-primary">
                          نافذتك الآن
                        </span>
                      ) : null}
                    </div>
                  ) : (
                    <p className="mb-1.5 text-[12px] font-bold text-muted-foreground">متى شئت</p>
                  )}

                  <ul className="stack-sm">
                    {group.items.map((entry) => (
                      <TimelineRow
                        key={entry.item.id}
                        item={entry.item}
                        scheduledTime={entry.scheduledTime}
                        status={byId.get(entry.item.id)?.status ?? null}
                        busy={savingItemId === entry.item.id}
                        onSetOutcome={onSetOutcome}
                        onResetOutcome={onResetOutcome}
                      />
                    ))}
                  </ul>
                </li>
              );
            })}
          </ol>
        </div>
      )}
    </Panel>
  );
}

function TimelineRow({
  item,
  scheduledTime,
  status,
  busy,
  onSetOutcome,
  onResetOutcome,
}: {
  item: DailyPlanItem["item"];
  scheduledTime?: string;
  status: PlanItemStatus | null;
  busy: boolean;
  onSetOutcome: (itemId: string, status: PlanItemStatus) => void;
  onResetOutcome: (itemId: string) => void;
}) {
  // أول حالة مقترحة: «تم» دائمًا متاح بنقرة واحدة.
  const quickAction: PlanItemStatus = status === "completed" ? "skipped" : "completed";

  return (
    <li className="flex items-center gap-2.5 rounded-2xl px-2.5 py-2 transition-colors hover:bg-white/60">
      <button
        type="button"
        disabled={busy}
        onClick={() => onSetOutcome(item.id, quickAction)}
        aria-pressed={status === "completed"}
        aria-label={`${item.title} — ${STATUS_LABELS[quickAction]}`}
        className={cn(
          "motion-press flex size-9 shrink-0 items-center justify-center rounded-xl border transition-colors disabled:opacity-50",
          status === "completed"
            ? "border-transparent bg-[var(--status-success)] text-white"
            : "border-[var(--rule)] bg-white/70 text-transparent hover:border-primary/40",
        )}
      >
        <Check className="size-4" />
      </button>

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-[12.5px] font-medium",
            status === "completed" && "text-muted-foreground line-through",
            status === "skipped" && "text-muted-foreground/70",
          )}
        >
          {item.title}
        </p>
        {scheduledTime ? (
          <p className="label-meta text-muted-foreground">{formatArabicTime(scheduledTime)}</p>
        ) : null}
      </div>

      {status ? (
        <div className="flex shrink-0 items-center gap-1">
          <span className="hidden items-center gap-1 sm:flex">
            <StatusDot state={STATUS_TONE[status]} />
          </span>
          {(Object.keys(STATUS_LABELS) as PlanItemStatus[])
            .filter((value) => value !== status)
            .slice(0, 2)
            .map((value) => {
              const Icon = STATUS_ICON[value];
              return (
                <button
                  key={value}
                  type="button"
                  disabled={busy}
                  onClick={() => onSetOutcome(item.id, value)}
                  title={STATUS_LABELS[value]}
                  aria-label={`${item.title} — ${STATUS_LABELS[value]}`}
                  className="motion-press flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-foreground disabled:opacity-50"
                >
                  <Icon className="size-3.5" />
                </button>
              );
            })}
          <button
            type="button"
            onClick={() => onResetOutcome(item.id)}
            title="تراجع"
            aria-label={`تراجع عن حالة ${item.title}`}
            className="motion-press flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-white hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
          </button>
        </div>
      ) : (
        <Circle className="size-3.5 shrink-0 text-[var(--status-idle)]" aria-hidden />
      )}
    </li>
  );
}
