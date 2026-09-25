/**
 * PHASE 3.x — نافذة الدعم.
 *
 * **لماذا نافذة لا قسم في الصفحة؟** رقم المحفظة شيء يفتحه من يقرّر
 * الدعم، لا ما يمرّ به كل من يفتح «عن التطبيق». فالرقم لا يظهر في الصفحة
 * أبدا، ولا يُنسخ بالخطأ، ولا يبقى معروضا بعد إغلاقها.
 *
 * **لا زر We Pay.** لا رابط موثوق يفتح التطبيق من المتصفح، فالزر الوهمي
 * وعدٌ لا نقدر على الوفاء به. المحلول: رقم + نسخ + سطر يشرح الخطوات.
 *
 * **الرقم يبقى ظاهرًا حتى بعد الفشل.** فشل النسخ يعني أن الحافظة مغلقة،
 * لا أن الرقم اختفى. المستخدم عنده طريق يدوي، ونُبقيه عنده.
 */

import { QuietButton } from "@/components/app/Surfaces";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SUPPORT, copyToClipboard, type CopyResult } from "@/lib/developer";
import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

export function SupportDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [copy, setCopy] = useState<CopyResult | null>(null);
  // مرجع للرقم: ينقل التركيز إليه بعد نجاح النسخ، فيعرف قارئ
  // الشاشة أن ما نُسخ هو هذا الرقم بعينه.
  const liveRef = useRef<HTMLParagraphElement | null>(null);

  // فتح النافذة من جديد يبدأ من حالة نظيفة: لا «تم النسخ» من مرة ago.
  useEffect(() => {
    if (open) setCopy(null);
  }, [open]);

  const onCopy = useCallback(async () => {
    const result = await copyToClipboard(SUPPORT.walletCopy);
    setCopy(result);
    // النجاح يُعلن لقارئ الشاشة، والنظر إلى الزر وحده لا يكفي.
    if (result === "copied") liveRef.current?.focus();
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="surface-veil max-w-md gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="px-5 pt-5 text-start sm:px-6">
          <p className="eyebrow">مساهمة في استمرار المشروع</p>
          <DialogTitle className="label-display mt-1 text-foreground">
            {SUPPORT.dialogTitle}
          </DialogTitle>
          <DialogDescription className="label-body mt-2 text-muted-foreground">
            {SUPPORT.dialogLead}
          </DialogDescription>
        </DialogHeader>

        <div className="rule-t mx-5 sm:mx-6">
          <p className="label-meta py-3 text-muted-foreground">{SUPPORT.methodLabel}</p>

          {/* الوسيلة: اسم فقط. لا زر يفتح شيئا — لا رابط موثوق لدينا. */}
          <div className="surface-secondary rounded-2xl px-4 py-3">
            <p className="label-section text-foreground">We Pay</p>
            <p
              ref={liveRef}
              tabIndex={-1}
              aria-live="polite"
              className="mt-1 font-mono text-[15px] tracking-[0.06em] text-foreground"
              dir="ltr"
            >
              {SUPPORT.walletDisplay}
            </p>
          </div>

          <p className="label-meta py-3 leading-6 text-muted-foreground">{SUPPORT.purpose}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 py-4 sm:px-6">
          <QuietButton
            state={copy === "copied" ? "success" : "default"}
            onClick={() => void onCopy()}
            aria-label={`${SUPPORT.copyLabel} — ${SUPPORT.walletDisplay}`}
          >
            {copy === "copied" ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copy === "copied" ? SUPPORT.copiedLabel : SUPPORT.copyLabel}
          </QuietButton>

          {copy && copy !== "copied" ? (
            <p className="label-meta text-muted-foreground" role="status">
              {SUPPORT.copyFailedLabel}
            </p>
          ) : null}
        </div>

        <p className="label-meta px-5 pb-5 leading-6 text-muted-foreground sm:px-6">
          {SUPPORT.howTo}
        </p>
      </DialogContent>
    </Dialog>
  );
}
