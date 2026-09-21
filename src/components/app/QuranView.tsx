import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ProfileAnswers } from "@/data/questions";
import { SURAHS, fetchSurahAyahs, getSurah, type Ayah } from "@/data/quran";
import { arabicNumber } from "@/lib/time";
import { BookOpen, Loader2, Minus, Plus, RotateCcw, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const LAST_READ_KEY = "sakinah:quran:last";

const WIRD_LABEL: Record<string, string> = {
  small: "وردك: أقل من صفحة",
  page: "وردك: صفحة واحدة",
  two: "وردك: صفحتان",
  five: "وردك: خمس صفحات",
  juz: "وردك: جزء كامل",
};

function readLastRead(): number {
  try {
    const raw = window.localStorage.getItem(LAST_READ_KEY);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : 1;
  } catch {
    return 1;
  }
}

export function QuranView({ profile }: { profile: ProfileAnswers }) {
  const [query, setQuery] = useState("");
  const [surahNumber, setSurahNumber] = useState(() => readLastRead());
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fontScale, setFontScale] = useState(1);
  const [attempt, setAttempt] = useState(0);

  const surah = getSurah(surahNumber) ?? SURAHS[0];

  const filtered = useMemo(() => {
    const term = query.trim();
    if (!term) return SURAHS;
    return SURAHS.filter(
      (item) => item.name.includes(term) || String(item.number) === term,
    );
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setAyahs(null);

    fetchSurahAyahs(surahNumber)
      .then((data) => {
        if (!cancelled) setAyahs(data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "تعذّر تحميل السورة");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    try {
      window.localStorage.setItem(LAST_READ_KEY, String(surahNumber));
    } catch {
      /* تجاهل */
    }

    return () => {
      cancelled = true;
    };
  }, [surahNumber, attempt]);

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<BookOpen className="size-5" />}
          title="القرآن الكريم — المصحف كاملًا"
          hint={`١١٤ سورة بترتيب المصحف، نصّ عثماني مطابق لما تحفظه • ${
            WIRD_LABEL[profile.quranAmount] ?? "حدّد وردك"
          }`}
        />
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[14rem]">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم السورة أو رقمها..."
              className="h-11 rounded-full border-white/70 bg-white/70 pr-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <GlassPill
              onClick={() => setFontScale((value) => Math.max(0.9, Number((value - 0.1).toFixed(2))))}
              aria-label="تصغير الخط"
            >
              <Minus className="size-3.5" />
            </GlassPill>
            <span className="text-[11px] text-muted-foreground">حجم الخط</span>
            <GlassPill
              onClick={() => setFontScale((value) => Math.min(1.8, Number((value + 0.1).toFixed(2))))}
              aria-label="تكبير الخط"
            >
              <Plus className="size-3.5" />
            </GlassPill>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <GlassCard className="p-4">
          <p className="px-2 pb-3 text-xs font-semibold">
            فهرس السور ({arabicNumber(filtered.length)})
          </p>
          <div className="max-h-[32rem] space-y-1 overflow-y-auto pl-1">
            {filtered.map((item) => (
              <button
                key={item.number}
                type="button"
                onClick={() => setSurahNumber(item.number)}
                className={`flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-right transition-all ${
                  item.number === surahNumber
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                    : "glass-tile text-foreground/80 hover:text-foreground"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`flex size-7 items-center justify-center rounded-xl text-[11px] font-semibold ${
                      item.number === surahNumber
                        ? "bg-white/25"
                        : "bg-white/70 text-primary"
                    }`}
                  >
                    {arabicNumber(item.number)}
                  </span>
                  <span className="text-sm font-medium">{item.name}</span>
                </span>
                <span className="text-[10px] opacity-70">
                  {arabicNumber(item.ayahs)} آية
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-xl font-bold">
                سورة {surah.name}
                <Badge variant="secondary" className="rounded-full text-[10px]">
                  {surah.type} • {arabicNumber(surah.ayahs)} آية
                </Badge>
              </h2>
              <p className="mt-1 text-[11px] text-muted-foreground">
                السورة رقم {arabicNumber(surah.number)} في ترتيب المصحف
              </p>
            </div>
            <GlassPill onClick={() => setAttempt((value) => value + 1)}>
              <span className="flex items-center gap-1.5">
                <RotateCcw className="size-3.5" /> إعادة التحميل
              </span>
            </GlassPill>
          </div>

          <div className="mt-5 rounded-3xl bg-white/55 p-5">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-16 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                جارٍ تحميل السورة...
              </div>
            ) : error ? (
              <div className="py-12 text-center">
                <p className="text-sm text-rose-600">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  حاول مرة أخرى
                </Button>
              </div>
            ) : (
              <div
                className="quran-text text-justify text-foreground"
                style={{ fontSize: `${1.2 * fontScale}rem` }}
              >
                {surah.number !== 9 ? (
                  <p className="mb-4 text-center text-primary">
                    بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ
                  </p>
                ) : null}
                {ayahs?.map((ayah) => (
                  <span key={ayah.number}>
                    {ayah.text}
                    <span className="mx-1 align-middle text-[0.7em] text-primary/70">
                      ﴿{arabicNumber(ayah.number)}﴾
                    </span>{" "}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
            <span>النص: المصحف العثماني — يُحمّل السورة عند أول قراءة ثم يُحفظ لتسريعها.</span>
            <span className="flex items-center gap-2">
              {surahNumber > 1 ? (
                <GlassPill onClick={() => setSurahNumber(surahNumber - 1)}>
                  السورة السابقة
                </GlassPill>
              ) : null}
              {surahNumber < 114 ? (
                <GlassPill onClick={() => setSurahNumber(surahNumber + 1)}>
                  السورة التالية
                </GlassPill>
              ) : null}
            </span>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
