import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { HADITHS, HADITH_TOPICS, type HadithTopic } from "@/data/hadith";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkCheck, Quote, ScrollText, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = HadithTopic | "الكل" | "المحفوظات";

export function HadithView({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("الكل");

  const filters: Filter[] = useMemo(
    () => ["الكل", "المحفوظات", ...HADITH_TOPICS],
    [],
  );

  const items = HADITHS.filter((hadith) => {
    if (filter === "الكل") return true;
    if (filter === "المحفوظات") return favorites.includes(hadith.id);
    return hadith.topic === filter;
  });

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<ScrollText className="size-5" />}
          title="أحاديث تحثّ قلبك على الخشوع"
          hint="كل كارت يحمل نص الحديث، الراوي، المصدر، ودرسًا عمليًا"
        />
        <div className="mt-5 flex flex-wrap gap-2">
          {filters.map((item) => (
            <GlassPill
              key={item}
              active={filter === item}
              onClick={() => setFilter(item)}
            >
              {item}
              {item === "المحفوظات" && favorites.length > 0
                ? ` (${favorites.length})`
                : ""}
            </GlassPill>
          ))}
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard soft className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            لم تحفظ أي حديث بعد — اضغط أيقونة الحفظ على الكارت ليظهر هنا.
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((hadith) => {
            const saved = favorites.includes(hadith.id);
            return (
              <GlassCard key={hadith.id} hover className="flex flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
                    <Sparkles className="size-3.5 text-primary" />
                    {hadith.topic}
                  </span>
                  <button
                    type="button"
                    aria-label="حفظ الحديث"
                    onClick={() => onToggleFavorite(hadith.id, "hadith", hadith.text.slice(0, 40))}
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

                <Quote className="mt-4 size-5 text-primary/50" />
                <p className="mt-3 text-[15px] leading-8 font-medium">«{hadith.text}»</p>

                <div className="mt-auto pt-5">
                  <div className="glass-tile rounded-2xl p-3 text-[11px] leading-5">
                    <p>
                      <span className="font-semibold text-foreground/80">الراوي:</span>{" "}
                      {hadith.narrator}
                    </p>
                    <p className="mt-1">
                      <span className="font-semibold text-foreground/80">المصدر:</span>{" "}
                      {hadith.source}
                    </p>
                  </div>
                  <p className="mt-3 text-[12px] leading-6 text-primary/85">
                    {hadith.lesson}
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
