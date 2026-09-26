/**
 * PHASE NEXT — بطاقة المسجد في الرئيسية.
 *
 * **ليست ميزة جانبية.** الصلاة لا تحدث في فراغ، فالمسجد جزء من اللحظة.
 * لكنها **تقدير لا شهادة**: نقول كم مترا، ولا نقول إنك صليت.
 *
 * وحالات الفشل مكتوبة صراحة. التطبيق يقول «ما عرفتش» ولا يملأ الفراغ
 * بالاختراع: مسجدٌ مُختلَق أسوأ من مسجدٍ لا يُعرض.
 */
import { Panel, QuietButton, SectionHead, Skeleton } from "@/components/app/Surfaces";
import { formatDistance, isSafeMapsUrl, mapsDirectionsHref, type MosquePlace } from "@/lib/oud-mosque";
import type { MosqueState } from "@/hooks/use-oud";
import { MapPin, Navigation, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function MosqueCard({
  state,
  places,
  onOpenSettings,
  onRetry,
}: {
  state: MosqueState;
  places: readonly MosquePlace[];
  onOpenSettings?: () => void;
  onRetry?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const nearest = places[0] ?? null;

  // بلا موقع وبلا طلب: لا نلمس المستخدم ولا نلمس إذنه. لا شيء يُعرض.
  if (state === "unknown" && !nearest) return null;

  if (state === "denied") {
    return (
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المسجد"
          title="المسافة مش معروفة دلوقتي"
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

  if (state === "loading") {
    return (
      <Panel className="space-y-3 p-5 sm:p-6">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-52" />
        <p className="label-meta text-muted-foreground" role="status">
          بجيب أقرب مسجد لك…
        </p>
      </Panel>
    );
  }

  if (!nearest) {
    return (
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المسجد"
          title="ما لقيتش مسجد قريب"
          hint="مصدر المساجد مفتوح، وقد يكون بطيئا أو محجوبا في شبكتك. التطبيق يقول ما عرفش بدل ما يخترع اسما."
        />
        {onRetry ? (
          <QuietButton onClick={onRetry} className="mt-3 px-4 text-[12px]">
            حاول تاني
          </QuietButton>
        ) : null}
      </Panel>
    );
  }

  const href = mapsDirectionsHref(nearest);
  const rest = places.slice(1);

  return (
    <Panel className="p-5 sm:p-6">
      <SectionHead
        eyebrow="أقرب مسجد"
        title={nearest.name}
        hint={`${formatDistance(nearest.distanceMeters)} منك دلوقتي`}
      />

      <p className="mt-3 flex items-start gap-2 rounded-2xl surface-sunken p-3 text-[12px] leading-6 text-muted-foreground">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
        <span>
          المسافة تقدير من موقعك الآن. الموقع لا يثبت أنك صلّيت، وتسجيل الصلاة بيدك أنت.
        </span>
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {isSafeMapsUrl(href) ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="motion-press touch-target btn-primary-edge inline-flex min-h-11 items-center gap-2 rounded-full px-5 text-[13px] font-semibold text-primary-foreground"
          >
            <Navigation className="size-4" aria-hidden />
            افتح الاتجاهات
          </a>
        ) : null}
        {rest.length > 0 ? (
          <QuietButton
            onClick={() => setExpanded((value) => !value)}
            aria-expanded={expanded}
            className="px-4 text-[12px]"
          >
            <MapPin className="size-3.5" aria-hidden />
            {expanded ? "اقفل" : `${rest.length} قريبين غيره`}
          </QuietButton>
        ) : null}
      </div>

      {expanded && rest.length > 0 ? (
        <ul className="mt-3 stack-sm">
          {rest.map((place) => (
            <li
              key={place.id}
              className="flex items-center justify-between gap-3 rounded-2xl surface-sunken px-3 py-2 text-[12px]"
            >
              <span className="min-w-0 truncate text-foreground">{place.name}</span>
              <span className="shrink-0 text-muted-foreground">
                {formatDistance(place.distanceMeters)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </Panel>
  );
}
