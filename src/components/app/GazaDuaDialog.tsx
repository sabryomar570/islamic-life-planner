import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HeartHandshake } from "lucide-react";
import { useEffect, useState } from "react";

const SEEN_KEY = "oud:gaza-dua:seen";

/**
 * نافذة دعاء هادئة تظهر مرة واحدة في اليوم، بلا مبالغة ولا تكرار مزعج،
 * ويمكن إغلاقها بسهولة ولا تُطالب بأي شيء.
 */
export function GazaDuaDialog({ enabled }: { enabled: boolean }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    const today = new Date().toDateString();
    try {
      if (window.localStorage.getItem(SEEN_KEY) === today) return;
    } catch {
      return;
    }
    // نؤجّلها قليلًا حتى لا تنبثق فوق شاشة قيد التحميل.
    const timer = window.setTimeout(() => setOpen(true), 2500);
    return () => window.clearTimeout(timer);
  }, [enabled]);

  const close = () => {
    try {
      window.localStorage.setItem(SEEN_KEY, new Date().toDateString());
    } catch {
      /* لا شيء */
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
      <DialogContent dir="rtl" className="glass-strong max-w-md rounded-3xl border-white/70 bg-white/94">
        <DialogHeader className="text-right">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <HeartHandshake className="size-5 text-primary" />
            دعوة للدعاء
          </DialogTitle>
          <DialogDescription className="text-right text-[13px] leading-7">
            لا تنسَ إخوانك في غزة وفلسطين. دعوة واحدة صادقة منك لا تكلّفك شيئًا.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-2xl bg-primary/8 p-4">
          <p className="quran-text text-[1.05rem] leading-9">
            اللَّهُمَّ إِنَّا نَسْأَلُكَ أَنْ تَنْصُرَ الْمُسْتَضْعَفِينَ فِي فِلَسْطِينَ،
            وَتَشْفِيَ جَرْحَاهُمْ، وَتَرْحَمَ شُهَدَاءَهُمْ، وَتَجْبُرَ كَسْرَهُمْ،
            وَتَرُدَّهُمْ إِلَى دِيَارِهِمْ آمِنِينَ.
          </p>
          <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
            دعاء مباح الصياغة؛ والمأثور في ذلك قوله ﷺ: «اللَّهُمَّ أَنْجِ الْمُسْتَضْعَفِينَ»
            — رواه البخاري ومسلم.
          </p>
        </div>

        <div className="flex justify-end">
          <Button type="button" className="btn-edge rounded-full" onClick={close}>
            آمين
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
