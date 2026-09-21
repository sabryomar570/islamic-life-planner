import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, CheckCheck, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import type { AdhkarGroup } from "@/data/adhkar";
import { arabicNumber } from "@/lib/time";

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
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id],
    );
  };

  // عند إتمام كل الأذكار نعلّم المجموعة كمنجزة تلقائيًا.
  useEffect(() => {
    if (open && total > 0 && checked.length === total && !isDone) {
      onToggleDone(true);
    }
  }, [checked.length, total, open, isDone, onToggleDone]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="glass-strong max-h-[88vh] w-[calc(100vw-1.5rem)] max-w-3xl overflow-hidden rounded-3xl border-white/70 bg-white/85 p-0"
        dir="rtl"
      >
        <div className="flex flex-col gap-1 border-b border-white/60 px-6 pb-4 pt-6">
          <DialogHeader className="text-right">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="size-5 text-primary" />
              {group.title}
            </DialogTitle>
            <DialogDescription className="text-right text-xs leading-5">
              {group.subtitle} • {group.when}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-3 flex items-center gap-3">
            <Progress value={percent} className="h-2 flex-1 bg-white/60" />
            <span className="text-xs font-medium text-muted-foreground">
              {arabicNumber(checked.length)} / {arabicNumber(total)}
            </span>
          </div>
        </div>

        <div className="max-h-[58vh] space-y-3 overflow-y-auto px-4 py-4 sm:px-6">
          {group.items.map((dhikr, index) => {
            const isChecked = checked.includes(dhikr.id);
            return (
              <button
                key={dhikr.id}
                type="button"
                onClick={() => toggleItem(dhikr.id)}
                className={cn(
                  "w-full rounded-2xl p-4 text-right transition-all",
                  isChecked
                    ? "glass-tile ring-1 ring-primary/40"
                    : "glass-soft hover:bg-white/80",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-white/70 text-[11px] font-semibold text-primary">
                      {arabicNumber(index + 1)}
                    </span>
                    <span className="text-sm font-semibold">
                      {dhikr.title ?? group.title}
                    </span>
                    <span className="rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-medium text-primary">
                      {dhikr.repeat === 1
                        ? "مرة واحدة"
                        : `${arabicNumber(dhikr.repeat)} مرات`}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-full border transition-all",
                      isChecked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-white/80 bg-white/70 text-transparent",
                    )}
                  >
                    <Check className="size-4" />
                  </span>
                </div>

                <p className="quran-text mt-3 text-[1.05rem] leading-9 text-foreground/90">
                  {dhikr.text}
                </p>

                <div className="mt-3 space-y-1 border-t border-white/60 pt-2 text-[11px] leading-5 text-muted-foreground">
                  <p>{dhikr.source}</p>
                  {dhikr.virtue ? (
                    <p className="text-primary/80">✦ {dhikr.virtue}</p>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-white/60 px-6 py-4">
          <span className="text-xs text-muted-foreground">
            {percent === 100
              ? "أتممت الأذكار، تقبّل الله منك."
              : "اضغط على كل ذكر بعد قراءته."}
          </span>
          <Button
            type="button"
            variant={isDone ? "outline" : "default"}
            className="rounded-full"
            onClick={() => onToggleDone(!isDone)}
          >
            <CheckCheck className="size-4" />
            {isDone ? "إلغاء التعليم" : "تمّت الأذكار"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
