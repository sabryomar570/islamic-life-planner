import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { PROPHET_STORIES, type ProphetStoryRecord } from "@/data/prophets";
import { cn } from "@/lib/utils";
import { arabicNumber } from "@/lib/time";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock,
  Copy,
  Landmark,
  ScrollText,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const PROGRESS_KEY = "oud:prophets:read";

type Filter = "all" | "saved";

function readProgress(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(PROGRESS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, number>;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeProgress(progress: Record<string, number>) {
  try {
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
  } catch {
    /* لا شيء */
  }
}

function storyMessage(story: ProphetStoryRecord) {
  return `${story.title}\n${story.prophet}\n\n${story.paragraphs.join("\n\n")}\n\nالعبرة: ${story.lesson}\n\nالمصدر: ${story.source}`;
}

async function shareStory(story: ProphetStoryRecord) {
  const text = storyMessage(story);
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title: story.title, text });
      return;
    } catch {
      /* تراجع المستخدم */
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast.success("نُسخت القصة بمصدرها.");
  } catch {
    toast.error("تعذّر النسخ من المتصفح.");
  }
}

function StoryCard({
  story,
  saved,
  read,
  onOpen,
  onToggleSave,
}: {
  story: ProphetStoryRecord;
  saved: boolean;
  read: boolean;
  onOpen: () => void;
  onToggleSave: () => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <GlassCard hover className={cn("flex flex-col p-5", read && "ring-1 ring-emerald-400/40")}>
      <div className="flex items-start justify-between gap-3">
        <button
          type="button"
          onClick={onOpen}
          className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70 transition-colors hover:text-foreground"
        >
          <Landmark className="size-3.5 text-primary" />
          {story.prophet}
        </button>
        <button
          type="button"
          aria-label={saved ? "محفوظة — إزالة الحفظ" : "حفظ القصة"}
          onClick={onToggleSave}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-full transition-all active:scale-90",
            saved
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
              : "glass-tile text-foreground/60 hover:text-foreground",
          )}
        >
          {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
        </button>
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-7">{story.title}</h3>

      <p className={cn("mt-2 text-[13px] leading-7 text-foreground/80", !open && "line-clamp-2")}>
        {story.paragraphs[0]}
      </p>

      {open ? (
        <div className="mt-2 space-y-2.5">
          {story.paragraphs.slice(1).map((paragraph, index) => (
            <p key={index} className="text-[13px] leading-7 text-foreground/80">
              {paragraph}
            </p>
          ))}
          {story.ayah ? (
            <div className="rounded-2xl bg-primary/8 p-3.5">
              <p className="quran-text text-[1.02rem] leading-9">﴿{story.ayah.text}﴾</p>
              <p className="mt-1 text-[10.5px] font-medium text-primary">{story.ayah.ref}</p>
            </div>
          ) : null}
          <div className="rounded-2xl bg-emerald-500/8 p-3.5 ring-1 ring-emerald-400/25">
            <p className="text-[12px] font-semibold text-emerald-800">العبرة</p>
            <p className="mt-1 text-[12.5px] leading-6 text-foreground/85">{story.lesson}</p>
          </div>
          <p className="text-[10.5px] leading-5 text-muted-foreground">المصدر: {story.source}</p>
        </div>
      ) : null}

      <div className="mt-auto pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <GlassPill onClick={() => setOpen((value) => !value)}>
            <span className="flex items-center gap-1.5">
              <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
              {open ? "إخفاء" : "اكمل القصة"}
            </span>
          </GlassPill>
          <GlassPill onClick={() => void shareStory(story)}>
            <span className="flex items-center gap-1.5">
              <Share2 className="size-3.5" /> مشاركة
            </span>
          </GlassPill>
          <span className="mr-auto flex items-center gap-1 text-[10px] text-muted-foreground">
            <Clock className="size-3" /> {arabicNumber(story.readMinutes)} دقائق
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

export function ProphetsView({
  savedIds,
  onToggleSave,
}: {
  savedIds: Set<string>;
  onToggleSave: (id: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [progress, setProgress] = useState<Record<string, number>>(() => readProgress());
  const [selected, setSelected] = useState<ProphetStoryRecord | null>(null);

  const items = useMemo(
    () =>
      filter === "saved"
        ? PROPHET_STORIES.filter((story) => savedIds.has(story.id))
        : PROPHET_STORIES,
    [filter, savedIds],
  );

  const readCount = useMemo(
    () => Object.values(progress).filter(Boolean).length,
    [progress],
  );

  const openStory = (story: ProphetStoryRecord) => {
    setSelected(story);
    const next = { ...progress, [story.id]: Date.now() };
    setProgress(next);
    writeProgress(next);
  };

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Landmark className="size-5" />}
          title="قصص الأنبياء"
          hint={`${arabicNumber(PROPHET_STORIES.length)} قصصًا من القرآن والسيرة — بمصدر كل قصة وعبرتها`}
          action={
            <GlassPill>
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5" /> قرأت {arabicNumber(readCount)}
              </span>
            </GlassPill>
          }
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <GlassPill active={filter === "all"} onClick={() => setFilter("all")}>
            كل القصص
          </GlassPill>
          <GlassPill active={filter === "saved"} onClick={() => setFilter("saved")}>
            محفوظاتي{savedIds.size > 0 ? ` (${arabicNumber(savedIds.size)})` : ""}
          </GlassPill>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard soft className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            لا قصص محفوظة بعد — اضغط أيقونة الحفظ على أي قصة.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((story) => (
            <StoryCard
              key={story.id}
              story={story}
              saved={savedIds.has(story.id)}
              read={Boolean(progress[story.id])}
              onOpen={() => openStory(story)}
              onToggleSave={() => onToggleSave(story.id, story.title)}
            />
          ))}
        </div>
      )}

      <GlassCard soft className="p-4">
        <p className="flex items-start gap-2 text-[10.5px] leading-5 text-muted-foreground">
          <ScrollText className="mt-0.5 size-3.5 shrink-0" />
          مصادر القصص: القرآن الكريم بالسورة والآية، وصحيح البخاري ومسلم، وسيرة ابن هشام.
          لا تُعرض صور للأنبياء عليهم السلام حفاظًا على قدرهم؛ المحتوى نصوص مقروءة فقط.
        </p>
      </GlassCard>

      {/* نافذة القراءة المركزة */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-sm sm:items-center"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="glass-strong m-3 max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-white/80 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]">
                <Landmark className="size-3.5 text-primary" />
                {selected.prophet}
              </span>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="btn-edge rounded-full px-3 py-1.5 text-[11px] font-medium"
                aria-label="إغلاق"
              >
                إغلاق
              </button>
            </div>

            <h2 className="mt-4 text-xl font-bold leading-8">{selected.title}</h2>

            <div className="mt-4 space-y-3">
              {selected.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-[14px] leading-8 text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>

            {selected.ayah ? (
              <div className="mt-5 rounded-2xl bg-primary/8 p-4">
                <p className="quran-text text-[1.1rem] leading-10">﴿{selected.ayah.text}﴾</p>
                <p className="mt-1.5 text-[11px] font-medium text-primary">{selected.ayah.ref}</p>
              </div>
            ) : null}

            <div className="mt-4 rounded-2xl bg-emerald-500/8 p-4 ring-1 ring-emerald-400/25">
              <p className="text-[12.5px] font-semibold text-emerald-800">العبرة العملية</p>
              <p className="mt-1 text-[13px] leading-7">{selected.lesson}</p>
            </div>

            <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
              المصدر: {selected.source}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              <GlassPill onClick={() => void shareStory(selected)}>
                <span className="flex items-center gap-1.5">
                  <Share2 className="size-3.5" /> مشاركة القصة
                </span>
              </GlassPill>
              <GlassPill
                onClick={() => {
                  onToggleSave(selected.id, selected.title);
                }}
              >
                <span className="flex items-center gap-1.5">
                  {savedIds.has(selected.id) ? (
                    <BookmarkCheck className="size-3.5" />
                  ) : (
                    <Bookmark className="size-3.5" />
                  )}
                  {savedIds.has(selected.id) ? "محفوظة" : "احفظ القصة"}
                </span>
              </GlassPill>
              <GlassPill
                onClick={() => {
                  void navigator.clipboard
                    .writeText(storyMessage(selected))
                    .then(() => toast.success("نُسخت القصة."))
                    .catch(() => toast.error("تعذّر النسخ."));
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Copy className="size-3.5" /> نسخ
                </span>
              </GlassPill>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
