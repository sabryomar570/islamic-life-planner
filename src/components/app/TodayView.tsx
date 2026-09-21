import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { AdhkarDialog } from "@/components/app/AdhkarDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ADHKAR_GROUPS, getAdhkarGroup, type AdhkarGroupId } from "@/data/adhkar";
import { hadithOfTheDay } from "@/data/hadith";
import { DAILY_AYAHS } from "@/data/quran";
import { distractionAdvice, type PlanBlock } from "@/lib/day-plan";
import { PRAYERS, PRAYER_STATUS_LABELS, type PrayerStatus, type Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime, formatDuration, formatGregorian, formatHijri, greeting } from "@/lib/time";
import type { ProfileAnswers } from "@/data/questions";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CalendarClock,
  Clock,
  Lightbulb,
  MapPin,
  Moon,
  RefreshCw,
  ScrollText,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

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

export function TodayView({
  userName,
  profile,
  timings,
  hijri,
  usingFallback,
  onRefreshTimes,
  dayState,
  onPrayerStatus,
  onAdhkarDone,
  plan,
  upcoming,
  permission,
  onRequestPermission,
  onOpenSection,
}: {
  userName?: string;
  profile: ProfileAnswers;
  timings: Timings;
  hijri: string | null;
  usingFallback: boolean;
  onRefreshTimes: () => void;
  dayState: { prayers: Record<string, string>; adhkar: string[]; favorites: string[] };
  onPrayerStatus: (prayer: string, status: PrayerStatus) => void;
  onAdhkarDone: (kind: AdhkarGroupId, done: boolean) => void;
  plan: PlanBlock[];
  upcoming: { key: string; name: string; time: string; minutesLeft: number };
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
  onOpenSection: (section: "prayers" | "hadith" | "plan" | "quran") => void;
}) {
  const [openGroup, setOpenGroup] = useState<AdhkarGroupId | null>(null);
  const today = new Date();
  const seed = Number(`${today.getFullYear()}${today.getMonth() + 1}${today.getDate()}`);
  const dailyAyah = DAILY_AYAHS[seed % DAILY_AYAHS.length];
  const dailyHadith = hadithOfTheDay(seed);
  const morningGroup = getAdhkarGroup("morning");
  const dailyDhikr = morningGroup.items[seed % morningGroup.items.length];

  const prayedCount = PRAYERS.filter((prayer) => {
    const status = dayState.prayers[prayer.key];
    return status === "jamaah" || status === "ontime";
  }).length;
  const adhkarDoneCount = dayState.adhkar.length;
  const nextBlocks = plan.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* لوح الترحيب + الصلاة القادمة */}
      <GlassCard strong className="overflow-hidden p-6 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="glass-tile inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-foreground/70">
              <MapPin className="size-3.5" />
              {profile.city}
              {usingFallback ? " • مواقيت تقريبية" : ""}
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting(today)}{userName ? `، ${userName}` : ""} 🌤️
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatGregorian(today)}
              {hijri ? ` — ${hijri}` : ` — ${formatHijri(today)}`}
            </p>
            <p className="mt-3 max-w-lg text-sm leading-6 text-foreground/75">
              «{distractionAdvice(profile.distraction)}»
            </p>
          </div>

          <div className="glass-tile w-full max-w-xs rounded-3xl p-5 text-center lg:min-w-[15rem]">
            <p className="text-[11px] font-medium text-muted-foreground">
              الصلاة القادمة
            </p>
            <p className="mt-1 text-xl font-bold text-primary">
              {upcoming.name} • {formatArabicTime(upcoming.time)}
            </p>
            <p className="mt-1 text-xs text-foreground/70">
              يتبقّى {formatDuration(Math.max(upcoming.minutesLeft, 0))}
            </p>
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
                  فعّل التنبيه
                </Button>
              ) : (
                <Badge variant="secondary" className="rounded-full text-[11px]">
                  التنبيهات مفعّلة
                </Badge>
              )}
            </div>
          </div>
        </div>
      </GlassCard>

      {/* ذكر اليوم */}
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard strong className="p-6 lg:col-span-2">
          <SectionTitle
            icon={<Sparkles className="size-5" />}
            title="ذكر اليوم"
            hint="ابدأ به: آية وذكر وحديث يخصّان يومك"
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
            <p className="mt-2 text-center text-xs font-medium text-primary">
              {dailyAyah.ref}
            </p>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] font-medium text-muted-foreground">
                ذكر اليوم • {dailyDhikr.title ?? morningGroup.title}
              </p>
              <p className="quran-text mt-2 text-[1.05rem] leading-9">
                {dailyDhikr.text}
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
                {dailyDhikr.source}
              </p>
            </div>

            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] font-medium text-muted-foreground">
                حديث اليوم • {dailyHadith.topic}
              </p>
              <p className="mt-2 text-sm leading-7 font-medium">
                «{dailyHadith.text}»
              </p>
              <p className="mt-3 text-[11px] text-muted-foreground">
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
                كل الأحاديث
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* حالة اليوم */}
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
              <Progress
                value={(prayedCount / PRAYERS.length) * 100}
                className="mt-2 h-2 bg-white/60"
              />
            </div>
            <div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium">الأذكار</span>
                <span className="text-muted-foreground">
                  {arabicNumber(adhkarDoneCount)} / {arabicNumber(ADHKAR_GROUPS.length)}
                </span>
              </div>
              <Progress
                value={(adhkarDoneCount / ADHKAR_GROUPS.length) * 100}
                className="mt-2 h-2 bg-white/60"
              />
            </div>

            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-xs font-medium">
                <Lightbulb className="size-4 text-amber-500" />
                نصيحة اليوم لك
              </p>
              <p className="mt-2 text-[13px] leading-6 text-foreground/75">
                {profile.mainGoal === "prayer"
                  ? "ركّز اليوم على الصلاة في وقتها: ضع الأذان بداية كل فترة في يومك."
                  : profile.mainGoal === "quran"
                    ? "لا تترك وردك اليوم؛ اجعله أول ما تفعل بعد الفجر."
                    : profile.mainGoal === "organize"
                      ? "التزم بخطّة يومك المولّدة من إجاباتك، وابدأ بأول فترة قادمة."
                      : profile.mainGoal === "sport"
                        ? "٢٠ دقيقة حركة اليوم تكفي لتغيير طاقتك كلها."
                        : "اجعل اليوم بداية: صلاة في وقتها، وذكر عند الاستيقاظ وعند النوم."}
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* الأذكار */}
      <div className="grid gap-5 lg:grid-cols-3">
        {ADHKAR_GROUPS.map((group) => {
          const done = dayState.adhkar.includes(group.id);
          return (
            <GlassCard key={group.id} hover className="p-6">
              <SectionTitle
                icon={<Moon className="size-5" />}
                title={
                  group.id === "morning"
                    ? "أذكار الصباح عند الاستيقاظ"
                    : group.id === "evening"
                      ? "أذكار المساء"
                      : "أذكار النوم قبل فراشك"
                }
                hint={`${group.subtitle} • ${group.when}`}
                action={
                  done ? (
                    <Badge className="rounded-full bg-emerald-500/90 text-white">
                      تمّت
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="rounded-full">
                      {arabicNumber(group.items.length)} ذكرًا
                    </Badge>
                  )
                }
              />
              <div className="mt-5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={() => setOpenGroup(group.id)}
                >
                  <Sparkles className="size-4" />
                  اقرأ الأذكار الآن
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
              <p className="mt-4 text-[11px] leading-5 text-muted-foreground">
                {group.items[0].source}
              </p>
            </GlassCard>
          );
        })}
      </div>

      {/* تسجيل الصلوات + خطّة اليوم */}
      <div className="grid gap-5 lg:grid-cols-3">
        <GlassCard className="p-6 lg:col-span-2">
          <SectionTitle
            icon={<Clock className="size-5" />}
            title="سجّل صلواتك اليوم"
            hint="اضغط حالة كل صلاة بعد أدائها"
            action={
              <GlassPill onClick={() => onOpenSection("prayers")}>
                سجل الأسبوع
              </GlassPill>
            }
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
            action={
              <GlassPill onClick={() => onOpenSection("plan")}>كل الخطّة</GlassPill>
            }
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
        </GlassCard>
      </div>

      <AdhkarDialog
        group={openGroup ? getAdhkarGroup(openGroup) : morningGroup}
        open={openGroup !== null}
        onOpenChange={(open) => setOpenGroup(open ? openGroup : null)}
        isDone={openGroup ? dayState.adhkar.includes(openGroup) : false}
        onToggleDone={(done) => openGroup && onAdhkarDone(openGroup, done)}
      />
    </div>
  );
}
