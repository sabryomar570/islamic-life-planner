/**
 * PHASE 3 — قارئ الحديث.
 *
 * **فصل مقصود:** النص في الوسط، والمصدر تحته في منطقة منفصلة بصريا.
 * لا شريط أدوات كبير، ولا أزرار كثيرة. ثلاثة أفعال فقط يستعملها القارئ
 * فعلا: حفظ، نسخ، تنقّل.
 *
 * **حالة التوثيق ظاهرة دائمًا** ولا تختفي في نافذة. من يقرأ حديثا يحتاج أن
 * يعرف أنه ليس يقينًا، فالرفق هنا موضع أمانة لا زينة.
 */

import { Artwork } from "@/components/app/Artworks";
import { QuietButton } from "@/components/app/Surfaces";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import {
  REVIEW_STATUS_HINTS,
  REVIEW_STATUS_LABELS,
  citationLine,
  reviewStatusOf,
} from "@/lib/hadith-metadata";
import { cn } from "@/lib/utils";
import { sectionTitle, type Hadith } from "@/data/hadith";
import { Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, Copy, Share2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

/** النص الذي يظهر بعد النسخ. لا يُزاد عليه. */
export function hadithCitation(hadith: Hadith): string {
  return `«${hadith.text}»\n${hadith.narrator} — ${citationLine(hadith)}\n(${sectionTitle(hadith.section)})`;
}

export function HadithReader({
  hadith,
  open,
  onOpenChange,
  saved,
  onToggleFavorite,
  onNavigate,
}: {
  hadith: Hadith | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saved: boolean;
  onToggleFavorite: (hadith: Hadith) => void;
  onNavigate?: (direction: "next" | "prev") => void;
}) {
  const [progress, setProgress] = useState(0);
  const bodyRef = useRef<HTMLDivElement | null>(null);

  // تقدّم القراءة يُقاس على التمرير لا على فاصل زمني، فيحترم المستخدم.
  const onScroll = useCallback(() => {
    const node = bodyRef.current;
    if (!node) return;
    const max = node.scrollHeight - node.clientHeight;
    setProgress(max <= 0 ? 0 : Math.min(100, (node.scrollTop / max) * 100));
  }, []);

  useEffect(() => {
    if (!open) {
      setProgress(0);
      return;
    }
    // النافذة تفتح على أعلى الحديث، لا على موضع عشوائي.
    bodyRef.current?.scrollTo({ top: 0 });
    setProgress(0);
  }, [open, hadith?.id]);

  if (!hadith) return null;

  const status = reviewStatusOf(hadith);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(hadithCitation(hadith));
      toast.success("نُسخ الحديث بمصدره.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  };

  const share = async () => {
    const text = `«${hadith.text}»\n${hadith.narrator} — ${citationLine(hadith)}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "حديث", text });
        return;
      } catch {
        // تراجع المستخدم عن المشاركة: نكتفي بالنسخ.
      }
    }
    await copy();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        dir="rtl"
        className="surface-veil max-w-2xl gap-0 overflow-hidden p-0"
      >
        <DialogHeader className="px-5 pt-5 text-start sm:px-6">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow">{sectionTitle(hadith.section)}</p>
              <DialogTitle className="label-display mt-1 text-foreground">
                قراءة الحديث
              </DialogTitle>
            </div>
            <Artwork name="hadith" tone="soft" />
          </div>
          {/* شريط رفيع يظهر فقط عندما يطول الحديث. */}
          <Progress
            value={progress}
            aria-label="تقدّم القراءة"
            className={cn("mt-3 h-1 transition-opacity", progress > 0 ? "opacity-100" : "opacity-0")}
          />
          <DialogDescription className="sr-only">
            {`الحديث بمصدره: ${hadith.narrator} — ${citationLine(hadith)}`}
          </DialogDescription>
        </DialogHeader>

        <div
          ref={bodyRef}
          onScroll={onScroll}
          className="mushaf-scroll max-h-[52vh] overflow-y-auto px-5 py-4 sm:px-6"
        >
          <p className="quran-text text-[17px] leading-[2.4] text-[var(--editorial-ink)]">
            {hadith.text}
          </p>

          {/* الخطوة العملية: سؤال صغير لا أمر. */}
          <p className="label-body mt-5 rounded-2xl surface-secondary px-4 py-3 text-foreground/80">
            {hadith.action}
          </p>
        </div>

        {/* المصدر منطقة مستقلة عن النص، لا سطرًا عابرًا في آخر فقرة. */}
        <div className="rule-t mx-5 px-0 sm:mx-6">
          <dl className="grid gap-2 py-4">
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="label-meta font-semibold text-foreground/70">الراوي</dt>
              <dd className="label-body text-foreground/85">{hadith.narrator}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="label-meta font-semibold text-foreground/70">المصدر</dt>
              <dd className="label-body text-foreground/85">{citationLine(hadith)}</dd>
            </div>
            <div className="flex flex-wrap items-baseline gap-x-2">
              <dt className="label-meta font-semibold text-foreground/70">حالة التوثيق</dt>
              <dd className="label-body text-foreground/85">
                {REVIEW_STATUS_LABELS[status]}
                <span className="mt-1 block text-muted-foreground">
                  {REVIEW_STATUS_HINTS[status]}
                </span>
              </dd>
            </div>
          </dl>
        </div>

        <div className="flex flex-wrap items-center gap-2 px-5 pb-5 sm:px-6">
          <QuietButton
            state={saved ? "active" : "default"}
            aria-pressed={saved}
            onClick={() => onToggleFavorite(hadith)}
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {saved ? "محفوظ" : "احفظ"}
          </QuietButton>
          <QuietButton onClick={() => void copy()}>
            <Copy className="size-3.5" />
            نسخ
          </QuietButton>
          <QuietButton onClick={() => void share()}>
            <Share2 className="size-3.5" />
            مشاركة
          </QuietButton>

          <div className="ms-auto flex items-center gap-1">
            {onNavigate ? (
              <QuietButton aria-label="الحديث السابق" onClick={() => onNavigate("prev")}>
                <ChevronRight className="size-3.5" />
              </QuietButton>
            ) : null}
            {onNavigate ? (
              <QuietButton aria-label="الحديث التالي" onClick={() => onNavigate("next")}>
                <ChevronLeft className="size-3.5" />
              </QuietButton>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
