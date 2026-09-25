import {
  ChoiceChip,
  Editorial,
  EmptyState,
  Panel,
  QuietButton,
  SectionHead,
  StatusDot,
  Tag,
} from "@/components/app/Surfaces";
import { PROPHET_STORIES, type ProphetStoryRecord } from "@/data/prophets";
import { cn } from "@/lib/utils";
import { arabicNumber } from "@/lib/time";
import {
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  Clock,
  Copy,
  Landmark,
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
    <article className={cn("surface-primary rounded-3xl p-5", read && "ring-1 ring-[var(--status-success)]/30")}>
      <div className="flex items-start justify-between gap-3">
        <button type="button" onClick={onOpen}>
          <Tag>
            <Landmark className="size-3.5 text-primary" />
            {story.prophet}
          </Tag>
        </button>
        <div className="flex items-center gap-2">
          {read ? <StatusDot state="success" /> : null}
          <button
            type="button"
            aria-label={saved ? "محفوظة — إزالة الحفظ" : "حفظ القصة"}
            aria-pressed={saved}
            onClick={onToggleSave}
            className={cn(
              "motion-press flex size-9 shrink-0 items-center justify-center rounded-xl",
              saved
                ? "bg-primary text-primary-foreground"
                : "surface-secondary text-foreground/60 hover:text-foreground",
            )}
          >
            {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
          </button>
        </div>
      </div>

      <h3 className="mt-3 text-[15px] font-bold leading-7">{story.title}</h3>

      <p className={cn("label-body mt-2 text-foreground/80", !open && "line-clamp-2")}>
        {story.paragraphs[0]}
      </p>

      {open ? (
        <div className="mt-2 space-y-2.5">
          {story.paragraphs.slice(1).map((paragraph, index) => (
            <p key={index} className="label-body text-foreground/80">
              {paragraph}
            </p>
          ))}
          {story.ayah ? (
            <Editorial className="p-3.5">
              <p className="quran-text text-[1.02rem] leading-9">﴿{story.ayah.text}﴾</p>
              <p className="label-meta mt-1 font-medium text-[oklch(0.5_0.06_70)]">
                {story.ayah.ref}
              </p>
            </Editorial>
          ) : null}
          <p className="label-body rounded-2xl surface-sunken p-3.5">{story.lesson}</p>
          <p className="label-meta text-muted-foreground">المصدر: {story.source}</p>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <QuietButton onClick={onOpen}>اقرأ القصة</QuietButton>
        <QuietButton onClick={() => setOpen((value) => !value)}>
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
          {open ? "إخفاء" : "معاينة"}
        </QuietButton>
        <QuietButton onClick={() => void shareStory(story)}>
          <Share2 className="size-3.5" />
          مشاركة
        </QuietButton>
        <span className="ms-auto flex items-center gap-1 label-meta text-muted-foreground">
          <Clock className="size-3" /> {arabicNumber(story.readMinutes)} دقائق
        </span>
      </div>
    </article>
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
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المعرفة"
          title="قصص الأنبياء"
          hint={`${arabicNumber(PROPHET_STORIES.length)} قصصًا من القرآن والسيرة — مصدر كل قصة وعبرتها.`}
          action={
            <span className="label-meta shrink-0 text-muted-foreground">
              قرأت {arabicNumber(readCount)}
            </span>
          }
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <ChoiceChip active={filter === "all"} onClick={() => setFilter("all")}>
            كل القصص
          </ChoiceChip>
          <ChoiceChip active={filter === "saved"} onClick={() => setFilter("saved")}>
            محفوظاتي{savedIds.size > 0 ? ` (${arabicNumber(savedIds.size)})` : ""}
          </ChoiceChip>
        </div>
      </Panel>

      {items.length === 0 ? (
        <EmptyState
          title="لا قصص محفوظة بعد"
          body="اضغط أيقونة الحفظ بجوار أي قصة، وستجدها هنا مع مصدرها."
        />
      ) : (
        <ul className="stack">
          {items.map((story) => (
            <li key={story.id}>
              <StoryCard
                story={story}
                saved={savedIds.has(story.id)}
                read={Boolean(progress[story.id])}
                onOpen={() => openStory(story)}
                onToggleSave={() => onToggleSave(story.id, story.title)}
              />
            </li>
          ))}
        </ul>
      )}

      <p className="label-meta px-1 leading-5 text-muted-foreground">
        مصادر القصص: القرآن الكريم بالسورة والآية، وصحيح البخاري ومسلم، وسيرة ابن هشام.
        لا تُعرض صور للأنبياء عليهم السلام حفاظًا على قدرهم؛ المحتوى نصوص مقروءة فقط.
      </p>

      {/* نافذة القراءة المركزة */}
      {selected ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/25 backdrop-blur-sm sm:items-center"
          onClick={() => setSelected(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="surface-quiet m-3 max-h-[88dvh] w-full max-w-2xl overflow-y-auto rounded-3xl p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <Tag>
                <Landmark className="size-3.5 text-primary" />
                {selected.prophet}
              </Tag>
              <QuietButton onClick={() => setSelected(null)} className="px-4">
                إغلاق
              </QuietButton>
            </div>

            <h2 className="label-display mt-4">{selected.title}</h2>

            <div className="mt-4 space-y-3">
              {selected.paragraphs.map((paragraph, index) => (
                <p key={index} className="text-[14px] leading-8 text-foreground/85">
                  {paragraph}
                </p>
              ))}
            </div>

            {selected.ayah ? (
              <Editorial className="mt-5 p-4">
                <p className="quran-text text-[1.1rem] leading-10">﴿{selected.ayah.text}﴾</p>
                <p className="label-meta mt-1.5 font-medium text-[oklch(0.5_0.06_70)]">
                  {selected.ayah.ref}
                </p>
              </Editorial>
            ) : null}

            <div className="mt-4 rounded-2xl surface-sunken p-4">
              <p className="text-[12.5px] font-bold">العبرة العملية</p>
              <p className="label-body mt-1">{selected.lesson}</p>
            </div>

            <p className="label-meta mt-4 text-muted-foreground">المصدر: {selected.source}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              <QuietButton onClick={() => void shareStory(selected)}>
                <Share2 className="size-3.5" />
                مشاركة القصة
              </QuietButton>
              <QuietButton onClick={() => onToggleSave(selected.id, selected.title)}>
                {savedIds.has(selected.id) ? (
                  <BookmarkCheck className="size-3.5" />
                ) : (
                  <Bookmark className="size-3.5" />
                )}
                {savedIds.has(selected.id) ? "محفوظة" : "احفظ القصة"}
              </QuietButton>
              <QuietButton
                onClick={() => {
                  void navigator.clipboard
                    .writeText(storyMessage(selected))
                    .then(() => toast.success("نُسخت القصة."))
                    .catch(() => toast.error("تعذّر النسخ."));
                }}
              >
                <Copy className="size-3.5" />
                نسخ
              </QuietButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
