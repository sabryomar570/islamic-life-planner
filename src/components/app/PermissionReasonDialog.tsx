/**
 * PHASE NEXT — لماذا نطلب الإذن، قبل أن نطلبه.
 *
 * **المشكلة التي تحلّها:** نافذة المتصفح نفسها تقول «الموقع يريد استخدام
 * موقعك» بلا سبب، ورفضها يبدو غامضا. فنشرح **قبل** الطلب لا بعده،
 * ونترك الرفض خيارا محترما بلا لوم وبلا تعطيل.
 *
 * **الوعد الذي نلتزم به ونكتبه للمستخدم، فلا نكسره:**
 * - لا نحفظ تاريخ مواقع، ولا نتتبّع في الخلفية.
 * - الموقع لا يثبت أن المستخدم صلّى.
 * - الرفض لا يمنع الصفحة الرئيسية ولا الصلاة ولا المواقيت.
 */
import { PrimaryButton, QuietButton } from "@/components/app/Surfaces";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Bell, MapPin, ShieldCheck } from "lucide-react";

export type PermissionKind = "notifications" | "location";

type Copy = {
  title: string;
  reason: string;
  bullets: string[];
  promise: string;
  allow: string;
  later: string;
  icon: typeof Bell;
};

/**
 * النصّ مُصدَّر عمدا: حوار Radix يعرض عبر بوابة لا تُرسَم على الخادم،
 * فنقرأ العقد نفسه في الاختبار بدل أن نثق به على عمياني.
 */
export const PERMISSION_COPY: Record<PermissionKind, Copy> = {
  notifications: {
    title: "ليه الإشعارات؟",
    reason:
      "عشان أذكّرك في وقت الصلاة بالظبط، لا أبعد ولا أقرب. ومن غير إذنك مش هيوصلك حاجة خالص.",
    bullets: [
      "وقت الصلاة، وقبلها بقليل.",
      "وقت وردك وأذكار المساء والنوم.",
      "مراجعة اليوم آخر الليل.",
    ],
    promise:
      "ومفيش سبام: تذكير واحد لكل صلاة، ولو رفضت هيشتغل كل حاجة عادي غير التنبيه.",
    allow: "اسمح بالإشعارات",
    later: "مش دلوقتي",
    icon: Bell,
  },
  location: {
    title: "ليه الموقع؟",
    reason:
      "عشان أعرف أقرب مسجد ليك بالمسافة، وأحسب مواقيت الصلاة على إحداثياتك أدق من اسم المدينة.",
    bullets: [
      "أقرب مسجد ليك والمسافة، والاتجاهات له في تطبيق الخرائط.",
      "قبلة أدق، ومواقيت أدق في مدينتك.",
    ],
    promise:
      "مش بنحفظ تاريخ مواقع، ومش بنتابعك في الخلفية، والموقع ما بيثبتش إنك صلّيت. ولو رفضت، كل حاجة تانية شغالة عادي.",
    allow: "سماح بالموقع",
    later: "مش دلوقتي",
    icon: MapPin,
  },
};

export function PermissionReasonDialog({
  kind,
  open,
  onOpenChange,
  onAllow,
  pending = false,
}: {
  kind: PermissionKind;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAllow: () => void;
  pending?: boolean;
}) {
  const copy = PERMISSION_COPY[kind];
  const Icon = copy.icon;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="surface-veil max-w-md gap-0 p-0">
        <DialogHeader className="p-5 pb-0 text-start">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Icon className="size-5" aria-hidden />
          </span>
          <DialogTitle className="label-display mt-3 text-foreground">{copy.title}</DialogTitle>
          <DialogDescription className="label-body mt-1.5 text-muted-foreground">
            {copy.reason}
          </DialogDescription>
        </DialogHeader>

        <div className="stack-sm p-5">
          <ul className="space-y-1.5">
            {copy.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-2 text-[13px] leading-6 text-foreground/85">
                <span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 rounded-2xl surface-sunken p-3 text-[12px] leading-6 text-muted-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
            <span>{copy.promise}</span>
          </p>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <PrimaryButton
              onClick={() => {
                onAllow();
                onOpenChange(false);
              }}
              loading={pending}
              className="px-5"
            >
              {copy.allow}
            </PrimaryButton>
            <QuietButton onClick={() => onOpenChange(false)} className="px-4">
              {copy.later}
            </QuietButton>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
