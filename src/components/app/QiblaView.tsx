/**
 * «القبلة» — a service, not an information page.
 *
 * **The flow is the point:** open, understand the direction, turn the
 * phone, arrive. So the dial is the hero, the reading is written in words
 * next to it, and the calibration instruction appears exactly when the
 * sensor is unsteady and not one second before.
 *
 * **What this page will never do:**
 *   - claim a precision it does not have
 *   - show a needle that is not backed by a reading
 *   - ask for location before saying why
 *   - break when the permission is refused
 *   - pretend there are mosques nearby when nothing found them
 *
 * **Location is optional.** A qibla bearing needs a position, but a device
 * compass plus a known position is enough; without a position we say so
 * instead of guessing. The mosque service already exists and is linked, not
 * duplicated: no mosque data is invented here.
 */
import {
  CompassDial,
  CompassStateNote,
  canRequestOrientationPermission,
  requestOrientationPermission,
  useDeviceHeading,
  type CompassState,
} from "@/components/oud/CompassDial";
import {
  ActionButton,
  Badge,
  ElevatedCard,
  HeroCard,
  ListRow,
  ScreenTitle,
  SectionHeader,
  SecondaryButton,
  StatCard,
  Sunken,
} from "@/components/oud/primitives";
import { PermissionReasonDialog } from "@/components/app/PermissionReasonDialog";
import type { QiblaPoint } from "@/lib/qibla";
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
} from "@/lib/qibla";
import { MapPin, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function QiblaCard({
  coords,
  onOpenQibla,
}: {
  coords: QiblaPoint | null;
  onOpenQibla: () => void;
}) {
  /** The small home tile. It must not compete with the prayer above it. */
  if (!coords) return null;
  const bearing = qiblaBearing(coords);
  return (
    <button
      type="button"
      onClick={onOpenQibla}
      className="oud-press oud-card oud-tap flex w-full items-center gap-3 rounded-3xl px-4 py-3.5 text-start"
    >
      <span className="oud-icon-tile oud-icon-sm" aria-hidden>
        <CompassGlyph />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[14px] font-semibold text-foreground">القبلة</span>
        <span className="label-meta block text-muted-foreground">
          {formatBearing(bearing)} · {qiblaDirectionName(bearing)}
        </span>
      </span>
      <span className="label-meta shrink-0 text-muted-foreground">{formatQiblaDistance(distanceToKaabaKm(coords))}</span>
    </button>
  );
}

function CompassGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 5 14.4 12 12 10.6 9.6 12Z" fill="currentColor" />
    </svg>
  );
}

export function QiblaView({
  coords,
  locationDenied,
  onRequestLocation,
  onOpenSettings,
  onOpenMosques,
}: {
  coords: QiblaPoint | null;
  locationDenied: boolean;
  onRequestLocation: () => void;
  onOpenSettings: () => void;
  onOpenMosques: () => void;
}) {
  const [reasonOpen, setReasonOpen] = useState(false);
  const [sensorAllowed, setSensorAllowed] = useState(false);
  const sensor = useDeviceHeading(sensorAllowed);

  const hasPoint = coords !== null && isValidPoint(coords);
  const bearing = hasPoint ? qiblaBearing(coords) : null;
  const direction = bearing === null ? null : qiblaDirectionName(bearing);
  const distance = hasPoint ? distanceToKaabaKm(coords) : null;
  const here = hasPoint ? atKaaba(distance ?? 0) : false;

  const needsSensorPermission = canRequestOrientationPermission() && !sensorAllowed;
  const state: CompassState = !sensorAllowed
    ? compassSupported()
      ? "calibrating"
      : "unsupported"
    : sensor.state;

  const askForSensor = async () => {
    const outcome = await requestOrientationPermission();
    setSensorAllowed(outcome !== "denied");
  };

  const askForLocation = () => {
    if (needsSensorPermission) {
      setReasonOpen(true);
      return;
    }
    onRequestLocation();
  };

  return (
    <div className="flex flex-col gap-5">
      <ScreenTitle title="القبلة" subtitle="اتجاه الكعبة من موقعك" />

      {/* The dial. One hero, one direction. */}
      <HeroCard className="p-5 sm:p-6">
        {bearing === null ? (
          <NoLocation
            denied={locationDenied}
            onRequest={askForLocation}
            onOpenSettings={onOpenSettings}
          />
        ) : (
          <div className="flex flex-col items-center gap-4">
            <CompassDial qiblaBearing={bearing} heading={sensor.heading} state={state} />

            {/* The number, so the direction never depends on the motion. */}
            <div className="text-center">
              <p className="text-[26px] leading-9 font-bold text-foreground">
                {formatBearing(bearing)}{" "}
                <span className="text-[14px] font-semibold text-muted-foreground">درجة من الشمال</span>
              </p>
              <p className="label-meta mt-0.5 text-muted-foreground">
                {direction} · {formatQiblaDistance(distance ?? 0)}
              </p>
            </div>

            <CompassStateNote state={state} />

            {needsSensorPermission ? (
              <ActionButton onClick={() => void askForSensor()} className="px-4 text-[13px]">
                فعّل البوصلة
              </ActionButton>
            ) : null}

            {state === "denied" ? (
              <p className="label-meta max-w-xs text-center text-muted-foreground">
                لم يُسمح للبوصلة. الزاوية أعلاه محسوبة من موقعك، وتظل صحيحة بلا مستشعر.
              </p>
            ) : null}
          </div>
        )}
      </HeroCard>

      {/* Where you are. Coordinates only when they explain something. */}
      {hasPoint ? (
        <ul className="grid grid-cols-2 gap-2.5">
          <li>
            <StatCard
              label="اتجاه القبلة"
              value={formatBearing(bearing ?? 0)}
              hint={direction ?? undefined}
              className="h-full"
            />
          </li>
          <li>
            <StatCard
              label="المسافة إلى الكعبة"
              value={formatQiblaDistance(distance ?? 0)}
              hint={here ? "أنت عند الكعبة" : "خط مستقيم"}
              className="h-full"
            />
          </li>
        </ul>
      ) : null}

      {/* The honesty note. It is not decoration; it is the contract. */}
      <Sunken className="flex items-start gap-2.5 p-3.5">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <p className="label-meta leading-6 text-muted-foreground">
          الموقع يحدّد الزاوية فقط. لا يثبت أنك صليت، ولا أن صلاتك في القبلة.
        </p>
      </Sunken>

      {/* Nearby mosques already exist as a service. This links to it; it does
          not invent a second list or a fake result. */}
      <ElevatedCard className="overflow-hidden">
        <SectionHeader title="المساجد القريبة" subtitle="خدمة قائمة في عبادتي" className="p-5 pb-3" />
        <ul>
          <li className="border-t border-[var(--oud-line-soft)]">
            <ListRow
              icon={MapPin}
              title="افتح بطاقة المسجد"
              meta="أقرب مسجد إليك، والمسافة والاتجاهات"
              onClick={onOpenMosques}
            />
          </li>
        </ul>
      </ElevatedCard>

      <PermissionReasonDialog
        kind="location"
        open={reasonOpen}
        onOpenChange={setReasonOpen}
        onAllow={() => onRequestLocation()}
      />
    </div>
  );
}

function NoLocation({
  denied,
  onRequest,
  onOpenSettings,
}: {
  denied: boolean;
  onRequest: () => void;
  onOpenSettings: () => void;
}) {
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <span className="oud-icon-tile oud-icon-lg" aria-hidden>
        <MapPin className="size-6" />
      </span>
      <p className="text-[16px] font-bold text-foreground">نحتاج موقعك مرة واحدة</p>
      <p className="label-body max-w-sm text-muted-foreground">
        علشان أحدد اتجاه القبلة بدقة حسب مكانك.
      </p>
      {denied ? (
        <>
          <Badge tone="attention">الموقع مرفوض</Badge>
          <p className="label-meta max-w-sm text-muted-foreground">
            الصفحة تعمل بلا موقع. فعّله من الإعدادات إن أردت زاوية من موضعك.
          </p>
          <SecondaryButton onClick={onOpenSettings} className="px-4 text-[13px]">
            الإعدادات
          </SecondaryButton>
        </>
      ) : (
        <ActionButton onClick={onRequest} className="px-4 text-[13px]">
          السماح بالموقع
        </ActionButton>
      )}
    </div>
  );
}

export { needleRotation };
