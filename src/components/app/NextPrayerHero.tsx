import { Meter, StatusDot, Panel, PrimaryButton } from "@/components/app/Surfaces";
import { useNow } from "@/hooks/use-clock";
import { toArabicDigits } from "@/lib/hijri";
import { PRAYERS, currentPrayer, nextPrayer, type PrayerKey, type PrayerStatus, type Timings } from "@/lib/prayers";
import { arabicNumber, formatArabicTime } from "@/lib/time";
import { ChevronLeft, Moon, Sun } from "lucide-react";

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
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <p className="eyebrow flex items-center gap-1.5">
            {next.key === "fajr" || next.key === "isha" ? (
              <Moon className="size-3.5" />
            ) : (
              <Sun className="size-3.5" />
            )}
            الصلاة القادمة
          </p>
          <div className="mt-1.5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h1 className="label-display text-primary">{next.name}</h1>
            <span className="text-[15px] font-semibold text-foreground/70">
              {formatArabicTime(next.time)}
            </span>
          </div>
          <p className="label-meta mt-2 text-muted-foreground">
            {active
              ? `${active.name} الآن · بعدها ${next.name}`
              : `${next.hint}`}
          </p>

          {/* شريط واحد يقول: كم من وقتك بين الصلاةين مرّ. */}
          <div className="mt-4 max-w-xs">
            <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
              <span>{active?.name ?? "منذ منتصف الليل"}</span>
              <span>{next.name}</span>
            </div>
            <Meter value={progress} label={`التقدّم إلى ${next.name}`} />
          </div>
        </div>

        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
          <div className="rounded-2xl surface-sunken px-4 py-3 text-center">
            <p className="label-meta text-muted-foreground">المتبقّي</p>
            {/* العدّاد يتحدّث كل نصف دقيقة: إعلانُه لقارئ الشاشة كل ٣٠ ثانية إزعاج.
               aria-live="off" يجعل ذلك مقصودًا لا مجرّد نتيجة عرضية. */}
            <div aria-live="off">
              <LiveCountdown target={target} />
            </div>
          </div>
          {awaiting ? (
            <PrimaryButton
              onClick={() => onLogCurrent(next.key, "ontime")}
              className="text-[12px]"
            >
              صلّيت {next.name}
            </PrimaryButton>
          ) : (
            <button
              type="button"
              onClick={onOpenPrayers}
              className="motion-press touch-target inline-flex items-center justify-center gap-1 rounded-full px-4 text-[12px] font-semibold text-primary"
            >
              سجل الصلاة
              <ChevronLeft className="size-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* شريط اليوم: نقطة لكل صلاة، بلا صندوق إضافي. */}
      <div className="rule-t px-5 py-3.5 sm:px-6">
        <div className="mb-2 flex items-center justify-between gap-3">
          <p className="text-[12px] font-semibold text-foreground/80">
            صلّيت اليوم {arabicNumber(doneCount)} من {arabicNumber(PRAYERS.length)}
          </p>
          <span className="label-meta text-muted-foreground">دخول الوقت</span>
        </div>
        <ol className="flex items-stretch gap-1.5" aria-label="حالة صلوات اليوم" aria-live="polite">
          {PRAYERS.map((prayer) => {
            const state = prayerState(
              prayer.key,
              dayState.prayers[prayer.key],
              toMinutes(timings[prayer.key]),
              nowMinutes,
            );
            return (
              <li key={prayer.key} className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
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
                  <span className="truncate text-[11px] text-muted-foreground">{prayer.name}</span>
                </div>
                <div
                  className="mt-1.5 h-1 rounded-full bg-[var(--status-idle)]"
                  aria-hidden
                >
                  <div
                    className="h-1 rounded-full"
                    style={{
                      width:
                        state === "done"
                          ? "100%"
                          : state === "late"
                            ? "100%"
                            : state === "missed"
                              ? "100%"
                              : "0%",
                      background:
                        state === "done"
                          ? "var(--status-success)"
                          : state === "late"
                            ? "var(--status-attention)"
                            : state === "missed"
                              ? "var(--status-missed)"
                              : "transparent",
                    }}
                  />
                </div>
                <span className="sr-only">
                  {prayer.name}: {STATE_LABEL[state]}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </Panel>
  );
}
