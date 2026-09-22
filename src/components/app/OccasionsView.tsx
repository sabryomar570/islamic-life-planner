import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  WEEKLY_OCCASIONS,
  todayOccasions,
  upcomingOccasions,
  type Occasion,
} from "@/data/occasions";
import { useNow } from "@/hooks/use-clock";
import {
  hijriLabel,
  hijriParts,
  isLastTenNights,
  isRamadan,
  ramadanDay,
  toArabicDigits,
} from "@/lib/hijri";
import type { Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime, toMinutes } from "@/lib/time";
import { cn } from "@/lib/utils";
import {
  CalendarHeart,
  ChevronDown,
  Clock,
  Droplets,
  Hourglass,
  Info,
  Moon,
  MoonStar,
  Sparkles,
  Sun,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";

function pad(value: number) {
  return toArabicDigits(String(value).padStart(2, "0"));
}

/** عدّاد حيّ بالثواني حتى بداية المناسبة. */
function LiveCountdown({ target }: { target: Date }) {
  const now = useNow(1000);
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    <span className="tabular-nums">
      {days > 0 ? `${arabicNumber(days)} يوم · ` : ""}
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

/** عدّاد دقائق حتى وقتٍ في اليوم نفسه (السحور/الإفطار). */
function MinutesCountdown({ time }: { time: string }) {
  const now = useNow(1000);
  const target = new Date(now);
  const total = toMinutes(time);
  target.setHours(Math.floor(total / 60), total % 60, 0, 0);
  const left = Math.max(0, Math.round((target.getTime() - now.getTime()) / 1000));
  if (left <= 0) return <span>انتهى وقته</span>;
  const hours = Math.floor(left / 3600);
  const minutes = Math.floor((left % 3600) / 60);
  const seconds = left % 60;
  return (
    <span className="tabular-nums">
      {hours > 0 ? `${arabicNumber(hours)} س ` : ""}
      {pad(minutes)}:{pad(seconds)}
    </span>
  );
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

/** بطاقة مناسبة مضغوطة: عدّاد حيّ، والتفاصيل تُفتح عند الطلب. */
function OccasionCard({
  occasion,
  daysAway,
  target,
  accent = false,
}: {
  occasion: Occasion;
  daysAway?: number;
  target?: Date;
  accent?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const dateLabel = target
    ? target.toLocaleDateString("ar-EG", { day: "numeric", month: "long" })
    : undefined;

  return (
    <div
      className={cn(
        "tile-edge flex flex-col rounded-2xl p-3.5",
        accent && "ring-1 ring-primary/30",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="ruqaa text-[1.05rem] font-bold leading-relaxed">{occasion.title}</h3>
        <Badge variant="secondary" className="shrink-0 rounded-full text-[9px]">
          {occasion.kind}
        </Badge>
      </div>

      {daysAway === undefined ? (
        <p className="mt-1 text-[10px] text-muted-foreground">{occasion.when}</p>
      ) : (
        <div className="mt-2 flex items-center gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
            <Hourglass className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-primary">                {daysAway === 0
                  ? "اليوم"
                  : daysAway === 1
                    ? "غدًا"
                    : `بعد ${arabicNumber(daysAway)} يومًا`}
            </p>
            {target && daysAway > 0 ? <LiveCountdown target={target} /> : null}
            {dateLabel ? (
              <p className="text-[10px] text-muted-foreground">{dateLabel}</p>
            ) : null}
          </div>
        </div>
      )}

      <ul className="mt-2 space-y-1">
        {(open ? occasion.deeds : occasion.deeds.slice(0, 2)).map((deed) => (
          <li
            key={deed}
            className="flex items-start gap-1.5 text-[10.5px] leading-5 text-foreground/75"
          >
            <span className="mt-1.5 size-1 shrink-0 rounded-full bg-emerald-500" />
            {deed}
          </li>
        ))}
      </ul>

      {occasion.deeds.length > 2 ? (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="mt-1.5 flex items-center gap-1 self-start text-[10px] font-medium text-primary"
        >
          <ChevronDown className={cn("size-3 transition-transform", open && "rotate-180")} />
          {open ? "أقل" : `${arabicNumber(occasion.deeds.length - 2)} أعمال أخرى`}
        </button>
      ) : null}

      <div className="mt-2.5 border-t border-white/70 pt-2 text-[9.5px] leading-4 text-muted-foreground">
        <p>{occasion.evidence}</p>
        {occasion.caveat ? (
          <p className="mt-1 flex items-start gap-1 text-amber-700/90">
            <Info className="mt-px size-2.5 shrink-0" />
            {occasion.caveat}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export function OccasionsView({ timings }: { timings: Timings }) {
  const now = useNow(30_000);
  const parts = hijriParts(now);

  const today = useMemo(() => {
    try {
      return todayOccasions(now);
    } catch {
      return [];
    }
  }, [parts.year, parts.month, parts.day, now.getDay()]);

  const upcoming = useMemo(() => {
    try {
      return upcomingOccasions(new Date(), 6);
    } catch {
      return [];
    }
  }, [parts.year, parts.month, parts.day]);

  const ramadan = isRamadan(now);
  const ramadanToday = ramadanDay(now);
  const lastTenProgress = isLastTenNights(now) ? ((parts.day - 20) / 10) * 100 : 0;

  return (
    <div className="space-y-4">
      <GlassCard strong className="p-5">
        <SectionTitle
          icon={<CalendarHeart className="size-5" />}
          title="المناسبات والصيام"
          hint={hijriLabel(now)}
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {today.map((occasion) => (
            <OccasionCard key={occasion.id} occasion={occasion} daysAway={0} accent />
          ))}
          {today.length === 0 ? (
            <p className="col-span-2 rounded-2xl bg-white/60 p-3 text-[11px] leading-5 text-muted-foreground">
              لا مناسبة خاصة اليوم. أفضل عمل في الأيام العادية: صلاة في وقتها، ورد ثابت،
              وذكر لا ينقطع.
            </p>
          ) : null}
        </div>
      </GlassCard>

      {ramadan ? (
        <GlassCard strong className="p-5">
          <SectionTitle
            icon={<MoonStar className="size-5" />}
            title={`رمضان — اليوم ${arabicNumber(ramadanToday ?? 0)}`}
            hint="السحور والإفطار بمواقيت مدينتك"
          />
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <div className="tile-edge rounded-2xl p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Moon className="size-3.5 text-indigo-500" /> نهاية السحور
              </p>
              <p className="mt-1 text-base font-bold text-primary">{formatArabicTime(timings.fajr)}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-foreground/80">
                <MinutesCountdown time={timings.fajr} />
              </p>
            </div>
            <div className="tile-edge rounded-2xl p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Utensils className="size-3.5 text-orange-500" /> الإفطار
              </p>
              <p className="mt-1 text-base font-bold text-primary">
                {formatArabicTime(timings.maghrib)}
              </p>
              <p className="mt-0.5 text-[11px] font-semibold text-foreground/80">
                <MinutesCountdown time={timings.maghrib} />
              </p>
            </div>
            <div className="tile-edge col-span-2 rounded-2xl p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Clock className="size-3.5 text-sky-500" /> التراويح
              </p>
              <p className="mt-1 text-[11.5px] font-semibold leading-5">
                بعد العشاء ({formatArabicTime(timings.isha)}) — صلِّ مع الإمام حتى ينصرف
                لتُكتب لك قيام ليلة.
              </p>
            </div>
          </div>

          <div className="mt-3 tile-edge rounded-2xl p-3.5">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold">
              <Droplets className="size-3.5 text-sky-500" /> دعاء الإفطار
            </p>
            <p className="quran-text mt-1.5 text-[1rem] leading-8">
              ذَهَبَ الظَّمَأُ وَابْتَلَّتِ الْعُرُوقُ وَثَبَتَ الأَجْرُ إِنْ شَاءَ اللَّهُ
            </p>
            <p className="mt-1 text-[10px] text-muted-foreground">
              رواه أبو داود، عن ابن عمر رضي الله عنهما.
            </p>
          </div>

          {isLastTenNights(now) ? (
            <div className="mt-3 rounded-2xl bg-primary/10 p-3.5 ring-1 ring-primary/25">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold">
                <Sparkles className="size-3.5 text-primary" />
                العشر الأواخر — تحرَّ ليلة القدر
              </p>
              <Progress value={lastTenProgress} className="mt-2 h-1.5 bg-white/60" />
              <p className="mt-2 text-[10.5px] leading-5 text-foreground/75">
                الليالي الوترية أرجى: ٢١، ٢٣، ٢٥، ٢٧، ٢٩. وقل: «اللهم إنك عفو تحب العفو فاعف
                عني» — رواه الترمذي.
              </p>
            </div>
          ) : null}
        </GlassCard>
      ) : (
        <GlassCard className="p-5">
          <SectionTitle
            icon={<MoonStar className="size-5" />}
            title="استعداد لرمضان"
            hint="الاستعداد يبدأ قبل الشهر"
          />
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            <div className="tile-edge rounded-2xl p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Sun className="size-3.5 text-amber-500" /> صيام تطوّع
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-5">
                الاثنين والخميس، والأيام البيض (١٣–١٥).
              </p>
            </div>
            <div className="tile-edge rounded-2xl p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Sparkles className="size-3.5 text-primary" /> زيادة الورد
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-5">
                زد صفحة كل أسبوع حتى تصل إلى جزء يوميًا.
              </p>
            </div>
            <div className="tile-edge col-span-2 rounded-2xl p-3.5">
              <p className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <Moon className="size-3.5 text-indigo-500" /> تعويد القيام
              </p>
              <p className="mt-1 text-[11px] font-semibold leading-5">
                ركعتان قبل الفجر كل ليلة — كان ﷺ لا يدعها. رواه البخاري ومسلم.
              </p>
            </div>
          </div>
        </GlassCard>
      )}

      <GlassCard className="p-5">
        <SectionTitle
          icon={<CalendarHeart className="size-5" />}
          title="القادم بعدّاد"
          hint="العدّ على تقويم أم القرى، والاعتماد النهائي لرؤية الهلال"
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5 lg:grid-cols-3">
          {upcoming.map((occasion) => (
            <OccasionCard
              key={occasion.id}
              occasion={occasion}
              daysAway={occasion.daysAway}
              target={startOfDay(occasion.date)}
            />
          ))}
        </div>
      </GlassCard>

      <GlassCard className="p-5">
        <SectionTitle
          icon={<Sparkles className="size-5" />}
          title="كل أسبوع"
          hint="الجمعة، والاثنين والخميس"
        />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          {WEEKLY_OCCASIONS.map((occasion) => (
            <OccasionCard key={occasion.id} occasion={occasion} />
          ))}
        </div>
      </GlassCard>

      <GlossaryNote />

      <div className="flex justify-center">
        <GlassPill onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          أعلى الصفحة
        </GlassPill>
      </div>
    </div>
  );
}

function GlossaryNote() {
  return (
    <GlassCard soft className="p-4">
      <p className="flex items-start gap-2 text-[10.5px] leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        التواريخ الهجرية تُحسب آليًا بتقويم أم القرى، وقد تختلف يومًا عن التقويم المحلي في
        بلدك؛ والاعتماد النهائي على إعلان الجهة الشرعية ورؤية الهلال. وما لم يثبت فيه عمل
        مخصوص صُرّح به أسفل البطاقة.
      </p>
    </GlassCard>
  );
}

