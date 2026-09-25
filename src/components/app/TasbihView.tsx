import { ChoiceChip, Meter, Panel, QuietButton, SectionHead, Sunken } from "@/components/app/Surfaces";
import { PRAYERS } from "@/lib/prayers";
import { arabicNumber } from "@/lib/time";
import { playChime, vibrate } from "@/lib/notify";
import { Minus, RotateCcw, Target } from "lucide-react";
import { useEffect, useState } from "react";

/**
 * PHASE 2G — المسبحة.
 *
 * عدّاد ملء الشاشة: كل شيء حوله يخدم العدّ، ولا شيء يقسم الانتباه.
 * العدّ نفسه هو الشاشة: كل ما حوله يخدمه، ولا شيء يقسم الانتباه.
 */

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
  const done = entry.count >= preset.target;

  useEffect(() => {
    writeState(state);
  }, [state]);

  const tap = () => {
    setState((current) => {
      const item = current[preset.text] ?? { count: 0, total: 0 };
      return {
        ...current,
        [preset.text]: { count: item.count + 1, total: item.total + 1 },
      };
    });
    vibrate(15);
    if (entry.count + 1 === preset.target) {
      playChime();
      vibrate([40, 60, 40]);
    }
  };

  const reset = () => {
    setState((current) => ({
      ...current,
      [preset.text]: { count: 0, total: current[preset.text]?.total ?? 0 },
    }));
    vibrate(10);
  };

  return (
    <div className="stack">
      {/* ——— الاختيار: شريط أفقي مضغوط، لا شبكة بطاقات ——— */}
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {PRESETS.map((item, index) => (
          <ChoiceChip
            key={item.text}
            active={index === presetIndex}
            onClick={() => setPresetIndex(index)}
            className="whitespace-nowrap"
          >
            {item.text}
          </ChoiceChip>
        ))}
      </div>

      {/* ——— العدّاد: العنصر المسيطر، خارج أي بطاقة جانبية ——— */}
      <Panel className="px-5 py-8 text-center sm:py-10">
        <p className="quran-text text-[22px] leading-relaxed text-foreground">{preset.text}</p>
        <p className="label-meta mt-1.5 text-muted-foreground">{preset.source}</p>

        <button
          type="button"
          onClick={tap}
          aria-label="اضغط للعدّ"
          className="motion-press mx-auto mt-7 flex size-56 items-center justify-center rounded-full border border-white/70 bg-[var(--surface-primary)] shadow-[0_20px_50px_-24px_oklch(0.42_0.05_255/0.45)] backdrop-blur-xl sm:size-64"
        >
          <span className="flex flex-col items-center">
            <span
              className="text-6xl font-bold leading-none text-primary tabular-nums transition-transform duration-200 sm:text-7xl"
              key={entry.count}
            >
              {arabicNumber(entry.count)}
            </span>
            <span className="label-meta mt-2 text-muted-foreground">
              من {arabicNumber(preset.target)}
            </span>
          </span>
          <span
            aria-hidden
            className="pointer-events-none absolute size-[13.5rem] rounded-full border-2 border-primary/15 sm:size-60"
          />
        </button>

        <div className="mx-auto mt-7 max-w-xs">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="flex items-center gap-1.5 label-meta text-muted-foreground">
              <Target className="size-3.5" />
              الهدف {arabicNumber(preset.target)}
            </span>
            <span className="label-meta text-muted-foreground">
              الإجمالي {arabicNumber(entry.total)}
            </span>
          </div>
          <Meter
            value={progress}
            tone={done ? "success" : undefined}
            label={`التقدّم إلى ${arabicNumber(preset.target)}`}
          />
          {done ? (
            <p className="label-meta mt-2 text-[var(--status-success)]">أتممت الورد — تقبّل الله منك.</p>
          ) : null}
        </div>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <QuietButton onClick={reset}>
            <RotateCcw className="size-3.5" />
            تصفير
          </QuietButton>
          <QuietButton
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
            <Minus className="size-3.5" />
            تراجع
          </QuietButton>
        </div>
      </Panel>

      <Sunken className="px-4 py-3">
        <SectionHead
          title="متى تُسبّح"
          hint={`بعد كل صلاة: ${PRAYERS.map((prayer) => prayer.name).join("، ")} — وقبل النوم.`}
        />
      </Sunken>
    </div>
  );
}
