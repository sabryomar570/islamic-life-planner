import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { PRAYERS } from "@/lib/prayers";
import { arabicNumber } from "@/lib/time";
import { playChime, vibrate } from "@/lib/notify";
import { cn } from "@/lib/utils";
import { Minus, RotateCcw, Sparkles, Target } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "sakinah:tasbih:v1";

const PRESETS: { text: string; target: number; source: string }[] = [
  { text: "سُبْحَانَ اللَّهِ", target: 33, source: "التسبيح بعد الصلاة — رواه مسلم" },
  { text: "الْحَمْدُ لِلَّهِ", target: 33, source: "التسبيح بعد الصلاة — رواه مسلم" },
  { text: "اللَّهُ أَكْبَرُ", target: 34, source: "تسبيح فاطمة رضي الله عنها — رواه البخاري" },
  { text: "لَا إِلَٰهَ إِلَّا اللَّهُ", target: 100, source: "أفضل الذكر — رواه البخاري ومسلم" },
  { text: "أَسْتَغْفِرُ اللَّهَ وَأَتُوبُ إِلَيْهِ", target: 100, source: "رواه مسلم، عن الأغرّ المزني" },
  { text: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ", target: 100, source: "من قالها مئة مرة حُطّت خطاياه — رواه مسلم" },
  { text: "لَا حَوْلَ وَلَا قُوَّةَ إِلَّا بِاللَّهِ", target: 100, source: "كنز من كنوز الجنة — رواه البخاري" },
];

type State = Record<string, { count: number; total: number }>;

function readState(): State {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as State;
  } catch {
    return {};
  }
}

function writeState(state: State) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* لا شيء */
  }
}

export function TasbihView() {
  const [presetIndex, setPresetIndex] = useState(0);
  const [state, setState] = useState<State>(() => readState());

  const preset = PRESETS[presetIndex];
  const entry = state[preset.text] ?? { count: 0, total: 0 };
  const progress = Math.min((entry.count / preset.target) * 100, 100);

  useEffect(() => {
    writeState(state);
  }, [state]);

  const tap = () => {
    setState((current) => {
      const item = current[preset.text] ?? { count: 0, total: 0 };
      const count = item.count + 1;
      return {
        ...current,
        [preset.text]: { count, total: item.total + 1 },
      };
    });
    vibrate(15);
    // نغمة خفيفة عند إتمام العدد.
    if (entry.count + 1 === preset.target) {
      playChime();
      vibrate([40, 60, 40]);
    }
  };

  const reset = () => {
    setState((current) => ({
      ...current,
      [preset.text]: { count: 0, total: (current[preset.text]?.total ?? 0) },
    }));
    vibrate(10);
  };

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Sparkles className="size-5" />}
          title="المسبحة — ذكر بإصبع واحد"
          hint="عدّاد محفوظ على جهازك مع اهتزاز خفيف عند كل تسبحة"
        />
        <div className="mt-5 flex flex-wrap gap-2">
          {PRESETS.map((item, index) => (
            <GlassPill
              key={item.text}
              active={index === presetIndex}
              onClick={() => setPresetIndex(index)}
            >
              {item.text}
            </GlassPill>
          ))}
        </div>
      </GlassCard>

      <GlassCard strong className="relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-emerald-200/40 blur-3xl" />
        <p className="quran-text relative text-2xl leading-relaxed">{preset.text}</p>
        <p className="relative mt-2 text-[11px] text-muted-foreground">{preset.source}</p>

        <button
          type="button"
          onClick={tap}
          aria-label="تسبيحة"
          className="relative mx-auto mt-8 flex size-48 items-center justify-center rounded-full bg-gradient-to-br from-primary/90 to-indigo-500/90 text-white shadow-xl shadow-primary/30 transition-transform active:scale-95"
        >
          <span className="text-5xl font-bold">{arabicNumber(entry.count)}</span>
          <span className="absolute inset-2 rounded-full border-2 border-white/25" />
        </button>

        <div className="relative mx-auto mt-6 max-w-xs">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Target className="size-3.5" /> الهدف: {arabicNumber(preset.target)}
            </span>
            <span>الإجمالي: {arabicNumber(entry.total)}</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/70">
            <div
              className={cn("h-full rounded-full bg-primary transition-all")}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="relative mt-6 flex flex-wrap items-center justify-center gap-2">
          <Button type="button" variant="outline" className="rounded-full" onClick={reset}>
            <RotateCcw className="size-4" />
            تصفير العدّاد
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="rounded-full"
            onClick={() =>
              setState((current) => ({
                ...current,
                [preset.text]: {
                  count: Math.max(0, (current[preset.text]?.count ?? 0) - 1),
                  total: current[preset.text]?.total ?? 0,
                },
              }))
            }
          >
            <Minus className="size-4" />
            تراجع خطوة
          </Button>
        </div>
      </GlassCard>

      <GlassCard soft className="p-5">
        <p className="text-[11px] leading-6 text-muted-foreground">
          كلمتان خفيفتان على اللسان، ثقيلتان في الميزان، حبيبتان إلى الرحمن: سُبْحَانَ
          اللَّهِ وَبِحَمْدِهِ، سُبْحَانَ اللَّهِ الْعَظِيمِ — رواه البخاري. أوقات يُستحب
          فيها التسبيح: بعد كل صلاة ({PRAYERS.map((prayer) => prayer.name).join("، ")})
          وقبل النوم.
        </p>
      </GlassCard>
    </div>
  );
}
