import { Badge, HeroCard, ProgressBar, ActionButton, TextLink } from "@/components/oud/primitives";
import { useNow } from "@/hooks/use-clock";
import { toArabicDigits } from "@/lib/hijri";
import { PRAYERS, currentPrayer, nextPrayer, type PrayerKey, type PrayerStatus, type Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime } from "@/lib/time";
import { Moon, Sun } from "lucide-react";

/**
 * PHASE 2A — بطل الشاشة الأولى.
 *
 * يجيب في ثانية واحدة على سؤال واحد: ما الصلاة القادمة؟ ومتى؟ وكم بقي؟
 * يشغل ارتفاعًا ثابتًا تقريبًا حتى لا يزيح ما تحته ولا يبتلع الشاشة.
 */

function toMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function pad(value: number) {
  return toArabicDigits(String(value).padStart(2, "0"));
}

function LiveCountdown({ target }: { target: Date }) {
  const now = useNow(1000);
  const total = Math.max(0, Math.floor((target.getTime() - now.getTime()) / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return (
    <span className="tabular-nums">
      {pad(hours)}:{pad(minutes)}:{pad(seconds)}
    </span>
  );
}

/** حالة كل صلاة اليوم: مؤداة / متأخرة / فائتة / لم تبدأ بعد. */
export function prayerState(
  key: PrayerKey,
  status: string | undefined,
  prayerMinutes: number,
  nowMinutes: number,
): "done" | "late" | "missed" | "pending" {
  if (status === "jamaah" || status === "ontime") return "done";
  if (status === "late") return "late";
  if (status === "missed") return "missed";
  return prayerMinutes <= nowMinutes ? "missed" : "pending";
}

const STATE_LABEL: Record<string, string> = {
  done: "أديتها",
  late: "متأخرة",
  missed: "لم تُسجَّل",
  pending: "لم تبدأ بعد",
};

export function NextPrayerHero({
  timings,
  dayState,
  onOpenPrayers,
  onLogCurrent,
}: {
  timings: Timings;
  dayState: { prayers: Record<string, string> };
  onOpenPrayers: () => void;
  onLogCurrent: (prayer: PrayerKey, status: PrayerStatus) => void;
}) {
  const now = useNow(30_000);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  const next = nextPrayer(timings, now);
  const active = currentPrayer(timings, now);

  const nextMinutes = toMinutes(next.time);
  const nextIndex = PRAYERS.findIndex((prayer) => prayer.key === next.key);

  // نقطة البداية: الصلاة السابقة، أو منتصف الليل إن كانت القادمة فجرًا.
  const previous = nextIndex > 0 ? PRAYERS[nextIndex - 1] : null;
  const fromMinutes = previous ? toMinutes(timings[previous.key]) : 0;
  const span = Math.max(1, (nextMinutes + (previous ? 0 : 1440)) - fromMinutes);
  const elapsed = previous ? nowMinutes - fromMinutes : nowMinutes + 1440 - fromMinutes;
  const progress = Math.max(0, Math.min(100, (elapsed / span) * 100));
  const doneCount = PRAYERS.filter(
    (prayer) => dayState.prayers[prayer.key] === "jamaah" || dayState.prayers[prayer.key] === "ontime",
  ).length;

  // العدّاد التنازلي يحسب هدفه من الموعد مباشرة؛ تكلفة الحساب رمّيلة.
  const target = new Date(now);
  target.setHours(Math.floor(nextMinutes / 60), nextMinutes % 60, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);

  // إن دخلت الصلاة القادمة ولم تُسجَّل بعد، نعرض إجراءً مباشرًا بدل وصلة.
  const nextState = prayerState(next.key, dayState.prayers[next.key], nextMinutes, nowMinutes);
  const awaiting = nextState === "missed" && nextMinutes <= nowMinutes;

  return (
    <HeroCard className="overflow-hidden">
      {/* الأثر المعماري: طبقتان من ضوء هادئ خلف البيانات. نسيج فقط، لا
          صورة. أي عنصر يُقرأ هنا هو رقم الصلاة، لا الخلفية. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <div className="absolute -top-24 -start-20 size-64 rounded-full bg-[radial-gradient(circle,oklch(0.86_0.07_250/0.55),transparent_65%)]" />
        <div className="absolute -bottom-28 -end-24 size-72 rounded-full bg-[radial-gradient(circle,oklch(0.9_0.05_205/0.45),transparent_65%)]" />
      </div>

      <div className="relative flex flex-col gap-5 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 text-[12px] font-semibold text-primary">
              {next.key === "fajr" || next.key === "isha" ? (
                <Moon className="size-3.5" aria-hidden />
              ) : (
                <Sun className="size-3.5" aria-hidden />
              )}
              الصلاة القادمة
            </p>
            <h1 className="mt-1 text-[30px] leading-10 font-bold text-foreground">{next.name}</h1>
            <p className="label-meta mt-1 text-muted-foreground">
              {formatArabicTime(next.time)}
              {active ? ` · ${active.name} الآن` : ""}
            </p>
          </div>
          {awaiting ? (
            <ActionButton
              onClick={() => onLogCurrent(next.key, "ontime")}
              className="shrink-0 px-4 text-[13px]"
            >
              صلّيت {next.name}
            </ActionButton>
          ) : null}
        </div>

        {/* العدّاد هو أكبر رقم في الشاشة. */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label-meta text-muted-foreground">المتبقّي</p>
            {/* العدّاد يتحدّث كل ثانية: إعلانُه لقارئ الشاشة كل ثانية إزعاج،
                فيبقى خارج المنطقة الحيّة عمدا. */}
            <p aria-live="off" className="text-[34px] leading-11 font-bold tracking-tight text-foreground">
              <LiveCountdown target={target} />
            </p>
          </div>
          <div className="min-w-[10rem] flex-1 sm:max-w-xs">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{active?.name ?? "منذ منتصف الليل"}</span>
              <span>{next.name}</span>
            </div>
            <ProgressBar value={progress} label={`التقدّم إلى ${next.name}`} />
          </div>
        </div>

        {!awaiting ? (
          <TextLink onClick={onOpenPrayers} className="self-start">
            سجل الصلاة
          </TextLink>
        ) : null}
      </div>

      {/* شريط اليوم: نقطة لكل صلاة، بلا صندوق إضافي. */}
      <div className="relative border-t border-[var(--oud-line-soft)] px-5 py-3.5">
        <div className="mb-2.5 flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-foreground/80">
            صلّيت اليوم {arabicNumber(doneCount)} من {arabicNumber(PRAYERS.length)}
          </p>
          <Badge tone="primary">دخول الوقت</Badge>
        </div>
        <ol className="flex items-stretch gap-1.5" aria-label="حالة صلوات اليوم" aria-live="polite">
          {PRAYERS.map((prayer) => {
            const state = prayerState(
              prayer.key,
              dayState.prayers[prayer.key],
              toMinutes(timings[prayer.key]),
              nowMinutes,
            );
            const color =
              state === "done"
                ? "var(--status-success)"
                : state === "late"
                  ? "var(--status-attention)"
                  : state === "missed"
                    ? "var(--status-missed)"
                    : "transparent";
            return (
              <li key={prayer.key} className="min-w-0 flex-1">
                <span
                  aria-hidden
                  className="block size-2 rounded-full"
                  style={{ background: color === "transparent" ? "var(--status-idle)" : color }}
                />
                <div className="mt-1.5 h-1 rounded-full bg-[var(--status-idle)]" aria-hidden>
                  <div className="h-1 rounded-full" style={{ width: color === "transparent" ? "0%" : "100%", background: color }} />
                </div>
                <span className="mt-1 block truncate text-[11px] text-muted-foreground">{prayer.name}</span>
                <span className="sr-only">
                  {prayer.name}: {STATE_LABEL[state]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </HeroCard>
  );
}
