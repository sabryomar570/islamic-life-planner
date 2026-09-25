/**
 * PHASE 3 — بيت الأحاديث.
 *
 * ثلاث طبقات بترتيب نيّة المستخدم لا بترتيب قاعدة البيانات:
 *   ١ حديث اليوم (لا اختيار، لا عشوائية)
 *   ٢ حديث سياق اليوم (مرتبط بالساعة)
 *   ٣ المكتبة (تصنيفات وبحث وقائمة قراءة)
 *
 * **قاعدة لا تُكسر:** ما لم يُوثَّق لا يُعرض كحديث موثوق. حالة التوثيق
 * ظاهرة في كل بطاقة، والقارئ يستطيع فتح الحديث كاملًا في نافذة مستقلة.
 */

import { Artwork } from "@/components/app/Artworks";
import { HadithReader } from "@/components/app/HadithReader";
import {
  ChoiceChip,
  EmptyState,
  Panel,
  QuietButton,
  SectionHead,
  Tag,
} from "@/components/app/Surfaces";
import { Input } from "@/components/ui/input";
import {
  HADITHS,
  HADITH_SECTIONS,
  hadithOfTheDay,
  searchHadiths,
  sectionTitle,
  type Hadith,
  type HadithSectionId,
} from "@/data/hadith";
import {
  HADITH_KIND_HINTS,
  HADITH_KIND_LABELS,
  HADITH_KIND_TONES,
  HADITH_TOPICS,
  dayContextTopic,
  daySeed,
  hadithKindOf,
  topicOfSection,
  topicTitle,
  type HadithTopic,
} from "@/lib/hadith-metadata";
import { arabicNumber } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Bookmark, BookmarkCheck, Dices, Search } from "lucide-react";
import { useMemo, useState } from "react";

type Filter = HadithTopic | "all" | "saved";

/**
 * شارة النسبة.
 *
 * **قاعدة بصرية لا لفظية:** المرفوع يأخذ نقطة مصمتة، والأثر يأخذ حلقة
 * مفرّغة. شكلان مختلفان فلا يخطئ العين سريعًا، ثم يأتي النصصريحا لئلا
 * يخطئ القارئ البطيء. ولون الأثر ليس لون المرفوع أبدًا.
 */
function ProvenanceTag({ hadith, className }: { hadith: Hadith; className?: string }) {
  const kind = hadithKindOf(hadith);
  const tone = HADITH_KIND_TONES[kind];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 label-meta font-medium",
        tone === "raised"
          ? "bg-primary/12 text-primary"
          : tone === "companion"
            ? "bg-[var(--status-neutral)]/12 text-[var(--editorial-ink)]"
            : "bg-[var(--status-attention)]/16 text-[var(--editorial-ink)]",
        className,
      )}
    >
      {tone === "raised" ? (
        <span className="block size-1.5 rounded-full bg-primary" aria-hidden />
      ) : (
        /* حلقة مفرّغة: شكل الأثر لا يخطئ بنقطة المرفوع. */
        <span
          className="block size-1.5 rounded-full border-[1.5px] border-current"
          aria-hidden
        />
      )}
      {HADITH_KIND_LABELS[kind]}
    </span>
  );
}

export function HadithView({
  favorites,
  isSaved,
  onToggleFavorite,
}: {
  favorites: string[];
  /** فحص فوري من نظام الحفظ الموحّد يتقدم على القائمة القديمة. */
  isSaved?: (id: string) => boolean;
  onToggleFavorite: (id: string, kind: string, title: string) => void;
}) {
  const check = (id: string) => (isSaved ? isSaved(id) : favorites.includes(id));
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  // الشابتان: لا تتغيران بتغير الوقت، فلا تقفز البطاقة تحت عين المستخدم.
  const today = useMemo(() => new Date(), []);
  const ofTheDay = useMemo(() => hadithOfTheDay(daySeed(today)), [today]);
  const contextTopic = useMemo(() => dayContextTopic(today), [today]);

  /** حديث سياقي ثابت لليوم: يُحسب مرة واحدة لا في كل رسم. */
  const contextual = useMemo(() => {
    const pool = HADITHS.filter((hadith) => topicOfSection(hadith.section) === contextTopic);
    if (pool.length === 0) return ofTheDay;
    return pool[daySeed(today) % pool.length];
  }, [contextTopic, ofTheDay, today]);

  const items = useMemo(() => {
    if (query.trim()) return searchHadiths(query);
    if (filter === "all") return HADITHS;
    if (filter === "saved") return HADITHS.filter((hadith) => check(hadith.id));
    return HADITHS.filter((hadith) => topicOfSection(hadith.section) === filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, query, favorites, isSaved]);

  const open = openId ? HADITHS.find((hadith) => hadith.id === openId) ?? null : null;

  const step = (direction: "next" | "prev") => {
    if (!openId) return;
    const at = items.findIndex((hadith) => hadith.id === openId);
    if (at < 0) return;
    const delta = direction === "next" ? 1 : -1;
    const target = items[(at + delta + items.length) % items.length];
    if (target) setOpenId(target.id);
  };

  const toggle = (hadith: Hadith) => {
    onToggleFavorite(hadith.id, "hadith", hadith.text.slice(0, 40));
  };

  return (
    <div className="stack">
      {/* ١ — حديث اليوم. البطل الوحيد في الشاشة. */}
      <Panel className="overflow-hidden p-0">
        <div className="flex items-start gap-3 p-5 pb-0 sm:p-6 sm:pb-0">
          <div className="min-w-0 flex-1">
            <p className="eyebrow">نص اليوم</p>
            <p className="label-meta mt-1 text-muted-foreground">
              {new Date().toLocaleDateString("ar-EG", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </p>
          </div>
          <Artwork name="hadith" tone="soft" />
        </div>

        <p className="quran-text mt-4 px-5 text-[17px] leading-[2.4] text-[var(--editorial-ink)] sm:px-6">
          {ofTheDay.text}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 px-5 pb-5 sm:px-6">
          <ProvenanceTag hadith={ofTheDay} />
          <Tag>{topicTitle(topicOfSection(ofTheDay.section))}</Tag>
        </div>

        <div className="rule-t mx-5 sm:mx-6">
          <div className="flex flex-wrap items-center justify-between gap-3 py-4">
            <p className="label-meta min-w-0 text-muted-foreground">
              <span className="font-semibold text-foreground/75">الراوي:</span> {ofTheDay.narrator}
              <span className="mx-2">·</span>
              <span className="font-semibold text-foreground/75">المصدر:</span> {ofTheDay.source}
            </p>
            <QuietButton
              state={check(ofTheDay.id) ? "active" : "default"}
              onClick={() => setOpenId(ofTheDay.id)}
            >
              اقرأ الحديث
            </QuietButton>
          </div>
        </div>
      </Panel>

      {/* ٢ — سياق اليوم. الموضوع واحد ثابت لكل ساعة. */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="حسب وقتك الآن"
          title="نص هذا الوقت"
          hint={`${topicTitle(contextTopic)} — يُختار بثبات، فيبقى المعنى واحدا كل يوم في وقته.`}
        />
        <HadithLine
          hadith={contextual}
          saved={check(contextual.id)}
          savedId={contextual.id}
          onOpen={setOpenId}
          onToggle={() => toggle(contextual)}
        />
      </Panel>

      {/* ٣ — المكتبة. */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="المعرفة"
          title="المكتبة"
          hint={`${arabicNumber(HADITHS.length)} نصا في ${arabicNumber(
            HADITH_SECTIONS.length,
          )} بابا، موزعة على ${arabicNumber(HADITH_TOPICS.length)} موضوعات. كل نص موسوم بنسبته.`}
          action={
            <QuietButton
              onClick={() => {
                const at = Math.floor(Math.random() * HADITHS.length);
                setFilter("all");
                setQuery("");
                setOpenId(HADITHS[at].id);
              }}
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
            placeholder="ابحث في نص الحديث أو الراوي أو المصدر..."
            aria-label="البحث في الأحاديث"
            className="h-11 rounded-2xl border-[var(--rule)] bg-white/80 ps-10 text-[13px]"
          />
        </div>

        {!query ? (
          <>
            <div className="mt-4 flex flex-wrap gap-2">
              <ChoiceChip
                active={filter === "all"}
                onClick={() => setFilter("all")}
              >
                كل النصوص
              </ChoiceChip>
              <ChoiceChip
                active={filter === "saved"}
                onClick={() => setFilter("saved")}
              >
                محفوظاتي{favorites.length > 0 ? ` (${arabicNumber(favorites.length)})` : ""}
              </ChoiceChip>
            </div>
            <div className="rail mt-2">
              {HADITH_TOPICS.map((topic) => (
                <ChoiceChip
                  key={topic.id}
                  active={filter === topic.id}
                  aria-label={topic.hint}
                  onClick={() => setFilter(topic.id)}
                >
                  {topic.title}
                </ChoiceChip>
              ))}
            </div>
          </>
        ) : (
          <p className="label-meta mt-3 text-muted-foreground">
            نتائج البحث: {arabicNumber(items.length)}
          </p>
        )}
      </Panel>

      {items.length === 0 ? (
        <EmptyState
          title={filter === "saved" ? "لم تحفظ حديثًا بعد" : "لا نتائج لهذا البحث"}
          body={
            filter === "saved"
              ? "اضغط أيقونة الحفظ بجوار أي حديث، وسيظهر هنا مع مصدره."
              : "جرّب كلمة أخرى أو اختر موضوعًا مختلفًا."
          }
        />
      ) : (
        <ul className="stack">
          {items.map((hadith) => (
            <li key={hadith.id}>
              <HadithLine
                hadith={hadith}
                saved={check(hadith.id)}
                savedId={hadith.id}
                onOpen={setOpenId}
                onToggle={() => toggle(hadith)}
              />
            </li>
          ))}
        </ul>
      )}

      <HadithReader
        hadith={open}
        open={open !== null}
        onOpenChange={(next) => {
          if (!next) setOpenId(null);
        }}
        saved={open ? check(open.id) : false}
        onToggleFavorite={toggle}
        onNavigate={step}
      />
    </div>
  );
}

/** سطر واحد للقراءة: الموضوع، النص، المصدر، وشارة التوثيق. */
function HadithLine({
  hadith,
  saved,
  savedId,
  onOpen,
  onToggle,
}: {
  hadith: Hadith;
  saved: boolean;
  savedId: string | null;
  onOpen: (id: string) => void;
  onToggle: () => void;
}) {
  return (
    <article className="surface-secondary rounded-3xl p-4 sm:p-5">
      <div className="flex flex-wrap items-center gap-2">
        <Tag>{topicTitle(topicOfSection(hadith.section))}</Tag>
        <ProvenanceTag hadith={hadith} />
      </div>

      <button
        type="button"
        onClick={() => onOpen(hadith.id)}
        className="motion-press mt-3 block w-full text-start"
      >
        <p className="text-[15px] leading-8 font-medium text-foreground">
          «{hadith.text}»
        </p>
        <p className="label-meta mt-2 text-muted-foreground">
          {hadith.narrator} — {hadith.source}
        </p>
      </button>

      <div className="mt-3 flex items-center gap-2">
        {savedId ? (
          <QuietButton
            state={saved ? "active" : "default"}
            aria-pressed={saved}
            aria-label={saved ? "إزالة من المحفوظات" : "حفظ الحديث"}
            onClick={onToggle}
          >
            {saved ? <BookmarkCheck className="size-3.5" /> : <Bookmark className="size-3.5" />}
            {saved ? "محفوظ" : "احفظ"}
          </QuietButton>
        ) : null}
        <QuietButton onClick={() => onOpen(hadith.id)}>اقرأ</QuietButton>
        <span className="label-meta ms-auto text-muted-foreground">
          {sectionTitle(hadith.section as HadithSectionId)}
        </span>
      </div>
    </article>
  );
}
