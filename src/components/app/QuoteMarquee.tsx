import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type QuoteSlide = {
  /** النص الظاهر في الشريط */
  quote: string;
  /** المصدر الصغير: باب/سورة/شاعر */
  origin: string;
  /** القسم الذي يفتحه الضغط على الاقتباس */
  target: string;
};

/**
 * شريط الاقتباسات: يتحرك تلقائيًا كل بضع ثوانٍ بانتقال سلس، ويستجيب للسحب
 * اليدوي (لمس أو فأرة)، والضغط على الاقتباس ينقل المستخدم لقسمه.
 * بلا مكتبات أنيميشن: CSS transitions فقط — خفيف على الأجهزة المتوسطة.
 */
export function QuoteMarquee({
  slides,
  onSelect,
}: {
  slides: QuoteSlide[];
  onSelect: (target: string) => void;
}) {
  const [index, setIndex] = useState(0);
  const timerRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const pauseRef = useRef<number | null>(null);

  const count = slides.length;
  const safeIndex = count > 0 ? ((index % count) + count) % count : 0;

  const restartTimer = () => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    if (pauseRef.current !== null) window.clearTimeout(pauseRef.current);
    timerRef.current = window.setTimeout(() => {
      setIndex((current) => (count > 0 ? (current + 1) % count : 0));
      restartTimer();
    }, 6000);
  };

  const goTo = (next: number) => {
    if (count === 0) return;
    setIndex(((next % count) + count) % count);
    restartTimer();
  };

  // دورة التحريك التلقائي: تُعاد ضبطها عند أي تفاعل يدوي.
  useEffect(() => {
    if (count === 0) return;
    restartTimer();
    return () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      if (pauseRef.current !== null) window.clearTimeout(pauseRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [count]);

  const onPointerDown = (event: React.PointerEvent) => {
    startXRef.current = event.clientX;
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  };

  const onPointerUp = (event: React.PointerEvent) => {
    if (startXRef.current === null) return;
    const delta = event.clientX - startXRef.current;
    startXRef.current = null;
    if (Math.abs(delta) > 40) {
      // سحب لليمين: الاقتباس السابق (RTL) — ولليسار: التالي
      goTo(delta > 0 ? safeIndex - 1 : safeIndex + 1);
      return;
    }
    restartTimer();
  };

  const onClick = () => {
    // الضغط (بلا سحب) يفتح القسم المرتبط.
    if (count > 0) onSelect(slides[safeIndex].target);
  };

  if (count === 0) return null;

  return (
    <div
      className="relative"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      style={{ touchAction: "pan-y" }}
    >
      <div className="overflow-hidden rounded-2xl">
        <div
          className="flex transition-transform duration-500 ease-out"
          style={{ transform: `translateX(${safeIndex * 100}%)` }}
        >
          {slides.map((slide, slideIndex) => (
            <button
              key={slideIndex}
              type="button"
              onClick={onClick}
              className="tile-edge flex min-w-full cursor-pointer flex-col items-center gap-1 rounded-2xl px-4 py-3 text-center"
              aria-label={`${slide.quote} — افتح ${slide.origin}`}
            >
              <span className="line-clamp-2 text-[12.5px] font-medium leading-6">
                {slide.quote}
              </span>
              <span className="text-[9.5px] font-semibold text-primary">{slide.origin}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-center gap-1.5">
        {slides.map((_, dotIndex) => (
          <button
            key={dotIndex}
            type="button"
            onClick={() => goTo(dotIndex)}
            aria-label={`اقتباس ${dotIndex + 1}`}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              dotIndex === safeIndex ? "bg-primary" : "bg-foreground/20",
            )}
          />
        ))}
      </div>
    </div>
  );
}
