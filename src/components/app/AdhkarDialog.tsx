import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Meter, PrimaryButton, QuietButton } from "@/components/app/Surfaces";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdhkarGroup } from "@/data/adhkar";
import { arabicNumber } from "@/lib/time";

/**
 * PHASE 2D — طقس الأذكار.
 *
 * النص هو الموضوع: كل ذكر فقرة هادئة، ووالتكرار واضح،
 * والمصدر سطر ثانوي. لا شبكة بطاقات ولا قاعدة بيانات.
 */

export function AdhkarDialog({
  group,
  open,
  onOpenChange,
  isDone,
  onToggleDone,
}: {
  group: AdhkarGroup;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isDone: boolean;
  onToggleDone: (done: boolean) => void;
}) {
  const [checked, setChecked] = useState<string[]>([]);

  useEffect(() => {
    if (open) setChecked([]);
  }, [open, group.id]);

  const total = group.items.length;
  const percent = total === 0 ? 0 : Math.round((checked.length / total) * 100);

  const toggleItem = (id: string) => {
    setChecked((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    );
  };

  useEffect(() => {
    if (open && total > 0 && checked.length === total && !isDone) {
      onToggleDone(true);
    }
  }, [checked.length, total, open, isDone, onToggleDone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="surface-quiet max-h-[88dvh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-hidden rounded-3xl p-0"
        dir="rtl"
      >
        {/* ——— الترويسة: ما هذا الورد، وكم بقي ——— */}
        <div className="rule-b px-5 pb-4 pt-5 sm:px-6">
          <DialogHeader className="text-start">
            <DialogTitle className="label-display">{group.title}</DialogTitle>
            <DialogDescription className="label-body text-start text-muted-foreground">
              {group.when} · {group.subtitle}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 flex items-center gap-3">
            <Meter
              value={percent}
              tone={percent === 100 ? "success" : undefined}
              className="flex-1"
              label="تقدّم الأذكار"
            />
            <span className="label-meta shrink-0 text-muted-foreground tabular-nums">
              {arabicNumber(checked.length)} / {arabicNumber(total)}
            </span>
          </div>
        </div>

        {/* ——— الأذكار: فقرات متتابعة لا بطاقات متجاورة ——— */}
        <ol className="max-h-[56dvh] overflow-y-auto px-5 py-2 sm:px-6">
          {group.items.map((dhikr, index) => {
            const isChecked = checked.includes(dhikr.id);
            return (
              <li key={dhikr.id}>
                <button
                  type="button"
                  onClick={() => toggleItem(dhikr.id)}
                  aria-pressed={isChecked}
                  className={cn(
                    "motion-press w-full border-b border-[var(--rule)] py-4 text-start last:border-b-0",
                    isChecked && "opacity-55",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="label-meta text-muted-foreground tabular-nums">
                        {arabicNumber(index + 1)}
                      </span>
                      {dhikr.title ? (
                        <span className="text-[13px] font-semibold">{dhikr.title}</span>
                      ) : null}
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
                        {dhikr.repeat === 1 ? "مرة واحدة" : `${arabicNumber(dhikr.repeat)} مرات`}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full border transition-colors",
                        isChecked
                          ? "border-transparent bg-[var(--status-success)] text-white"
                          : "border-[var(--rule)] bg-white/70 text-transparent",
                      )}
                    >
                      <Check className="size-4" />
                    </span>
                  </div>

                  <p className="quran-text mt-3 text-[1.12rem] leading-9 text-foreground/90">
                    {dhikr.text}
                  </p>

                  <div className="mt-2.5 space-y-0.5">
                    <p className="label-meta text-muted-foreground">{dhikr.source}</p>
                    {dhikr.virtue ? (
                      <p className="label-meta text-primary/80">✦ {dhikr.virtue}</p>
                    ) : null}
                  </div>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="rule-t flex flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-6">
          <p className="label-meta min-w-0 flex-1 text-muted-foreground">
            {percent === 100
              ? "أتممت الأذكار، تقبّل الله منك."
              : "اضغط على كل ذكر بعد قراءته."}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            {isDone ? (
              <QuietButton onClick={() => onToggleDone(false)}>إلغاء التعليم</QuietButton>
            ) : null}
            <PrimaryButton onClick={() => onToggleDone(!isDone)} className="px-4 text-[12px]">
              {isDone ? "تمّت الأذكار" : "علمتني أتممته"}
            </PrimaryButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
