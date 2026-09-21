import { GlassCard, GlassPill, SectionTitle } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { QUESTIONS, type ProfileAnswers } from "@/data/questions";
import type { PlanBlock, PlanBlockKind } from "@/lib/day-plan";
import { arabicNumber, formatArabicTime, toMinutes } from "@/lib/time";
import {
  BedDouble,
  BookOpen,
  Briefcase,
  CalendarClock,
  Clock,
  Dumbbell,
  Moon,
  Pencil,
  Sparkles,
  Target,
  Users,
  Utensils,
} from "lucide-react";

const BLOCK_ICON: Record<PlanBlockKind, typeof Sparkles> = {
  adhkar: Sparkles,
  prayer: Moon,
  quran: BookOpen,
  sport: Dumbbell,
  work: Briefcase,
  family: Users,
  meal: Utensils,
  sleep: BedDouble,
  focus: Target,
};

const BLOCK_TONE: Record<PlanBlockKind, string> = {
  adhkar: "bg-sky-500/12 text-sky-600",
  prayer: "bg-indigo-500/12 text-indigo-600",
  quran: "bg-emerald-500/12 text-emerald-600",
  sport: "bg-orange-500/12 text-orange-600",
  work: "bg-slate-500/12 text-slate-600",
  family: "bg-pink-500/12 text-pink-600",
  meal: "bg-amber-500/12 text-amber-600",
  sleep: "bg-violet-500/12 text-violet-600",
  focus: "bg-teal-500/12 text-teal-600",
};

export function PlanView({
  plan,
  profile,
  onEditProfile,
}: {
  plan: PlanBlock[];
  profile: ProfileAnswers;
  onEditProfile: () => void;
}) {
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nextBlock = plan.find((block) => toMinutes(block.time) > nowMinutes);

  return (
    <div className="space-y-5">
      <GlassCard strong className="p-6">
        <SectionTitle
          icon={<CalendarClock className="size-5" />}
          title="خطّة يومك — مبنية على إجاباتك الخمسة عشر"
          hint="فترات واضحة مع سبب عملي لكل فترة، ومرتبطة بمواقيت مدينتك"
          action={
            <Button type="button" className="rounded-full" onClick={onEditProfile}>
              <Pencil className="size-4" />
              تعديل إجاباتي
            </Button>
          }
        />

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Clock className="size-4 text-sky-500" /> الفترة القادمة
            </p>
            <p className="mt-1 text-sm font-semibold">
              {nextBlock
                ? `${formatArabicTime(nextBlock.time)} • ${nextBlock.title}`
                : "انتهى يومك — حان وقت أذكار النوم"}
            </p>
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Dumbbell className="size-4 text-orange-500" /> الرياضة
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatArabicTime(plan.find((block) => block.kind === "sport")?.time ?? profile.wakeTime)}
            </p>
          </div>
          <div className="glass-tile rounded-2xl p-4">
            <p className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <BedDouble className="size-4 text-violet-500" /> أذكار النوم
            </p>
            <p className="mt-1 text-sm font-semibold">
              {formatArabicTime(profile.sleepTime)}
            </p>
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-6">
        <SectionTitle
          icon={<Sparkles className="size-5" />}
          title={`${arabicNumber(plan.length)} فترة في يومك`}
          hint="ابدأ من الفترة القادمة فقط، ولا تحاول تنفيذ اليوم كله مرة واحدة"
        />

        <div className="mt-6 space-y-3">
          {plan.map((block) => {
            const Icon = BLOCK_ICON[block.kind];
            const isNext = nextBlock?.id === block.id;
            return (
              <div
                key={block.id}
                className={`flex gap-4 rounded-3xl p-4 transition-all ${
                  isNext ? "bg-primary/10 ring-1 ring-primary/25" : "glass-tile"
                }`}
              >
                <div className="flex w-16 shrink-0 flex-col items-center gap-2">
                  <span className="text-xs font-semibold text-primary">
                    {formatArabicTime(block.time, false)}
                  </span>
                  <span
                    className={`flex size-10 items-center justify-center rounded-2xl ${BLOCK_TONE[block.kind]}`}
                  >
                    <Icon className="size-5" />
                  </span>
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold">{block.title}</p>
                    {isNext ? (
                      <span className="rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-medium text-primary-foreground">
                        التالية
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1.5 text-[12px] leading-6 text-foreground/70">
                    {block.detail}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </GlassCard>

      <GlassCard soft className="p-6">
        <SectionTitle
          icon={<Target className="size-5" />}
          title="ملخّص إجاباتك"
          hint="تعديل أي إجابة يُعيد بناء الخطّة فورًا"
          action={<GlassPill onClick={onEditProfile}>تعديل</GlassPill>}
        />
        <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {QUESTIONS.map((question, index) => (
            <div key={question.key} className="glass-tile rounded-2xl p-3">
              <p className="text-[10px] text-muted-foreground">
                {arabicNumber(index + 1)}. {question.title}
              </p>
              <p className="mt-1 text-[12px] font-medium">
                {question.kind === "time"
                  ? formatArabicTime(profile[question.key])
                  : (question.options?.find(
                      (option) => option.value === profile[question.key],
                    )?.label ?? profile[question.key])}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
