import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { MushafPage } from "@/components/app/MushafPage";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { ProfileAnswers } from "@/data/questions";
import { SURAHS, clampSurahNumber, getSurah } from "@/data/quran";
import { toArabicDigits } from "@/lib/hijri";
import { QURAN_FONT_SIZES, paginateAyahs } from "@/lib/mushaf";
import { useOnlineStatus } from "@/lib/pwa";
import {
  BASMALA,
  isBundled,
  loadSurah,
  splitBasmala,
  type Ayah,
  type SurahSource,
} from "@/lib/quran-store";
import { arabicNumber } from "@/lib/time";
import {
  BookOpen,
  Bookmark,
  BookmarkCheck,
  Check,
  CloudDownload,
  Copy,
  HardDriveDownload,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Share2,
  Sparkles,
  WifiOff,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const LAST_READ_KEY = "sakinah:quran:last";
const BOOKMARK_KEY = "sakinah:quran:bookmark";

const WIRD_LABEL: Record<string, string> = {
  small: "وردك: أقل من صفحة",
  page: "وردك: صفحة واحدة",
  two: "وردك: صفحتان",
  five: "وردك: خمس صفحات",
  juz: "وردك: جزء كامل",
};

type BookmarkRecord = { surah: number; ayah: number; at: number };

function readNumber(key: string, fallback: number) {
  try {
    const raw = window.localStorage.getItem(key);
    const parsed = raw ? Number(raw) : NaN;
    return Number.isFinite(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function readBookmark(): BookmarkRecord | null {
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BookmarkRecord;
    if (typeof parsed?.surah !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

export type QuranOfflineController = {
  cachedCount: number;
  total: number;
  downloading: boolean;
  progress: number;
  onDownload: () => void;
  onCancelDownload: () => void;
  onClear: () => void;
};

export function QuranView({
  profile,
  mushafMode,
  fontScale,
  onMushafModeChange,
  onFontScaleChange,
  offline,
}: {
  profile: ProfileAnswers;
  mushafMode: boolean;
  fontScale: number;
  onMushafModeChange: (value: boolean) => void;
  onFontScaleChange: (value: number) => void;
  offline: QuranOfflineController;
}) {
  const online = useOnlineStatus();
  const [query, setQuery] = useState("");
  const [surahNumber, setSurahNumber] = useState(() => clampSurahNumber(readNumber(LAST_READ_KEY, 1)));
  const [ayahs, setAyahs] = useState<Ayah[] | null>(null);
  const [source, setSource] = useState<SurahSource>("network");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pendingLastPage, setPendingLastPage] = useState(false);
  const [selectedAyah, setSelectedAyah] = useState<Ayah | null>(null);
  const [bookmark, setBookmark] = useState<BookmarkRecord | null>(() => readBookmark());

  const surah = getSurah(surahNumber) ?? SURAHS[0];
  const { cachedCount, downloading, progress: downloadProgress } = offline;

  const filtered = useMemo(() => {
    const term = query.trim();
    if (!term) return SURAHS;
    return SURAHS.filter(
      (item) => item.name.includes(term) || String(item.number) === term || item.number === Number(term),
    );
  }, [query]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageIndex(0);

    loadSurah(surahNumber, { forceNetwork: attempt > 0 })
      .then((result) => {
        if (cancelled) return;
        setAyahs(result.ayahs);
        setSource(result.source);
        if (result.source === "bundled" && navigator.onLine) {
          toast.info("لا يتوفر نص هذه السورة كاملًا دون إنترنت؛ نعرض النسخة المحفوظة داخل التطبيق.", {
            duration: 5000,
          });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setAyahs(null);
          setError(err instanceof Error ? err.message : "تعذّر تحميل السورة");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    try {
      window.localStorage.setItem(LAST_READ_KEY, String(surahNumber));
    } catch {
      /* لا شيء */
    }

    return () => {
      cancelled = true;
    };
  }, [surahNumber, attempt]);

  const split = useMemo(
    () => (ayahs ? splitBasmala(surahNumber, ayahs) : { ayahs: [] as Ayah[], basmalaShown: false }),
    [ayahs, surahNumber],
  );

  const pages = useMemo(() => paginateAyahs(split.ayahs), [split.ayahs]);
  const safePage = Math.min(pageIndex, Math.max(pages.length - 1, 0));

  const goNext = useCallback(() => {
    setPageIndex((value) => {
      if (value + 1 < pages.length) return value + 1;
      if (surahNumber < SURAHS.length) {
        setSurahNumber(surahNumber + 1);
        return 0;
      }
      return value;
    });
  }, [pages.length, surahNumber]);

  const goPrev = useCallback(() => {
    if (pageIndex > 0) {
      setPageIndex(pageIndex - 1);
      return;
    }
    if (surahNumber > 1) {
      setPendingLastPage(true);
      setSurahNumber(surahNumber - 1);
    }
  }, [pageIndex, surahNumber]);

  // الرجوع من أول صفحة يفتح آخر صفحة من السورة السابقة بعد اكتمال تحميلها.
  useEffect(() => {
    if (pendingLastPage && !loading && pages.length > 0) {
      setPageIndex(pages.length - 1);
      setPendingLastPage(false);
    }
  }, [pendingLastPage, loading, pages.length]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") goNext();
      if (event.key === "ArrowRight") goPrev();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const saveBookmark = () => {
    const current = pages[safePage]?.[0];
    const record: BookmarkRecord = {
      surah: surah.number,
      ayah: current?.number ?? 1,
      at: Date.now(),
    };
    try {
      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(record));
    } catch {
      /* لا شيء */
    }
    setBookmark(record);
    toast.success(`حُفظ مكانك: سورة ${surah.name} — الآية ${arabicNumber(record.ayah)}`);
  };

  const copyAyah = async (ayah: Ayah) => {
    const text = `${ayah.text} ﴿${toArabicDigits(ayah.number)}﴾ — سورة ${surah.name}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("نُسخت الآية.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  };

  const shareAyah = async (ayah: Ayah) => {
    const text = `${ayah.text} ﴿${toArabicDigits(ayah.number)}﴾ — سورة ${surah.name}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `سورة ${surah.name}`, text });
        return;
      } catch {
        /* تراجع المستخدم عن المشاركة */
      }
    }
    await copyAyah(ayah);
  };

  const savedLocally = source !== "network" || isBundled(surahNumber);

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<BookOpen />}
          title="المصحف — صفحات كالمصحف الورقي"
          hint={`بسم الله الرحمن الرحيم مفصولة عن السورة • ${
            WIRD_LABEL[profile.quranAmount] ?? "حدّد وردك"
          }`}
          action={
            <GlassPill onClick={() => onMushafModeChange(!mushafMode)}>
              {mushafMode ? "عرض آية بآية" : "عرض صفحات المصحف"}
            </GlassPill>
          }
        />

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="relative min-w-[13rem] flex-1">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم السورة أو رقمها..."
              className="h-11 rounded-full border-white/70 bg-white/70 pr-10 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <GlassPill
              onClick={() => {
                const index = QURAN_FONT_SIZES.findIndex((size) => size >= fontScale);
                onFontScaleChange(QURAN_FONT_SIZES[Math.max(index - 1, 0)]);
              }}
              aria-label="تصغير الخط"
            >
              <Minus className="size-3.5" />
            </GlassPill>
            <span className="text-[11px] text-muted-foreground">حجم الخط</span>
            <GlassPill
              onClick={() => {
                const index = QURAN_FONT_SIZES.findIndex((size) => size > fontScale);
                onFontScaleChange(
                  QURAN_FONT_SIZES[index === -1 ? QURAN_FONT_SIZES.length - 1 : index],
                );
              }}
              aria-label="تكبير الخط"
            >
              <Plus className="size-3.5" />
            </GlassPill>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px]">
          {!online ? (
            <Badge variant="secondary" className="rounded-full gap-1">
              <WifiOff className="size-3.5" /> أنت دون إنترنت
            </Badge>
          ) : null}
          {savedLocally ? (
            <Badge className="rounded-full bg-emerald-500/90 text-white gap-1">
              <Check className="size-3.5" /> محفوظة على جهازك
            </Badge>
          ) : null}
          <Badge variant="secondary" className="rounded-full">
            المحفوظ: {arabicNumber(cachedCount)} من {arabicNumber(offline.total)} سورة
          </Badge>
          {bookmark ? (
            <GlassPill
              onClick={() => {
                setSurahNumber(bookmark.surah);
                setPageIndex(0);
                toast.info(`عدنا إلى سورة ${getSurah(bookmark.surah)?.name ?? ""}`);
              }}
            >
              <span className="flex items-center gap-1.5">
                <BookmarkCheck className="size-3.5" />
                متابعة القراءة: {getSurah(bookmark.surah)?.name}
              </span>
            </GlassPill>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          {downloading ? (
            <>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={offline.onCancelDownload}
              >
                إيقاف التنزيل
              </Button>
              <div className="min-w-[10rem] flex-1">
                <Progress value={downloadProgress} className="h-2 bg-white/60" />
              </div>
              <span className="text-[11px] text-muted-foreground">
                {toArabicDigits(downloadProgress)}٪
              </span>
            </>
          ) : (
            <Button type="button" className="rounded-full" onClick={offline.onDownload}>
              <CloudDownload className="size-4" />
              نزّل المصحف للعمل دون إنترنت
            </Button>
          )}
          <GlassPill onClick={offline.onClear}>
            <span className="flex items-center gap-1.5">
              <HardDriveDownload className="size-3.5" /> تفريغ النسخ المحفوظة
            </span>
          </GlassPill>
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-[19rem_1fr]">
        <GlassCard className="p-4">
          <p className="px-2 pb-3 text-xs font-semibold">
            فهرس السور ({arabicNumber(filtered.length)})
          </p>
          <div className="max-h-[34rem] space-y-1 overflow-y-auto pl-1">
            {filtered.map((item) => (
              <div key={item.number} className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSurahNumber(item.number)}
                  className={`flex flex-1 items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-right transition-all ${
                    item.number === surahNumber
                      ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                      : "glass-tile text-foreground/80 hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <span
                      className={`flex size-7 items-center justify-center rounded-xl text-[11px] font-semibold ${
                        item.number === surahNumber ? "bg-white/25" : "bg-white/70 text-primary"
                      }`}
                    >
                      {arabicNumber(item.number)}
                    </span>
                    <span className="text-sm font-medium">{item.name}</span>
                  </span>
                  <span className="text-[10px] opacity-70">
                    {isBundled(item.number) ? "محفوظة" : `${arabicNumber(item.ayahs)} آية`}
                  </span>
                </button>
              </div>
            ))}
          </div>
        </GlassCard>

        <div className="space-y-4">
          <GlassCard className="p-4 sm:p-5">
            {loading ? (
              <div className="flex items-center justify-center gap-3 py-20 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                جارٍ تحميل السورة...
              </div>
            ) : error ? (
              <div className="py-16 text-center">
                <p className="text-sm text-rose-600">{error}</p>
                <Button
                  type="button"
                  variant="outline"
                  className="mt-4 rounded-full"
                  onClick={() => setAttempt((value) => value + 1)}
                >
                  <RotateCcw className="size-4" />
                  حاول مرة أخرى
                </Button>
              </div>
            ) : mushafMode ? (
              <MushafPage
                surah={surah}
                ayahs={pages[safePage] ?? []}
                pageIndex={safePage}
                totalPages={pages.length}
                fontScale={fontScale}
                showBasmala={split.basmalaShown}
                onPrev={goPrev}
                onNext={goNext}
                onSelectAyah={setSelectedAyah}
              />
            ) : (
              <div className="space-y-3">
                {surah.number !== 1 && surah.number !== 9 ? (
                  <p className="quran-text text-center text-lg text-primary">{BASMALA}</p>
                ) : null}
                {split.ayahs.map((ayah) => (
                  <div key={ayah.number} className="rounded-2xl bg-white/55 p-4">
                    <p className="quran-text text-[1.1rem] leading-[2.3]" style={{ fontSize: `${fontScale}rem` }}>
                      {ayah.text}
                      <span className="mr-2 align-middle text-[0.7em] text-primary/70">
                        ﴿{toArabicDigits(ayah.number)}﴾
                      </span>
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <GlassPill onClick={() => copyAyah(ayah)}>
                        <span className="flex items-center gap-1.5">
                          <Copy className="size-3.5" /> نسخ
                        </span>
                      </GlassPill>
                      <GlassPill onClick={() => void shareAyah(ayah)}>
                        <span className="flex items-center gap-1.5">
                          <Share2 className="size-3.5" /> مشاركة
                        </span>
                      </GlassPill>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          <GlassCard soft className="flex flex-wrap items-center justify-between gap-3 p-4 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-2">
              <Sparkles className="size-3.5 text-primary" />
              أسهم لوحة المفاتيح (→ ←) تنقل بين الصفحات، والنقر على رقم الآية يعرض خياراتها.
            </span>
            <div className="flex items-center gap-2">
              <GlassPill onClick={saveBookmark}>
                <span className="flex items-center gap-1.5">
                  <Bookmark className="size-3.5" /> احفظ مكاني
                </span>
              </GlassPill>
              <GlassPill onClick={() => setSurahNumber((value) => clampSurahNumber(value + 1))}>
                السورة التالية
              </GlassPill>
            </div>
          </GlassCard>
        </div>
      </div>

      <Dialog open={selectedAyah !== null} onOpenChange={(open) => !open && setSelectedAyah(null)}>
        <DialogContent
          dir="rtl"
          className="glass-strong max-w-lg rounded-3xl border-white/70 bg-white/90"
        >
          <DialogHeader className="text-right">
            <DialogTitle className="text-base">
              سورة {surah.name} — الآية {arabicNumber(selectedAyah?.number ?? 1)}
            </DialogTitle>
            <DialogDescription className="text-right text-xs">
              اضغط نسخًا أو مشاركة لنقل الآية كما هي.
            </DialogDescription>
          </DialogHeader>
          {selectedAyah ? (
            <>
              <p className="quran-text text-[1.15rem] leading-[2.4]">{selectedAyah.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => void copyAyah(selectedAyah)}
                >
                  <Copy className="size-4" /> نسخ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => void shareAyah(selectedAyah)}
                >
                  <Share2 className="size-4" /> مشاركة
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full"
                  onClick={() => {
                    const record: BookmarkRecord = {
                      surah: surah.number,
                      ayah: selectedAyah.number,
                      at: Date.now(),
                    };
                    try {
                      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(record));
                    } catch {
                      /* لا شيء */
                    }
                    setBookmark(record);
                    toast.success("حُفظت الآية كعلامة قراءة.");
                    setSelectedAyah(null);
                  }}
                >
                  <Bookmark className="size-4" /> اجعلها علامة قراءتي
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

