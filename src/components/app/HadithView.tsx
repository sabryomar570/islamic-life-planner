import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Input } from "@/components/ui/input";
import {
  HADITHS,
  HADITH_SECTIONS,
  randomHadith,
  searchHadiths,
  sectionTitle,
  type Hadith,
  type HadithSectionId,
} from "@/data/hadith";
import { cn } from "@/lib/utils";
import { arabicNumber } from "@/lib/time";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Dices,
  Quote,
  ScrollText,
  Search,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Filter = HadithSectionId | "all" | "saved";

export function HadithView({
  favorites,
  isSaved,
  onToggleFavorite,
}: {
  favorites: string[];
  /** فحص فوري من نظام الحفظ الموحّد (يتفوّق على favorites القديمة عند توفره). */
  isSaved?: (id: string) => boolean;
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const check = (id: string) => (isSaved ? isSaved(id) : favorites.includes(id));
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState<Hadith | null>(null);

  const items = useMemo(() => {
    const base = query.trim()
      ? searchHadiths(query)
      : filter === "saved"
        ? HADITHS.filter((hadith) => check(hadith.id))
        : filter === "all"
          ? HADITHS
          : HADITHS.filter((hadith) => hadith.section === filter);
    return base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, favorites, isSaved]);

  const copyHadith = async (hadith: Hadith) => {
    const text = `«${hadith.text}»\n${hadith.narrator} — ${hadith.source}\n(${sectionTitle(hadith.section)})`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("نُسخ الحديث بمصدره.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  };

  const shareHadith = async (hadith: Hadith) => {
    const text = `«${hadith.text}»\n${hadith.narrator} — ${hadith.source}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "حديث", text });
        return;
      } catch {
        /* تراجع */
      }
    }
    await copyHadith(hadith);
  };

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<ScrollText className="size-5" />}
          title="أحاديث مبوّبة بحسب حاجتك اليوم"
          hint={`${arabicNumber(HADITHS.length)} حديثًا في ${arabicNumber(
            HADITH_SECTIONS.length,
          )} بابًا: مغفرة الذنوب، استجابة الدعاء، فكّ الكرب، الصبر، الرزق… براويه ومصدره`}
          action={
            <GlassPill
              onClick={() => {
                const next = randomHadith(highlight?.id ?? null);
                setHighlight(next);
                document
                  .getElementById(`hadith-${next.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <span className="flex items-center gap-1.5">
                <Dices className="size-3.5" /> حديث عشوائي
              </span>
            </GlassPill>
          }
        />

        <div className="relative mt-5">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في نص الحديث أو الراوي أو الباب..."
            className="h-11 rounded-full border-white/70 bg-white/70 pr-10 text-sm"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <GlassPill active={filter === "all" && !query} onClick={() => { setFilter("all"); setQuery(""); }}>
            كل الأبواب
          </GlassPill>
          <GlassPill
            active={filter === "saved"}
            onClick={() => {
              setFilter("saved");
              setQuery("");
            }}
          >
            محفوظاتي{favorites.length > 0 ? ` (${arabicNumber(favorites.length)})` : ""}
          </GlassPill>
          {HADITH_SECTIONS.map((section) => (
            <GlassPill
              key={section.id}
              active={filter === section.id && !query}
              onClick={() => {
                setFilter(section.id);
                setQuery("");
              }}
            >
              {section.title}
            </GlassPill>
          ))}
        </div>

        {filter !== "all" && filter !== "saved" ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            {HADITH_SECTIONS.find((section) => section.id === filter)?.hint}
          </p>
        ) : null}
        {query ? (
          <p className="mt-3 text-[11px] text-muted-foreground">
            نتائج البحث: {arabicNumber(items.length)}
          </p>
        ) : null}
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard soft className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "saved"
              ? "لم تحفظ حديثًا بعد — اضغط أيقونة الحفظ على أي كارت."
              : "لا يوجد حديث بهذا البحث، جرّب كلمة أخرى."}
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((hadith) => {
            const saved = check(hadith.id);
            return (
              <GlassCard
                key={hadith.id}
                id={`hadith-${hadith.id}`}
                hover
                className={cn(
                  "flex flex-col p-6",
                  highlight?.id === hadith.id && "ring-2 ring-primary/45",
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setFilter(hadith.section)}
                    className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70 transition-colors hover:text-foreground"
                  >
                    {sectionTitle(hadith.section)}
                  </button>
                  <button
                    type="button"
                    aria-label="حفظ الحديث"
                    onClick={() =>
                      onToggleFavorite(hadith.id, "hadith", hadith.text.slice(0, 40))
                    }
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
                  <p className="mt-3 text-[12px] leading-6 text-primary/85">{hadith.action}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <GlassPill onClick={() => void copyHadith(hadith)}>
                      <span className="flex items-center gap-1.5">
                        <Copy className="size-3.5" /> نسخ
                      </span>
                    </GlassPill>
                    <GlassPill onClick={() => void shareHadith(hadith)}>
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
