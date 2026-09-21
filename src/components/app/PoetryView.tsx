import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
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
  Feather,
  Quote,
  Share2,
  Shuffle,
  Sparkles,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Filter = PoemTheme | "all" | "saved";

export function PoetryView({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [shuffled, setShuffled] = useState(false);
  const [spotlight, setSpotlight] = useState<Poem>(() => poemOfTheDay());
  const [spotlightKey, setSpotlightKey] = useState(0);

  const items = useMemo(() => {
    const base =
      filter === "saved"
        ? POEMS.filter((poem) => favorites.includes(poem.id))
        : filter === "all"
          ? POEMS
          : POEMS.filter((poem) => poem.theme === filter);
    return shuffled ? shufflePoems(base) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, shuffled, favorites]);

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
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Feather className="size-5" />}
          title="أبيات من الشعر الجاهلي"
          hint={`${arabicNumber(POEMS.length)} بيتًا (مطوّلة) من المعلّقات والدواوين — في الشجاعة والعزيمة والكرم والصبر`}
          action={
            <div className="flex items-center gap-2">
              <GlassPill
                onClick={() => {
                  setShuffled((value) => !value);
                  toast.info(shuffled ? "أُعيد ترتيب الأبيات" : "خُلطت الأبيات عشوائيًا");
                }}
              >
                <span className="flex items-center gap-1.5">
                  <Shuffle className="size-3.5" /> {shuffled ? "ترتيب الديوان" : "خلط"}
                </span>
              </GlassPill>
              <GlassPill onClick={surprise}>
                <span className="flex items-center gap-1.5">
                  <Dices className="size-3.5" /> بيت جديد
                </span>
              </GlassPill>
            </div>
          }
        />

        <div className="mt-5 flex flex-wrap gap-2">
          <GlassPill active={filter === "all"} onClick={() => setFilter("all")}>
            كل الأبواب
          </GlassPill>
          <GlassPill active={filter === "saved"} onClick={() => setFilter("saved")}>
            محفوظاتي{favorites.length > 0 ? ` (${arabicNumber(favorites.length)})` : ""}
          </GlassPill>
          {POEM_THEMES.map((theme) => (
            <GlassPill key={theme} active={filter === theme} onClick={() => setFilter(theme)}>
              {theme}
            </GlassPill>
          ))}
        </div>
      </GlassCard>

      {/* بيت اليوم — يتغيّر يوميًا ويمكن تدويره بلا نهاية */}
      <GlassCard
        strong
        className="relative overflow-hidden p-6 text-center sm:p-8"
        key={spotlightKey}
      >
        <div className="absolute -right-10 top-0 size-40 rounded-full bg-amber-200/40 blur-3xl" />
        <div className="absolute -left-8 bottom-0 size-40 rounded-full bg-sky-200/40 blur-3xl" />
        <span className="relative glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
          <Sparkles className="size-3.5 text-primary" />
          {spotlight.theme} • الشعر الجاهلي
        </span>
        <div className="poetry-text relative mt-5 text-[1.25rem] leading-[2.5]">
          {spotlight.lines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>
        <p className="relative mt-4 text-xs font-semibold text-primary">{spotlight.poet}</p>
        <p className="relative mt-1 text-[11px] text-muted-foreground">{spotlight.source}</p>
        <p className="relative mx-auto mt-3 max-w-md text-[12px] leading-6 text-foreground/75">
          {spotlight.focal}
        </p>
        <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2">
          <GlassPill onClick={() => rotate(items)}>بيت آخر</GlassPill>
          <GlassPill onClick={() => void copyPoem(spotlight)}>
            <span className="flex items-center gap-1.5">
              <Copy className="size-3.5" /> نسخ
            </span>
          </GlassPill>
          <GlassPill onClick={() => void sharePoem(spotlight)}>
            <span className="flex items-center gap-1.5">
              <Share2 className="size-3.5" /> مشاركة
            </span>
          </GlassPill>
          <GlassPill
            onClick={() =>
              onToggleFavorite(spotlight.id, "poem", spotlight.lines[0])
            }
          >
            <span className="flex items-center gap-1.5">
              {favorites.includes(spotlight.id) ? (
                <BookmarkCheck className="size-3.5" />
              ) : (
                <Bookmark className="size-3.5" />
              )}
              {favorites.includes(spotlight.id) ? "محفوظ" : "احفظ البيت"}
            </span>
          </GlassPill>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard soft className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            لا توجد أبيات محفوظة بعد — اضغط أيقونة الحفظ على أي بيت.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((poem) => {
            const saved = favorites.includes(poem.id);
            return (
              <GlassCard key={poem.id} hover className="flex flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
                    <Quote className="size-3.5 text-primary" />
                    {poem.theme}
                  </span>
                  <button
                    type="button"
                    aria-label="حفظ البيت"
                    onClick={() => onToggleFavorite(poem.id, "poem", poem.lines[0])}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-all",
                      saved
                        ? "bg-primary text-primary-foreground"
                        : "glass-tile text-foreground/60 hover:text-foreground",
                    )}
                  >
                    {saved ? <BookmarkCheck className="size-4" /> : <Bookmark className="size-4" />}
                  </button>
                </div>

                <div className="poetry-text mt-5 text-center text-[1.15rem] leading-[2.4]">
                  {poem.lines.map((line) => (
                    <p key={line}>{line}</p>
                  ))}
                </div>

                <div className="mt-auto pt-5 text-center">
                  <p className="text-xs font-semibold text-primary">{poem.poet}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{poem.source}</p>
                  <p className="mt-3 text-[12px] leading-6 text-foreground/75">{poem.focal}</p>
                  <div className="mt-3 flex items-center justify-center gap-2">
                    <GlassPill onClick={() => void copyPoem(poem)}>
                      <span className="flex items-center gap-1.5">
                        <Copy className="size-3.5" /> نسخ
                      </span>
                    </GlassPill>
                    <GlassPill onClick={() => void sharePoem(poem)}>
                      <span className="flex items-center gap-1.5">
                        <Share2 className="size-3.5" /> مشاركة
                      </span>
                    </GlassPill>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
