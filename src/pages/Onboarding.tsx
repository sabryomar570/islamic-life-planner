import { GlassCard, GlassPill } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { api } from "@/convex/_generated/api";
import {
  DEFAULT_ANSWERS,
  QUESTIONS,
  pickAnswers,
  type AnswerKey,
  type ProfileAnswers,
} from "@/data/questions";
import { arabicNumber, formatArabicTime } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const HIGHLIGHTS = [
  {
    icon: Clock,
    title: "خطّة يوم كاملة",
    text: "من وقت استيقاظك حتى نومك، مع فترة للرياضة والقرآن والعمل والعائلة.",
  },
  {
    icon: Sparkles,
    title: "أذكار في وقتها",
    text: "أذكار الصباح عند الاستيقاظ، وأذكار المساء قبل النوم، بتذكير في مكانها.",
  },
  {
    icon: BookOpen,
    title: "تذكير الصلاة والخشوع",
    text: "مواقيت مدينتك مع تنبيه عند الأذان، وأحاديث تُلين قلبك مع الراوي والمصدر.",
  },
];

export default function Onboarding() {
  const [searchParams] = useSearchParams();
  const isEdit = searchParams.get("edit") === "1";
  const navigate = useNavigate();
  const profileDoc = useQuery(api.planner.getProfile);
  const saveProfile = useMutation(api.planner.saveProfile);
  const prefilled = useRef(false);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<ProfileAnswers>>({
    wakeTime: DEFAULT_ANSWERS.wakeTime,
    sleepTime: DEFAULT_ANSWERS.sleepTime,
    workStart: DEFAULT_ANSWERS.workStart,
    workEnd: DEFAULT_ANSWERS.workEnd,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (profileDoc && !prefilled.current) {
      prefilled.current = true;
      setAnswers(pickAnswers(profileDoc as Partial<ProfileAnswers>));
    }
  }, [profileDoc]);

  if (profileDoc === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          لحظة...
        </div>
      </main>
    );
  }

  if (profileDoc && !isEdit) {
    return <Navigate to="/dashboard" replace />;
  }

  const total = QUESTIONS.length;
  const question = QUESTIONS[index];
  const value = (answers[question.key] ?? "") as string;
  const isAnswered =
    question.kind === "text" ? value.trim().length > 1 : value.length > 0;
  const progress = ((index + (isAnswered ? 1 : 0)) / total) * 100;

  const setAnswer = (key: AnswerKey, next: string) => {
    setAnswers((current) => ({ ...current, [key]: next }));
    setError(null);
  };

  const goNext = () => {
    if (!isAnswered) return;
    if (index < total - 1) setIndex((current) => current + 1);
  };

  const finish = async () => {
    if (!isAnswered) return;
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ answers: pickAnswers(answers) });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "تعذّر حفظ إجاباتك، حاول مرة أخرى",
      );
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(isEdit ? "/dashboard" : "/")}
            className="flex items-center gap-3 text-right"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-white shadow-lg shadow-sky-500/25">
              <Sparkles className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold">سكينة</span>
              <span className="block text-[11px] text-muted-foreground">
                خطوتك الأولى: ١٥ سؤالًا عن يومك
              </span>
            </span>
          </button>
          {isEdit ? (
            <GlassPill onClick={() => navigate("/dashboard")}>
              رجوع للخطّة
            </GlassPill>
          ) : null}
        </header>

        <GlassCard strong className="p-6 sm:p-8">
          <div className="flex items-center justify-between gap-4 text-xs">
            <span className="glass-tile rounded-full px-3 py-1.5 font-medium">
              سؤال {arabicNumber(index + 1)} من {arabicNumber(total)}
            </span>
            <span className="text-muted-foreground">{question.section}</span>
          </div>

          <Progress value={progress} className="mt-4 h-2 bg-white/60" />

          <div className="mt-7">
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">
              {question.title}
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {question.hint}
            </p>

            <div className="mt-6">
              {question.kind === "time" ? (
                <div className="flex flex-wrap items-center gap-3">
                  <Input
                    type="time"
                    value={value}
                    onChange={(event) => setAnswer(question.key, event.target.value)}
                    className="glass-tile h-12 w-40 rounded-2xl border-white/70 text-base"
                  />
                  <span className="text-sm text-muted-foreground">
                    اختيارك: {value ? formatArabicTime(value) : "—"}
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {["04:30", "05:00", "06:00", "07:00", "22:00", "23:00", "00:00"].map(
                      (option) => (
                        <GlassPill
                          key={option}
                          active={value === option}
                          onClick={() => setAnswer(question.key, option)}
                        >
                          {formatArabicTime(option)}
                        </GlassPill>
                      ),
                    )}
                  </div>
                </div>
              ) : question.kind === "text" ? (
                <Input
                  value={value}
                  onChange={(event) => setAnswer(question.key, event.target.value)}
                  placeholder={question.placeholder}
                  className="glass-tile h-12 max-w-sm rounded-2xl border-white/70 text-base"
                />
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {question.options?.map((option) => {
                    const active = value === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setAnswer(question.key, option.value)}
                        className={`flex items-center justify-between gap-3 rounded-2xl p-4 text-right text-sm transition-all ${
                          active
                            ? "bg-primary/12 ring-1 ring-primary/40"
                            : "glass-tile hover:bg-white/85"
                        }`}
                      >
                        <span>
                          <span className="block font-medium">{option.label}</span>
                          {option.hint ? (
                            <span className="mt-0.5 block text-[11px] text-muted-foreground">
                              {option.hint}
                            </span>
                          ) : null}
                        </span>
                        {active ? (
                          <CheckCircle2 className="size-5 shrink-0 text-primary" />
                        ) : (
                          <span className="size-5 shrink-0 rounded-full border border-white/80" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-xs text-rose-700">
              {error}
            </p>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={index === 0}
              onClick={() => setIndex((current) => Math.max(0, current - 1))}
            >
              <ArrowRight className="size-4" />
              السابق
            </Button>

            {index === total - 1 ? (
              <Button
                type="button"
                className="rounded-full px-6"
                disabled={!isAnswered || saving}
                onClick={finish}
              >
                {saving ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
                احفظ وابدأ يومي
              </Button>
            ) : (
              <Button
                type="button"
                className="rounded-full px-6"
                disabled={!isAnswered}
                onClick={goNext}
              >
                التالي
                <ArrowLeft className="size-4" />
              </Button>
            )}
          </div>
        </GlassCard>

        <div className="grid gap-4 sm:grid-cols-3">
          {HIGHLIGHTS.map((item) => (
            <GlassCard key={item.title} soft className="p-5">
              <span className="flex size-9 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <item.icon className="size-4" />
              </span>
              <p className="mt-3 text-sm font-semibold">{item.title}</p>
              <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                {item.text}
              </p>
            </GlassCard>
          ))}
        </div>
      </div>
    </div>
  );
}
