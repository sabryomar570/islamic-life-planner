import {
  ChoiceChip,
  Editorial,
  EmptyState,
  Panel,
  QuietButton,
  SectionHead,
  Tag,
} from "@/components/app/Surfaces";
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
  Search,
  Share2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

type Filter = DuaSectionId | "all" | "saved";

/** نص رسالة المشاركة: منسّق وجميل بمصدر الدعاء. */
export function formatDuaMessage(dua: Dua) {
  const ref = dua.source === "قرآن كريم" ? `﴿${dua.text}﴾` : `«${dua.text}»`;
  return `${ref}\n\n${dua.source} — ${dua.reference}\n\n[من تطبيق عود]`;
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
  isSaved,
  onToggleFavorite,
}: {
  favorites: string[];
  /** فحص فوري من نظام الحفظ الموحّد (يتفوّق على favorites القديمة عند توفره). */
  isSaved?: (id: string) => boolean;
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [spotlight, setSpotlight] = useState<Dua>(() => duaOfTheDay());

  const check = (id: string) => (isSaved ? isSaved(id) : favorites.includes(id));

  const items = useMemo(() => {
    const term = query.trim();
    if (term) {
      return DUAS.filter(
        (dua) => dua.text.includes(term) || dua.reference.includes(term),
      );
    }
    if (filter === "saved") return DUAS.filter((dua) => check(dua.id));
    if (filter === "all") return DUAS;
    return DUAS.filter((dua) => dua.section === filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, favorites, isSaved]);

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
  };  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المعرفة"
          title="الأدعية"
          hint={`${arabicNumber(DUAS.length)} دعاءً من القرآن والسنة، في ${arabicNumber(
            DUA_SECTIONS.length,
          )} بابًا — بمصدر كل دعاء.`}
          action={
            <QuietButton
              onClick={() => setSpotlight(randomDua(spotlight.id))}
              className="px-4"
            >
              <Dices className="size-3.5" />
              دعاء جديد
            </QuietButton>
          }
        />

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في نص الدعاء أو المصدر..."
            className="h-11 rounded-2xl border-[var(--rule)] bg-white/80 ps-10 text-[13px]"
          />
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <ChoiceChip active={filter === "all" && !query} onClick={() => { setFilter("all"); setQuery(""); }}>
            كل الأبواب
          </ChoiceChip>
          <ChoiceChip
            active={filter === "saved"}
            onClick={() => {
              setFilter("saved");
              setQuery("");
            }}
          >
            محفوظاتي{favorites.length > 0 ? ` (${arabicNumber(favorites.length)})` : ""}
          </ChoiceChip>
          {DUA_SECTIONS.map((section) => (
            <ChoiceChip
              key={section.id}
              active={filter === section.id && !query}
              onClick={() => {
                setFilter(section.id);
                setQuery("");
              }}
            >
              {section.title}
            </ChoiceChip>
          ))}
        </div>
      </Panel>

      {/* دعاء اليوم: ورق تحريري دافئ — لا زجاج ولا توهج خلفي. */}
      <Editorial className="p-6 text-center sm:p-8">
        <span className="label-meta font-semibold text-[oklch(0.55_0.05_75)]">
          دعاء اليوم · {spotlight.source}
        </span>
        <p className="quran-text mt-5 text-[1.2rem] leading-[2.4] text-[var(--editorial-ink)]">
          {spotlight.source === "قرآن كريم" ? `﴿${spotlight.text}﴾` : `«${spotlight.text}»`}
        </p>
        <p className="label-meta mt-3 font-medium text-[oklch(0.5_0.06_72)]">{spotlight.reference}</p>
        <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
          <QuietButton onClick={() => void copyDua(spotlight)} className="px-4">
            <Copy className="size-3.5" />
            نسخ
          </QuietButton>
          <QuietButton onClick={() => void shareDua(spotlight)} className="px-4">
            <Share2 className="size-3.5" />
            مشاركة في رسالة
          </QuietButton>
          <QuietButton
            onClick={() => onToggleFavorite(spotlight.id, "dhikr", spotlight.text.slice(0, 40))}
            className="px-4"
          >
            {check(spotlight.id) ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {check(spotlight.id) ? "محفوظ" : "احفظ الدعاء"}
          </QuietButton>
        </div>
      </Editorial>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "saved" ? "لم تحفظ دعاءً بعد" : "لا نتائج لهذا البحث"}
          body={
            filter === "saved"
              ? "اضغط أيقونة الحفظ بجوار أي دعاء، وسيظهر هنا مع مصدره."
              : "جرّب كلمة أخرى أو اختر بابًا مختلفًا."
          }
        />
      ) : (
        /* قراءة تحريرية: نص الدعاء هو الموضوع، والمصدر سطر لا بطاقة. */
        <ul className="stack">
          {items.map((dua) => {
            const saved = check(dua.id);
            const section = DUA_SECTIONS.find((entry) => entry.id === dua.section);
            return (
              <li key={dua.id}>
                <article className="surface-primary rounded-3xl p-5 sm:p-6">
                  <div className="flex items-center justify-between gap-3">
                    <Tag>{section?.title ??dua.source}</Tag>
                    <button
                      type="button"
                      aria-label={saved ? "إزالة من المحفوظات" : "حفظ الدعاء"}
                      aria-pressed={saved}
                      onClick={() => onToggleFavorite(dua.id, "dhikr", dua.text.slice(0, 40))}
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

                  <p className="quran-text mt-4 text-[1.12rem] leading-[2.3]">
                    {dua.source === "قرآن كريم" ? `﴿${dua.text}﴾` : `«${dua.text}»`}
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <QuietButton onClick={() => void copyDua(dua)} className="px-4">
                      <Copy className="size-3.5" />
                      نسخ
                    </QuietButton>
                    <QuietButton onClick={() => void shareDua(dua)} className="px-4">
                      <Share2 className="size-3.5" />
                      مشاركة
                    </QuietButton>
                  </div>

                  <p className="label-meta mt-3 text-muted-foreground">{dua.reference}</p>
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
