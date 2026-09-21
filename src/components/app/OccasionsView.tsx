import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  OCCASIONS,
  WEEKLY_OCCASIONS,
  todayOccasions,
  upcomingOccasions,
  type Occasion,
} from "@/data/occasions";
import {
  hijriLabel,
  hijriProgressLabel,
  hijriParts,
  isLastTenNights,
  isRamadan,
  ramadanDay,
  toArabicDigits,
} from "@/lib/hijri";
import type { Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime, formatDuration, toMinutes } from "@/lib/time";
import {
  CalendarHeart,
  Check,
  Clock,
  Droplets,
  Info,
  Moon,
  MoonStar,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

function useMinuteClock() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function minutesUntil(time: string, now: Date) {
  const target = toMinutes(time);
  const current = now.getHours() * 60 + now.getMinutes();
  return target - current;
}

function OccasionCard({ occasion, daysAway, dateLabel }: {
  occasion: Occasion;
  daysAway?: number;
  dateLabel?: string;
}) {
  return (
    <GlassCard hover className="flex h-full flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold">{occasion.title}</h3>
          <p className="mt-1 text-[11px] text-muted-foreground">{occasion.when}</p>
        </div>
        <Badge variant="secondary" className="rounded-full text-[10px]">
          {occasion.kind}
        </Badge>
      </div>

      {daysAway !== undefined ? (
        <p className="mt-3 text-xs font-semibold text-primary">
          {daysAway === 0
            ? "اليوم"
            : daysAway === 1
              ? "غدًا"
              : `بعد ${arabicNumber(daysAway)} يومًا`}
          {dateLabel ? ` • ${dateLabel}` : ""}
        </p>
      ) : null}

      <ul className="mt-3 space-y-1.5">
        {occasion.deeds.map((deed) => (
          <li key={deed} className="flex items-start gap-2 text-[11px] leading-5 text-foreground/75">
            <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
            {deed}
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-white/60 pt-3 text-[10px] leading-5 text-muted-foreground">
        <p>{occasion.evidence}</p>
        {occasion.caveat ? (
          <p className="mt-1.5 flex items-start gap-1.5 text-amber-700/90">
            <Info className="mt-0.5 size-3 shrink-0" />
            {occasion.caveat}
          </p>
        ) : null}
      </div>
    </GlassCard>
  );
}

export function OccasionsView({ timings }: { timings: Timings }) {
  const now = useMinuteClock();
  const parts = useMemo(() => hijriParts(now), [now]);
  const today = useMemo(() => todayOccasions(now), [now]);
  const upcoming = useMemo(() => upcomingOccasions(now, 8), [now]);
  const ramadan = isRamadan(now);
  const ramadanToday = ramadanDay(now);

  const suhoorIn = minutesUntil(timings.fajr, now);
  const iftarIn = minutesUntil(timings.maghrib, now);
  const lastTenProgress = isLastTenNights(now) ? ((parts.day - 20) / 10) * 100 : 0;

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<CalendarHeart className="size-5" />}
          title="المناسبات الدينية والصيام"
          hint={`${hijriLabel(now)} • ${hijriProgressLabel(now)}`}
          action={
            <GlassPill onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
              اليوم
            </GlassPill>
          }
        />

        {today.length > 0 ? (
          <div className="mt-5 space-y-2">
            {today.map((occasion) => (
              <div key={occasion.id} className="glass-tile rounded-2xl p-4">
                <p className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="size-4 text-primary" />
                  {occasion.title}
                  <span className="text-[11px] font-normal text-muted-foreground">
                    {occasion.when}
                  </span>
                </p>
                <p className="mt-2 text-[12px] leading-6 text-foreground/75">
                  {occasion.deeds.join(" • ")}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-[12px] leading-6 text-muted-foreground">
            لا مناسبة خاصة اليوم — وهذا أيضًا نعمة. أفضل عمل في الأيام العادية: صلاة في
            وقتها، ورد ثابت، وذكر لا ينقطع.
          </p>
        )}
      </GlassCard>

      {ramadan ? (
        <GlassCard strong className="p-6">
          <SectionTitle
            icon={<MoonStar className="size-5" />}
            title={`رمضان — اليوم ${arabicNumber(ramadanToday ?? 0)}`}
            hint="عدّاد السحور والإفطار بمواقيت مدينتك، ودعاء الإفطار، ومتابعة العشر الأواخر"
          />

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Moon className="size-4 text-indigo-500" /> السحور ينتهي عند الفجر
              </p>
              <p className="mt-1 text-lg font-bold text-primary">
                {formatArabicTime(timings.fajr)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {suhoorIn > 0
                  ? `باقٍ ${formatDuration(suhoorIn)}`
                  : "انتهى وقت السحور لهذا اليوم"}
              </p>
            </div>
            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Utensils className="size-4 text-orange-500" /> الإفطار عند المغرب
              </p>
              <p className="mt-1 text-lg font-bold text-primary">
                {formatArabicTime(timings.maghrib)}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {iftarIn > 0 ? `باقٍ ${formatDuration(iftarIn)}` : "حان وقت الإفطار"}
              </p>
            </div>
            <div className="glass-tile rounded-2xl p-4 sm:col-span-2">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Clock className="size-4 text-sky-500" /> التراويح
              </p>
              <p className="mt-1 text-sm font-semibold">
                بعد صلاة العشاء — صلِّ مع الإمام حتى ينصرف ليُكتب لك قيام ليلة.
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                العشاء اليوم {formatArabicTime(timings.isha)}
              </p>
            </div>
          </div>

          <div className="mt-5 glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <Droplets className="size-4 text-sky-500" />
              دعاء الإفطار
            </p>
            <p className="quran-text mt-2 text-[1.05rem] leading-9">
              ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              رواه أبو داود عن ابن عمر رضي الله عنهما — ويُستحب الدعاء قبل الفطر.
            </p>
          </div>

          {isLastTenNights(now) ? (
            <div className="mt-5 rounded-2xl bg-primary/10 p-4 ring-1 ring-primary/25">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="size-4 text-primary" />
                أنت في العشر الأواخر — تحرَّ ليلة القدر
              </p>
              <Progress value={lastTenProgress} className="mt-3 h-2 bg-white/60" />
              <p className="mt-2 text-[11px] leading-6 text-foreground/75">
                الليلة الثامنة عشرة فما بعدها: قُم ولو بعشر دقائق، وقل: «اللهم إنك عفو تحب
                العفو فاعف عني». الليالي الوترية أرجى: ٢١، ٢٣، ٢٥، ٢٧، ٢٩.
              </p>
            </div>
          ) : null}
        </GlassCard>
      ) : (
        <GlassCard className="p-6">
          <SectionTitle
            icon={<MoonStar className="size-5" />}
            title="استعداد لرمضان"
            hint="لا يبدأ الاستعداد في أول ليلة؛ يبدأ قبلها"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Sun className="size-4 text-amber-500" /> صيام تطوّع
              </p>
              <p className="mt-1 text-sm font-semibold">
                الاثنين والخميس، والأيام البيض (١٣–١٥)، وعاشوراء.
              </p>
            </div>
            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Sparkles className="size-4 text-primary" /> ورد أسرع
              </p>
              <p className="mt-1 text-sm font-semibold">
                زد صفحة كل أسبوع حتى تصل إلى جزء يوميًا.
              </p>
            </div>
            <div className="glass-tile rounded-2xl p-4">
              <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
                <Moon className="size-4 text-indigo-500" /> تعويد القيام
              </p>
              <p className="mt-1 text-sm font-semibold">
                ابدأ بركعتين قبل الفجر كل ليلة حتى يصبح القيام عادة.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-6">
        <SectionTitle
          icon={<CalendarHeart className="size-5" />}
          title="المناسبات القادمة"
          hint="العدّ محسوب على تقويم أم القرى مع التاريخ الميلادي، وأثبت الصيام برؤية الهلال"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {upcoming.map((occasion) => (
            <OccasionCard
              key={occasion.id}
              occasion={occasion}
              daysAway={occasion.daysAway}
              dateLabel={occasion.date.toLocaleDateString("ar-EG", {
                day: "numeric",
                month: "long",
              })}
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Sparkles className="size-5" />}
          title="كل أسبوع"
          hint="مواعيد تتكرر كل جمعة، وفرصتان للصيام في الأسبوع"
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {WEEKLY_OCCASIONS.map((occasion) => (
            <OccasionCard key={occasion.id} occasion={occasion} />
          ))}
        </div>
      </GlassCard>

      <GlassCard soft className="p-5">
        <p className="flex items-start gap-2 text-[11px] leading-6 text-muted-foreground">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          التواريخ الهجرية تقديرية تُحسب آليًا ({toArabicDigits(parts.year)} هـ)، وقد
          تختلف يومًا عن التقويم الرسمي في بلدك؛ الاعتماد النهائي على إعلان الجهة الشرعية
          ورؤية الهلال. المذكور من الأحاديث أُشير لمصدره على كل مناسبة.
        </p>
      </GlassCard>
    </div>
  );
}
