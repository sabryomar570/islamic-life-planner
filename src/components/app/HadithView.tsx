import {
  ChoiceChip,
  EmptyState,
  Panel,
  QuietButton,
  SectionHead,
} from "@/components/app/Surfaces";
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
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المعرفة"
          title="الأحاديث"
          hint={`${arabicNumber(HADITHS.length)} حديثًا في ${arabicNumber(
            HADITH_SECTIONS.length,
          )} بابًا — براويه ومصدره.`}
          action={
            <QuietButton
              onClick={() => {
                const next = randomHadith(highlight?.id ?? null);
                setHighlight(next);
                document
                  .getElementById(`hadith-${next.id}`)
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
              className="px-4"
            >
              <Dices className="size-3.5" />
              عشوائي
            </QuietButton>
          }
        />

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ابحث في نص الحديث أو الراوي أو الباب..."
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
          {HADITH_SECTIONS.map((section) => (
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

        {filter !== "all" && filter !== "saved" ? (
          <p className="label-meta mt-3 text-muted-foreground">
            {HADITH_SECTIONS.find((section) => section.id === filter)?.hint}
          </p>
        ) : null}
        {query ? (
          <p className="label-meta mt-3 text-muted-foreground">
            نتائج البحث: {arabicNumber(items.length)}
          </p>
        ) : null}
      </Panel>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "saved" ? "لم تحفظ حديثًا بعد" : "لا نتائج لهذا البحث"}
          body={
            filter === "saved"
              ? "اضغط أيقونة الحفظ بجوار أي حديث، وسيظهر هنا مع مصدره."
              : "جرّب كلمة أخرى أو اختر بابًا مختلفًا."
          }
        />
      ) : (
        /* قراءة تحريرية: نص الحديث هو الموضوع، والبيانات سطر تحته لا بطاقة فوقه. */
        <ul className="stack">
          {items.map((hadith) => {
            const saved = check(hadith.id);
            return (
              <li key={hadith.id}>
                <article
                  id={`hadith-${hadith.id}`}
                  className={cn(
                    "surface-primary rounded-3xl p-5 sm:p-6",
                    highlight?.id === hadith.id && "ring-2 ring-primary/40",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setFilter(hadith.section)}
                      className="motion-press rounded-full surface-secondary px-3 py-1 text-[11px] font-medium text-foreground/70 hover:text-foreground"
                    >
                      {sectionTitle(hadith.section)}
                    </button>
                    <button
                      type="button"
                      aria-label={saved ? "إزالة من المحفوظات" : "حفظ الحديث"}
                      aria-pressed={saved}
                      onClick={() =>
                        onToggleFavorite(hadith.id, "hadith", hadith.text.slice(0, 40))
                      }
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

                  <p className="mt-4 text-[16px] leading-9 font-medium text-foreground">
                    «{hadith.text}»
                  </p>

                  <p className="label-meta mt-3 text-muted-foreground">
                    <span className="font-semibold text-foreground/75">الراوي:</span> {hadith.narrator}
                    <span className="mx-2">·</span>
                    <span className="font-semibold text-foreground/75">المصدر:</span> {hadith.source}
                  </p>

                  <p className="label-body mt-3 text-primary/85">{hadith.action}</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <QuietButton onClick={() => void copyHadith(hadith)} className="px-4">
                      <Copy className="size-3.5" />
                      نسخ
                    </QuietButton>
                    <QuietButton onClick={() => void shareHadith(hadith)} className="px-4">
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
