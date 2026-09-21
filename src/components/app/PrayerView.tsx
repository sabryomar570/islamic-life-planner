import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import type { ProfileAnswers } from "@/data/questions";
import { ADHKAR_GROUPS } from "@/data/adhkar";
import { PRAYERS, type PrayerStatus, type Timings } from "@/lib/prayers";
import {
  arabicNumber,
  dateKey,
  formatArabicTime,
  weekdayShort,
} from "@/lib/time";
import { Bell, Clock, Flame, MapPin, RefreshCw, Target, TrendingUp } from "lucide-react";

export type PrayerStats = {
  days: number;
  jamaah: number;
  ontime: number;
  late: number;
  missed: number;
  prayerRate: number;
  adhkarRate: number;
  streak: number;
  best: string | null;
  weakest: string | null;
  perPrayer: { key: string; done: number; missed: number }[];
};

const STATUS_TONE: Record<string, string> = {
  jamaah: "bg-emerald-500",
  ontime: "bg-sky-500",
  late: "bg-amber-500",
  missed: "bg-rose-500",
};

const STATUS_OPTIONS: { value: PrayerStatus; label: string }[] = [
  { value: "jamaah", label: "جماعة" },
  { value: "ontime", label: "في الوقت" },
  { value: "late", label: "متأخرة" },
  { value: "missed", label: "فائتة" },
];

function isDoneDay(day: Record<string, string> | undefined) {
  if (!day) return false;
  return PRAYERS.every((prayer) => day[prayer.key] === "jamaah" || day[prayer.key] === "ontime");
}

export function PrayerView({
  timings,
  city,
  usingFallback,
  onRefreshTimes,
  dayState,
  onPrayerStatus,
  profile,
  permission,
  onRequestPermission,
  history,
  stats,
}: {
  timings: Timings;
  city: string;
  usingFallback: boolean;
  onRefreshTimes: () => void;
  dayState: { prayers: Record<string, string>; adhkar: string[] };
  onPrayerStatus: (prayer: string, status: PrayerStatus) => void;
  profile: ProfileAnswers;
  permission: NotificationPermission | "unsupported";
  onRequestPermission: () => void;
  history?: { prayers: Record<string, Record<string, string>>; adhkar: Record<string, string[]> };
  stats?: PrayerStats;
}) {
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    const key = dateKey(days[index]);
    if (isDoneDay(history?.prayers[key])) streak += 1;
    else break;
  }

  const focusPrayer = PRAYERS.find((prayer) => prayer.key === profile.mostMissedPrayer);
  const prayerName = (key: string | null) =>
    PRAYERS.find((prayer) => prayer.key === key)?.name ?? "—";

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="glass-tile inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] text-foreground/70">
              <MapPin className="size-3.5" />
              {city}
              {usingFallback ? " • مواقيت تقريبية (تعذّر الاتصال)" : " • بحسب الطريقة المختارة في الإعدادات"}
            </span>
            <h1 className="mt-3 text-2xl font-bold tracking-tight">
              مواقيت اليوم وتذكيرات الصلاة
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
              سجّل حالة كل صلاة لتعرف أثرك، وسيصلك إشعار عند دخول الوقت إن سمحت به.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
            <Button type="button" variant="outline" className="rounded-full" onClick={onRefreshTimes}>
              <RefreshCw className="size-4" />
              تحديث المواقيت
            </Button>
            {permission !== "granted" ? (
              <Button type="button" className="rounded-full" onClick={onRequestPermission}>
                <Bell className="size-4" />
                فعّل التذكير
              </Button>
            ) : (
              <Badge className="rounded-full bg-emerald-500/90 text-white">
                تذكير الصلاة مفعّل
              </Badge>
            )}
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Flame className="size-4 text-orange-500" /> استمرارية الالتزام
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {arabicNumber(streak)} يوم
            </p>
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="size-4 text-sky-500" /> صلوات اليوم
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {arabicNumber(Object.keys(dayState.prayers).length)} / ٥
            </p>
          </div>
          <div className="glass-tile rounded-2xl p-4 sm:col-span-2">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Target className="size-4 text-indigo-500" /> صلاتك الأكثر تفويتًا
            </p>
            <p className="mt-1 text-sm font-semibold">
              {focusPrayer ? `${focusPrayer.name} — ${focusPrayer.hint}` : "لا تفوتك صلاة، الحمد لله"}
            </p>
            {focusPrayer ? (
              <p className="mt-1 text-[11px] text-muted-foreground">
                موعدها اليوم {formatArabicTime(timings[focusPrayer.key])} • ضع منبّهًا قبلها
                بـ ١٥ دقيقة.
              </p>
            ) : null}
          </div>
        </div>
      </GlassCard>

      {stats && stats.days > 0 ? (
        <GlassCard className="p-6">
          <SectionTitle
            icon={<TrendingUp className="size-5" />}
            title={`أثرك في ${arabicNumber(stats.days)} يومًا`}
            hint="محسوب من سجلّك الفعلي: جماعة، في الوقت، متأخرة، فائتة"
          />
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] text-muted-foreground">نسبة الصلاة في وقتها</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {arabicNumber(stats.prayerRate)}٪
              </p>
              <Progress value={stats.prayerRate} className="mt-2 h-1.5 bg-white/60" />
            </div>
            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] text-muted-foreground">أيام فيها أذكار</p>
              <p className="mt-1 text-2xl font-bold text-primary">
                {arabicNumber(stats.adhkarRate)}٪
              </p>
              <Progress value={stats.adhkarRate} className="mt-2 h-1.5 bg-white/60" />
            </div>
            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] text-muted-foreground">في جماعة</p>
              <p className="mt-1 text-2xl font-bold text-emerald-600">
                {arabicNumber(stats.jamaah)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                فائتة: {arabicNumber(stats.missed)} • متأخرة: {arabicNumber(stats.late)}
              </p>
            </div>
            <div className="glass-tile rounded-2xl p-4">
              <p className="text-[11px] text-muted-foreground">أقوى وأضعف صلاة</p>
              <p className="mt-1 text-sm font-semibold">
                {prayerName(stats.best)} ثم {prayerName(stats.weakest)}
              </p>
              <p className="mt-1 text-[10px] text-muted-foreground">
                ابدأ بأضعف صلاة: نبّهها في وقتها أسبوعًا كاملًا.
              </p>
            </div>
          </div>
        </GlassCard>
      ) : null}

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Clock className="size-5" />}
          title="صلوات اليوم"
          hint="سجّل جماعة أو في الوقت لتحسب لك الاستمرارية"
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
                    <p className="text-sm font-semibold">
                      {prayer.name}
                      <span className="mr-2 text-xs font-normal text-muted-foreground">
                        {formatArabicTime(timings[prayer.key])}
                      </span>
                    </p>
                    <p className="text-[11px] text-muted-foreground">{prayer.hint}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {STATUS_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => onPrayerStatus(prayer.key, option.value)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-medium transition-all ${
                        status === option.value
                          ? `${STATUS_TONE[option.value]} text-white`
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

        <div className="mt-6 border-t border-white/60 pt-5">
          <p className="text-xs font-semibold">سجل الأسبوع</p>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {days.map((day) => {
              const key = dateKey(day);
              const dayLogs = history?.prayers[key];
              const isToday = key === dateKey(new Date());
              return (
                <div
                  key={key}
                  className={`rounded-2xl p-2 text-center ${
                    isToday ? "bg-primary/12 ring-1 ring-primary/30" : "glass-tile"
                  }`}
                >
                  <p className="text-[10px] text-muted-foreground">{weekdayShort(day)}</p>
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-1">
                    {PRAYERS.map((prayer) => {
                      const status = dayLogs?.[prayer.key];
                      return (
                        <span
                          key={prayer.key}
                          title={`${prayer.name}: ${status ?? "غير مسجّلة"}`}
                          className={`size-2 rounded-full ${
                            status ? STATUS_TONE[status] : "bg-slate-300/70"
                          }`}
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </GlassCard>

      <GlassCard soft className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] leading-5 text-muted-foreground">
            الأذكار المنجزة اليوم: {arabicNumber(dayState.adhkar.length)} من{" "}
            {arabicNumber(ADHKAR_GROUPS.length)} — لا تنسَ أذكار الصباح عند استيقاظك وأذكار
            النوم قبل فراشك.
          </p>
          <GlassPill onClick={onRefreshTimes}>تحديث المواقيت</GlassPill>
        </div>
      </GlassCard>
    </div>
  );
}
