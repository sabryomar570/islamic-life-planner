import { Meter, Panel, SectionHead, StatusDot, Sunken } from "@/components/app/Surfaces";
import { PRAYERS } from "@/lib/prayers";
import { arabicNumber, dateKey, weekdayShort } from "@/lib/time";
import { cn } from "@/lib/utils";

/**
 * PHASE 2 — الإحصاءات.
 *
 * مقياس أول واحد، ثم ثانويات تشرحه، ثم تاريخ بصري. لا اثنتا عشرة بطاقة.
 * الأرقام كلها من سجل المستخدم نفسه؛ لا نسبة بلا denominator.
 */

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

function toneFor(status: string | undefined) {
  if (status === "jamaah" || status === "ontime") return "success";
  if (status === "late") return "attention";
  if (status === "missed") return "missed";
  return "idle";
}

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
    <div className="stack">
      {/* ——— المقياس الأول ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="متابعتي"
          title="نسبة الصلاة في وقتها"
          hint={`محسوبة من آخر ${arabicNumber(stats.days)} يومًا في سجلّك — لا تقدير ولا افتراض.`}
        />
        <div className="mt-4 flex flex-wrap items-end gap-x-6 gap-y-2">
          <p className="text-4xl font-bold text-primary tabular-nums">
            {arabicNumber(stats.prayerRate)}٪
          </p>
          <p className="label-body pb-1 text-muted-foreground">
            {arabicNumber(stats.jamaah)} في جماعة · {arabicNumber(stats.ontime)} في الوقت
          </p>
        </div>
        <Meter className="mt-3" value={stats.prayerRate} tone="success" label="نسبة الصلاة في وقتها" />
        <p className="label-meta mt-2 text-muted-foreground">
          متأخرة {arabicNumber(stats.late)} · فائتة {arabicNumber(stats.missed)}
        </p>
      </Panel>

      {/* ——— ثانويات: تشرح الأول ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead title="ما الذي يفسّر الرقم" />
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Sunken className="px-3.5 py-3">
            <dt className="label-meta text-muted-foreground">أيام متصلة</dt>
            <dd className="mt-0.5 text-[15px] font-bold text-foreground">
              {arabicNumber(stats.streak)}
            </dd>
            <dd className="label-meta text-muted-foreground">
              أطول سلسلة {arabicNumber(stats.longestRun)}
            </dd>
          </Sunken>
          <Sunken className="px-3.5 py-3">
            <dt className="label-meta text-muted-foreground">أيام فيها أذكار</dt>
            <dd className="mt-0.5 text-[15px] font-bold text-foreground">
              {arabicNumber(stats.adhkarRate)}٪
            </dd>
          </Sunken>
          <Sunken className="col-span-2 px-3.5 py-3 sm:col-span-1">
            <dt className="label-meta text-muted-foreground">أقوى وأضعف</dt>
            <dd className="mt-0.5 text-[13px] font-semibold">
              {prayerName(stats.best)} · {prayerName(stats.weakest)}
            </dd>
          </Sunken>
        </dl>
        {stats.weakest ? (
          <p className="label-body mt-4 text-muted-foreground">
            ابدأ بأضعف صلاة: نبّهها في وقتها أسبوعًا كاملًا قبل أن تقيس أي شيء آخر.
          </p>
        ) : null}
      </Panel>

      {/* ——— تاريخ بصري ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          title="آخر ١٤ يومًا"
          hint="ارتفاع العمود = عدد الصلوات المكتملة من ٥ في ذلك اليوم."
        />
        <ul className="mt-5 flex items-end gap-1.5">
          {last14.map((day) => (
            <li key={day.date} className="flex flex-1 flex-col items-center gap-1.5">
              <span className="label-meta text-muted-foreground tabular-nums">
                {arabicNumber(day.done)}
              </span>
              <div
                className={cn(
                  "w-full rounded-t-lg transition-[height] duration-300",
                  day.done === 5
                    ? "bg-[var(--status-success)]"
                    : day.done >= 3
                      ? "bg-[var(--status-neutral)]"
                      : day.done >= 1
                        ? "bg-[var(--status-attention)]"
                        : "bg-[var(--status-missed)]",
                )}
                style={{ height: `${Math.max((day.done / maxDone) * 64, 6)}px` }}
                title={`${day.date}: ${day.done} صلوات · ${day.adhkar} أذكار`}
              />
              <span className="label-meta text-muted-foreground">{day.date.slice(8)}</span>
            </li>
          ))}
        </ul>
      </Panel>

      {/* ——— خريطة الصلاة ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          title="جدول الصلوات"
          hint="كل نقطة صلاة في آخر سبعة أيام — أخضر أديتها، رمادي لم تُسجّل."
        />
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[32rem] text-right">
            <caption className="sr-only">حالة كل صلاة في آخر سبعة أيام مع نسبة الأداء</caption>
            <thead>
              <tr className="border-b border-[var(--rule)] label-meta text-muted-foreground">
                <th scope="col" className="pb-2 pe-2 font-medium">الصلاة</th>
                {Array.from({ length: 7 }, (_, index) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - index));
                  return (
                    <th key={index} scope="col" className="pb-2 text-center font-medium">
                      {weekdayShort(date)}
                    </th>
                  );
                })}
                <th scope="col" className="pb-2 text-center font-medium">النسبة</th>
              </tr>
            </thead>
            <tbody>
              {PRAYERS.map((prayer) => {
                const perPrayer = stats.perPrayer.find((item) => item.key === prayer.key);
                const total = (perPrayer?.done ?? 0) + (perPrayer?.missed ?? 0);
                const rate = total === 0 ? 0 : Math.round(((perPrayer?.done ?? 0) / total) * 100);
                return (
                  <tr key={prayer.key} className="border-b border-[var(--rule)] last:border-b-0">
                    <th scope="row" className="py-2.5 pe-2 text-[12.5px] font-semibold">
                      {prayer.name}
                    </th>
                    {Array.from({ length: 7 }, (_, index) => {
                      const date = new Date();
                      date.setDate(date.getDate() - (6 - index));
                      const status = history?.prayers[dateKey(date)]?.[prayer.key];
                      return (
                        <td key={index} className="py-2.5 text-center">
                          <span
                            className="inline-flex items-center justify-center"
                            title={`${prayer.name}: ${status ?? "غير مسجّلة"}`}
                          >
                            <StatusDot state={toneFor(status)} />
                          </span>
                          <span className="sr-only">
                            {prayer.name} {status ?? "غير مسجّلة"}
                          </span>
                        </td>
                      );
                    })}
                    <td className="py-2.5 text-center text-[12.5px] font-semibold text-primary">
                      {total === 0 ? "—" : `${arabicNumber(rate)}٪`}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
