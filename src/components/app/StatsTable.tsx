import { GlassCard, SectionTitle } from "@/components/app/GlassCard";
import { Progress } from "@/components/ui/progress";
import { PRAYERS } from "@/lib/prayers";
import { arabicNumber, dateKey, weekdayShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Activity, CalendarDays, Flame, TrendingUp } from "lucide-react";

export type DetailedStats = {
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
  daily: { date: string; done: number; logged: number; adhkar: number }[];
  bestWeekStart: string | null;
  longestRun: number;
};

const STATUS_TONE: Record<string, string> = {
  jamaah: "bg-emerald-500",
  ontime: "bg-sky-500",
  late: "bg-amber-500",
  missed: "bg-rose-500",
};

/** جدول إحصاءات حقيقي مبني بالكامل على سجل المستخدم في قاعدة البيانات. */
export function StatsTable({
  stats,
  history,
}: {
  stats: DetailedStats;
  history?: { prayers: Record<string, Record<string, string>>; adhkar: Record<string, string[]> };
}) {
  const prayerName = (key: string | null) =>
    PRAYERS.find((prayer) => prayer.key === key)?.name ?? "—";

  const last14 = stats.daily.slice(-14);
  const maxDone = Math.max(...last14.map((day) => day.done), 1);

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<Activity className="size-5" />}
          title="إحصاءاتك — من سجلّك الحقيقي"
          hint={`آخر ${arabicNumber(stats.days)} يومًا في الصلوات والأذكار، محسوبة من ما سجّلته بنفسك`}
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <TrendingUp className="size-4 text-sky-500" /> نسبة الصلاة في وقتها
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {arabicNumber(stats.prayerRate)}٪
            </p>
            <Progress value={stats.prayerRate} className="mt-2 h-1.5 bg-white/60" />
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Flame className="size-4 text-orange-500" /> الاستمرارية الحالية
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {arabicNumber(stats.streak)} يوم
            </p>
            <p className="text-[10px] text-muted-foreground">
              أطول سلسلة: {arabicNumber(stats.longestRun)} يومًا
            </p>
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <CalendarDays className="size-4 text-emerald-500" /> أيام فيها أذكار
            </p>
            <p className="mt-1 text-2xl font-bold text-primary">
              {arabicNumber(stats.adhkarRate)}٪
            </p>
            <Progress value={stats.adhkarRate} className="mt-2 h-1.5 bg-white/60" />
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="text-[11px] text-muted-foreground">الجماعة والوقت</p>
            <p className="mt-1 text-lg font-bold text-emerald-600">
              {arabicNumber(stats.jamaah)} جماعة • {arabicNumber(stats.ontime)} وقت
            </p>
            <p className="text-[10px] text-muted-foreground">
              متأخرة {arabicNumber(stats.late)} • فائتة {arabicNumber(stats.missed)}
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Activity className="size-5" />}
          title="آخر ١٤ يومًا — يومًا بيوم"
          hint="عدد الصلوات المكتملة (من ٥) في كل يوم، مع الأذكار المنجزة"
        />

        <div className="mt-5 flex items-end gap-1.5" dir="rtl">
          {last14.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="text-[9px] text-muted-foreground">
                {arabicNumber(day.done)}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-lg transition-all",
                  day.done === 5
                    ? "bg-emerald-500/85"
                    : day.done >= 3
                      ? "bg-sky-500/80"
                      : day.done >= 1
                        ? "bg-amber-400/80"
                        : "bg-rose-400/70",
                )}
                style={{ height: `${Math.max((day.done / maxDone) * 64, 6)}px` }}
                title={`${day.date}: ${day.done} صلوات • ${day.adhkar} أذكار`}
              />
              <span className="text-[9px] text-muted-foreground">
                {day.date.slice(8)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<CalendarDays className="size-5" />}
          title="جدول الصلوات — الأسبوع الأخير"
          hint="حالة كل صلاة في كل يوم: جماعة، في الوقت، متأخرة، فائتة"
        />

        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[34rem] text-right text-xs">
            <thead>
              <tr className="border-b border-white/70 text-[10px] text-muted-foreground">
                <th className="pb-2 pr-2 font-medium">الصلاة</th>
                {Array.from({ length: 7 }, (_, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - index));
                  return (
                    <th key={index} className="pb-2 text-center font-medium">
                      {weekdayShort(date)}
                    </th>
                  );
                })}
                <th className="pb-2 text-center font-medium">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {PRAYERS.map((prayer) => {
                const perPrayer = stats.perPrayer.find(
                  (item) => item.key === prayer.key,
                );
                const total = (perPrayer?.done ?? 0) + (perPrayer?.missed ?? 0);
                const rate =
                  total === 0
                    ? 0
                    : Math.round(((perPrayer?.done ?? 0) / total) * 100);
                return (
                  <tr key={prayer.key} className="border-b border-white/40 last:border-0">
                    <td className="py-2.5 pr-2 font-semibold">{prayer.name}</td>
                    {Array.from({ length: 7 }, (_, index) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - index));
                      const key = dateKey(date);
                      const status = history?.prayers[key]?.[prayer.key];
                      return (
                        <td key={index} className="py-2.5 text-center">
                          <span
                            className={`inline-block size-2.5 rounded-full ${
                              status ? STATUS_TONE[status] : "bg-slate-300/70"
                            }`}
                            title={status ?? "غير مسجّلة"}
                          />
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-center font-semibold text-primary">
                      {total === 0 ? "—" : `${arabicNumber(rate)}٪`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="glass-tile rounded-2xl p-4">
            <p className="text-[11px] text-muted-foreground">أقوى صلاة لديك</p>
            <p className="mt-1 text-sm font-bold text-emerald-600">
              {prayerName(stats.best)}
            </p>
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="text-[11px] text-muted-foreground">التي تحتاج تركيزًا</p>
            <p className="mt-1 text-sm font-bold text-amber-600">
              {prayerName(stats.weakest)}
            </p>
          </div>
        </div>
      </GlassCard>
    </div>
  );
}
