import { Panel, SectionHead, StatusDot, Sunken } from "@/components/app/Surfaces";
import { ADHKAR_GROUPS, type AdhkarGroupId } from "@/data/adhkar";
import { arabicNumber } from "@/lib/time";
import { cn } from "@/lib/utils";
import { ChevronLeft, CloudRain, HeartPulse, Moon, Sunrise, Sunset } from "lucide-react";

/**
 * PHASE 2D — فهرس الأذكار.
 *
 * الأذكار طقس لا قاعدة بيانات: كل مجموعة مدخل واحد يقول «متى، وكم، وهل أتممتها».
 * التفاصيل تُفتح في نافذة الأداء القائمة أصلًا — لا نكرّرها هنا.
 */

const GROUP_ICON: Record<AdhkarGroupId, typeof Sunrise> = {
  morning: Sunrise,
  evening: Sunset,
  sleep: Moon,
  after_prayer: HeartPulse,
  distress: CloudRain,
};

export function AdhkarIndex({
  done,
  onOpen,
}: {
  done: readonly string[];
  onOpen: (group: AdhkarGroupId) => void;
}) {
  const doneCount = ADHKAR_GROUPS.filter((group) => done.includes(group.id)).length;

  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="وردك اليومي"
          title="الأذكار"
          hint="افتح المجموعة وقتها — لا قبلها ولا بعدها."
        />
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--status-idle)]">
            <div
              className="h-full rounded-full bg-[var(--status-success)] transition-[width] duration-300"
              style={{
                width: `${(doneCount / ADHKAR_GROUPS.length) * 100}%`,
              }}
            />
          </div>
          <p className="label-meta shrink-0 text-muted-foreground">
            {arabicNumber(doneCount)} من {arabicNumber(ADHKAR_GROUPS.length)}
          </p>
        </div>
      </Panel>

      <ul className="stack-sm">
        {ADHKAR_GROUPS.map((group) => {
          const Icon = GROUP_ICON[group.id];
          const isDone = done.includes(group.id);
          const totalRepeats = group.items.reduce((sum, item) => sum + item.repeat, 0);
          return (
            <li key={group.id}>
              <button
                type="button"
                onClick={() => onOpen(group.id)}
                className={cn(
                  "motion-press surface-primary flex w-full items-center gap-3.5 rounded-3xl p-4 text-right sm:p-5",
                  isDone && "bg-[var(--status-success)]/6",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-2xl",
                    isDone ? "bg-[var(--status-success)]/12 text-[var(--status-success)]" : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-5" />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-bold">{group.title}</span>
                    {isDone ? (
                      <StatusDot state="success" />
                    ) : null}
                  </span>
                  <span className="label-meta mt-0.5 block truncate text-muted-foreground">
                    {group.when} · {arabicNumber(group.items.length)} ذكرًا
                  </span>
                  <span className="label-meta mt-0.5 block truncate text-muted-foreground/80">
                    {group.subtitle}
                  </span>
                </span>

                <span className="flex shrink-0 items-center gap-2">
                  <span className="hidden text-[11px] text-muted-foreground sm:block">
                    {arabicNumber(totalRepeats)} مرة
                  </span>
                  <ChevronLeft className="size-4 text-muted-foreground" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <Sunken className="px-4 py-3">
        <p className="label-meta leading-5 text-muted-foreground">
          الأذكار تُثبت مع كل ورد تُتمّه، ويظهر أثرها في نسبة الأذكار ضمن إحصاءاتك الأسبوعية.
        </p>
      </Sunken>
    </div>
  );
}
