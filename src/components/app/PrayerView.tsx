import { prayerState } from "@/components/app/NextPrayerHero";
import {
  EmptyState,
  Meter,
  Panel,
  PrimaryButton,
  QuietButton,
  SectionHead,
  StatusDot,
  Sunken,
} from "@/components/app/Surfaces";
import { useNow } from "@/hooks/use-clock";
import type { ProfileAnswers } from "@/data/questions";
import { ADHKAR_GROUPS } from "@/data/adhkar";
import { PRAYERS, type PrayerStatus, type Timings } from "@/lib/prayers";
import { arabicNumber, dateKey, formatArabicTime, weekdayShort } from "@/lib/time";
import { cn } from "@/lib/utils";
import { Bell, Check, MapPin, RefreshCw } from "lucide-react";
import { lazy, Suspense } from "react";

// PHASE 3: كسول عمدا حتى لا تدخل قاعدة الأحاديث المسار الحرج.
// **بعد كل الاستيراد لا قبله:** تسمية ثابتة بين الاستيرادات تعمل في
// البناء، وتترنّح في خادم التطوير حين لا يُرفع ترتيب التنفيذ كما هو.
const InsightSlot = lazy(() =>
  import("@/components/app/InsightSlot").then((module) => ({ default: module.InsightSlot })),
);

/**
 * PHASE 2B — الصلاة كإيقاع اليوم.
 *
 * إيقاع الصلوات الخمس هو البنية، والإحصاءات تفصيل تحت لا شبكة بطاقات موازية.
 * لكل صلاة حالتها الحقيقية: أديتها، متأخرة، فائتة، أو لم تبدأ.
 */

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

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
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
  onOpenAdhkar,
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
  stats?: {
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
  onOpenAdhkar?: () => void;
}) {
  const now = useNow(30_000);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    return date;
  });

  let streak = 0;
  for (let index = days.length - 1; index >= 0; index -= 1) {
    if (isDoneDay(history?.prayers[dateKey(days[index])])) streak += 1;
    else break;
  }

  const prayerName = (key: string | null) =>
    PRAYERS.find((prayer) => prayer.key === key)?.name ?? "—";
  const focusPrayer = PRAYERS.find((prayer) => prayer.key === profile.mostMissedPrayer);

  const loggedToday = PRAYERS.filter(
    (prayer) => dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  return (
    <div className="stack">
      {/* اقتباس عن الصلاة: واحد ثابت، لا يتبدل مع كل تحديث. */}
      <Suspense fallback={null}>
        <InsightSlot area="prayers" />
      </Suspense>

      {/* ——— ترويسة مختصرة: أين نحسب، وهل تصل التذكيرات ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="إيقاع اليوم"
          title="الصلاة"
          hint={`سجّل كل صلاة بصدق؛ السجلّ هو ما يجعل الاقتراحات بعده صادقة.`}
        />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <span className="flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {city}
              {usingFallback ? " · مواقيت تقريبية (تعذّر الاتصال)" : ""}
            </span>
          </span>
          <div className="flex shrink-0 items-center gap-2">
            <QuietButton onClick={onRefreshTimes} className="px-3" aria-label="تحديث المواقيت">
              <RefreshCw className="size-3.5" />
            </QuietButton>
            {permission !== "granted" ? (
              <PrimaryButton onClick={onRequestPermission} className="h-9 px-4 text-[12px]">
                <Bell className="size-3.5" />
                فعّل التذكير
              </PrimaryButton>
            ) : (
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-[var(--status-success)]">
                <Check className="size-3.5" />
                التذكير مفعّل
              </span>
            )}
          </div>
        </div>
      </Panel>

      {/* ——— الإيقاع: خمس صلوات، كل واحدة سطر لا بطاقة ——— */}
      <Panel className="overflow-hidden">
        <div className="p-5 sm:p-6">
          <SectionHead
            title="صلوات اليوم"
            hint={`أديت ${arabicNumber(loggedToday)} من ${arabicNumber(PRAYERS.length)}`}
          />
        </div>
        <ol className="rule-t px-5 pb-2 sm:px-6">
          {PRAYERS.map((prayer) => {
            const status = dayState.prayers[prayer.key] as PrayerStatus | undefined;
            const state = prayerState(prayer.key, status, toMinutes(timings[prayer.key]), nowMinutes);
            const isNow =
              toMinutes(timings[prayer.key]) <= nowMinutes &&
              toMinutes(timings[prayer.key]) > nowMinutes - 180;
            return (
              <li key={prayer.key} className="border-b border-[var(--rule)] last:border-b-0">
                <div className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                  <div className="flex min-w-0 items-center gap-3">
                    <StatusDot
                      state={
                        state === "done"
                          ? "success"
                          : state === "late"
                            ? "attention"
                            : state === "missed"
                              ? "missed"
                              : "idle"
                      }
                    />
                    <div className="min-w-0">
                      <p className={cn("text-[14px] font-bold", isNow && "text-primary")}>
                        {prayer.name}
                        {isNow ? <span className="label-meta me-2 font-normal">الآن</span> : null}
                      </p>
                      <p className="label-meta text-muted-foreground">
                        {formatArabicTime(timings[prayer.key])} · {prayer.hint}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    {STATUS_OPTIONS.map((option) => {
                      const active = status === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onPrayerStatus(prayer.key, option.value)}
                          aria-pressed={active}
                          className={cn(
                            "motion-press min-h-9 rounded-full px-3 text-[11px] font-medium",
                            active
                              ? option.value === "jamaah" || option.value === "ontime"
                                ? "bg-[var(--status-success)] text-white"
                                : option.value === "late"
                                  ? "bg-[var(--status-attention)] text-white"
                                  : "bg-[var(--status-missed)] text-white"
                              : "surface-secondary text-foreground/70 hover:bg-white/80",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </Panel>

      {/* ——— استمراريتك: المقياس الأول، ثم ما يشرحه ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="استمراريتك"
          title={`${arabicNumber(streak)} يوم متصل`}
          hint="اليوم يُحتسب كاملًا فقط إذا أديت الصلوات الخمس في وقتها أو في جماعة."
        />

        {stats && stats.days > 0 ? (
          <>
            <div className="mt-4">
              <div className="mb-1.5 flex items-baseline justify-between gap-2">
                <p className="label-meta text-muted-foreground">الصلاة في وقتها</p>
                <p className="text-[15px] font-bold text-foreground">
                  {arabicNumber(stats.prayerRate)}٪
                </p>
              </div>
              <Meter value={stats.prayerRate} tone="success" label="نسبة الصلاة في وقتها" />
            </div>

            <dl className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Sunken className="px-3.5 py-3">
                <dt className="label-meta text-muted-foreground">في جماعة</dt>
                <dd className="mt-0.5 text-[15px] font-bold text-[var(--status-success)]">
                  {arabicNumber(stats.jamaah)}
                </dd>
              </Sunken>
              <Sunken className="px-3.5 py-3">
                <dt className="label-meta text-muted-foreground">متأخرة</dt>
                <dd className="mt-0.5 text-[15px] font-bold text-[var(--status-attention)]">
                  {arabicNumber(stats.late)}
                </dd>
              </Sunken>
              <Sunken className="px-3.5 py-3">
                <dt className="label-meta text-muted-foreground">فائتة</dt>
                <dd className="mt-0.5 text-[15px] font-bold text-[var(--status-missed)]">
                  {arabicNumber(stats.missed)}
                </dd>
              </Sunken>
              <Sunken className="px-3.5 py-3">
                <dt className="label-meta text-muted-foreground">أيام فيها أذكار</dt>
                <dd className="mt-0.5 text-[15px] font-bold text-foreground">
                  {arabicNumber(stats.adhkarRate)}٪
                </dd>
              </Sunken>
            </dl>

            <p className="label-body mt-4 text-muted-foreground">
              {stats.weakest
                ? `أضعف صلواتك ${prayerName(stats.weakest)}. نبّهها في وقتها أسبوعًا كاملًا قبل أي شيء آخر.`
                : "لا تظهر صلاة متعثرة بعد."}
            </p>
          </>
        ) : (
          <EmptyState
            title="لا يوجد سجلّ كافٍ بعد"
            body="سجّل يومين على الأقل ليظهر أثر كل صلاة في سلسلتك."
          />
        )}
      </Panel>

      {/* ——— سجل الأسبوع: قراءة بصرية لا جدول ——— */}
      <Panel className="p-5 sm:p-6">
        <SectionHead title="سجل الأسبوع" hint="كل نقطة صلاة؛ أخضر أديتها، رمادي لم تُسجّل." />
        <div className="mt-4 grid grid-cols-7 gap-1.5">
          {days.map((day) => {
            const key = dateKey(day);
            const dayLogs = history?.prayers[key];
            const isToday = key === dateKey(new Date());
            return (
              <div key={key} className="min-w-0 text-center">
                <p className="label-meta text-muted-foreground">{weekdayShort(day)}</p>
                <ul
                  className={cn(
                    "mt-1.5 flex flex-col items-center gap-1 rounded-xl py-2",
                    isToday ? "bg-primary/10 ring-1 ring-primary/25" : "",
                  )}
                  aria-label={`صلوات ${weekdayShort(day)}`}
                >
                  {PRAYERS.map((prayer) => {
                    const status = dayLogs?.[prayer.key];
                    return (
                      <li
                        key={prayer.key}
                        title={`${prayer.name}: ${status ?? "غير مسجّلة"}`}
                        className={cn(
                          "size-1.5 rounded-full",
                          status === "jamaah" || status === "ontime"
                            ? "bg-[var(--status-success)]"
                            : status === "late"
                              ? "bg-[var(--status-attention)]"
                              : status === "missed"
                                ? "bg-[var(--status-missed)]"
                                : "bg-[var(--status-idle)]",
                        )}
                      />
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </Panel>

      {/* ——— الصلة بالأذكار: سطر لا لوحة ——— */}
      {focusPrayer ? (
        <Sunken className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <p className="label-meta min-w-0 flex-1 text-muted-foreground">
            صلاتك الأكثر تفويتًا: {focusPrayer.name} — موعدها اليوم {formatArabicTime(timings[focusPrayer.key])}.
          </p>
          {onOpenAdhkar ? (
            <QuietButton onClick={onOpenAdhkar} className="h-9 px-4">
              أذكار
            </QuietButton>
          ) : null}
        </Sunken>
      ) : (
        <Sunken className="px-4 py-3">
          <p className="label-meta text-muted-foreground">
            أتممت اليوم {arabicNumber(dayState.adhkar.length)} من {arabicNumber(ADHKAR_GROUPS.length)} أذكار.
          </p>
        </Sunken>
      )}
    </div>
  );
}
