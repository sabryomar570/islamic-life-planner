import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { ADHKAR_GROUPS } from "@/data/adhkar";
import { DUA_COUNT } from "@/data/duas";
import { HADITHS, HADITH_SECTIONS } from "@/data/hadith";
import { POEMS } from "@/data/poetry";
import { SURAHS } from "@/data/quran";
import { useInstallPrompt } from "@/lib/pwa";
import { arabicNumber } from "@/lib/time";
import {
  Bell,
  BookOpen,
  CalendarHeart,
  Check,
  Compass,
  Feather,
  HeartHandshake,
  ScrollText,
  Smartphone,
  Sunrise,
  Sunset,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router";

const SECTIONS = [
  {
    icon: Sunrise,
    title: "أذكار موقوتة",
    text: "الصباح عند الاستيقاظ، والمساء قبل النوم، وبعد كل صلاة — بعدد التكرار ومصدر كل ذكر.",
  },
  {
    icon: BookOpen,
    title: "المصحف",
    text: "١١٤ سورة بصفحات تشبه المصحف الورقي، والبسملة مفصولة عن السورة، وعلامة قراءة.",
  },
  {
    icon: HeartHandshake,
    title: "أدعية مأثورة",
    text: `${arabicNumber(DUA_COUNT)} دعاءً من القرآن والسنة مبوبة على الحاجة: الهمّ، الرزق، المغفرة، الذرية.`,
  },
  {
    icon: ScrollText,
    title: "أحاديث مبوّبة",
    text: `${arabicNumber(HADITHS.length)} حديثًا في ${arabicNumber(HADITH_SECTIONS.length)} بابًا، ومع كل حديث راويه ومصدره.`,
  },
  {
    icon: CalendarHeart,
    title: "المناسبات",
    text: "رمضان وعرفة والعيدان والأيام البيض، بعدّاد لكل مناسبة وبأفضل عمل فيها.",
  },
  {
    icon: Feather,
    title: "أبيات مختارة",
    text: `${arabicNumber(POEMS.length)} بيتًا من الشعر العربي في العزيمة والثبات، مع قائلها.`,
  },
  {
    icon: Bell,
    title: "تذكير في وقته",
    text: "إشعار عند دخول وقت الصلاة، وقبل الورد، وقبل النوم — بإذنك وحده.",
  },
  {
    icon: WifiOff,
    title: "يعمل دون إنترنت",
    text: "ثبّته كتطبيق، ونزّل المصحف مرة واحدة، ثم اقرأ بلا شبكة.",
  },
];

const ADHKAR_TOTAL = ADHKAR_GROUPS.reduce((total, group) => total + group.items.length, 0);

export default function Landing() {
  const install = useInstallPrompt();

  const facts = [
    { value: arabicNumber(SURAHS.length), label: "سورة كاملة" },
    { value: arabicNumber(HADITHS.length), label: "حديثًا بروايته" },
    { value: arabicNumber(ADHKAR_TOTAL), label: "ذكرًا بمصدره" },
    { value: arabicNumber(DUA_COUNT), label: "دعاءً مأثورًا" },
  ];

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to="/" className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-base font-bold text-white shadow-lg shadow-sky-500/25">
              عود
            </span>
            <span className="text-base font-bold">عود</span>
          </Link>

          <div className="flex items-center gap-2">
            {install.canInstall ? (
              <Button
                variant="ghost"
                size="sm"
                className="btn-edge hidden rounded-full text-xs sm:flex"
                onClick={() => void install.promptInstall()}
              >
                <Smartphone className="size-3.5" />
                تثبيت
              </Button>
            ) : null}
            <Button asChild variant="ghost" size="sm" className="btn-edge rounded-full text-xs">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
            <Button asChild size="sm" className="btn-edge rounded-full text-xs">
              <Link to="/auth?returnTo=%2Fonboarding">إنشاء حساب</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-5xl px-4 pb-10 pt-10 sm:px-6">
        <div className="grid items-center gap-8 lg:grid-cols-[1fr_0.85fr]">
          <div>
            <h1 className="text-3xl font-bold leading-[1.35] tracking-tight sm:text-[2.4rem]">
              صلاتك، وأذكارك،
              <br />
              ووردك في مكان واحد
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/75">
              مواقيت دقيقة، أذكار الصباح والمساء والنوم، مصحف يعمل دون إنترنت، وأحاديث
              وأدعية بمصادرها.
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="btn-edge rounded-full px-6 text-sm">
                <Link to="/auth?returnTo=%2Fonboarding">
                  ابدأ
                  <Compass className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="btn-edge rounded-full px-6 text-sm">
                <Link to="/auth">لدي حساب</Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-muted-foreground">
              {[
                "المواقيت على موقعك أو مدينتك تلقائيًا",
                "كل نص بمصدره وراويه",
                "لا يُطلب شيء قبل إذنك",
              ].map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-500" />
                  {point}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative">
            <div className="absolute -right-6 -top-6 size-36 rounded-full bg-sky-300/40 blur-3xl" />
            <div className="absolute -bottom-8 -left-4 size-40 rounded-full bg-amber-200/40 blur-3xl" />

            <GlassCard strong className="relative p-5">
              <p className="text-[11px] text-muted-foreground">الصلاة القادمة</p>
              <p className="mt-1 text-lg font-bold text-primary">العصر ٣:٢٤ مساءً</p>
              <p className="mt-3 rounded-2xl bg-primary/8 px-4 py-3 text-center">
                <span className="quran-text text-[1.05rem] leading-9">
                  ﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾
                </span>
                <span className="mt-1 block text-[10px] font-medium text-primary">الرعد: ٢٨</span>
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {["الصباح", "المساء", "النوم"].map((label) => (
                  <span
                    key={label}
                    className="tile-edge rounded-2xl px-2 py-2 text-center text-[10px] font-medium"
                  >
                    أذكار {label}
                  </span>
                ))}
              </div>
              <p className="mt-3 flex items-center justify-between rounded-2xl bg-white/60 px-3.5 py-2 text-[11px]">
                <span>صلّيت اليوم</span>
                <span className="font-semibold text-primary">٣ / ٥</span>
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <h2 className="text-xl font-bold tracking-tight">ما يوجد داخله</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {SECTIONS.map((item) => (
            <GlassCard key={item.title} hover className="p-4">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <item.icon className="size-4" />
              </span>
              <h3 className="mt-3 text-[13px] font-semibold">{item.title}</h3>
              <p className="mt-1.5 text-[11px] leading-5 text-foreground/70">{item.text}</p>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <GlassCard strong className="p-5 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <h2 className="text-xl font-bold tracking-tight">المحتوى</h2>
              <p className="mt-2 text-[13px] leading-6 text-foreground/75">
                كل نص مذكور معه راويه أو مصدره، وما لم يثبت فيه عمل مخصوص صُرّح به.
              </p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                {facts.map((fact) => (
                  <div key={fact.label} className="tile-edge rounded-2xl p-3.5">
                    <p className="text-lg font-bold text-primary">{fact.value}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{fact.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <ul className="space-y-2.5">
              {[
                "المواقيت تُحسب على منطقتك الزمنية، أو على إحداثياتك إن سمحت بالموقع",
                "نص القرآن بالرسم العثماني، مع نسخة محفوظة تعمل دون شبكة",
                "الأحاديث بأبوابها ورواتها، والأدعية بمراجعها",
                "تنبيه صريح لما لا يثبت فيه عمل مخصّوص",
                "لا حسابات إعلانية ولا تتبّع",
              ].map((item) => (
                <li key={item} className="tile-edge flex items-start gap-2.5 rounded-2xl p-3.5 text-[12px] leading-6">
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="size-3" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
        <GlassCard strong className="p-7 text-center sm:p-10">
          <p className="quran-text text-xl leading-[2.3]">﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾</p>
          <h2 className="mt-4 text-xl font-bold tracking-tight">أسئلة قصيرة ثم يبدأ يومك</h2>
          <Button asChild size="lg" className="btn-edge mt-6 rounded-full px-7 text-sm">
            <Link to="/auth?returnTo=%2Fonboarding">
              ابدأ
              <Compass className="size-4" />
            </Link>
          </Button>
        </GlassCard>
      </section>

      <footer className="mx-auto w-full max-w-5xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-5 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sunset className="size-3.5 text-primary" />
            عود
          </span>
          <span>كل نص بمصدره • يعمل دون إنترنت</span>
        </div>
      </footer>
    </div>
  );
}
