import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ADHKAR_GROUPS, type AdhkarGroupId } from "@/data/adhkar";
import { hadithOfTheDay, sectionTitle } from "@/data/hadith";
import { ayahOfTheDay } from "@/data/quran";
import type { Occasion } from "@/data/occasions";
import { distractionAdvice, type PlanBlock } from "@/lib/day-plan";
import { PRAYERS, PRAYER_STATUS_LABELS, type PrayerStatus, type Timings } from "@/lib/prayers";
import {
  arabicNumber,
  formatArabicTime,
  formatDuration,
  formatGregorian,
  greeting,
} from "@/lib/time";
import type { ProfileAnswers } from "@/data/questions";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  BookOpen,
  CalendarClock,
  CalendarHeart,
  Clock,
  Lightbulb,
  MapPin,
  Moon,
  RefreshCw,
  ScrollText,
  Sparkles,
  WifiOff,
} from "lucide-react";

const BLOCK_ICON = {
  adhkar: Sparkles,
  prayer: Moon,
  quran: BookOpen,
  sport: Sparkles,
  work: Clock,
  family: Sparkles,
  meal: Sparkles,
  sleep: Moon,
  focus: CalendarClock,
} as const;

const STATUS_OPTIONS: { value: PrayerStatus; label: string; tone: string }[] = [
  { value: "jamaah", label: "جماعة", tone: "bg-emerald-500/90 text-white" },
  { value: "ontime", label: "في الوقت", tone: "bg-sky-500/90 text-white" },
  { value: "late", label: "متأخرة", tone: "bg-amber-500/90 text-white" },
  { value: "missed", label: "فائتة", tone: "bg-rose-500/90 text-white" },
];

const GROUP_TITLE: Record<AdhkarGroupId, string> = {
  morning: "أذكار الصباح عند الاستيقاظ",
  evening: "أذكار المساء",
  sleep: "أذكار النوم قبل فراشك",
  after_prayer: "أذكار بعد الصلاة",
  distress: "أذكار الهمّ والكرب",
};

export function TodayView({
  userName,
  profile,
  timings,
  hijri,
  offlineSaved,
  onRefreshTimes,
  dayState,
  onPrayerStatus,
  onAdhkarDone,
  onOpenAdhkar,
  plan,
  upcoming,
  permission,
  onRequestPermission,
  nextReminder,
  occasions,
  onOpenSection,
}: {
  userName?: string;
  profile: ProfileAnswers;
  timings: Timings;
  hijri: string | null;
  offlineSaved: boolean;
  onRefreshTimes: () => void;
  dayState: { prayers: Record<string, string>; adhkar: string[]; favorites: string[] };
  onPrayerStatus: (prayer: string, status: PrayerStatus) => void;
  onAdhkarDone: (kind: AdhkarGroupId, done: boolean) => void;
  onOpenAdhkar: (group: AdhkarGroupId) => void;
  plan: PlanBlock[];
  upcoming: { key: string; name: string; time: string; minutesLeft: number };
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
  nextReminder: string | null;
  occasions: Occasion[];
  onOpenSection: (
    section: "prayers" | "hadith" | "plan" | "quran" | "poetry" | "occasions" | "settings",
  ) => void;
}) {
  const today = new Date();
  const dailyAyah = ayahOfTheDay(today);
  const seed = Number(`${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`);
  const dailyHadith = hadithOfTheDay(seed);

  const prayedCount = PRAYERS.filter((prayer) => {
    const status = dayState.prayers[prayer.key];
    return status === "jamaah" || status === "ontime";
  }).length;
  const nextBlocks = plan.slice(0, 4);

  return (
    <div className="space-y-5">
      <GlassCard strong className="overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-tile inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-foreground/70">
                <MapPin className="size-3.5" />
                {profile.city}
              </span>
              {offlineSaved ? (
                <Badge variant="secondary" className="rounded-full gap-1 text-[10px]">
                  <WifiOff className="size-3" /> مواقيت محفوظة
                </Badge>
              ) : null}
              {occasions.slice(0, 2).map((occasion) => (
                <button
                  key={occasion.id}
                  type="button"
                  onClick={() => onOpenSection("occasions")}
                  className="glass-tile inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-foreground/75 transition-colors hover:text-foreground"
                >
                  <CalendarHeart className="size-3.5 text-primary" />
                  {occasion.title}
                </button>
              ))}
            </div>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting(today)}
              {userName ? `، ${userName}` : ""}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatGregorian(today)}
              {hijri ? ` — ${hijri}` : ""}
            </p>
            <p className="mt-3 max-w-lg text-[13px] leading-6 text-foreground/75">
              {distractionAdvice(profile.distraction)}
            </p>
          </div>

          <div className="glass-tile w-full max-w-xs rounded-3xl p-5 text-center lg:min-w-[15rem]">
            <p className="text-[11px] font-medium text-muted-foreground">الصلاة القادمة</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {upcoming.name} • {formatArabicTime(upcoming.time)}
            </p>
            <p className="mt-1 text-xs text-foreground/70">
              يتبقّى {formatDuration(Math.max(upcoming.minutesLeft, 0))}
            </p>
            {nextReminder ? (
              <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
                التذكير القادم: {nextReminder}
              </p>
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full text-[11px]"
                onClick={onRefreshTimes}
              >
                <RefreshCw className="size-3.5" />
                تحديث المواقيت
              </Button>
              {permission !== "granted" ? (
                <Button
                  type="button"
                  size="sm"
                  className="rounded-full text-[11px]"
                  onClick={onRequestPermission}
                >
                  <Bell className="size-3.5" />
                  اسمح بالإشعارات
                </Button>
              ) : (
                <Badge variant="secondary" className="rounded-full gap-1 text-[11px]">
                  <BellRing className="size-3.5" /> التنبيهات تعمل
                </Badge>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard strong className="p-6 lg:col-span-2">
          <SectionTitle
            icon={<Sparkles className="size-5" />}
            title="ذكر اليوم"
            hint="آية وذكر وحديث يخصّان هذا اليوم"
            action={
              <GlassPill onClick={() => onOpenSection("quran")}>
                <span className="flex items-center gap-1.5">
                  <BookOpen className="size-3.5" /> ورد القرآن
                </span>
              </GlassPill>
            }
          />

          <div className="mt-5 rounded-3xl bg-gradient-to-br from-sky-500/12 via-white/40 to-indigo-400/12 p-5">
            <p className="quran-text text-center text-[1.35rem] leading-[2.6] text-foreground">
              ﴿{dailyAyah.text}﴾
            </p>
            <p className="mt-2 text-center text-xs font-medium text-primary">{dailyAyah.ref}</p>
            <div className="mt-3 flex justify-center gap-2">
              <GlassPill
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(`﴿${dailyAyah.text}﴾ — ${dailyAyah.ref}`)
                    .catch(() => undefined);
                }}
              >
                نسخ الآية
              </GlassPill>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] font-medium text-muted-foreground">
                ذكر اليوم • من أذكار الصباح
              </p>
              <p className="quran-text mt-2 text-[1.05rem] leading-9">
                سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
              </p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                مئة مرة في يومك تُحطّ بها الخطايا — رواه البخاري ومسلم.
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 -mr-2 rounded-full text-[11px] text-primary"
                onClick={() => onOpenAdhkar("morning")}
              >
                <Sparkles className="size-3.5" />
                افتح أذكار الصباح
              </Button>
            </div>

            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] font-medium text-muted-foreground">
                حديث اليوم • {sectionTitle(dailyHadith.section)}
              </p>
              <p className="mt-2 text-sm leading-7 font-medium">«{dailyHadith.text}»</p>
              <p className="mt-2 text-[11px] text-muted-foreground">
                الراوي: {dailyHadith.narrator} — {dailyHadith.source}
              </p>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="mt-2 -mr-2 rounded-full text-[11px] text-primary"
                onClick={() => onOpenSection("hadith")}
              >
                <ScrollText className="size-3.5" />
                كل الأبواب والأحاديث
              </Button>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionTitle
            icon={<CalendarClock className="size-5" />}
            title="حالة يومك"
            hint="تابع إنجازك لحظة بلحظة"
          />
          <div className="mt-5 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">الصلوات في وقتها</span>
                <span className="text-muted-foreground">
                  {arabicNumber(prayedCount)} / {arabicNumber(PRAYERS.length)}
                </span>
              </div>
              <Progress value={(prayedCount / PRAYERS.length) * 100} className="mt-2 h-2 bg-white/60" />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">الأذكار</span>
                <span className="text-muted-foreground">
                  {arabicNumber(dayState.adhkar.length)} / {arabicNumber(ADHKAR_GROUPS.length)}
                </span>
              </div>
              <Progress
                value={(dayState.adhkar.length / ADHKAR_GROUPS.length) * 100}
                className="mt-2 h-2 bg-white/60"
              />
            </div>

            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-xs font-medium">
                <Lightbulb className="size-4 text-amber-500" />
                خطوتك التالية
              </p>
              <p className="mt-2 text-[13px] leading-6 text-foreground/75">
                {nextBlocks[0]
                  ? `${formatArabicTime(nextBlocks[0].time)} — ${nextBlocks[0].title}: ${nextBlocks[0].detail}`
                  : "راجع خطّتك لغد وحدّد أول فترة."}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        {ADHKAR_GROUPS.map((group) => {
          const done = dayState.adhkar.includes(group.id);
          return (
            <GlassCard key={group.id} hover className="flex flex-col p-6">
              <SectionTitle
                icon={<Moon className="size-5" />}
                title={GROUP_TITLE[group.id]}
                hint={`${group.subtitle} • ${group.when}`}
                action={
                  done ? (
                    <Badge className="rounded-full bg-emerald-500/90 text-white">تمّت</Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">
                      {arabicNumber(group.items.length)} ذكرًا
                    </Badge>
                  )
                }
              />
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button type="button" className="rounded-full" onClick={() => onOpenAdhkar(group.id)}>
                  <Sparkles className="size-4" />
                  اقرأ الآن
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => onAdhkarDone(group.id, !done)}
                >
                  {done ? "إلغاء التعليم" : "تعليم كمنجزة"}
                </Button>
              </div>
              <p className="mt-4 text-[11px] leading-5 text-muted-foreground">{group.items[0].source}</p>
            </GlassCard>
          );
        })}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <SectionTitle
            icon={<Clock className="size-5" />}
            title="سجّل صلواتك اليوم"
            hint="نقرة واحدة بعد كل صلاة"
            action={<GlassPill onClick={() => onOpenSection("prayers")}>سجل الأسبوع</GlassPill>}
          />

          <div className="mt-5 space-y-3">
            {PRAYERS.map((prayer) => {
              const status = dayState.prayers[prayer.key] as PrayerStatus | undefined;
              return (
                <div
                  key={prayer.key}
                  className="glass-tile flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{prayer.ornament}</span>
                    <div>
                      <p className="text-sm font-semibold">{prayer.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatArabicTime(timings[prayer.key])} — {prayer.hint}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {STATUS_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => onPrayerStatus(prayer.key, option.value)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                          status === option.value
                            ? option.tone
                            : "bg-white/60 text-foreground/70 hover:bg-white/85"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                    {status ? (
                      <span className="text-[10px] text-muted-foreground">
                        {PRAYER_STATUS_LABELS[status]}
                      </span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <SectionTitle
            icon={<CalendarClock className="size-5" />}
            title="فتراتك القادمة"
            hint="من خطّتك المبنية على إجاباتك"
            action={<GlassPill onClick={() => onOpenSection("plan")}>كل الخطّة</GlassPill>}
          />
          <div className="mt-5 space-y-3">
            {nextBlocks.map((block, index) => {
              const Icon = BLOCK_ICON[block.kind];
              return (
                <motion.div
                  key={block.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.04, duration: 0.3 }}
                  className="glass-tile flex items-start gap-3 rounded-2xl p-3.5"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <p className="text-[13px] font-semibold">
                      {formatArabicTime(block.time, false)} • {block.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                      {block.detail}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
          <GlassPill className="mt-4 w-full" onClick={() => onOpenSection("settings")}>
            إعداد التذكيرات والموقع والعمل دون إنترنت
          </GlassPill>
        </GlassCard>
      </div>
    </div>
  );
}
