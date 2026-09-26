/**
 * PHASE NEXT — حضور عود في الرئيسية.
 *
 * سطر واحد، في مكان واحد، فوق كل شيء. **ليس** بطاقة تحفيز ولا شعارًا
 * ولا شريط إعلانات. مكانه بعد الصلاة القادمة لا قبلها: الصلاة هي المحور،
 * وعود يتكلم بعدها لا يعلوها.
 *
 * ولأنه سطر واحد، صارمٌ في ما لا يقوله:
 * - لا إيموجي، ولا خط كبير، ولا لون صارخ.
 * - لا يظهر بلا سبب. سببُه في `context`، والسطر بلا سبب لا يُرسم.
 * - لا يختفي بصمت إن لم يُوجد سبب: يعود إلى «أنا هنا… يومك معاك».
 */
import { Sunken, Tag } from "@/components/app/Surfaces";
import { arabicNumber } from "@/lib/time";
import type { Achievement } from "@/lib/oud-progress";
import type { OudLine, OudTone } from "@/lib/oud-voice";
import { toneLabel } from "@/lib/oud-voice";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

/** لون خافت لكل نبرة. النص أولا، واللون ثانوي — فلا يُقرأ لونه وحده. */
const TONE_CLASS: Record<OudTone, string> = {
  calm: "text-foreground/80",
  direct: "text-foreground",
  tease: "text-foreground/85",
  warm: "text-foreground",
  proud: "text-primary",
};

export function OudLineCard({
  line,
  xp,
  onOpen,
}: {
  line: OudLine | null;
  xp: { total: number; today: number; levelLabel: string };
  onOpen?: (view: string) => void;
}) {
  const clickable = Boolean(line?.view && onOpen);
  const Tag_ = clickable ? "button" : "div";

  return (
    <section aria-label="عود معك" className="flex flex-col gap-2">
      <Tag_
        {...(clickable
          ? { type: "button" as const, onClick: () => onOpen?.(line!.view!) }
          : {})}
        className={cn(
          "oud-press oud-card oud-tap flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-start",
          !clickable && "cursor-default",
        )}
      >
        {/* علامة عود: بلاطة جلية صغيرة، لا فقاعة محادثة. */}
        <span className="oud-icon-tile oud-icon-md shrink-0" aria-hidden>
          <Sparkles className="size-[1.25rem]" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="label-meta block text-primary">عود</span>
          <span
            className={cn("mt-0.5 block text-[15px] leading-8 font-semibold", TONE_CLASS[line?.tone ?? "calm"])}
          >
            {line?.text ?? "أنا هنا… يومك معاك"}
          </span>
        </span>
        <span className="sr-only">نبرة عود: {toneLabel(line?.tone ?? "calm")}</span>
      </Tag_>

      {xp.today > 0 ? (
        <Sunken className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5">
          <p className="label-meta text-muted-foreground">
            {arabicNumber(xp.total)} نقطة · {xp.levelLabel}
          </p>
          <p className="label-meta text-muted-foreground">
            {arabicNumber(xp.today)} اليوم
          </p>
        </Sunken>
      ) : null}
    </section>
  );
}

/**
 * إعلان إنجاز: مرة واحدة، ثم يختفي. **ليس** لوحة شارات، ولا نوافذ متتالية،
 * ولا احتفالا مصطنعا. الشارة نفسها في صفحة الإحصاءات.
 */
export function AchievementToast({
  achievement,
  onDismiss,
  onOpen,
}: {
  achievement: Achievement | null;
  onDismiss: () => void;
  onOpen?: (view: string) => void;
}) {
  if (!achievement) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      className="motion-swap fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+6rem)] z-50 mx-auto max-w-sm"
    >
      <div className="oud-card flex items-start gap-3 rounded-3xl p-4 shadow-[var(--oud-shadow-3)]">
        <span className="oud-icon-tile oud-icon-sm shrink-0" aria-hidden>
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold">فتحت: {achievement.label}</p>
          <p className="label-meta mt-0.5 leading-5 text-muted-foreground">{achievement.detail}</p>
          {onOpen ? (
            <button
              type="button"
              onClick={() => onOpen("stats")}
              className="touch-target mt-1.5 inline-flex items-center rounded-full px-2 text-[12px] font-semibold text-primary"
            >
              شوفها
            </button>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          aria-label="إغلاق إعلان الإنجاز"
          className="touch-target -me-2 -mt-2 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground"
        >
          <span aria-hidden>×</span>
        </button>
      </div>
    </div>
  );
}

export { Tag };
