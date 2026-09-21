import { GlassCard, GlassPill } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ADHKAR_GROUPS, type AdhkarGroupId } from "@/data/adhkar";
import { hadithOfTheDay, sectionTitle } from "@/data/hadith";
import { ayahOfTheDay } from "@/data/quran";
import type { Occasion } from "@/data/occasions";
import type { ProfileAnswers } from "@/data/questions";
import { distractionAdvice, type PlanBlock } from "@/lib/day-plan";
import { PRAYERS, type PrayerStatus, type Timings } from "@/lib/prayers";
import {
  arabicNumber,
  formatArabicTime,
  formatDuration,
  formatGregorian,
  greeting,
} from "@/lib/time";
import { motion } from "framer-motion";
import {
  Bell,
  BellRing,
  BookOpen,
  CalendarClock,
  CalendarHeart,
  Clock,
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
  morning: "أذكار الصباح",
  evening: "أذكار المساء",
  sleep: "أذكار النوم",
  after_prayer: "أذكار بعد الصلاة",
  distress: "أذكار الهمّ والكرب",
};

const GROUP_ORDER: AdhkarGroupId[] = ["morning", "evening", "sleep", "after_prayer", "distress"];
const GROUP_SUBTITLE: Record<AdhkarGroupId, string> = {
  morning: "عند الاستيقاظ",
  evening: "قبل المغرب",
  sleep: "قبل فراشك",
  after_prayer: "بعد كل صلاة",
  distress: "عند الضيق",
};

/** عنوان قسم مرقّم يعطي تسلسلًا واضحًا للشاشة. */
function StepTitle({
  step,
  title,
  hint,
  action,
  icon,
}: {
  step: number;
  title: string;
  hint?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-primary/12 text-sm font-bold text-primary">
          {arabicNumber(step)}
        </span>
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            {icon}
            {title}
          </h2>
          {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
        </div>
      </div>
      {action}
    </div>
  );
}

export function TodayView({
  userName,
  profile,
  timings,
  hijri,
  offlineSaved,
  onRefreshTimes,
  dayState,
  onPrayerStatus,
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
  const nextBlocks = plan.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* ١ — الترحيب والصلاة القادمة */}
      <GlassCard strong className="overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/70">
                <MapPin className="size-3.5" />
                {profile.city}
              </span>
              {offlineSaved ? (
                <span className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-muted-foreground">
                  <WifiOff className="size-3.5" /> مواقيت محفوظة
                </span>
              ) : null}
              {occasions.slice(0, 1).map((occasion) => (
                <button
                  key={occasion.id}
                  type="button"
                  onClick={() => onOpenSection("occasions")}
                  className="glass-tile inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] text-foreground/75 transition-colors hover:text-foreground"
                >
                  <CalendarHeart className="size-3.5 text-primary" />
                  {occasion.title}
                </button>
              ))}
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">
              {greeting(today)}
              {userName ? `، ${userName}` : ""}
            </h1>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {formatGregorian(today)}
              {hijri ? ` — ${hijri}` : ""}
            </p>
          </div>

          <div className="glass-tile w-full shrink-0 rounded-3xl p-4 text-center lg:w-64">
            <p className="text-[11px] font-medium text-muted-foreground">الصلاة القادمة</p>
            <p className="mt-1 text-xl font-bold text-primary">
              {upcoming.name} • {formatArabicTime(upcoming.time)}
            </p>
            <p className="mt-0.5 text-xs text-foreground/70">
              يتبقّى {formatDuration(Math.max(upcoming.minutesLeft, 0))}
            </p>
            <div className="mt-3 flex items-center justify-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 rounded-full text-[11px]"
                onClick={onRefreshTimes}
                aria-label="تحديث المواقيت"
              >
                <RefreshCw className="size-3.5" />
              </Button>
              {permission !== "granted" ? (
                <Button
                  type="button"
                  size="sm"
                  className="h-7 rounded-full text-[11px]"
                  onClick={onRequestPermission}
                >
                  <Bell className="size-3.5" />
                  فعّل التنبيهات
                </Button>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600">
                  <BellRing className="size-3.5" /> التنبيهات تعمل
                </span>
              )}
            </div>
            {nextReminder ? (
              <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{nextReminder}</p>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {/* ٢ — ذكر اليوم: الآية والذكر والحديث */}
      <GlassCard strong className="p-5 sm:p-6">
        <StepTitle
          step={1}
          title="ذكر اليوم"
          hint="ثلاثة ألوف تفتح يومك: آية، وذكر، وحديث"
          icon={<Sparkles className="size-4 text-primary" />}
          action={
            <GlassPill onClick={() => onOpenSection("quran")}>
              <span className="flex items-center gap-1.5">
                <BookOpen className="size-3.5" /> ورد القرآن
              </span>
            </GlassPill>
          }
        />

        <div className="rounded-3xl bg-gradient-to-br from-sky-500/12 via-white/40 to-indigo-400/12 p-5">
          <p className="quran-text text-center text-[1.3rem] leading-[2.5]">
            ﴿{dailyAyah.text}﴾
          </p>
          <p className="mt-2 text-center text-xs font-medium text-primary">{dailyAyah.ref}</p>
          <div className="mt-3 flex justify-center">
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

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="glass-tile rounded-2xl p-4">
            <p className="text-[11px] font-medium text-muted-foreground">ذكر اليوم</p>
            <p className="quran-text mt-2 text-[1.05rem] leading-9">
              سُبْحَانَ اللَّهِ وَبِحَمْدِهِ
            </p>
            <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
              مئة مرة تُحطّ بها الخطايا — رواه البخاري ومسلم.
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1.5 -mr-2 rounded-full text-[11px] text-primary"
              onClick={() => onOpenAdhkar("morning")}
            >
              افتح أذكار الصباح
            </Button>
          </div>

          <div className="glass-tile rounded-2xl p-4">
            <p className="text-[11px] font-medium text-muted-foreground">
              حديث اليوم • {sectionTitle(dailyHadith.section)}
            </p>
            <p className="mt-2 text-sm font-medium leading-7">«{dailyHadith.text}»</p>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {dailyHadith.narrator} — {dailyHadith.source}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="mt-1.5 -mr-2 rounded-full text-[11px] text-primary"
              onClick={() => onOpenSection("hadith")}
            >
              كل الأبواب
            </Button>
          </div>
        </div>

        <p className="mt-4 rounded-2xl bg-amber-400/10 px-4 py-2.5 text-center text-[12px] leading-6 text-foreground/75">
          💡 {distractionAdvice(profile.distraction)}
        </p>
      </GlassCard>

      {/* ٣ — صلواتك اليوم: التقدّم والتسجيل السريع في مكان واحد */}
      <GlassCard strong className="p-5 sm:p-6">
        <StepTitle
          step={2}
          title="صلواتك اليوم"
          hint="سجّل كل صلاة بنقرة واحدة"
          icon={<Clock className="size-4 text-primary" />}
          action={
            <GlassPill onClick={() => onOpenSection("prayers")}>
              السجلّ والإحصاءات
            </GlassPill>
          }
        />

        <div className="mb-4 flex items-center gap-3">
          <Progress
            value={(prayedCount / PRAYERS.length) * 100}
            className="h-2 flex-1 bg-white/60"
          />
          <span className="text-xs font-medium text-muted-foreground">
            {arabicNumber(prayedCount)} / {arabicNumber(PRAYERS.length)}
          </span>
        </div>

        <div className="space-y-2.5">
          {PRAYERS.map((prayer) => {
            const status = dayState.prayers[prayer.key] as PrayerStatus | undefined;
            return (
              <div
                key={prayer.key}
                className="glass-tile flex flex-col gap-2.5 rounded-2xl p-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <span className="text-xl">{prayer.ornament}</span>
                  <div>
                    <p className="text-sm font-semibold">{prayer.name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatArabicTime(timings[prayer.key])}
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
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* ٤ — الأذكار الخمسة مرتّبة بأرقامها */}
      <GlassCard strong className="p-5 sm:p-6">
        <StepTitle
          step={3}
          title="أذكارك اليوم"
          hint={`أنجزت ${arabicNumber(dayState.adhkar.length)} من ${arabicNumber(ADHKAR_GROUPS.length)}`}
          icon={<Moon className="size-4 text-primary" />}
        />
        <Progress
          value={(dayState.adhkar.length / ADHKAR_GROUPS.length) * 100}
          className="mb-4 h-2 bg-white/60"
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GROUP_ORDER.map((groupId, index) => {
            const group = ADHKAR_GROUPS.find((item) => item.id === groupId);
            if (!group) return null;
            const done = dayState.adhkar.includes(groupId);
            return (
              <motion.button
                key={groupId}
                type="button"
                onClick={() => onOpenAdhkar(groupId)}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="glass-tile flex items-center gap-3 rounded-2xl p-4 text-right transition-all hover:bg-white/85"
              >
                <span
                  className={`flex size-11 shrink-0 items-center justify-center rounded-2xl text-sm font-bold ${
                    done ? "bg-emerald-500 text-white" : "bg-primary/12 text-primary"
                  }`}
                >
                  {done ? "✓" : arabicNumber(index + 1)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">{GROUP_TITLE[groupId]}</span>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">
                    {GROUP_SUBTITLE[groupId]} • {arabicNumber(group.items.length)} ذكرًا
                  </span>
                </span>
              </motion.button>
            );
          })}
        </div>
      </GlassCard>

      {/* ٥ — فتراتك القادمة من خطّتك */}
      <GlassCard strong className="p-5 sm:p-6">
        <StepTitle
          step={4}
          title="فتراتك القادمة"
          hint="من خطّتك المبنية على إجاباتك"
          icon={<CalendarClock className="size-4 text-primary" />}
          action={<GlassPill onClick={() => onOpenSection("plan")}>كل الخطّة</GlassPill>}
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {nextBlocks.map((block, index) => {
            const Icon = BLOCK_ICON[block.kind];
            return (
              <motion.div
                key={block.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.3 }}
                className="glass-tile rounded-2xl p-4"
              >
                <div className="flex items-center gap-2.5">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold">{block.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {formatArabicTime(block.time, false)}
                    </p>
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                  {block.detail}
                </p>
              </motion.div>
            );
          })}
          {nextBlocks.length === 0 ? (
            <p className="text-[13px] text-muted-foreground sm:col-span-3">
              لا فترات بعد — أكمل الأسئلة لنبني خطّتك.
            </p>
          ) : null}
        </div>
        <div className="mt-4 flex justify-center">
          <GlassPill onClick={() => onOpenSection("settings")}>
            التذكيرات والموقع والعمل دون إنترنت
          </GlassPill>
        </div>
      </GlassCard>
    </div>
  );
}

