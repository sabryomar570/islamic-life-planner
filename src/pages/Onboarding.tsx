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
import { detectLocation } from "@/lib/location";
import { askNotificationPermission, notificationPermission } from "@/lib/notify";
import { arabicNumber, formatArabicTime } from "@/lib/time";
import { useMutation, useQuery } from "convex/react";
import { ArrowLeft, ArrowRight, BellRing, BookOpen, Bookmark, CheckCircle2, Clock, HeartHandshake, Loader2, ScrollText, Sparkles } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";

const TOUR_KEY = "oud:tour:done";

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
    /* لا شيء */
  }
}

/** شاشة تعريفية مختصرة تظهر مرة واحدة فقط قبل أسئلة البداية. */
function TourIntro({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  const TOUR_ITEMS = [
    { icon: Clock, title: "صلاتي", text: "مواقيت على مكانك، وتسجيل كل صلاة بنقرة" },
    { icon: BookOpen, title: "المصحف", text: "كامل ويعمل دون إنترنت بعد تنزيله" },
    { icon: HeartHandshake, title: "الأدعية والأذكار", text: "مقسّمة على أبواب: همّ، رزق، مغفرة…" },
    { icon: ScrollText, title: "الأحاديث والأبيات", text: "لكل عنصر مصدره وراويه" },
    { icon: Bookmark, title: "الحفظ", text: "اضغط علامة الحفظ على أي عنصر — يبقى محفوظًا" },
    { icon: BellRing, title: "الإشعارات", text: "تذكير هادئ عند الصلاة والأذكار — بإذنك" },
  ];
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-8">
      <GlassCard strong className="w-full max-w-2xl p-6 sm:p-8">
        <div className="text-center">
          <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-lg font-bold text-white shadow-lg shadow-sky-500/25">
            عود
          </span>
          <h1 className="mt-4 text-xl font-bold tracking-tight">مرحبًا بك في عود</h1>
          <p className="mx-auto mt-1.5 max-w-md text-[13px] leading-6 text-muted-foreground">
            تطبيق واحد يجمع صلاتك ووردك وذكر اليوم — وهذه أهم أقسامه قبل أن نبدأ.
          </p>
        </div>

        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {TOUR_ITEMS.map((item) => (
            <div key={item.title} className="tile-edge flex items-start gap-3 rounded-2xl p-3.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <item.icon className="size-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold">{item.title}</span>
                <span className="mt-0.5 block text-[11px] leading-5 text-muted-foreground">
                  {item.text}
                </span>
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center gap-2">
          <Button
            type="button"
            size="lg"
            className="btn-primary-edge w-full max-w-xs rounded-full font-semibold"
            onClick={onStart}
          >
            نبدأ — {arabicNumber(15)} سؤالًا قصيرًا
          </Button>
          <button
            type="button"
            onClick={onSkip}
            className="text-[11px] text-muted-foreground underline-offset-4 hover:underline"
          >
            تخطّي التعريف والذهاب للأسئلة مباشرة
          </button>
        </div>
      </GlassCard>
    </main>
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

  const location = useMemo(() => detectLocation(), []);

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Partial<ProfileAnswers>>({
    wakeTime: DEFAULT_ANSWERS.wakeTime,
    sleepTime: DEFAULT_ANSWERS.sleepTime,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [notifyState, setNotifyState] = useState<NotificationPermission | "unsupported">(() =>
    notificationPermission(),
  );

  useEffect(() => {
    if (profileDoc && !prefilled.current) {
      prefilled.current = true;
      setAnswers(pickAnswers(profileDoc as Partial<ProfileAnswers>));
    }
  }, [profileDoc]);

  if (showTour) {
    return (
      <TourIntro
        onStart={() => {
          writeTourDone();
          setShowTour(false);
        }}
        onSkip={() => {
          writeTourDone();
          setShowTour(false);
        }}
      />
    );
  }

  if (profileDoc === undefined) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <div className="glass flex items-center gap-3 rounded-full px-5 py-3 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          جارٍ التحميل...
        </div>
      </main>
    );
  }

  if (profileDoc && !isEdit && !saved) {
    return <Navigate to="/dashboard" replace />;
  }

  const total = QUESTIONS.length;
  const question = QUESTIONS[index];
  const value = (answers[question.key] ?? "") as string;
  const isAnswered = value.trim().length > 0;
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
      await saveProfile({
        answers: pickAnswers(answers),
        location: { city: location.city, label: location.label },
      });
      setSaved(true);
      setSaving(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "تعذّر حفظ إجاباتك، حاول مرة أخرى");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5">
        <header className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => navigate(isEdit ? "/dashboard" : "/")}
            className="flex items-center gap-3 text-right"
          >
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-base font-bold text-white shadow-lg shadow-sky-500/25">
              عود
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold">أسئلة البداية</span>
              <span className="block text-[11px] text-muted-foreground">
                {arabicNumber(total)} أسئلة قصيرة عن يومك
              </span>
            </span>
          </button>
          {isEdit ? (
            <GlassPill onClick={() => navigate("/dashboard")}>رجوع</GlassPill>
          ) : null}
        </header>

        {saved ? (
          <GlassCard strong className="p-6 text-center sm:p-8">
            <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-500/12 text-emerald-600">
              <CheckCircle2 className="size-6" />
            </span>
            <h1 className="mt-4 text-xl font-bold tracking-tight">حُفظت إجاباتك</h1>
            <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-muted-foreground">
              حدّدنا مكانك تلقائيًا: <span className="font-semibold">{location.label}</span>. يمكنك
              تعديله من الإعدادات أو بالسماح بالموقع.
            </p>

            <div className="mx-auto mt-5 max-w-lg">
              <div className="tile-edge flex flex-wrap items-center justify-between gap-3 rounded-2xl p-4">
                <div className="max-w-sm text-right">
                  <p className="text-[13px] font-semibold">إشعارات الصلاة والورد</p>
                  <p className="mt-0.5 text-[11px] leading-5 text-muted-foreground">
                    إشعار عند دخول الوقت، وقبل وردك، وقبل النوم. لا يصل شيء دون إذنك.
                  </p>
                </div>
                {notifyState === "granted" ? (
                  <span className="rounded-full bg-emerald-500/90 px-3 py-1 text-[11px] text-white">
                    مفعّلة
                  </span>
                ) : (
                  <Button
                    type="button"
                    className="btn-edge rounded-full"
                    onClick={async () => {
                      setNotifyState(await askNotificationPermission());
                    }}
                  >
                    اسمح بالإشعارات
                  </Button>
                )}
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              className="btn-edge mt-6 rounded-full px-7 text-sm"
              onClick={() => navigate("/dashboard", { replace: true })}
            >
              <Sparkles className="size-4" />
              ابدأ
            </Button>
          </GlassCard>
        ) : (
          <GlassCard strong className="p-6 sm:p-7">
            <div className="flex items-center justify-between gap-4 text-[11px]">
              <span className="tile-edge rounded-full px-3 py-1.5 font-medium">
                سؤال {arabicNumber(index + 1)} من {arabicNumber(total)}
              </span>
              <span className="text-muted-foreground">{question.section}</span>
            </div>

            <Progress value={progress} className="mt-3.5 h-1.5 bg-white/70" />

            <div className="mt-6">
              <h1 className="text-lg font-bold tracking-tight sm:text-xl">{question.title}</h1>
              <p className="mt-1.5 text-[13px] leading-6 text-muted-foreground">{question.hint}</p>

              <div className="mt-5">
                {question.kind === "time" ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Input
                      type="time"
                      value={value}
                      onChange={(event) => setAnswer(question.key, event.target.value)}
                      className="glass-tile h-11 w-36 rounded-2xl border-white/70 text-base"
                    />
                    <span className="text-[12px] text-muted-foreground">
                      {value ? formatArabicTime(value) : "—"}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
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
                ) : (
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    {question.options?.map((option) => {
                      const active = value === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAnswer(question.key, option.value)}
                          className={`flex items-center justify-between gap-3 rounded-2xl p-3.5 text-right text-[13px] transition-all ${
                            active ? "bg-primary/12 ring-1 ring-primary/40" : "tile-edge hover:bg-white"
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
              <p className="mt-4 rounded-2xl bg-rose-500/10 p-3 text-xs text-rose-700">{error}</p>
            ) : null}

            <div className="mt-7 flex items-center justify-between gap-3">
              <Button
                type="button"
                variant="outline"
                className="btn-edge rounded-full"
                disabled={index === 0}
                onClick={() => setIndex((current) => Math.max(0, current - 1))}
              >
                <ArrowRight className="size-4" />
                السابق
              </Button>

              {index === total - 1 ? (
                <Button
                  type="button"
                  className="btn-edge rounded-full px-6"
                  disabled={!isAnswered || saving}
                  onClick={finish}
                >
                  {saving ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                  حفظ
                </Button>
              ) : (
                <Button
                  type="button"
                  className="btn-edge rounded-full px-6"
                  disabled={!isAnswered}
                  onClick={goNext}
                >
                  التالي
                  <ArrowLeft className="size-4" />
                </Button>
              )}
            </div>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
