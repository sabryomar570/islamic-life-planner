import { Panel, PrimaryButton, QuietButton, StatusDot } from "@/components/app/Surfaces";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import {
  ESSENTIAL_ANSWER_KEYS,
  pickAnswers,
  questionFor,
  type AnswerKey,
  type ProfileAnswers,
  type QuestionOption,
} from "@/data/questions";
import { detectLocation } from "@/lib/location";
import { askNotificationPermission, notificationPermission } from "@/lib/notify";
import { arabicNumber, formatArabicTime } from "@/lib/time";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Battery,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDot,
  Clock,
  Coffee,
  Footprints,
  GraduationCap,
  HeartHandshake,
  Loader2,
  MapPin,
  Moon,
  Notebook,
  Shield,
  Smartphone,
  Sparkles,
  Sun,
  Target,
  Users,
  Volume2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const TOUR_KEY = "oud:tour:done";

type ProfileAnswersPatch = Partial<ProfileAnswers>;

type Stage = {
  id:
    | "rhythm"
    | "prayer"
    | "goal"
    | "habits"
    | "day-shape"
    | "work-window"
    | "wind-down"
    | "tone";
  eyebrow: string;
  title: string;
  description: string;
  keys: readonly AnswerKey[];
};

const CORE_STAGES: Stage[] = [
  {
    id: "rhythm",
    eyebrow: "نبدأ من يومك",
    title: "متى يبدأ يومك، ومتى ينتهي؟",
    description: "وقتا الاستيقاظ والنوم يكفيان لنضبط التذكيرات الأساسية.",
    keys: ["wakeTime", "sleepTime"],
  },
  {
    id: "prayer",
    eyebrow: "صلاتك أولًا",
    title: "أين أنت من الصلاة الآن؟",
    description: "نختار أسلوب تذكير يناسبك الآن، без لوم أو مبالغة.",
    keys: ["prayerCommitment", "mostMissedPrayer"],
  },
  {
    id: "goal",
    eyebrow: "نية واضحة",
    title: "ما الذي تحب أن يرافقك أولًا؟",
    description: "سنضع هذا الاهتمام في مقدمة الرئيسية، ونرتّب ما يخدمه من حوله.",
    keys: ["mainGoal"],
  },
  {
    id: "habits",
    eyebrow: "وردك وبداية يومك",
    title: "ما الحجم المناسب الذي تستطيع الاستمرار عليه؟",
    description: "لا نطلب التزامًا كبيرًا؛ فقط خطوة واقعية تستطيع تكرارها مع الوقت.",
    keys: ["quranAmount", "startingRitual"],
  },
];

const OPTIONAL_STAGES: Stage[] = [
  {
    id: "day-shape",
    eyebrow: "تفصيل اختياري",
    title: "كيف يبدو يومك عادةً؟",
    description: "هذه التفاصيل تجعل سطر الخطة والمراجعة أقرب إلى يومك الحقيقي.",
    keys: ["dayRhythm", "dayEnd", "focusTime"],
  },
  {
    id: "work-window",
    eyebrow: "تفصيل اختياري",
    title: "متى تكون الأساسية، ومتى تستريح؟",
    description: "دقيقة واحدة تكفي. اترك أي وقت فارغًا إذا كان يومك مرنًا.",
    keys: ["workStart", "workEnd", "restTime"],
  },
  {
    id: "wind-down",
    eyebrow: "تفصيل اختياري",
    title: "ما الذي يستنزفك، وكيف تحب أن تهدأ؟",
    description: "نستخدمها في تذكير هادئ يناسب واقعك، بلا لوم أو أنظمة إضافية.",
    keys: ["distraction", "eveningReset"],
  },
  {
    id: "tone",
    eyebrow: "تفصيل اختياري",
    title: "اختر أسلوب المراقبة ومسار هذا الأسبوع",
    description: "يمكنك تعديلها لاحقًا من الإعدادات في أي وقت.",
    keys: ["movement", "disciplineLevel", "weeklyFocus"],
  },
];

const ALL_STAGES = [...CORE_STAGES, ...OPTIONAL_STAGES];

const TIME_SUGGESTIONS: Partial<Record<AnswerKey, readonly string[]>> = {
  wakeTime: ["05:00", "06:00", "07:00"],
  sleepTime: ["22:00", "23:00", "00:00"],
  dayEnd: ["16:00", "18:00", "20:00"],
  focusTime: ["07:00", "09:00", "12:00"],
  workStart: ["08:00", "09:00", "16:00"],
  workEnd: ["14:00", "17:00", "20:00"],
  restTime: ["13:00", "17:00", "21:00"],
};

const PRAYER_COMMITMENT_ICONS: Record<string, typeof Check> = {
  always: Check,
  most: Clock,
  sometimes: Bell,
  starting: Footprints,
};

const GOAL_ICONS: Record<string, typeof Clock> = {
  prayer: Clock,
  quran: BookOpen,
  adhkar: Sun,
  duas: HeartHandshake,
};

const RITUAL_ICONS: Record<string, typeof BookOpen> = {
  wird: BookOpen,
  adhkar: Sun,
  dua: HeartHandshake,
  tasbih: CircleDot,
};

const LIFE_ICONS: Record<string, typeof Calendar> = {
  study: GraduationCap,
  work: Briefcase,
  both: BookOpen,
  open: Coffee,
  walk: Footprints,
  sport: Footprints,
  active: Footprints,
  rest: Moon,
  phone: Smartphone,
  social: Users,
  fatigue: Battery,
  noise: Volume2,
  quran: BookOpen,
  adhkar: Moon,
  reflection: Notebook,
  calm: Moon,
  gentle: Shield,
  balanced: Target,
  firm: Shield,
  prayer: Clock,
  consistency: Calendar,
};

function readTourDone(): boolean {
  try {
    return window.localStorage.getItem(TOUR_KEY) === "1";
  } catch {
    return false;
  }
}

function writeTourDone() {
  try {
    window.localStorage.setItem(TOUR_KEY, "1");
  } catch {
    /* التخزين غير متاح */
  }
}

function hasValue(answers: ProfileAnswersPatch, key: AnswerKey): boolean {
  const value = answers[key];
  return typeof value === "string" && value.trim().length > 0;
}

function isStageComplete(stage: Stage, answers: ProfileAnswersPatch): boolean {
  if (stage.id === "prayer") {
    return (
      hasValue(answers, "prayerCommitment") &&
      (answers.prayerCommitment === "always" || hasValue(answers, "mostMissedPrayer"))
    );
  }
  // نافذة العمل والراحة progressive: يمكن تركها فارغة ثم العودة إليها لاحقًا.
  if (stage.id === "work-window") return true;
  return stage.keys.every((key) => hasValue(answers, key));
}

function isEssentialProfileComplete(answers: ProfileAnswersPatch): boolean {
  return ESSENTIAL_ANSWER_KEYS.every((key) => hasValue(answers, key));
}

function TourIntro({ onStart }: { onStart: () => void }) {
  const highlights = [
    { icon: Clock, title: "صلاتك", text: "مواقيت مناسبة لمكانك وسجل واضح لكل صلاة" },
    { icon: BookOpen, title: "وردك", text: "ذكر ومصحف وأدعية في مكان واحد" },
    { icon: HeartHandshake, title: "يومك", text: "تذكير هادئ لما يناسب إيقاعك" },
    { icon: Bell, title: "بإذنك", text: "لا إشعارات مزعجة ولا طلبات غير ضرورية" },
  ];

  return (
    <main className="flex min-h-dvh items-center justify-center px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))]">
      <Panel className="w-full max-w-2xl p-5 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20">
            عود
          </span>
          <p className="mt-5 text-xs font-semibold text-primary">لنفهم يومك أولًا</p>
          <h1 className="label-display mt-2">أهلًا بك في عود</h1>
          <p className="label-body mx-auto mt-2 max-w-md text-muted-foreground">
            أربع خطوات قصيرة تفهمنا وقت يومك، الصلاة التي تحتاج انتباهك، وهدفك الأهم. التفاصيل
            الدقيقة يمكن أن تأتي لاحقًا.
          </p>
        </div>

        <div className="mt-7 grid gap-2.5 sm:grid-cols-2">
          {highlights.map((item) => (
            <div key={item.title} className="surface-secondary flex items-start gap-3 rounded-2xl p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <item.icon className="size-5" />
              </span>
              <span>
                <span className="block text-sm font-semibold">{item.title}</span>
                <span className="label-body mt-1 block text-muted-foreground">{item.text}</span>
              </span>
            </div>
          ))}
        </div>

        <PrimaryButton onClick={onStart} className="mt-7 w-full">
          لنبدأ
          <ChevronLeft className="size-4" />
        </PrimaryButton>
      </Panel>
    </main>
  );
}

function TimeField({
  answerKey,
  value,
  onChange,
  compact = false,
}: {
  answerKey: AnswerKey;
  value: string;
  onChange: (value: string) => void;
  compact?: boolean;
}) {
  const question = questionFor(answerKey);
  const suggestions = TIME_SUGGESTIONS[answerKey] ?? [];
  const id = `onboarding-${answerKey}`;

  return (
    <div className={cn("glass-tile rounded-3xl p-4", compact ? "" : "sm:p-5")}>
      <label htmlFor={id} className="block">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Clock className="size-4 text-primary" />
          {question.title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{question.hint}</span>
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Input
          id={id}
          type="time"
          dir="ltr"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-14 min-w-36 flex-1 rounded-2xl border-white/80 bg-white/75 text-center text-lg font-semibold tabular-nums"
        />
        <span className="min-w-20 text-sm font-semibold text-primary" aria-live="polite">
          {value ? formatArabicTime(value) : "اختر الوقت"}
        </span>
      </div>
      {suggestions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {suggestions.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              aria-pressed={value === option}
              className={cn(
                "min-h-10 rounded-full px-3.5 text-xs font-semibold transition-all",
                value === option
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                  : "border border-border/70 bg-background/65 text-foreground hover:bg-background",
              )}
            >
              {formatArabicTime(option)}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function TextField({
  answerKey,
  value,
  onChange,
}: {
  answerKey: AnswerKey;
  value: string;
  onChange: (value: string) => void;
}) {
  const question = questionFor(answerKey);
  const id = `onboarding-${answerKey}`;
  return (
    <div className="glass-tile rounded-3xl p-4 sm:p-5">
      <label htmlFor={id} className="block">
        <span className="flex items-center gap-2 text-sm font-semibold">
          <Notebook className="size-4 text-primary" />
          {question.title}
        </span>
        <span className="mt-1 block text-xs leading-5 text-muted-foreground">{question.hint}</span>
      </label>
      <Input
        id={id}
        type="text"
        value={value}
        maxLength={120}
        onChange={(event) => onChange(event.target.value)}
        placeholder="مثال: مراجعة مشروع قبل نهاية الأسبوع"
        className="mt-4 h-12 rounded-2xl border-white/80 bg-white/75"
      />
      <span className="mt-2 block text-[11px] text-muted-foreground">اختياري — سطر واحد كافٍ.</span>
    </div>
  );
}

function ChoiceCards({
  answerKey,
  value,
  onChange,
  iconFor,
  compact = false,
}: {
  answerKey: AnswerKey;
  value: string;
  onChange: (value: string) => void;
  iconFor?: (option: QuestionOption) => typeof Clock;
  compact?: boolean;
}) {
  const question = questionFor(answerKey);
  const options = question.options ?? [];

  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Target className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">{question.title}</h3>
          <p className="label-body mt-1 text-muted-foreground">{question.hint}</p>
        </div>
      </div>
      <div className={cn("mt-4 grid gap-2.5", compact ? "grid-cols-2" : "sm:grid-cols-2")}>
        {options.map((option) => {
          const selected = value === option.value;
          const Icon = iconFor?.(option);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "motion-press flex min-h-24 items-start gap-3 rounded-2xl p-3.5 text-right",
                selected
                  ? "bg-primary/10 ring-1 ring-primary/40"
                  : "surface-secondary hover:bg-white/80",
              )}
            >
              {Icon ? (
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                    selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
                  )}
                >
                  <Icon className="size-4" />
                </span>
              ) : null}
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold leading-5">{option.label}</span>
                {option.hint ? (
                  <span className="label-meta mt-1 block leading-5 text-muted-foreground">
                    {option.hint}
                  </span>
                ) : null}
              </span>
              <span
                className={cn(
                  "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-[var(--rule)]",
                )}
              >
                {selected ? <Check className="size-3" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PrayerPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = questionFor("mostMissedPrayer").options ?? [];
  return (
    <div className="rounded-3xl border border-primary/15 bg-primary/6 p-4">
      <h3 className="text-sm font-semibold">أي صلاة تحب أن نضعها في مرآتك؟</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">
        سنُذكّرك بها بلطف، ويمكنك اختيار «لا تفوتني».
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-12 rounded-xl border px-2 py-2 text-xs font-semibold transition-all",
                selected
                  ? "border-primary/40 bg-primary text-primary-foreground shadow-sm"
                  : "border-border/65 bg-background/75 hover:border-primary/25",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AmountPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const options = questionFor("quranAmount").options ?? [];
  return (
    <div>
      <div className="flex items-start gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <BookOpen className="size-5" />
        </span>
        <div>
          <h3 className="text-sm font-semibold">حجم الورد الواقعي</h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            اختر ما تستطيع تكراره في الأيام المزدحمة أيضًا.
          </p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "min-h-16 rounded-2xl border px-2 py-3 text-xs font-semibold transition-all",
                selected
                  ? "border-primary/45 bg-primary text-primary-foreground shadow-sm"
                  : "border-border/65 bg-background/62 hover:border-primary/25",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StageContent({
  stage,
  answers,
  setAnswer,
  setPrayerCommitment,
}: {
  stage: Stage;
  answers: ProfileAnswersPatch;
  setAnswer: (key: AnswerKey, value: string) => void;
  setPrayerCommitment: (value: string) => void;
}) {
  if (stage.id === "rhythm") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <TimeField
          answerKey="wakeTime"
          value={answers.wakeTime ?? ""}
          onChange={(value) => setAnswer("wakeTime", value)}
        />
        <TimeField
          answerKey="sleepTime"
          value={answers.sleepTime ?? ""}
          onChange={(value) => setAnswer("sleepTime", value)}
        />
      </div>
    );
  }

  if (stage.id === "prayer") {
    return (
      <div className="space-y-4">
        <ChoiceCards
          answerKey="prayerCommitment"
          value={answers.prayerCommitment ?? ""}
          onChange={setPrayerCommitment}
          iconFor={(option) => PRAYER_COMMITMENT_ICONS[option.value] ?? Target}
        />
        {answers.prayerCommitment === "always" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-800">
            <Check className="size-5 shrink-0" />
            <span>سنكتفي بتنبيه واحد عند دخول وقت الصلاة.</span>
          </div>
        ) : answers.prayerCommitment ? (
          <PrayerPicker
            value={answers.mostMissedPrayer ?? ""}
            onChange={(value) => setAnswer("mostMissedPrayer", value)}
          />
        ) : (
          <p className="rounded-2xl bg-muted/55 p-3 text-xs leading-5 text-muted-foreground">
            اختر أولًا أين أنت مع الصلاة، ثم سيظهر السؤال الأنسب لك.
          </p>
        )}
      </div>
    );
  }

  if (stage.id === "goal") {
    return (
      <ChoiceCards
        answerKey="mainGoal"
        value={answers.mainGoal ?? ""}
        onChange={(value) => setAnswer("mainGoal", value)}
        iconFor={(option) => GOAL_ICONS[option.value] ?? Target}
      />
    );
  }

  if (stage.id === "habits") {
    return (
      <div className="space-y-6">
        <AmountPicker
          value={answers.quranAmount ?? ""}
          onChange={(value) => setAnswer("quranAmount", value)}
        />
        <div className="border-t border-border/55 pt-5">
          <ChoiceCards
            answerKey="startingRitual"
            value={answers.startingRitual ?? ""}
            onChange={(value) => setAnswer("startingRitual", value)}
            iconFor={(option) => RITUAL_ICONS[option.value] ?? Sparkles}
          />
        </div>
      </div>
    );
  }

  if (stage.id === "day-shape") {
    return (
      <div className="space-y-5">
        <ChoiceCards
          answerKey="dayRhythm"
          value={answers.dayRhythm ?? ""}
          onChange={(value) => setAnswer("dayRhythm", value)}
          iconFor={(option) => LIFE_ICONS[option.value] ?? Calendar}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TimeField
            compact
            answerKey="dayEnd"
            value={answers.dayEnd ?? ""}
            onChange={(value) => setAnswer("dayEnd", value)}
          />
          <TimeField
            compact
            answerKey="focusTime"
            value={answers.focusTime ?? ""}
            onChange={(value) => setAnswer("focusTime", value)}
          />
        </div>
      </div>
    );
  }

  if (stage.id === "work-window") {
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <TimeField
          compact
          answerKey="workStart"
          value={answers.workStart ?? ""}
          onChange={(value) => setAnswer("workStart", value)}
        />
        <TimeField
          compact
          answerKey="workEnd"
          value={answers.workEnd ?? ""}
          onChange={(value) => setAnswer("workEnd", value)}
        />
        <div className="sm:col-span-2">
          <TimeField
            compact
            answerKey="restTime"
            value={answers.restTime ?? ""}
            onChange={(value) => setAnswer("restTime", value)}
          />
        </div>
      </div>
    );
  }

  if (stage.id === "wind-down") {
    return (
      <div className="space-y-6">
        <ChoiceCards
          answerKey="distraction"
          value={answers.distraction ?? ""}
          onChange={(value) => setAnswer("distraction", value)}
          iconFor={(option) => LIFE_ICONS[option.value] ?? Smartphone}
        />
        <div className="border-t border-border/55 pt-5">
          <ChoiceCards
            answerKey="eveningReset"
            value={answers.eveningReset ?? ""}
            onChange={(value) => setAnswer("eveningReset", value)}
            iconFor={(option) => LIFE_ICONS[option.value] ?? Moon}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ChoiceCards
        answerKey="movement"
        value={answers.movement ?? ""}
        onChange={(value) => setAnswer("movement", value)}
        iconFor={(option) => LIFE_ICONS[option.value] ?? Footprints}
        compact
      />
      <div className="border-t border-border/55 pt-5">
        <ChoiceCards
          answerKey="disciplineLevel"
          value={answers.disciplineLevel ?? ""}
          onChange={(value) => setAnswer("disciplineLevel", value)}
          iconFor={(option) => LIFE_ICONS[option.value] ?? Shield}
        />
      </div>
      <div className="border-t border-border/55 pt-5">
        <ChoiceCards
          answerKey="weeklyFocus"
          value={answers.weeklyFocus ?? ""}
          onChange={(value) => setAnswer("weeklyFocus", value)}
          iconFor={(option) => LIFE_ICONS[option.value] ?? Target}
        />
      </div>
      <div className="border-t border-border/55 pt-5">
        <TextField
          answerKey="commitment"
          value={answers.commitment ?? ""}
          onChange={(value) => setAnswer("commitment", value)}
        />
      </div>
    </div>
  );
}

function SavedState({
  isEdit,
  locationLabel,
  notifyState,
  onAskNotifications,
  onAddDetails,
  onFinish,
}: {
  isEdit: boolean;
  locationLabel: string;
  notifyState: NotificationPermission | "unsupported";
  onAskNotifications: () => void;
  onAddDetails: () => void;
  onFinish: () => void;
}) {
  return (
    <Panel className="motion-swap overflow-hidden">
      <div className="rule-b px-5 py-7 text-center sm:px-8">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[var(--status-success)]/12 text-[var(--status-success)]">
          <Check className="size-7" />
        </span>
        <p className="mt-4 text-xs font-semibold text-primary">اكتمل الأساس</p>
        <h1 className="label-display mt-2">
          {isEdit ? "حُفظت تعديلاتك" : "صار عود أقرب إلى يومك"}
        </h1>
        <p className="label-body mx-auto mt-2 max-w-md text-muted-foreground">
          استُنتج مكانك: <span className="font-semibold text-foreground">{locationLabel}</span>. يمكنك
          تغييره لاحقًا من الإعدادات.
        </p>
      </div>

      <div className="stack-sm p-5 sm:p-7">
        <div className="surface-secondary flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
          <div className="max-w-sm">
            <p className="flex items-center gap-2 text-sm font-semibold">
              <Bell className="size-4 text-primary" />
              إشعارات الصلاة والورد
            </p>
            <p className="label-body mt-1 text-muted-foreground">
              لا يصل شيء قبل إذنك، ويمكنك تغيير الإعداد لاحقًا.
            </p>
          </div>
          {notifyState === "granted" ? (
            <span className="flex items-center gap-1.5 text-xs font-semibold text-[var(--status-success)]">
              <StatusDot state="success" />
              مفعّلة
            </span>
          ) : (
            <PrimaryButton onClick={onAskNotifications} className="px-4 text-[12px]">
              اسمح بالإشعارات
            </PrimaryButton>
          )}
        </div>

        {!isEdit ? (
          <div className="rounded-2xl bg-primary/6 p-4">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">تفاصيل اختيارية… بلا استجواب</p>
                <p className="label-body mt-1 text-muted-foreground">
                  يمكنك إضافة شكل يومك، ما يستنزفك، وأسلوب المتابعة الآن أو من الإعدادات لاحقًا.
                </p>
                <QuietButton onClick={onAddDetails} className="mt-3 px-4 text-[12px]">
                  أضف تفاصيلي
                  <ChevronLeft className="size-3.5" />
                </QuietButton>
              </div>
            </div>
          </div>
        ) : null}

        <PrimaryButton onClick={onFinish} className="w-full">
          {isEdit ? "العودة إلى الرئيسية" : "ابدأ يومك مع عود"}
          <ChevronLeft className="size-4" />
        </PrimaryButton>
      </div>
    </Panel>
  );
}

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";
  const navigate = useNavigate();
  const profileDoc = useQuery(api.planner.getProfile);
  const saveProfile = useMutation(api.planner.saveProfile);
  const prefilled = useRef(false);
  const [showTour, setShowTour] = useState(() => !isEdit && !readTourDone());
  const [enteredDetails, setEnteredDetails] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [answers, setAnswers] = useState<ProfileAnswersPatch>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [notifyState, setNotifyState] = useState<NotificationPermission | "unsupported">(() =>
    notificationPermission(),
  );

  const location = useMemo(() => detectLocation(), []);

  useEffect(() => {
    if (profileDoc && !prefilled.current) {
      prefilled.current = true;
      setAnswers(pickAnswers(profileDoc as Partial<ProfileAnswers>));
    }
  }, [profileDoc]);

  // Prefetch the next route while this screen is active.
  useEffect(() => {
    void import("./Dashboard.tsx");
  }, []);

  const stage = ALL_STAGES[stageIndex];
  const inDetails = stageIndex >= CORE_STAGES.length;
  const visibleStages = inDetails ? OPTIONAL_STAGES : CORE_STAGES;
  const visibleIndex = inDetails ? stageIndex - CORE_STAGES.length : stageIndex;
  const complete = stage ? isStageComplete(stage, answers) : true;
  const progress = saved
    ? 100
    : ((visibleIndex + (complete ? 1 : 0)) / visibleStages.length) * 100;

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [stageIndex]);

  if (showTour) {
    return (
      <TourIntro
        onStart={() => {
          writeTourDone();
          setShowTour(false);
        }}
      />
    );
  }

  if (profileDoc === undefined) {
    return (
      <main
        className="min-h-dvh bg-background px-4 py-[max(2rem,env(safe-area-inset-top))]"
        role="status"
        aria-busy="true"
      >
        <div className="mx-auto w-full max-w-3xl animate-pulse space-y-5 motion-reduce:animate-none">
          <div className="flex items-center gap-3">
            <span className="size-11 rounded-2xl bg-primary/15" />
            <span className="h-3 w-36 rounded-full bg-foreground/10" />
          </div>
          <Panel className="min-h-[28rem] p-6">
            <span className="skeleton block h-3 w-28" />
            <span className="skeleton mt-4 block h-7 w-72 max-w-full" />
            <span className="skeleton mt-3 block h-3 w-full" />
            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <span className="skeleton h-36 rounded-3xl" />
              <span className="skeleton h-36 rounded-3xl" />
            </div>
          </Panel>
          <span className="sr-only">جارٍ تحميل ملفك</span>
        </div>
      </main>
    );
  }

  if (profileDoc && !isEdit && !saved && !enteredDetails) {
    return <Navigate to="/dashboard" replace />;
  }

  const setAnswer = (key: AnswerKey, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setError(null);
  };

  const setPrayerCommitment = (value: string) => {
    setAnswers((current) => ({
      ...current,
      prayerCommitment: value,
      mostMissedPrayer: value === "always" ? "none" : "",
    }));
    setError(null);
  };

  const saveCurrentProfile = async () => {
    if (!complete || (inDetails && stageIndex < ALL_STAGES.length - 1)) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile({
        answers: pickAnswers(answers),
        location: { city: location.city, label: location.label },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر حفظ إجاباتك، حاول مرة أخرى");
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (!complete) return;
    if (stageIndex < ALL_STAGES.length - 1) {
      setStageIndex((current) => current + 1);
      return;
    }
    void saveCurrentProfile();
  };

  const goBack = () => {
    if (enteredDetails && stageIndex === CORE_STAGES.length) {
      setStageIndex(CORE_STAGES.length - 1);
      setEnteredDetails(false);
      setSaved(true);
      return;
    }
    if (stageIndex > 0) setStageIndex((current) => current - 1);
  };

  const finish = () => {
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-dvh bg-background px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => navigate(isEdit ? "/dashboard" : "/")}
            className="flex min-h-11 items-center gap-3 rounded-2xl text-right focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/45"
            aria-label={isEdit ? "العودة إلى الرئيسية" : "العودة"}
          >
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-base font-bold text-primary-foreground shadow-lg shadow-primary/20">
              عود
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">فهم يومك</span>
              <span className="block text-[11px] text-muted-foreground">
                {inDetails ? "تفاصيل اختيارية" : "الأساس أولًا"}
              </span>
            </span>
          </button>
          <Button
            type="button"
            variant="ghost"
            className="min-h-11 rounded-full px-3 text-xs"
            onClick={() => navigate(isEdit ? "/dashboard" : "/")}
          >
            {isEdit ? "رجوع" : "لاحقًا"}
          </Button>
        </header>

        {saved ? (
          <SavedState
            isEdit={isEdit}
            locationLabel={location.label}
            notifyState={notifyState}
            onAskNotifications={() => {
              void askNotificationPermission().then(setNotifyState);
            }}
            onAddDetails={() => {
              setSaved(false);
              setEnteredDetails(true);
              setStageIndex(CORE_STAGES.length);
            }}
            onFinish={finish}
          />
        ) : (
          <>
            <Panel className="overflow-hidden">
              <div className="rule-b px-5 pb-5 pt-6 sm:px-7">
                <div className="flex items-center justify-between gap-3 label-meta">
                  <span className="font-semibold text-primary">
                    {inDetails ? "اختياري" : "الأساس"} · {arabicNumber(visibleIndex + 1)} من{" "}
                    {arabicNumber(visibleStages.length)}
                  </span>
                  <span className="text-muted-foreground">{stage.eyebrow}</span>
                </div>
                <Progress
                  value={progress}
                  className="mt-4 h-1.5 bg-white/75"
                  aria-label="تقدم فهم اليوم"
                />
              </div>

              <div key={stage.id} className="stage-enter p-5 sm:p-7">
                <div className="max-w-2xl">
                  <h1 className="label-display">{stage.title}</h1>
                  <p className="label-body mt-2 text-muted-foreground">{stage.description}</p>
                </div>

                <div className="mt-6">
                  <StageContent
                    stage={stage}
                    answers={answers}
                    setAnswer={setAnswer}
                    setPrayerCommitment={setPrayerCommitment}
                  />
                </div>

                {error ? (
                  <div
                    className="mt-5 rounded-2xl bg-[var(--status-missed)]/8 p-3 text-[13px] text-[var(--status-missed)]"
                    role="alert"
                  >
                    {error}
                  </div>
                ) : null}

                <div className="mt-7 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-5">
                  <Button
                    type="button"
                    variant="ghost"
                    className="min-h-11 rounded-full px-3"
                    disabled={stageIndex === 0 || saving}
                    onClick={goBack}
                  >
                    <ChevronRight className="size-4" />
                    السابق
                  </Button>

                  <div className="flex flex-col items-end gap-2">
                    <Button
                      type="button"
                      className="btn-primary-edge min-h-11 rounded-full px-6 font-semibold"
                      disabled={!complete || saving}
                      onClick={goNext}
                    >
                      {saving ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : stageIndex === CORE_STAGES.length - 1 ||
                        stageIndex === ALL_STAGES.length - 1 ? (
                        <Check className="size-4" />
                      ) : (
                        <ChevronLeft className="size-4" />
                      )}
                      {saving
                        ? "جارٍ الحفظ"
                        : stageIndex === CORE_STAGES.length - 1 ||
                            stageIndex === ALL_STAGES.length - 1
                          ? "احفظ فهمي"
                          : "التالي"}
                    </Button>
                    {!complete ? (
                      <span className="text-[11px] text-muted-foreground">أكمل الاختيار للمتابعة</span>
                    ) : null}
                  </div>
                </div>
              </div>
            </Panel>

            {isEssentialProfileComplete(answers) ? (
              <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
                <MapPin className="size-3.5 text-primary" />
                لن نطلب منك مكانًا الآن؛ نبدأ بما يمكن استنتاجه من جهازك ويمكنك تعديله لاحقًا.
              </p>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
