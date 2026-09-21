import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Input } from "@/components/ui/input";
import {
  DUA_SECTIONS,
  DUAS,
  duaOfTheDay,
  randomDua,
  type Dua,
  type DuaSectionId,
} from "@/data/duas";
import { cn } from "@/lib/utils";
import { arabicNumber } from "@/lib/time";
import {
  Bookmark,
  BookmarkCheck,
  Copy,
  Dices,
  HeartHandshake,
  Quote,
  Search,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Filter = DuaSectionId | "all" | "saved";

/** نص رسالة المشاركة: منسّق وجميل بمصدر الدعاء. */
export function formatDuaMessage(dua: Dua) {
  const ref = dua.source === "قرآن كريم" ? `﴿${dua.text}﴾` : `«${dua.text}»`;
  return `${ref}\n\n${dua.source} — ${dua.reference}\n\n[from سكينة 🤍]`;
}

async function shareText(title: string, message: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({ title, text: message });
      return "shared";
    } catch {
      /* تراجع المستخدم عن المشاركة — ننتقل للنسخ */
    }
  }
  try {
    await navigator.clipboard.writeText(message);
    return "copied";
  } catch {
    return "failed";
  }
}

export function DuasView({
  favorites,
  onToggleFavorite,
}: {
  favorites: string[];
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [spotlight, setSpotlight] = useState<Dua>(() => duaOfTheDay());

  const items = useMemo(() => {
    const term = query.trim();
    if (term) {
      return DUAS.filter(
        (dua) => dua.text.includes(term) || dua.reference.includes(term),
      );
    }
    if (filter === "saved") return DUAS.filter((dua) => favorites.includes(dua.id));
    if (filter === "all") return DUAS;
    return DUAS.filter((dua) => dua.section === filter);
  }, [filter, query, favorites]);

  const copyDua = async (dua: Dua) => {
    try {
      await navigator.clipboard.writeText(formatDuaMessage(dua));
      toast.success("نُسخ الدعاء بمصدره.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  };

  const shareDua = async (dua: Dua) => {
    const result = await shareText("دعاء مأثور", formatDuaMessage(dua));
    if (result === "copied") toast.info("نُسخ الدعاء إلى الحافظة؛ ألصقه في أي رسالة.");
    if (result === "failed") toast.error("تعذّرت المشاركة من المتصفح.");
  };

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<HeartHandshake className="size-5" />}
          title="أدعية مأثورة على حاجتك"
          hint={`${arabicNumber(DUAS.length)} دعاءً من القرآن والسنة، في ${arabicNumber(DUA_SECTIONS.length)} بابًا — بمصدر كل دعاء`}
          action={
            <GlassPill
              onClick={() => {
                setSpotlight(randomDua(spotlight.id));
              }}
            >
              <span className="flex items-center gap-1.5">
                <Dices className="size-3.5" /> دعاء جديد
              </span>
            </GlassPill>
          }
        />

        <div className="relative mt-5">
          <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في نص الدعاء أو المصدر..."
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
          {DUA_SECTIONS.map((section) => (
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
      </GlassCard>

      {/* دعاء اليوم */}
      <GlassCard strong className="relative overflow-hidden p-6 text-center sm:p-8">
        <div className="absolute -right-10 top-0 size-40 rounded-full bg-emerald-200/40 blur-3xl" />
        <div className="absolute -left-8 bottom-0 size-40 rounded-full bg-sky-200/40 blur-3xl" />
        <span className="relative glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
          <Quote className="size-3.5 text-primary" />
          دعاء اليوم • {spotlight.source}
        </span>
        <p className="quran-text relative mt-5 text-[1.25rem] leading-[2.4]">
          {spotlight.source === "قرآن كريم" ? `﴿${spotlight.text}﴾` : `«${spotlight.text}»`}
        </p>
        <p className="relative mt-3 text-[11px] font-medium text-primary">{spotlight.reference}</p>
        <div className="relative mt-4 flex flex-wrap items-center justify-center gap-2">
          <GlassPill onClick={() => void copyDua(spotlight)}>
            <span className="flex items-center gap-1.5">
              <Copy className="size-3.5" /> نسخ
            </span>
          </GlassPill>
          <GlassPill onClick={() => void shareDua(spotlight)}>
            <span className="flex items-center gap-1.5">
              <Share2 className="size-3.5" /> مشاركة في رسالة
            </span>
          </GlassPill>
          <GlassPill onClick={() => onToggleFavorite(spotlight.id, "dhikr", spotlight.text.slice(0, 40))}>
            <span className="flex items-center gap-1.5">
              {favorites.includes(spotlight.id) ? (
                <BookmarkCheck className="size-3.5" />
              ) : (
                <Bookmark className="size-3.5" />
              )}
              {favorites.includes(spotlight.id) ? "محفوظ" : "احفظ الدعاء"}
            </span>
          </GlassPill>
        </div>
      </GlassCard>

      {items.length === 0 ? (
        <GlassCard soft className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {filter === "saved"
              ? "لم تحفظ دعاءً بعد — اضغط أيقونة الحفظ على أي كارت."
              : "لا يوجد دعاء بهذا البحث، جرّب كلمة أخرى."}
          </p>
        </GlassCard>
      ) : (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {items.map((dua) => {
            const saved = favorites.includes(dua.id);
            const sectionTitle = DUA_SECTIONS.find((section) => section.id === dua.section)?.title;
            return (
              <GlassCard key={dua.id} hover className="flex flex-col p-6">
                <div className="flex items-center justify-between gap-3">
                  <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
                    {dua.source === "قرآن كريم" ? "﴿ قرآن ﴾" : "☀ سنة"} • {sectionTitle}
                  </span>
                  <button
                    type="button"
                    aria-label="حفظ الدعاء"
                    onClick={() => onToggleFavorite(dua.id, "dhikr", dua.text.slice(0, 40))}
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

                <p className="quran-text mt-5 flex-1 text-[1.08rem] leading-[2.3]">
                  {dua.source === "قرآن كريم" ? `﴿${dua.text}﴾` : `«${dua.text}»`}
                </p>

                <div className="mt-auto pt-5">
                  <p className="text-[11px] text-muted-foreground">{dua.reference}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <GlassPill onClick={() => void copyDua(dua)}>
                      <span className="flex items-center gap-1.5">
                        <Copy className="size-3.5" /> نسخ
                      </span>
                    </GlassPill>
                    <GlassPill onClick={() => void shareDua(dua)}>
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
