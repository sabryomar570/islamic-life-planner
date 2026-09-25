/**
 * PHASE 3 — مستطيل الإحصاء المتحرك.
 *
 * **ليس شريط إعلانات.** يتحرك بنفسه ببطء شديد، ويتوقف عند أي تفاعل،
 * ولا ينتقل تلقائيا أبدا تحت `prefers-reduced-motion`. الغرض أن يمنح
 * القسم لحظة صدق واحدة، لا أن يبقى على الشاشة يعيد الانتباه.
 *
 * **الانتقال:** 240ms فقط، و`opacity + translateY` وحدهما. لا منعكس أفقي،
 * ولا تكبير، ولا وميض. الحركة هنا طقس لا مسرح.
 */

import { Artwork, type ArtworkName } from "@/components/app/Artworks";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export type Insight = {
  id: string;
  /** نص قصير. سطران إلى أربعة أسطر كحد أقصى. */
  text: string;
  /** من أين جاء. إلزامي: نص بلا مصدر لا يعرض هنا. */
  source: string;
  /** تصنيف قصير: الصلاة، العادات، المراجعة. */
  category: string;
  /** رسم مرتبط بالمعنى. */
  artwork: ArtworkName;
  /** وجهة عند الضغط. `undefined` تعني أن البطاقة ليست قابلة للضغط. */
  onOpen?: string;
  actionLabel?: string;
};

/** مدة الوقوف بين الشرائح. بطيئة عمدا. */
const DWELL_MS = 9_000;
/** مدة الانتقال. ضمن نطاق 180 إلى 400 كما في نظام التصميم. */
const TRANSITION_MS = 240;

export function InsightCarousel({
  insights,
  onNavigate,
  className,
  /** يوقف الدوران التلقائي كليلا. */
  paused = false,
}: {
  insights: readonly Insight[];
  onNavigate?: (view: string) => void;
  className?: string;
  paused?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [interacted, setInteracted] = useState(false);
  const regionRef = useRef<HTMLDivElement | null>(null);

  const count = insights.length;

  // نقرأ تفضيل الحركة مباشرة من المتصفح: المكوّن لا يعتمد على JS ليدركه.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);

  const go = useCallback(
    (next: number) => {
      if (count === 0) return;
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  // الدوران يتوقف عند أول تفاعل، وعند إخفاء التبويب، وعند تقليل الحركة.
  useEffect(() => {
    if (paused || interacted || reduced || count <= 1) return;
    if (typeof document !== "undefined" && document.hidden) return;
    const timer = window.setTimeout(() => go(index + 1), DWELL_MS);
    return () => window.clearTimeout(timer);
  }, [index, count, go, interacted, paused, reduced]);

  if (count === 0) return null;

  const current = insights[index];
  const openable = Boolean(current.onOpen && onNavigate);

  const handleKey = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setInteracted(true);
      go(index + 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setInteracted(true);
      go(index - 1);
    }
  };

  const body = (
    <>
      <div className="flex items-start gap-3">
        <Artwork name={current.artwork} tone="soft" />
        <div className="min-w-0 flex-1">
          <p className="eyebrow">{current.category}</p>
          <p className="mt-2 text-[15px] leading-8 font-medium text-foreground">
            {current.text}
          </p>
          <p className="label-meta mt-3 text-muted-foreground">{current.source}</p>
        </div>
      </div>
      {openable ? (
        <span className="mt-4 inline-flex items-center gap-1 label-meta font-semibold text-primary">
          {current.actionLabel ?? "اقرأ"}
          <ChevronLeft className="size-3.5" />
        </span>
      ) : null}
    </>
  );

  return (
    <div
      ref={regionRef}
      className={cn("surface-primary rounded-3xl p-5", className)}
      // منطقة هادئة: لا يعلن كل شريحة، ولا يعيد قراءة المحتوى على التبديل.
      aria-roledescription="شريحة إحصاء"
      onMouseEnter={() => setInteracted(true)}
      onFocusCapture={() => setInteracted(true)}
    >
      <div
        key={current.id}
        className={cn(reduced ? "" : "motion-swap")}
        style={reduced ? undefined : { animationDuration: `${TRANSITION_MS}ms` }}
      >
        {openable ? (
          <button
            type="button"
            onClick={() => {
              setInteracted(true);
              if (current.onOpen && onNavigate) onNavigate(current.onOpen);
            }}
            className="motion-press block w-full text-start"
          >
            {body}
          </button>
        ) : (
          <div className="text-start">{body}</div>
        )}
      </div>

      {count > 1 ? (
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5" role="tablist" aria-label="شرائح الإحصاء">
            {insights.map((insight, position) => (
              <button
                key={insight.id}
                type="button"
                role="tab"
                aria-selected={position === index}
                aria-label={`الشريحة ${position + 1} من ${count}`}
                onClick={() => {
                  setInteracted(true);
                  go(position);
                }}
                className="motion-press touch-target flex h-6 w-6 items-center justify-center"
              >
                <span
                  className={cn(
                    "block rounded-full transition-all",
                    position === index
                      ? "h-1.5 w-4 bg-primary"
                      : "h-1.5 w-1.5 bg-[var(--status-idle)]",
                  )}
                />
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-label="الشريحة التالية"
              onClick={() => {
                setInteracted(true);
                go(index + 1);
              }}
              className="motion-press touch-target flex items-center justify-center rounded-full surface-secondary text-foreground/70"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="الشريحة السابقة"
              onClick={() => {
                setInteracted(true);
                go(index - 1);
              }}
              className="motion-press touch-target flex items-center justify-center rounded-full surface-secondary text-foreground/70"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
