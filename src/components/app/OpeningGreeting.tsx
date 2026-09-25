import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Heart, Minus, Plus } from "lucide-react";
import { useEffect, useState } from "react";

const COUNT_KEY = "oud:salawat:count";

function readCount(): number {
  try {
    const raw = window.localStorage.getItem(COUNT_KEY);
    const parsed = raw ? Number(raw) : 0;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  } catch {
    return 0;
  }
}

/**
 * نافذة الافتتاح الموحّدة — تظهر عند كل تشغيل للتطبيق (مرة في كل جلسة):
 * دعاء لأهل غزة + الصلاة على النبي ﷺ مع عدّاد محفوظ، وإمكانية حفظ الدعاء.
 * راقية وخفيفة وتُغلق بلمسة واحدة (زر أو الخلفية أو Escape).
 */
export function OpeningGreeting({
  enabled = true,
  onToggleFavorite,
}: {
  enabled?: boolean;
  onToggleFavorite?: (itemId: string, kind: string, title: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(() => readCount());

  useEffect(() => {
    if (!enabled) return;
    // تأخير قصير حتى تكتمل أول رسمة للواجهة فلا تنبثق فوق شاشة تحميل.
    const timer = window.setTimeout(() => setOpen(true), 1200);
    return () => window.clearTimeout(timer);
  }, [enabled]);

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
  };

  const GAZA_DUA_ID = "opening:gaza";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        dir="rtl"
        className="glass-strong max-w-md rounded-3xl border-white/70 bg-white/93"
      >
        <DialogHeader className="text-right">
          <span className="mx-auto flex size-11 items-center justify-center rounded-2xl bg-emerald-400/18 text-emerald-600">
            <Heart className="size-5" />
          </span>
          <DialogTitle className="ruqaa mt-2 text-center text-[1.4rem] leading-relaxed">
            صَلُّوا عَلَى النَّبِيِّ ﷺ
          </DialogTitle>
          <DialogDescription className="text-center text-[12.5px] leading-6">
            «مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا» — رواه مسلم
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-primary/8 p-4">
          <p className="quran-text text-[1.02rem] leading-9">
            اللَّهُمَّ إِنَّا نَسْأَلُكَ أَنْ تَنْصُرَ الْمُسْتَضْعَفِينَ فِي فِلَسْطِينَ،
            وَتَشْفِيَ جَرْحَاهُمْ، وَتَرْحَمَ شُهَدَاءَهُمْ، وَتَرُدَّهُمْ إِلَى دِيَارِهِمْ
            آمِنِينَ.
          </p>
          <p className="mt-2 text-[10.5px] leading-5 text-muted-foreground">
            دعاء مباح الصياغة؛ والمأثور: «اللَّهُمَّ أَنْجِ الْمُسْتَضْعَفِينَ» — رواه
            البخاري ومسلم.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            {onToggleFavorite ? (
              <button
                type="button"
                onClick={() => onToggleFavorite(GAZA_DUA_ID, "dhikr", "دعاء للمستضعفين في فلسطين")}
                className="btn-edge rounded-full px-3 py-1.5 text-[11px] font-medium text-primary"
              >
                احفظ الدعاء
              </button>
            ) : null}
            <span className="text-[11px] text-muted-foreground">
              يظهر عند كل تشغيل للتطبيق
            </span>
          </div>
        </div>

        <div className="tile-edge flex items-center justify-between gap-3 rounded-2xl p-3">
          <span className="text-[12px] font-medium text-muted-foreground">
            عدّاد الصلاة على النبي ﷺ
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => add(-1)}
              aria-label="إنقاص"
              className="btn-edge flex size-8 items-center justify-center rounded-xl"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-10 text-center text-base font-bold tabular-nums">
              {count.toLocaleString("ar-EG")}
            </span>
            <button
              type="button"
              onClick={() => add(1)}
              aria-label="زيادة"
              className="btn-primary-edge flex size-8 items-center justify-center rounded-xl text-white"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        <Button
          type="button"
          className="btn-primary-edge w-full rounded-2xl py-2.5 font-semibold"
          onClick={() => setOpen(false)}
        >
          آمين — تصفّح التطبيق
        </Button>
      </DialogContent>
    </Dialog>
  );
}