import { GlassCard } from "@/components/app/GlassCard";
import { MushafPage } from "@/components/app/MushafPage";
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
import { cn } from "@/lib/utils";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  CloudDownload,
  Copy,
  Gauge,
  List,
  Loader2,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Share2,
  StepBack,
  StepForward,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

const LAST_READ_KEY = "sakinah:quran:last";
const BOOKMARK_KEY = "sakinah:quran:bookmark";
const SCROLL_KEY = "oud:quran:scroll";

const WIRD_LABEL: Record<string, string> = {
  small: "أقل من صفحة",
  page: "صفحة واحدة",
  two: "صفحتان",
  five: "خمس صفحات",
  juz: "جزء",
};

/** سرعات التمرير التلقائي بالبكسل في الثانية (١ = الأهدأ). */
export const SCROLL_SPEEDS = [12, 20, 32, 50, 76];

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

function readScrollPrefs() {
  try {
    const raw = window.localStorage.getItem(SCROLL_KEY);
    if (!raw) return { speed: 2 };
    const parsed = JSON.parse(raw) as { speed?: number };
    const speed = Number(parsed?.speed);
    return { speed: Number.isFinite(speed) ? Math.min(Math.max(speed, 1), 5) : 2 };
  } catch {
    return { speed: 2 };
  }
}

/** زر في شريط التحكم السفلي — مُعرَّف خارج المكوّن حتى لا يُعاد إنشاؤه كل تصيير. */
function ToolButton({
  onClick,
  label,
  active = false,
  disabled = false,
  children,
}: {
  onClick: () => void;
  label: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex min-w-[3.4rem] flex-1 flex-col items-center gap-0.5 rounded-2xl px-1 py-1.5 text-[9.5px] font-medium leading-3 transition-colors",
        disabled
          ? "opacity-40"
          : active
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30"
            : "text-foreground/75 hover:bg-white/80",
      )}
    >
      {children}
      {label}
    </button>
  );
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
  const [indexOpen, setIndexOpen] = useState(false);
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
  const [autoScroll, setAutoScroll] = useState(false);
  const [speed, setSpeed] = useState(() => readScrollPrefs().speed);
  const [reachedEnd, setReachedEnd] = useState(false);
  const [pendingBookmark, setPendingBookmark] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoRequested = useRef(false);

  const surah = getSurah(surahNumber) ?? SURAHS[0];
  const { cachedCount, downloading, progress: downloadProgress } = offline;

  const filtered = useMemo(() => {
    const term = query.trim();
    if (!term) return SURAHS;
    return SURAHS.filter(
      (item) =>
        item.name.includes(term) ||
        item.name.replace(/[أإآ]/g, "ا").includes(term.replace(/[أإآ]/g, "ا")) ||
        String(item.number) === term,
    );
  }, [query]);

  /* تحميل السورة: ذاكرة ← قاعدة بيانات ← محفوظ داخل التطبيق ← شبكة. */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPageIndex(0);
    setReachedEnd(false);

    loadSurah(surahNumber, { forceNetwork: attempt > 0 })
      .then((result) => {
        if (cancelled) return;
        setAyahs(result.ayahs);
        setSource(result.source);
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

  /* إرجاع موضع التمرير لأعلى الصفحة عند تبديل الصفحة. */
  useEffect(() => {
    const element = scrollRef.current;
    if (element) element.scrollTop = 0;
  }, [safePage, surahNumber]);

  const goNext = useCallback(() => {
    setPageIndex((value) => {
      if (value + 1 < pages.length) return value + 1;
      if (surahNumber < SURAHS.length) {
        setSurahNumber(surahNumber + 1);
        return 0;
      }
      setReachedEnd(true);
      return value;
    });
  }, [pages.length, surahNumber]);

  const goPrev = useCallback(() => {
    setPageIndex((value) => {
      if (value > 0) return value - 1;
      if (surahNumber > 1) {
        setPendingLastPage(true);
        setSurahNumber(surahNumber - 1);
      }
      return 0;
    });
  }, [surahNumber]);

  useEffect(() => {
    if (pendingLastPage && !loading && pages.length > 0) {
      setPageIndex(pages.length - 1);
      setPendingLastPage(false);
    }
  }, [pendingLastPage, loading, pages.length]);

  /* التنقّل بأسهم لوحة المفاتيح. */
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.target instanceof HTMLInputElement) return;
      if (event.key === "ArrowLeft") goNext();
      if (event.key === "ArrowRight") goPrev();
      if (event.key === " ") {
        event.preventDefault();
        setAutoScroll((value) => {
          if (!value) onMushafModeChange(true);
          return !value;
        });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onMushafModeChange]);

  /* التمرير التلقائي: حركة ناعمة بمعدّل السرعة المختارة، وتقليب الصفحة تلقائيًا. */
  useEffect(() => {
    if (!autoScroll || loading || !mushafMode) return;
    const element = scrollRef.current;
    if (!element) return;

    let frame = 0;
    let last = performance.now();
    let carry = 0;
    let stopped = false;

    const loop = (time: number) => {
      if (stopped) return;
      const delta = Math.min(time - last, 120);
      last = time;
      carry += (delta / 1000) * SCROLL_SPEEDS[speed - 1];
      const step = Math.floor(carry);
      if (step > 0) {
        carry -= step;
        element.scrollTop += step;
      }
      if (element.scrollTop + element.clientHeight >= element.scrollHeight - 2) {
        // ننتقل للصفحة التالية ونُكمل القراءة، ونوقف عند آخر المصحف.
        if (surahNumber < SURAHS.length || safePage < pages.length - 1) goNext();
        else setAutoScroll(false);
        return;
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
    };
  }, [autoScroll, speed, loading, mushafMode, safePage, goNext, surahNumber, pages.length]);

  /* حفظ تفضيل السرعة. */
  useEffect(() => {
    try {
      window.localStorage.setItem(SCROLL_KEY, JSON.stringify({ speed }));
    } catch {
      /* لا شيء */
    }
  }, [speed]);

  /* تنزيل المصحف كاملًا تلقائيًا مرة واحدة عند أول قراءة مع اتصال. */
  useEffect(() => {
    if (!online || downloading || autoRequested.current) return;
    if (cachedCount >= offline.total) return;
    const timer = window.setTimeout(() => {
      if (autoRequested.current) return;
      autoRequested.current = true;
      offline.onDownload();
    }, 1500);
    return () => window.clearTimeout(timer);
  }, [online, downloading, cachedCount, offline]);

  const saveBookmark = () => {
    const current = pages[safePage]?.[0];
    const record: BookmarkRecord = { surah: surah.number, ayah: current?.number ?? 1, at: Date.now() };
    try {
      window.localStorage.setItem(BOOKMARK_KEY, JSON.stringify(record));
    } catch {
      /* لا شيء */
    }
    setBookmark(record);
    toast.success(`حُفظ مكانك: سورة ${surah.name} — الآية ${arabicNumber(record.ayah)}`);
  };

  const resumeReading = () => {
    if (bookmark) {
      setSurahNumber(clampSurahNumber(bookmark.surah));
      setPendingBookmark(bookmark.ayah);
      toast.info(`عدنا إلى سورة ${getSurah(bookmark.surah)?.name ?? ""}`);
      return;
    }
    toast.info("لا موضع محفوظ بعد — احفظ مكانك بزر العلامة.");
  };

  useEffect(() => {
    if (pendingBookmark === null || loading || pages.length === 0) return;
    const found = pages.findIndex((page) => page.some((ayah) => ayah.number >= pendingBookmark));
    setPageIndex(found === -1 ? 0 : found);
    setPendingBookmark(null);
  }, [pendingBookmark, loading, pages]);

  const formatAyahMessage = (ayah: Ayah) =>
    `﴿${ayah.text}﴾\n\n[سورة ${surah.name} — الآية ${toArabicDigits(ayah.number)}]\n\n«وَلَقَدْ يَسَّرْنَا الْقُرْآنَ لِلذِّكْرِ» — من تطبيق عود`;

  const copyAyah = async (ayah: Ayah) => {
    try {
      await navigator.clipboard.writeText(formatAyahMessage(ayah));
      toast.success("نُسخت الآية.");
    } catch {
      toast.error("تعذّر النسخ من المتصفح.");
    }
  };

  const shareAyah = async (ayah: Ayah) => {
    const text = formatAyahMessage(ayah);
    if (navigator.share) {
      try {
        await navigator.share({ title: `سورة ${surah.name}`, text });
        return;
      } catch {
        /* تراجع المستخدم */
      }
    }
    await copyAyah(ayah);
  };

  const savedLocally = source !== "network" || isBundled(surahNumber);

  return (
    <div className="space-y-3">
      {/* شريط أعلى مختصر: الفهرس واسم السورة وحجم الخط */}
      <div className="tile-edge flex items-center gap-2 rounded-2xl p-2">
        <button
          type="button"
          onClick={() => setIndexOpen(true)}
          className="btn-edge flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-semibold"
        >
          <List className="size-3.5" />
          الفهرس
        </button>

        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-bold">سورة {surah.name}</p>
          <p className="text-[10px] text-muted-foreground">
            {surah.type} • {arabicNumber(surah.ayahs)} آية •{" "}
            {arabicNumber(safePage + 1)}/{arabicNumber(pages.length)}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="تصغير الخط"
            onClick={() => {
              const index = QURAN_FONT_SIZES.findIndex((size) => size >= fontScale);
              onFontScaleChange(QURAN_FONT_SIZES[Math.max(index - 1, 0)]);
            }}
            className="btn-edge flex size-8 items-center justify-center rounded-xl"
          >
            <Minus className="size-3.5" />
          </button>
          <button
            type="button"
            aria-label="تكبير الخط"
            onClick={() => {
              const index = QURAN_FONT_SIZES.findIndex((size) => size > fontScale);
              onFontScaleChange(
                QURAN_FONT_SIZES[index === -1 ? QURAN_FONT_SIZES.length - 1 : index],
              );
            }}
            className="btn-edge flex size-8 items-center justify-center rounded-xl"
          >
            <Plus className="size-3.5" />
          </button>
        </div>
      </div>

      {/* المصحف: مساحة تمرير مستقلة ليتمكّن التمرير التلقائي من تحريك النص */}
      <div
        ref={scrollRef}
        className="mushaf-scroll h-[58dvh] min-h-[20rem] overflow-y-auto overscroll-contain rounded-3xl pb-2"
      >
        {loading ? (
          <GlassCard className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            جارٍ تحميل السورة...
          </GlassCard>
        ) : error ? (
          <GlassCard className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <p className="text-sm text-rose-600">{error}</p>
            <Button
              type="button"
              variant="outline"
              className="btn-edge rounded-full"
              onClick={() => setAttempt((value) => value + 1)}
            >
              <RotateCcw className="size-4" />
              حاول مرة أخرى
            </Button>
          </GlassCard>
        ) : mushafMode ? (
          <MushafPage
            surah={surah}
            ayahs={pages[safePage] ?? []}
            pageIndex={safePage}
            totalPages={pages.length}
            fontScale={fontScale}
            showBasmala={split.basmalaShown}
            onSelectAyah={setSelectedAyah}
          />
        ) : (
          <GlassCard className="space-y-2.5 p-3.5">
            {surah.number !== 1 && surah.number !== 9 && split.basmalaShown ? (
              <p className="quran-text text-center text-base text-primary">{BASMALA}</p>
            ) : null}
            {split.ayahs.map((ayah) => (
              <div key={ayah.number} className="rounded-2xl bg-white/60 p-3">
                <p
                  className="quran-text leading-[2.2]"
                  style={{ fontSize: `${fontScale}rem` }}
                >
                  {ayah.text}
                  <span className="mr-2 align-middle text-[0.7em] text-primary/70">
                    ﴿{toArabicDigits(ayah.number)}﴾
                  </span>
                </p>
              </div>
            ))}
          </GlassCard>
        )}
      </div>

      {/* رسائل حالة مختصرة — سطر واحد بلا حشو */}
      <div className="flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
        {!online ? <span className="rounded-full bg-amber-400/15 px-2 py-0.5">دون إنترنت</span> : null}
        {savedLocally ? (
          <span className="flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-emerald-700">
            <Check className="size-3" /> محفوظة على جهازك
          </span>
        ) : null}
        <span>
          المحفوظ: {arabicNumber(cachedCount)} من {arabicNumber(offline.total)} سورة
        </span>
        <span>• الورد: {WIRD_LABEL[profile.quranAmount] ?? "—"}</span>
        {reachedEnd ? <span className="text-primary">بلغت آخر المصحف</span> : null}
        <button
          type="button"
          onClick={() => onMushafModeChange(!mushafMode)}
          className="mr-auto font-medium text-primary underline-offset-4 hover:underline"
        >
          {mushafMode ? "عرض آية بآية" : "عرض صفحات المصحف"}
        </button>
      </div>

      {downloading ? (
        <div className="tile-edge flex items-center gap-3 rounded-2xl p-3">
          <CloudDownload className="size-4 text-primary" />
          <Progress value={downloadProgress} className="h-1.5 flex-1 bg-white/70" />
          <span className="text-[10px] tabular-nums text-muted-foreground">
            {toArabicDigits(downloadProgress)}٪
          </span>
          <button
            type="button"
            onClick={offline.onCancelDownload}
            className="text-[10px] font-medium text-rose-600"
          >
            إيقاف
          </button>
        </div>
      ) : cachedCount < offline.total ? (
        <button
          type="button"
          onClick={offline.onDownload}
          className="btn-edge flex w-full items-center justify-center gap-2 rounded-2xl px-3 py-2.5 text-[11px] font-semibold"
        >
          <CloudDownload className="size-4" />
          نزّل المصحف كاملًا للقراءة دون إنترنت
        </button>
      ) : null}

      {/* فراغ سفلي حتى لا يُحجب آخر المحتوى بشريط التحكم */}
      <div className="h-14" aria-hidden />

      {/* شريط التحكم السفلي — أسفل الصفحة لا فوق النص */}
      <div className="fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+4.9rem)] z-30 px-3">
        {autoScroll ? (
          <div className="glass-strong mx-auto mb-1.5 flex w-full max-w-md items-center justify-center gap-1.5 rounded-2xl border border-white/80 px-2 py-1.5">
            <span className="text-[10px] font-medium text-muted-foreground">السرعة</span>
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setSpeed(value)}
                aria-label={`سرعة ${value}`}
                className={cn(
                  "size-7 rounded-xl text-[11px] font-semibold transition-colors",
                  value === speed
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/70 text-foreground/70 hover:bg-white",
                )}
              >
                {arabicNumber(value)}
              </button>
            ))}
          </div>
        ) : null}
        <div className="glass-strong mx-auto flex w-full max-w-md items-center gap-0.5 rounded-3xl border border-white/80 p-1.5 shadow-xl shadow-sky-900/10">
          <ToolButton onClick={goPrev} label="السابق">
            <StepBack className="size-[18px]" />
          </ToolButton>
          <ToolButton onClick={goNext} label="التالي">
            <StepForward className="size-[18px]" />
          </ToolButton>

          <ToolButton
            onClick={() => {
              setAutoScroll((value) => {
                // التمرير التلقائي يعمل على صفحات المصحف، فنعرض الصفحات عند تفعيله.
                if (!value) onMushafModeChange(true);
                return !value;
              });
            }}
            label={autoScroll ? "إيقاف" : "تمرير تلقائي"}
            active={autoScroll}
          >
            {autoScroll ? <Pause className="size-[18px]" /> : <Play className="size-[18px]" />}
          </ToolButton>

          <ToolButton
            onClick={() => setSpeed((value) => (value >= 5 ? 1 : value + 1))}
            label={`سرعة ${arabicNumber(speed)}`}
            active={autoScroll}
          >
            <Gauge className="size-[18px]" />
          </ToolButton>

          <ToolButton onClick={saveBookmark} label="علامة">
            <Bookmark className="size-[18px]" />
          </ToolButton>

          <ToolButton onClick={resumeReading} label="استكمال" active={Boolean(bookmark)}>
            <BookmarkCheck className="size-[18px]" />
          </ToolButton>
        </div>
      </div>

      {/* فهرس السور — يختفي فورًا بعد الاختيار ليظهر النص */}
      <Sheet open={indexOpen} onOpenChange={setIndexOpen}>
        <SheetContent
          side="bottom"
          className="glass-strong flex h-[85dvh] flex-col rounded-t-[2rem] border-white/70 bg-white/95 px-4 pb-6 pt-3"
        >
          <SheetHeader className="items-center text-center">
            <SheetTitle className="text-base">فهرس السور</SheetTitle>
          </SheetHeader>

          <div className="relative mt-2">
            <Search className="absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="ابحث باسم السورة أو رقمها..."
              className="h-11 rounded-full border-white/70 bg-white/80 pr-10 text-sm"
            />
          </div>

          <div className="mt-3 flex-1 space-y-1 overflow-y-auto pl-1">
            {filtered.map((item) => (
              <button
                key={item.number}
                type="button"
                onClick={() => {
                  setSurahNumber(item.number);
                  setPageIndex(0);
                  setIndexOpen(false);
                }}
                className={cn(
                  "flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-right transition-colors",
                  item.number === surahNumber
                    ? "bg-primary text-primary-foreground"
                    : "tile-edge hover:bg-white",
                )}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={cn(
                      "flex size-7 items-center justify-center rounded-xl text-[11px] font-semibold",
                      item.number === surahNumber ? "bg-white/25" : "bg-primary/12 text-primary",
                    )}
                  >
                    {arabicNumber(item.number)}
                  </span>
                  <span className="text-sm font-medium">{item.name}</span>
                </span>
                <span className="text-[10px] opacity-70">
                  {isBundled(item.number) ? "محفوظة" : `${arabicNumber(item.ayahs)} آية`}
                </span>
              </button>
            ))}
            {filtered.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">لا سورة بهذا الاسم.</p>
            ) : null}
          </div>

          <div className="mt-3 flex items-center gap-2">
            <GlassPillButton onClick={() => setIndexOpen(false)}>إغلاق</GlassPillButton>
            <span className="text-[10px] text-muted-foreground">
              اختر سورة ليظهر نصّها مباشرة.
            </span>
          </div>
        </SheetContent>
      </Sheet>

      {/* خيارات الآية */}
      <Dialog open={selectedAyah !== null} onOpenChange={(open) => !open && setSelectedAyah(null)}>
        <DialogContent dir="rtl" className="glass-strong max-w-lg rounded-3xl border-white/70 bg-white/94">
          <DialogHeader className="text-right">
            <DialogTitle className="text-base">
              سورة {surah.name} — الآية {arabicNumber(selectedAyah?.number ?? 1)}
            </DialogTitle>
            <DialogDescription className="text-right text-xs">
              انسخ الآية أو شاركها كما هي.
            </DialogDescription>
          </DialogHeader>
          {selectedAyah ? (
            <>
              <p className="quran-text text-[1.1rem] leading-[2.3]">{selectedAyah.text}</p>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="btn-edge rounded-full"
                  onClick={() => void copyAyah(selectedAyah)}
                >
                  <Copy className="size-4" /> نسخ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="btn-edge rounded-full"
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
                  <Bookmark className="size-4" /> اجعلها علامتي
                </Button>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/** زر دائري صغير داخل النوافذ لتقليل التكرار. */
function GlassPillButton({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="btn-edge rounded-full px-3.5 py-1.5 text-[11px] font-medium"
    >
      {children}
    </button>
  );
}
