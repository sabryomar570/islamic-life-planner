import { GlassCard } from "@/components/app/GlassCard";
import { ADHKAR_GROUPS, type AdhkarGroupId } from "@/data/adhkar";
import { duaOfTheDay } from "@/data/duas";
import { hadithOfTheDay } from "@/data/hadith";
import { upcomingOccasions } from "@/data/occasions";
import { ayahOfTheDay, getSurah } from "@/data/quran";
import type { ProfileAnswers } from "@/data/questions";
import { useNow } from "@/hooks/use-clock";
import { hijriParts, toArabicDigits } from "@/lib/hijri";
import { PRAYERS, nextPrayer, type Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime, formatGregorian, greeting } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  BookOpen,
  Bookmark,
  CalendarHeart,
  CircleDot,
  Clock,
  Feather,
  HeartHandshake,
  LayoutGrid,
  Moon,
  ScrollText,
  Sparkles,
  Sun,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type HomeSection =
  | "prayers"
  | "quran"
  | "duas"
  | "tasbih"
  | "hadith"
  | "poetry"
  | "occasions"
  | "settings";

const WIRD_LABEL: Record<string, string> = {
  small: "أقل من صفحة",
  page: "صفحة واحدة",
  two: "صفحتان",
  five: "خمس صفحات",
  juz: "جزء كامل",
};

const LAST_READ_KEY = "sakinah:quran:last";
const BOOKMARK_KEY = "sakinah:quran:bookmark";

/** أول عمل صباحي: يحدّد البطاقة الأولى في الشريط. */
const RITUAL_TILE: Record<
  string,
  { label: string; icon: typeof Sparkles; section: HomeSection; adhkar?: AdhkarGroupId }
> = {
  wird: { label: "وردي", icon: BookOpen, section: "quran" },
  adhkar: { label: "أذكار الصباح", icon: Sun, section: "prayers", adhkar: "morning" },
  dua: { label: "دعاء الصباح", icon: HeartHandshake, section: "duas" },
  tasbih: { label: "تسبيح", icon: CircleDot, section: "tasbih" },
};

/** ترتيب بطاقات الرئيسية حسب أهم ما يتابعه المستخدم. */
const CARD_ORDER: Record<string, string[]> = {
  prayer: ["ayah", "hadith", "wird", "dhikr"],
  quran: ["wird", "ayah", "hadith", "dhikr"],
  adhkar: ["dhikr", "ayah", "wird", "hadith"],
  duas: ["dua", "ayah", "adhkar", "wird"],
};

function pad(value: number) {
  return toArabicDigits(String(value).padStart(2, "0"));
}

/** عدّاد حيّ بصيغة ساعة:دقيقة:ثانية — يقرأ من الساعة المشتركة. */
function LiveCountdown({ target, className }: { target: Date; className?: string }) {
  const now = useNow(1000);
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    <span className={cn("tabular-nums", className)}>
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

function readSurahNumber() {
  try {
    const parsed = Number(window.localStorage.getItem(LAST_READ_KEY));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  } catch {
    return null;
  }
}

function readBookmark() {
  try {
    const raw = window.localStorage.getItem(BOOKMARK_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { surah?: number; ayah?: number };
    if (typeof parsed?.surah !== "number") return null;
    return { surah: parsed.surah, ayah: typeof parsed.ayah === "number" ? parsed.ayah : 1 };
  } catch {
    return null;
  }
}

/** بطاقة صغيرة في الشريط العلوي: أيقونة + اسم القسم. */
function RailTile({
  icon: Icon,
  label,
  onClick,
  delay = 0,
  highlight = false,
}: {
  icon: typeof Sparkles;
  label: string;
  onClick: () => void;
  delay?: number;
  highlight?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "btn-edge flex w-[4.6rem] flex-col items-center gap-1.5 rounded-2xl px-1.5 py-2.5",
        highlight && "ring-1 ring-primary/40",
      )}
    >
      <span
        className="float-soft flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary"
        style={{ animationDelay: `${delay}ms` }}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="text-[10px] font-medium leading-4 text-foreground/80">{label}</span>
    </button>
  );
}

/** بطاقة مربّعة صغيرة موحّدة الشكل للشبكة الثنائية. */
function MiniCard({
  icon: Icon,
  title,
  action,
  onClick,
  children,
  className,
}: {
  icon: typeof Sparkles;
  title: string;
  action?: string;
  onClick?: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("tile-edge flex flex-col rounded-2xl p-3.5", className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground">
          <Icon className="size-3.5 text-primary" />
          {title}
        </span>
        {action && onClick ? (
          <button
            type="button"
            onClick={onClick}
            className="text-[10px] font-medium text-primary underline-offset-4 hover:underline"
          >
            {action}
          </button>
        ) : null}
      </div>
      <div className="mt-2 flex-1">{children}</div>
    </div>
  );
}

export function HomeView({
  userName,
  profile,
  locationLabel,
  timings,
  hijri,
  dayState,
  onOpenSection,
  onOpenAdhkar,
  onOpenAllSections,
  mainGoal,
  startingRitual,
}: {
  userName?: string;
  profile: ProfileAnswers;
  locationLabel: string;
  timings: Timings;
  hijri: string | null;
  dayState: { prayers: Record<string, string>; adhkar: string[]; favorites: string[] };
  onOpenSection: (section: HomeSection) => void;
  onOpenAdhkar: (group: AdhkarGroupId) => void;
  /** يفتح نافذة «كل الأقسام» في الشريط العلوي. */
  onOpenAllSections: () => void;
  /** أكثر ما يتابعه المستخدم — يرتّب بطاقات الشاشة. */
  mainGoal: string;
  /** أول عمل صباحي — يوضع أول الشريط. */
  startingRitual: string;
}) {
  const now = useNow(1000);
  const [lastSurah, setLastSurah] = useState<number | null>(null);
  const [bookmark, setBookmark] = useState<{ surah: number; ayah: number } | null>(null);

  useEffect(() => {
    setLastSurah(readSurahNumber());
    setBookmark(readBookmark());
  }, []);

  const dailyAyah = ayahOfTheDay(now);
  const dateSeed = now.getDate() + now.getMonth() * 31;
  const dailyHadith = useMemo(() => hadithOfTheDay(dateSeed), [dateSeed]);
  const dailyDua = useMemo(() => duaOfTheDay(now), [dateSeed]);

  // التاريخ الهجري يتغيّر مرة كل يوم: لا نُعيد حساب المناسبات كل ثانية.
  const hijriDay = hijriParts(now);
  const dayId = `${hijriDay.year}-${hijriDay.month}-${hijriDay.day}`;
  const upcoming = useMemo(() => upcomingOccasions(new Date(), 2), [dayId]);

  const next = nextPrayer(timings, now);
  const nextTarget = useMemo(() => {
    const minutes = Number(next.time.split(":")[0]) * 60 + Number(next.time.split(":")[1]);
    const target = new Date(now);
    target.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
    if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
    return target;
  }, [next.time, now.getDate(), now.getHours(), now.getMinutes()]);

  const prayedCount = PRAYERS.filter(
    (prayer) => dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  const dailyDhikr = useMemo(() => {
    const group = ADHKAR_GROUPS.find((item) => item.id === "morning") ?? ADHKAR_GROUPS[0];
    return group.items[now.getDate() % group.items.length];
  }, [now.getDate()]);

  const surahName = (number: number) => getSurah(number)?.name ?? arabicNumber(number);
  const positionLabel = bookmark
    ? `سورة ${surahName(bookmark.surah)} — الآية ${arabicNumber(bookmark.ayah)}`
    : lastSurah
      ? `سورة ${surahName(lastSurah)}`
      : null;

  return (
    <div className="space-y-3.5">
      {/* الرأس: تحية وتاريخ ومكان — سطر واحد بلا حشو */}
      <header className="flex flex-wrap items-end justify-between gap-2 px-1">
        <div className="min-w-0">
          <h1 className="text-lg font-bold tracking-tight">
            {greeting(now)}
            {userName ? `، ${userName}` : ""}
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {formatGregorian(now)}
            {hijri ? ` • ${hijri}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-white/70 px-2.5 py-1 text-[10px] font-medium text-foreground/70 ring-1 ring-white/80">
          {locationLabel}
        </span>
      </header>

      {/* شريط الأقسام: بطاقات صغيرة متحركة، وأولها أول عمل صباحي للمستخدم */}
      <nav className="rail" aria-label="أقسام التطبيق">
        {(() => {
          const ritual = RITUAL_TILE[startingRitual] ?? RITUAL_TILE.adhkar;
          return (
            <RailTile
              icon={ritual.icon}
              label={ritual.label}
              highlight
              onClick={() =>
                ritual.adhkar ? onOpenAdhkar(ritual.adhkar) : onOpenSection(ritual.section)
              }
            />
          );
        })()}
        <RailTile icon={Clock} label="صلاتي" onClick={() => onOpenSection("prayers")} delay={120} />
        <RailTile icon={BookOpen} label="المصحف" onClick={() => onOpenSection("quran")} delay={240} />
        <RailTile icon={HeartHandshake} label="الأدعية" onClick={() => onOpenSection("duas")} delay={360} />
        <RailTile icon={CircleDot} label="المسبحة" onClick={() => onOpenSection("tasbih")} delay={480} />
        <RailTile icon={ScrollText} label="الأحاديث" onClick={() => onOpenSection("hadith")} delay={600} />
        <RailTile icon={Feather} label="الأبيات" onClick={() => onOpenSection("poetry")} delay={720} />
        <RailTile icon={CalendarHeart} label="المناسبات" onClick={() => onOpenSection("occasions")} delay={840} />
        <RailTile icon={LayoutGrid} label="كل الأقسام" onClick={onOpenAllSections} delay={960} />
      </nav>

      {/* الصلاة القادمة + العدّاد + تقدّم اليوم */}
      <GlassCard strong className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Moon className="size-3.5 text-primary" />
              الصلاة القادمة
            </p>
            <p className="mt-1 text-xl font-bold text-primary">
              {next.name}
              <span className="mr-2 text-base font-semibold text-foreground/80">
                {formatArabicTime(next.time)}
              </span>
            </p>
          </div>

          <div className="text-center">
            <p className="text-[11px] text-muted-foreground">المتبقّي</p>
            <LiveCountdown
              target={nextTarget}
              className="mt-0.5 block text-2xl font-bold tracking-tight"
            />
          </div>

          <button
            type="button"
            onClick={() => onOpenSection("prayers")}
            className="btn-edge rounded-2xl px-3.5 py-2 text-[11px] font-semibold"
          >
            صلّيت اليوم {arabicNumber(prayedCount)}/{arabicNumber(PRAYERS.length)}
          </button>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          {PRAYERS.map((prayer) => {
            const status = dayState.prayers[prayer.key];
            return (
              <span
                key={prayer.key}
                title={`${prayer.name} — ${formatArabicTime(timings[prayer.key])}`}
                className={cn(
                  "h-1.5 flex-1 rounded-full",
                  status === "jamaah" || status === "ontime"
                    ? "bg-emerald-500/80"
                    : status === "late"
                      ? "bg-amber-400/80"
                      : status === "missed"
                        ? "bg-rose-400/80"
                        : "bg-white/80 ring-1 ring-white/90",
                )}
              />
            );
          })}
        </div>
      </GlassCard>

      {/* أذكار مختصرة: صباح / مساء / نوم */}
      <div className="grid grid-cols-3 gap-2.5">
        {(
          [
            { id: "morning" as AdhkarGroupId, label: "الصباح", icon: Sun },
            { id: "evening" as AdhkarGroupId, label: "المساء", icon: Moon },
            { id: "sleep" as AdhkarGroupId, label: "النوم", icon: Moon },
          ]
        ).map((item) => {
          const group = ADHKAR_GROUPS.find((entry) => entry.id === item.id);
          const done = dayState.adhkar.includes(item.id);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onOpenAdhkar(item.id)}
              className={cn(
                "tile-edge flex flex-col items-center gap-1 rounded-2xl px-2 py-3",
                done && "ring-1 ring-emerald-400/60",
              )}
            >
              <item.icon className={cn("size-4", done ? "text-emerald-500" : "text-primary")} />
              <span className="text-[11px] font-semibold">أذكار {item.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {done ? "تمّت ✓" : `${arabicNumber(group?.items.length ?? 0)} ذكرًا`}
              </span>
            </button>
          );
        })}
      </div>

      {/* شبكة بطاقتين متجاورتين — مرتّبة حسب أهم ما يتابعه المستخدم */}
      <div className="grid grid-cols-2 gap-2.5">
        {(CARD_ORDER[mainGoal] ?? CARD_ORDER.prayer).map((id) => {
          if (id === "ayah") {
            return (
              <MiniCard
                key={id}
                icon={BookOpen}
                title="آية اليوم"
                action="القرآن"
                onClick={() => onOpenSection("quran")}
              >
                <p className="quran-text line-clamp-4 text-[0.95rem] leading-8">
                  ﴿{dailyAyah.text}﴾
                </p>
                <p className="mt-1.5 text-[10px] font-medium text-primary">{dailyAyah.ref}</p>
              </MiniCard>
            );
          }
          if (id === "dhikr") {
            return (
              <MiniCard
                key={id}
                icon={Sun}
                title="ذكر اليوم"
                action="الأذكار"
                onClick={() => onOpenAdhkar("morning")}
              >
                <p className="quran-text line-clamp-3 text-[0.95rem] leading-8">{dailyDhikr.text}</p>
                <p className="mt-1.5 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                  {dailyDhikr.source}
                </p>
              </MiniCard>
            );
          }
          if (id === "hadith") {
            return (
              <MiniCard
                key={id}
                icon={ScrollText}
                title="حديث اليوم"
                action="كل الأبواب"
                onClick={() => onOpenSection("hadith")}
              >
                <p className="line-clamp-4 text-[12px] font-medium leading-6">«{dailyHadith.text}»</p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">
                  {dailyHadith.narrator} — {dailyHadith.source}
                </p>
              </MiniCard>
            );
          }
          if (id === "dua") {
            return (
              <MiniCard
                key={id}
                icon={HeartHandshake}
                title="دعاء اليوم"
                action="الأدعية"
                onClick={() => onOpenSection("duas")}
              >
                <p className="quran-text line-clamp-4 text-[0.95rem] leading-8">{dailyDua.text}</p>
                <p className="mt-1.5 text-[10px] text-muted-foreground">{dailyDua.reference}</p>
              </MiniCard>
            );
          }
          if (id === "adhkar") {
            return (
              <MiniCard
                key={id}
                icon={Moon}
                title="أذكار اليوم"
                action="افتح"
                onClick={() => onOpenAdhkar("morning")}
              >
                <p className="text-[12px] font-semibold">
                  {arabicNumber(dayState.adhkar.length)} من {arabicNumber(ADHKAR_GROUPS.length)}
                </p>
                <p className="mt-1 text-[10px] leading-4 text-muted-foreground">
                  {dayState.adhkar.length === ADHKAR_GROUPS.length
                    ? "أتممت أذكار اليوم"
                    : "أكمل ما بقي من أذكار الصباح والمساء والنوم"}
                </p>
              </MiniCard>
            );
          }
          return (
            <MiniCard
              key={id}
              icon={Bookmark}
              title="ورد القرآن"
              action="تابع"
              onClick={() => onOpenSection("quran")}
            >
              <p className="text-[12px] font-semibold">
                {WIRD_LABEL[profile.quranAmount] ?? "صفحة واحدة"}
              </p>
              <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted-foreground">
                {positionLabel ? `آخر موضع: ${positionLabel}` : "لم تبدأ القراءة بعد"}
              </p>
            </MiniCard>
          );
        })}
      </div>

      {/* أقرب مناسبتين بعدّاد حيّ */}
      <div className="grid grid-cols-2 gap-2.5">
        {upcoming.map((occasion) => {
          const target = new Date(
            occasion.date.getFullYear(),
            occasion.date.getMonth(),
            occasion.date.getDate(),
          );
          return (
            <button
              key={occasion.id}
              type="button"
              onClick={() => onOpenSection("occasions")}
              className="tile-edge flex flex-col rounded-2xl p-3.5 text-right"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-semibold">
                <CalendarHeart className="size-3.5 text-primary" />
                {occasion.title}
              </span>
              <span className="mt-1 text-[10px] text-muted-foreground">
                {occasion.daysAway === 0
                  ? "اليوم"
                  : occasion.daysAway === 1
                    ? "غدًا"
                    : `بعد ${arabicNumber(occasion.daysAway)} يومًا`}
              </span>
              <LiveCountdown target={target} className="mt-1.5 text-sm font-bold text-primary" />
            </button>
          );
        })}
        {upcoming.length === 0 ? (
          <button
            type="button"
            onClick={() => onOpenSection("occasions")}
            className="tile-edge col-span-2 rounded-2xl p-3.5 text-right text-[11px] text-muted-foreground"
          >
            لا مناسبة قريبة — تفقّد قسم المناسبات لمواعيد الصيام والأعياد.
          </button>
        ) : null}
      </div>
    </div>
  );
}
