import {
  ChoiceChip,
  Editorial,
  EmptyState,
  Panel,
  QuietButton,
  SectionHead,
  Tag,
} from "@/components/app/Surfaces";
import {
  POEMS,
  POEM_THEMES,
  nextPoem,
  poemOfTheDay,
  randomPoem,
  shufflePoems,
  type Poem,
  type PoemTheme,
} from "@/data/poetry";
import { cn } from "@/lib/utils";
import { arabicNumber } from "@/lib/time";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Dices,
  Share2,
  Shuffle,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Filter = PoemTheme | "all" | "saved";

export function PoetryView({
  favorites,
  isSaved,
  onToggleFavorite,
}: {
  favorites: string[];
  /** فحص فوري من نظام الحفظ الموحّد. */
  isSaved?: (id: string) => boolean;
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [shuffled, setShuffled] = useState(false);
  const [spotlight, setSpotlight] = useState<Poem>(() => poemOfTheDay());
  const [spotlightKey, setSpotlightKey] = useState(0);

  const check = (id: string) => (isSaved ? isSaved(id) : favorites.includes(id));

  const items = useMemo(() => {
    const base =
      filter === "saved"
        ? POEMS.filter((poem) => check(poem.id))
        : filter === "all"
          ? POEMS
          : POEMS.filter((poem) => poem.theme === filter);
    return shuffled ? shufflePoems(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, shuffled, favorites, isSaved]);

  const rotate = (pool: Poem[]) => {
    setSpotlight((current) => nextPoem(current.id, pool) ?? current);
    setSpotlightKey((value) => value + 1);
  };

  const surprise = () => {
    const pick = randomPoem(spotlight.id, items.length > 0 ? items : POEMS);
    if (pick) {
      setSpotlight(pick);
      setSpotlightKey((value) => value + 1);
    }
  };

  const copyPoem = async (poem: Poem) => {
    const text = `${poem.lines.join("\n")}\n— ${poem.poet} (${poem.source})`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("نُسخ البيت بقائله.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  };

  const sharePoem = async (poem: Poem) => {
    const text = `${poem.lines.join("\n")}\n— ${poem.poet}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: poem.poet, text });
        return;
      } catch {
        /* تراجع */
      }
    }
    await copyPoem(poem);
  };

  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المعرفة"
          title="الأبيات"
          hint={`${arabicNumber(POEMS.length)} بيتًا من المعلّقات والدواوين — كل بيت منسوب إلى قائله.`}
          action={
            <div className="flex items-center gap-2">
              <QuietButton
                onClick={() => {
                  setShuffled((value) => !value);
                  toast.info(shuffled ? "أُعيد ترتيب الأبيات" : "خُلطت الأبيات عشوائيًا");
                }}
                className="px-4"
              >
                <Shuffle className="size-3.5" />
                {shuffled ? "ترتيب" : "خلط"}
              </QuietButton>
              <QuietButton onClick={surprise} className="px-4">
                <Dices className="size-3.5" />
                بيت جديد
              </QuietButton>
            </div>
          }
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <ChoiceChip active={filter === "all"} onClick={() => setFilter("all")}>
            كل الأبواب
          </ChoiceChip>
          <ChoiceChip active={filter === "saved"} onClick={() => setFilter("saved")}>
            محفوظاتي{favorites.length > 0 ? ` (${arabicNumber(favorites.length)})` : ""}
          </ChoiceChip>
          {POEM_THEMES.map((theme) => (
            <ChoiceChip key={theme} active={filter === theme} onClick={() => setFilter(theme)}>
              {theme}
            </ChoiceChip>
          ))}
        </div>
      </Panel>

      {/* بيت اليوم — ورق تحريري دافئ، بلا توهج خلفي ولا زجاج */}
      <Editorial key={spotlightKey} className="motion-swap p-6 text-center sm:p-8">
        <p className="label-meta font-semibold text-[oklch(0.55_0.05_75)]">{spotlight.theme}</p>
        <div className="poetry-text mt-5 text-[1.22rem] leading-[2.5] text-[var(--editorial-ink)]">
          {spotlight.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="mt-4 text-[13px] font-bold text-[oklch(0.45_0.06_70)]">{spotlight.poet}</p>
        <p className="label-meta mt-1 text-muted-foreground">{spotlight.source}</p>
        <p className="label-body mx-auto mt-3 max-w-md text-foreground/80">{spotlight.focal}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <QuietButton onClick={() => rotate(items)}>بيت آخر</QuietButton>
          <QuietButton onClick={() => void copyPoem(spotlight)}>
            <Copy className="size-3.5" />
            نسخ
          </QuietButton>
          <QuietButton onClick={() => void sharePoem(spotlight)}>
            <Share2 className="size-3.5" />
            مشاركة
          </QuietButton>
          <QuietButton onClick={() => onToggleFavorite(spotlight.id, "poem", spotlight.lines[0])}>
            {check(spotlight.id) ? (
              <BookmarkCheck className="size-3.5" />
            ) : (
              <Bookmark className="size-3.5" />
            )}
            {check(spotlight.id) ? "محفوظ" : "احفظ البيت"}
          </QuietButton>
        </div>
      </Editorial>

      {items.length === 0 ? (
        <EmptyState
          title="لا توجد أبيات هنا بعد"
          body={
            filter === "saved"
              ? "اضغط أيقونة الحفظ بجوار أي بيت، وسيظهر هنا مع قائله ومصدره."
              : "لا توجد أبيات في هذا الباب."
          }
        />
      ) : (
        /* قراءة تحريرية: البيت في الوسط، والبيانات سطران لا بطاقة فوقه. */
        <ul className="stack">
          {items.map((poem) => {
            const saved = check(poem.id);
            return (
              <li key={poem.id}>
                <article className="surface-primary rounded-3xl px-5 py-6 text-center sm:px-6">
                  <div className="flex items-center justify-between gap-3">
                    <Tag>{poem.theme}</Tag>
                    <button
                      type="button"
                      aria-label={saved ? "إزالة الحفظ" : "حفظ البيت"}
                      aria-pressed={saved}
                      onClick={() => onToggleFavorite(poem.id, "poem", poem.lines[0])}
                      className={cn(
                        "motion-press flex size-9 items-center justify-center rounded-xl",
                        saved
                          ? "bg-primary text-primary-foreground"
                          : "surface-secondary text-foreground/60 hover:text-foreground",
                      )}
                    >
                      {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                    </button>
                  </div>

                  <div className="poetry-text mt-4 text-[1.15rem] leading-[2.4] text-foreground">
                    {poem.lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>

                  <p className="mt-4 text-[12.5px] font-bold text-primary">{poem.poet}</p>
                  <p className="label-meta mt-0.5 text-muted-foreground">{poem.source}</p>
                  <p className="label-body mt-3 text-foreground/80">{poem.focal}</p>

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    <QuietButton onClick={() => void copyPoem(poem)} className="px-4">
                      <Copy className="size-3.5" />
                      نسخ
                    </QuietButton>
                    <QuietButton onClick={() => void sharePoem(poem)} className="px-4">
                      <Share2 className="size-3.5" />
                      مشاركة
                    </QuietButton>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
