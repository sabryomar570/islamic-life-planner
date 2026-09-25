import { ChoiceChip, EmptyState, Panel, SectionHead, Tag } from "@/components/app/Surfaces";
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
  Trash2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

/**
 * PHASE 2I — مكتبة موحّدة.
 *
 * كل ما حفظه المستخدم من أي نوع يجتمع هنا. القائمة تُقرأ كصفوف تحريرية
 * لا كشبكة بطاقات متساوية: النص أولًا، والمصدر سطر ثانٍ، والإزالة هادئة.
 */

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

type Filter = "all" | "hadith" | "poem" | "dhikr" | "ayah" | "story";

function lookupDetail(record: FavoriteRecord) {
  if (record.kind === "hadith") {
    const hadith = HADITHS.find((item) => item.id === record.itemId);
    if (hadith) {
      return {
        text: `«${hadith.text}»`,
        meta: `${hadith.narrator} — ${hadith.source} · ${sectionTitle(hadith.section)}`,
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
    if (story) return { text: `${story.prophet} — ${story.title}`, meta: story.source };
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

  const counts = useMemo(() => {
    const base: Record<string, number> = { hadith: 0, poem: 0, dhikr: 0, ayah: 0, story: 0 };
    for (const item of favorites) base[item.kind] = (base[item.kind] ?? 0) + 1;
    return base;
  }, [favorites]);

  const items = useMemo(
    () => (filter === "all" ? favorites : favorites.filter((item) => item.kind === filter)),
    [favorites, filter],
  );

  const filters: { value: Filter; label: string; count: number }[] = [
    { value: "all", label: "الكل", count: favorites.length },
    { value: "ayah", label: "آيات", count: counts.ayah ?? 0 },
    { value: "hadith", label: "أحاديث", count: counts.hadith ?? 0 },
    { value: "dhikr", label: "أذكار وأدعية", count: counts.dhikr ?? 0 },
    { value: "poem", label: "أبيات", count: counts.poem ?? 0 },
    { value: "story", label: "قصص", count: counts.story ?? 0 },
  ];

  return (
    <div className="stack">
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="متابعتي"
          title="المحفوظات"
          hint={`${arabicNumber(favorites.length)} عنصرًا محفوظًا — يبقى في حسابك وعلى جهازك.`}
        />
        <div className="mt-4 flex flex-wrap gap-2">
          {filters.map((option) => (
            <ChoiceChip
              key={option.value}
              active={filter === option.value}
              onClick={() => setFilter(option.value)}
            >
              {option.label}
              <span className="ms-1 opacity-70">{arabicNumber(option.count)}</span>
            </ChoiceChip>
          ))}
        </div>
      </Panel>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "all" ? "لم تحفظ شيئًا بعد" : `لا شيء محفوظ من نوع «${KIND_LABEL[filter] ?? filter}»`}
          body="اضغط أيقونة الحفظ في أي حديث أو آية أو بيت، وستجده هنا في أي وقت."
          action={
            <>
              <ChoiceChip onClick={() => onOpenSection("quran")}>المصحف</ChoiceChip>
              <ChoiceChip onClick={() => onOpenSection("hadith")}>الأحاديث</ChoiceChip>
              <ChoiceChip onClick={() => onOpenSection("duas")}>الأدعية</ChoiceChip>
              <ChoiceChip onClick={() => onOpenSection("poetry")}>الأبيات</ChoiceChip>
            </>
          }
        />
      ) : (
        <ul className="stack-sm">
          {items.map((record) => {
            const detail = lookupDetail(record);
            const Icon = KIND_ICON[record.kind] ?? BookOpen;
            return (
              <li key={record.itemId}>
                <article
                  className={cn(
                    "surface-primary rounded-3xl p-4 sm:p-5",
                    record.kind === "poem" && "text-center",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Tag>
                      <Icon className="size-3.5 text-primary" />
                      {KIND_LABEL[record.kind] ?? "عنصر"}
                    </Tag>
                    <button
                      type="button"
                      aria-label="إزالة من المحفوظات"
                      onClick={() => {
                        onRemove(record.itemId);
                        toast.info("أُزيل من المحفوظات.");
                      }}
                      className="motion-press flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-rose-500/10 hover:text-rose-600"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>

                  <p
                    className={cn(
                      "mt-3 whitespace-pre-line text-[14px] leading-8",
                      record.kind === "dhikr" && "quran-text text-[1.05rem]",
                      record.kind === "poem" && "poetry-text text-[1.05rem]",
                      record.kind === "ayah" && "quran-text text-[1.05rem]",
                    )}
                  >
                    {detail.text}
                  </p>

                  {detail.meta ? (
                    <p className="label-meta mt-3 text-muted-foreground">{detail.meta}</p>
                  ) : null}
                </article>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
