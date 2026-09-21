import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { arabicNumber } from "@/lib/time";
import { playChime, vibrate } from "@/lib/notify";
import { Heart, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

const COUNT_KEY = "sakinah:salawat:count";
const SESSION_KEY = "sakinah:salawat:session";

function readCount(): number {
  try {
    const raw = window.localStorage.getItem(COUNT_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

function readSession(): boolean {
  try {
    return window.sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * نافذة «صلِّ على محمد» تظهر مرة واحدة عند فتح التطبيق في كل جلسة.
 * عدّاد صلوات محفوظ، وزر إرسال التذكير إلى الخلفية لا شيء.
 */
export function SalawatGreeting({ enabled = true }: { enabled?: boolean }) {
  const [open, setOpen] = useState(() => enabled && !readSession());
  const [count, setCount] = useState(() => readCount());

  useEffect(() => {
    if (open) {
      try {
        window.sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* لا شيء */
      }
    }
  }, [open]);

  const add = (delta: number) => {
    setCount((current) => {
      const next = Math.max(0, current + delta);
      try {
        window.localStorage.setItem(COUNT_KEY, String(next));
      } catch {
        /* لا شيء */
      }
      return next;
    });
    if (delta > 0) {
      vibrate(20);
      playChime();
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        dir="rtl"
        className="glass-strong max-w-sm rounded-3xl border-white/70 bg-white/92 text-center"
      >
        <DialogHeader className="items-center text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-400/25 to-teal-300/25 text-emerald-600">
            <Heart className="size-6" />
          </span>
          <DialogTitle className="ruqaa mt-2 text-2xl">
            صَلُّوا عَلَى النَّبِيِّ ﷺ
          </DialogTitle>
          <DialogDescription className="text-center text-[13px] leading-7">
            اللَّهُمَّ صَلِّ وَسَلِّمْ عَلَى نَبِيِّنَا مُحَمَّدٍ
            <br />
            «مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا» — رواه مسلم
          </DialogDescription>
        </DialogHeader>

        <div className="glass-tile mx-auto flex w-fit items-center gap-4 rounded-full px-5 py-3">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="rounded-full"
            aria-label="ناقص"
            onClick={() => add(-1)}
          >
            <Minus className="size-4" />
          </Button>
          <span className="min-w-14 text-center text-2xl font-bold text-primary">
            {arabicNumber(count)}
          </span>
          <Button
            type="button"
            size="icon"
            className="rounded-full"
            aria-label="صلاة واحدة"
            onClick={() => add(1)}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          عدّادك المحفوظ على جهازك — كل صلاة تُكتب لك عشرًا بإذن الله.
        </p>

        <Button type="button" className="rounded-full" onClick={() => setOpen(false)}>
          تقبّل الله — متابعة التطبيق
        </Button>
      </DialogContent>
    </Dialog>
  );
}
