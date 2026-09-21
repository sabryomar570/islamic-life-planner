import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Nudge } from "@/hooks/use-nudges";
import type { AdhkarGroupId } from "@/data/adhkar";
import { PRAYERS, type PrayerStatus } from "@/lib/prayers";
import { BellRing, Clock, Sparkles } from "lucide-react";

const QUICK_STATUSES: { value: PrayerStatus; label: string }[] = [
  { value: "jamaah", label: "في جماعة" },
  { value: "ontime", label: "في الوقت" },
  { value: "late", label: "متأخرة" },
];

/**
 * نافذة تنبيه تظهر بنفسها عند الحاجة: وقت عبادة فات، أو قسم لم يدخله المستخدم.
 * كل خيار هنا ينفّذ شيئًا فعليًا، ولا تظهر مرة أخرى في اليوم بعد إغلاقها.
 */
export function NudgeCenter({
  nudge,
  onDismiss,
  onOpenView,
  onOpenAdhkar,
  onLogPrayer,
  onRequestNotifications,
}: {
  nudge: Nudge | null;
  onDismiss: (options?: { forever?: boolean }) => void;
  onOpenView: (view: string) => void;
  onOpenAdhkar: (group: AdhkarGroupId) => void;
  onLogPrayer: (prayer: string, status: PrayerStatus) => void;
  onRequestNotifications: () => void;
}) {
  const adhkarGroup = (nudge?.payload?.adhkar ?? null) as AdhkarGroupId | null;
  const prayerKey = (nudge?.payload?.prayer ?? null) as string | null;
  const prayer = prayerKey ? PRAYERS.find((item) => item.key === prayerKey) : undefined;

  const runPrimary = () => {
    if (!nudge) return;
    switch (nudge.id) {
      case "notifications":
        onRequestNotifications();
        break;
      case "adhkar_morning":
      case "adhkar_evening":
      case "adhkar_sleep":
        if (adhkarGroup) onOpenAdhkar(adhkarGroup);
        break;
      case "prayer_log":
        if (prayerKey) onLogPrayer(prayerKey, "ontime");
        break;
      default:
        if (nudge.view) onOpenView(nudge.view);
        break;
    }
    onDismiss();
  };

  return (
    <Dialog open={nudge !== null} onOpenChange={(open) => !open && onDismiss()}>
      <DialogContent
        dir="rtl"
        className="glass-strong max-w-md rounded-3xl border-white/70 bg-white/92"
      >
        {nudge ? (
          <>
            <DialogHeader className="text-right">
              <span className="glass-tile inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
                {nudge.id === "notifications" ? (
                  <BellRing className="size-3.5 text-primary" />
                ) : nudge.id === "prayer_log" ? (
                  <Clock className="size-3.5 text-primary" />
                ) : (
                  <Sparkles className="size-3.5 text-primary" />
                )}
                {nudge.eyebrow}
              </span>
              <DialogTitle className="mt-3 text-lg leading-8">{nudge.title}</DialogTitle>
              <DialogDescription className="text-right text-[13px] leading-7">
                {nudge.body}
              </DialogDescription>
            </DialogHeader>

            {prayer && prayerKey ? (
              <div className="flex flex-wrap gap-2">
                {QUICK_STATUSES.map((status) => (
                  <button
                    key={status.value}
                    type="button"
                    onClick={() => {
                      onLogPrayer(prayerKey, status.value);
                      onDismiss();
                    }}
                    className="glass-tile rounded-full px-3.5 py-2 text-xs font-medium transition-colors hover:bg-white/90"
                  >
                    {prayer.name} — {status.label}
                  </button>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button type="button" className="rounded-full" onClick={runPrimary}>
                  {nudge.primary}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full text-xs"
                  onClick={() => onDismiss()}
                >
                  {nudge.secondary ?? "لاحقًا"}
                </Button>
              </div>
              <button
                type="button"
                onClick={() => onDismiss({ forever: true })}
                className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
              >
                لا تُظهر هذا التنبيه مرة أخرى
              </button>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
