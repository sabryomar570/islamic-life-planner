/**
 * PHASE NEXT — اتجاه القبلة.
 *
 * **ما تعرضه:** زاوية واحدة محسوبة من إحداثياتك، واسم الجهة، والمسافة.
 * **ما لا تعرضه أبدا:** أنك صليت في القبلة. الاتجاه جغرافيا، وسجل
 * الصلاة يبقى بيدك.
 *
 * **البوصلة أمانة لا زينة:** إن لم يقرأ المتصفح مستشعر الاتجاه، لا نرسم
 * إبرة ثابتة توهم بدقة وهي ليست كذلك، بل نقول للمستخدم يفصد بوصلة
 * جهازه، ونكتفي بالزاوية الحقيقية المحسوبة.
 */
import { Panel, QuietButton, SectionHead, Sunken } from "@/components/app/Surfaces";
import {
  atKaaba,
  compassSupported,
  distanceToKaabaKm,
  formatBearing,
  formatQiblaDistance,
  isValidPoint,
  needleRotation,
  qiblaBearing,
  qiblaDirectionName,
  type QiblaPoint,
} from "@/lib/qibla";
import { arabicNumber } from "@/lib/time";
import { Compass, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";

/** حالة البوصلة: بلا مستشعر، أو مستشعر لم يرد، أو مستشعر يقرأ. */
type CompassState = "unsupported" | "denied" | "ready";

/**
 * يقرأ اتجاه الجهاز إن سمح. **بلا إذن iOS**: لو طلبناه لكان قاطع إذن في
 * مسار صامت، والاستعداد صفر. فإما أن يقرأ المتصفح بلا إذن، وإلا بقيت
 * الزاوية المحسوبة وحدها، ونقول ذلك للمستخدم.
 */
function useDeviceHeading(active: boolean): { state: CompassState; heading: number | null } {
  const [state, setState] = useState<CompassState>(() =>
    compassSupported() ? "ready" : "unsupported",
  );
  const [heading, setHeading] = useState<number | null>(null);

  useEffect(() => {
    if (!active || !compassSupported()) return;
    const onOrientation = (event: DeviceOrientationEvent) => {
      // الخاصية خاصة ب WebKit وغير موجودة في تعريف TypeScript القياسي،
      // فنقرأها من شكل موسّع صراحة. غيابها ليس خطأ: يعني بلا إذن.
      const heading = (event as DeviceOrientationEvent & { webkitCompassHeading?: number })
        .webkitCompassHeading;
      const raw = typeof heading === "number" && Number.isFinite(heading) ? heading : null;
      if (raw === null) {
        setState((current) => (current === "ready" ? "denied" : current));
        return;
      }
      setHeading((360 - raw) % 360);
      setState("ready");
    };
    window.addEventListener("deviceorientationabsolute", onOrientation as EventListener);
    window.addEventListener("deviceorientation", onOrientation as EventListener);
    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation as EventListener);
      window.removeEventListener("deviceorientation", onOrientation as EventListener);
    };
  }, [active]);

  return { state, heading };
}

/** الإبرة: زاوية دوران محسوبة، أو سهم ثابت مع نص صادق بجواره. */
function QiblaNeedle({ rotation, angle }: { rotation: number | null; angle: number }) {
  return (
    <span
      role="img"
      aria-label={`اتجاه القبلة ${formatBearing(angle)} درجة من الشمال`}
      className="relative flex size-28 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 sm:size-32"
    >
      <span className="absolute top-1 text-[10px] font-bold text-muted-foreground" aria-hidden>
        شمال
      </span>
      <span
        className="flex h-full w-full items-center justify-center"
        style={{ transform: `rotate(${rotation ?? angle}deg)` }}
      >
        <svg viewBox="0 0 24 24" className="size-12 text-primary sm:size-14" aria-hidden>
          <path
            d="M12 2.5 19 21l-7-4-7 4 7-18.5Z"
            fill="currentColor"
            opacity={rotation === null ? 0.35 : 1}
          />
        </svg>
      </span>
    </span>
  );
}

/** الأرقام المعروضة: الزاوية والمسافة، وهي كل ما نعد به. */
function QiblaFigures({ angle, km }: { angle: number; km: number }) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <p className="text-[15px] leading-8 font-semibold text-foreground">
        {qiblaDirectionName(angle)}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-[12px]">
        <div className="rounded-2xl surface-sunken px-3 py-2">
          <dt className="text-muted-foreground">الزاوية من الشمال</dt>
          <dd className="mt-0.5 font-bold text-foreground">{formatBearing(angle)}°</dd>
        </div>
        <div className="rounded-2xl surface-sunken px-3 py-2">
          <dt className="text-muted-foreground">المسافة للكعبة</dt>
          <dd className="mt-0.5 font-bold text-foreground">{formatQiblaDistance(km)}</dd>
        </div>
      </dl>
    </div>
  );
}

/** النص الصادق: الموقع لا يثبت صلاة. */
function QiblaHonesty() {
  return (
    <p className="mt-3 flex items-start gap-2 rounded-2xl surface-sunken p-3 text-[12px] leading-6 text-muted-foreground">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
      <span>
        الزاوية محسوبة من موقعك الآن على مسافة مستقيمة. الموقع لا يثبت أنك صليت، وتسجيل صلاتك
        بيدك أنت.
      </span>
    </p>
  );
}

/** بطاقة مختصرة للرئيسية. بلا موقع لا شيء يُعرض ولا إذن يُطلب. */
export function QiblaCard({
  coords,
  denied,
  onOpenSettings,
  onOpenQibla,
}: {
  coords: QiblaPoint | null;
  denied?: boolean;
  onOpenSettings?: () => void;
  onOpenQibla?: () => void;
}) {
  /**
   * **الخطّاف فوق كل خروج مبكر، لا تحته.**
   *
   * كان `useDeviceHeading` بعد `if (!isValidPoint(coords)) return null`، أي
   * أنه يُستدعى في بعض الرسم ويغيب في غيرها. هذا لا يجتاز البناء ولا
   * يظهر إلا لحظة الانتقال من بلا موقع إلى بموقع، فيسقط التطبيق عندها
   *точно. فترتيب الاستدعاء ثابت، والمحتوى وحده يتغيّر.
   */
  const { state: compassState, heading } = useDeviceHeading(true);
  const rotation = needleRotation(heading, isValidPoint(coords) ? qiblaBearing(coords) : 0);

  if (!isValidPoint(coords)) {
    if (!denied) return null;
    return (
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="القبلة"
          title="الزاوية مش معروفة دلوقتي"
          hint="رفضت إذن الموقع، والصلاة كالمعتاد. تقدر تفعّله من الإعدادات وقت ما تحب، ولا يعطّل شيئا."
        />
        {onOpenSettings ? (
          <QuietButton onClick={onOpenSettings} className="mt-3 px-4 text-[12px]">
            الإعدادات
          </QuietButton>
        ) : null}
      </Panel>
    );
  }

  const angle = qiblaBearing(coords);
  const km = distanceToKaabaKm(coords);
  const honest =
    compassState === "unsupported"
      ? "متصفحك ما فيهوش مستشعر بوصلة. الزاوية المحسوبة صحيحة، ودوّر بوصلة جهازك."
      : "مستشعر البوصلة ما راسلش في المتصفح هذا. الزاوية المحسوبة صحيحة، ودوّر بوصلة جهازك.";

  return (
    <Panel className="p-5 sm:p-6">
      <SectionHead
        eyebrow="القبلة"
        title={atKaaba(km) ? "أنت عند البيت" : `القبلة ${qiblaDirectionName(angle)}`}
        hint={`${formatQiblaDistance(km)} من الكعبة`}
        action={
          onOpenQibla ? (
            <button
              type="button"
              onClick={onOpenQibla}
              className="touch-target inline-flex items-center gap-1 rounded-full px-3 text-[12px] font-semibold text-primary"
            >
              صفحتها
              <Compass className="size-3.5" aria-hidden />
            </button>
          ) : null
        }
      />

      <div className="mt-3 flex flex-wrap items-center gap-4">
        <QiblaNeedle rotation={rotation} angle={angle} />
        <QiblaFigures angle={angle} km={km} />
      </div>

      {compassState !== "ready" || rotation === null ? (
        <p className="label-meta mt-3 leading-6 text-muted-foreground">{honest}</p>
      ) : null}

      <QiblaHonesty />
    </Panel>
  );
}

/** صفحة القبلة كاملة: نفس البيانات بحجم أكبر، ولا شيء أكثر. */
export function QiblaView({ coords, denied }: { coords: QiblaPoint | null; denied?: boolean }) {
  // نفس القاعدة: الخطّاف أولا، فلا يتبدّل ترتيب الاستدعاء بتبدّل الموقع.
  const { state: compassState, heading } = useDeviceHeading(true);
  const rotation = needleRotation(heading, isValidPoint(coords) ? qiblaBearing(coords) : 0);

  if (!isValidPoint(coords)) {
    return (
      <Panel className="p-6">
        <SectionHead
          eyebrow="القبلة"
          title={denied ? "الموقع مرفوض" : "محتاجين موقعك مرة واحدة"}
          hint={
            denied
              ? "رفضت إذن الموقع، فالزاوية مش معروفة. كل حاجة تانية شغالة عادي، وتقدر تفعّله من الإعدادات وقت ما تحب."
              : "القبلة زاوية بين موقعك والكعبة، فلا تُحسب إلا من إحداثياتك. من الإعدادات تفعّل الموقع، وتقرأ السبب قبل الطلب."
          }
        />
      </Panel>
    );
  }

  const angle = qiblaBearing(coords);
  const km = distanceToKaabaKm(coords);
  const honest =
    compassState === "unsupported"
      ? "متصفحك ما فيهوش مستشعر بوصلة. الزاوية المحسوبة أعلاه صحيحة، ودوّر بوصلة جهازك في الاتجاه ده."
      : "مستشعر البوصلة ما راسلش في المتصفح هذا. الزاوية المحسوبة أعلاه صحيحة، ودوّر بوصلة جهازك.";

  return (
    <div className="stack">
      <Panel className="p-6">
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
          <QiblaNeedle rotation={rotation} angle={angle} />
          <QiblaFigures angle={angle} km={km} />
        </div>

        {compassState !== "ready" || rotation === null ? (
          <Sunken className="mt-4 px-4 py-3">
            <p className="label-meta leading-6 text-muted-foreground">{honest}</p>
          </Sunken>
        ) : (
          <p className="label-meta mt-4 text-muted-foreground">
            الإبرة بتتحرك مع بوصلة جهازك. الزاوية ثابتة: {formatBearing(angle)} درجة من الشمال.
          </p>
        )}

        <QiblaHonesty />
      </Panel>

      <Sunken className="px-4 py-3">
        <p className="label-meta leading-6 text-muted-foreground">
          الحساب على مسافة مستقيمة من موقعك المعروض، فقد تتغير بخطاك خطوة أو خطوتين. والصلاة في
          المسجد أجمع من أي زاوية.
        </p>
      </Sunken>

      <p className="px-2 text-center text-[11px] leading-6 text-muted-foreground">
        {arabicNumber(Math.round(km))} كيلومتر — {qiblaDirectionName(angle)} ({formatBearing(angle)}{" "}
        درجة)
      </p>
    </div>
  );
}
