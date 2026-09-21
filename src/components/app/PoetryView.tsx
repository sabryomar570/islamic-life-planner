import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { POEMS, POEM_THEMES, type PoemTheme } from "@/data/poetry";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkCheck, Feather, Flame } from "lucide-react";
import { useState } from "react";

type Filter = PoemTheme | "الكل" | "المحفوظات";

export function PoetryView({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("الكل");
  const filters: Filter[] = ["الكل", "المحفوظات", ...POEM_THEMES];

  const items = POEMS.filter((poem) => {
    if (filter === "الكل") return true;
    if (filter === "المحفوظات") return favorites.includes(poem.id);
    return poem.theme === filter;
  });

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Feather className="size-5" />}
          title="أبيات تحفّزك على الرياضة والشجاعة والعزيمة"
          hint="من عيون الشعر العربي — مع معنى عملي يمشي مع خطّتك"
        />
        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((item) => (
            <GlassPill key={item} active={filter === item} onClick={() => setFilter(item)}>
              {item}
              {item === "المحفوظات" && favorites.length > 0 ? ` (${favorites.length})` : ""}
            </GlassPill>
          ))}
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
                    <Flame className="size-3.5 text-amber-500" />
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
                    {saved ? (
                      <BookmarkCheck className="size-4" />
                    ) : (
                      <Bookmark className="size-4" />
                    )}
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
                  <p className="mt-3 text-[12px] leading-6 text-foreground/75">
                    {poem.note}
                  </p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
