import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { DUAS } from "@/data/duas";
import { HADITHS, sectionTitle } from "@/data/hadith";
import { POEMS } from "@/data/poetry";
import { PROPHET_STORIES } from "@/data/prophets";
import type { FavoriteRecord } from "@/hooks/use-favorites";
import { cn } from "@/lib/utils";
import { arabicNumber } from "@/lib/time";
import {
  BookOpen,
  Feather,
  HeartHandshake,
  Landmark,
  ScrollText,
  Sparkles,
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

const KIND_LABEL: Record<string, string> = {
  hadith: "حديث",
  poem: "بيت",
  dhikr: "ذكر أو دعاء",
  ayah: "آية",
  story: "قصة",
};

const KIND_ICON: Record<string, typeof BookOpen> = {
  hadith: ScrollText,
  poem: Feather,
  dhikr: HeartHandshake,
  ayah: BookOpen,
  story: Landmark,
};

type Filter = "all" | "hadith" | "poem" | "dhikr" | "story";

function lookupDetail(record: FavoriteRecord) {
  if (record.kind === "hadith") {
    const hadith = HADITHS.find((item) => item.id === record.itemId);
    if (hadith) {
      return {
        text: `«${hadith.text}»`,
        meta: `${hadith.narrator} — ${hadith.source} • ${sectionTitle(hadith.section)}`,
      };
    }
  }
  if (record.kind === "poem") {
    const poem = POEMS.find((item) => item.id === record.itemId);
    if (poem) return { text: poem.lines.join("\n"), meta: `${poem.poet} — ${poem.source}` };
  }
  if (record.kind === "dhikr") {
    const dua = DUAS.find((item) => item.id === record.itemId);
    if (dua) return { text: dua.text, meta: `${dua.source} — ${dua.reference}` };
  }
  if (record.kind === "story") {
    const story = PROPHET_STORIES.find((item) => item.id === record.itemId);
    if (story) return { text: `${story.prophet} — ${story.title}`, meta: `المصدر: ${story.source}` };
  }
  return { text: record.title, meta: KIND_LABEL[record.kind] ?? "" };
}

export function SavedView({
  favorites,
  onRemove,
  onOpenSection,
}: {
  favorites: FavoriteRecord[];
  onRemove: (itemId: string) => void;
  onOpenSection: (view: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");

  const items = useMemo(
    () => (filter === "all" ? favorites : favorites.filter((item) => item.kind === filter)),
    [favorites, filter],
  );

  const counts = useMemo(
    () => ({
      hadith: favorites.filter((item) => item.kind === "hadith").length,
      poem: favorites.filter((item) => item.kind === "poem").length,
      dhikr: favorites.filter((item) => item.kind === "dhikr").length,
      story: favorites.filter((item) => item.kind === "story").length,
    }),
    [favorites],
  );

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Sparkles className="size-5" />}
          title="محفوظاتي"
          hint={`${arabicNumber(favorites.length)} عنصرًا محفوظًا — يبقى في حسابك وعلى جهازك`}
        />

        <div className="mt-4 flex flex-wrap gap-2">
          <GlassPill active={filter === "all"} onClick={() => setFilter("all")}>
            الكل ({arabicNumber(favorites.length)})
          </GlassPill>
          <GlassPill active={filter === "hadith"} onClick={() => setFilter("hadith")}>
            أحاديث ({arabicNumber(counts.hadith)})
          </GlassPill>
          <GlassPill active={filter === "poem"} onClick={() => setFilter("poem")}>
            أبيات ({arabicNumber(counts.poem)})
          </GlassPill>
          <GlassPill active={filter === "dhikr"} onClick={() => setFilter("dhikr")}>
            أذكار وأدعية ({arabicNumber(counts.dhikr)})
          </GlassPill>
          <GlassPill active={filter === "story"} onClick={() => setFilter("story")}>
            قصص ({arabicNumber(counts.story)})
          </GlassPill>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard soft className="p-8 text-center">
          <p className="text-sm leading-7 text-muted-foreground">
            لا شيء محفوظ في هذا الباب بعد.
            <br />
            احفظ ما يهمّك من الأحاديث والأبيات والأدعية والقصص لتجده هنا في أي وقت.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <GlassPill onClick={() => onOpenSection("hadith")}>الأحاديث</GlassPill>
            <GlassPill onClick={() => onOpenSection("poetry")}>الأبيات</GlassPill>
            <GlassPill onClick={() => onOpenSection("duas")}>الأدعية</GlassPill>
            <GlassPill onClick={() => onOpenSection("prophets")}>قصص الأنبياء</GlassPill>
          </div>
        </GlassCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((record) => {
            const detail = lookupDetail(record);
            const Icon = KIND_ICON[record.kind] ?? BookOpen;
            return (
              <GlassCard key={record.itemId} hover className="flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
                    <Icon className="size-3.5 text-primary" />
                    {KIND_LABEL[record.kind] ?? "عنصر"}
                  </span>
                  <button
                    type="button"
                    aria-label="إزالة من المحفوظات"
                    onClick={() => {
                      onRemove(record.itemId);
                      toast.info("أُزيل من المحفوظات.");
                    }}
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full transition-all active:scale-90",
                      "glass-tile text-foreground/50 hover:bg-rose-500/12 hover:text-rose-600",
                    )}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>

                <p
                  className={cn(
                    "mt-4 whitespace-pre-line text-[13.5px] leading-7",
                    record.kind === "dhikr" && "quran-text",
                    record.kind === "poem" && "poetry-text text-center",
                  )}
                >
                  {detail.text}
                </p>

                {detail.meta ? (
                  <p className="mt-auto pt-4 text-[11px] text-muted-foreground">{detail.meta}</p>
                ) : null}
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
