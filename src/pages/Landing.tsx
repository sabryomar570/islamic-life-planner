import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { ADHKAR_GROUPS } from "@/data/adhkar";
import { HADITHS, HADITH_SECTIONS } from "@/data/hadith";
import { OCCASIONS } from "@/data/occasions";
import { POEMS } from "@/data/poetry";
import { SURAHS } from "@/data/quran";
import { useInstallPrompt } from "@/lib/pwa";
import { arabicNumber } from "@/lib/time";
import { motion } from "framer-motion";
import {
  Bell,
  BookOpen,
  CalendarHeart,
  Check,
  Compass,
  Feather,
  MapPin,
  Moon,
  ScrollText,
  Smartphone,
  Sparkles,
  Sunrise,
  Sunset,
  WifiOff,
} from "lucide-react";
import { Link } from "react-router";

const STEPS = [
  {
    icon: Compass,
    title: "خمسة عشر سؤالًا",
    text: "وقت استيقاظك ونومك، صلاتك، عملك، رياضتك، وما يشوّش يومك.",
  },
  {
    icon: Moon,
    title: "خطّة يوم لك وحدك",
    text: "فترات مرتّبة على مواقيت مدينتك، مع سبب عملي لكل فترة.",
  },
  {
    icon: Bell,
    title: "تذكير في وقته",
    text: "إشعار عند دخول وقت الصلاة، وقبل وردك، وقبل نومك.",
  },
];

const FEATURES = [
  {
    icon: Sunrise,
    title: "أذكار الصباح والمساء والنوم",
    text: "بعدد التكرار ومصدر كل ذكر، وتُسجّل إنجازك يوميًا.",
  },
  {
    icon: BookOpen,
    title: "مصحف بصفحات كالورقي",
    text: "البسملة مفصولة عن السورة، ورقم كل آية في دائرة، وعلامة قراءة.",
  },
  {
    icon: ScrollText,
    title: "أحاديث مبوّبة على حاجتك",
    text: "مغفرة الذنوب، استجابة الدعاء، فكّ الكرب، الصبر، الرزق، برّ الوالدين…",
  },
  {
    icon: Feather,
    title: "شعر جاهلي في العزيمة",
    text: "من المعلّقات ودواوين الشعراء الجاهليين، ومع كل بيت خطوة عملية.",
  },
  {
    icon: CalendarHeart,
    title: "رمضان والأعياد والمناسبات",
    text: "عدّاد لأيام رمضان وعرفة والأيام البيض، وأفضل عمل لكل مناسبة بمصدره.",
  },
  {
    icon: WifiOff,
    title: "يعمل دون إنترنت",
    text: "ثبّته على جهازك، ونزّل المصحف مرة واحدة، ثم اقرأ بلا شبكة.",
  },
];

const AUDIENCE = [
  "تبدأ من الصفر وتريد نظامًا واقعيًا لا مثاليًا",
  "تصلي لكن تريد خشوعًا، لا حركات فقط",
  "عندك رغبة في ورد ثابت ولا تعرف من أين تبدأ",
  "تسهر وتصحو متأخرًا، وتريد انتظامًا تدريجيًا",
];

const HERO_POINTS = [
  "مواقيت دقيقة بالموقع أو باسم مدينتك",
  "تذكير يعمل داخل التطبيق وخارجه",
  "كل نص بمصدره وراويه",
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.5 },
};

const ADHKAR_TOTAL = ADHKAR_GROUPS.reduce((total, group) => total + group.items.length, 0);

export default function Landing() {
  const install = useInstallPrompt();

  const stats = [
    { value: arabicNumber(HADITHS.length), label: `حديثًا في ${arabicNumber(HADITH_SECTIONS.length)} بابًا` },
    { value: arabicNumber(ADHKAR_TOTAL), label: "ذكرًا بمصادرها" },
    { value: arabicNumber(SURAHS.length), label: "سورة كاملة" },
    { value: arabicNumber(POEMS.length), label: "بيتًا من الشعر الجاهلي" },
  ];

  return (
    <div className="min-h-screen">
      <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-white shadow-lg shadow-sky-500/25">
              <Sparkles className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold">سكينة</span>
              <span className="block text-[11px] text-muted-foreground">
                ترتيب يومك حول الصلاة
              </span>
            </span>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { href: "#how", label: "كيف يعمل" },
              { href: "#features", label: "المزايا" },
              { href: "#content", label: "المحتوى" },
              { href: "#audience", label: "لمن؟" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-xs font-medium text-foreground/70 transition-colors hover:bg-white/60 hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            {install.canInstall ? (
              <Button
                variant="ghost"
                className="hidden rounded-full text-xs sm:flex"
                onClick={() => void install.promptInstall()}
              >
                <Smartphone className="size-3.5" />
                تثبيت
              </Button>
            ) : null}
            <Button asChild variant="ghost" className="rounded-full text-xs">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
            <Button asChild className="rounded-full text-xs">
              <Link to="/auth?returnTo=%2Fonboarding">ابدأ الآن</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 pt-14 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="glass-tile inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-foreground/75">
              <Moon className="size-3.5 text-primary" />
              مصمّم لمن يبدأ الالتزام الآن
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-[1.35] tracking-tight sm:text-[2.6rem] sm:leading-[1.3]">
              يسألك عن يومك أولًا،
              <br />
              ثم يرتّبه حول
              <span className="text-primary"> الصلاة والذكر</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-foreground/75">
              مواقيت صلاتك بدقة، أذكار الصباح عند استيقاظك وأذكار النوم قبل فراشك، مصحف
              يعمل دون إنترنت، أحاديث مبوّبة على ما تحتاجه، ومواعيد رمضان والأعياد.
              تتذكّر أنت، ويبقى عليك أن تنفّذ.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7 text-sm">
                <Link to="/auth?returnTo=%2Fonboarding">
                  ابدأ الأسئلة الخمسة عشر
                  <Compass className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6 text-sm">
                <Link to="/auth">لدي حساب</Link>
              </Button>
            </div>

            <ul className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
              {HERO_POINTS.map((point) => (
                <li key={point} className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-emerald-500" />
                  {point}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.15 }}
            className="relative"
          >
            <div className="absolute -right-6 -top-6 size-40 rounded-full bg-sky-300/40 blur-3xl" />
            <div className="absolute -bottom-8 -left-4 size-44 rounded-full bg-amber-200/40 blur-3xl" />

            <GlassCard strong className="relative p-6">
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span>ذكر اليوم</span>
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-3" /> القاهرة
                </span>
              </div>

              <div className="mt-4 rounded-3xl bg-gradient-to-br from-sky-500/12 via-white/40 to-indigo-400/12 p-5 text-center">
                <p className="quran-text text-[1.15rem] leading-10">
                  ﴿أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ﴾
                </p>
                <p className="mt-1 text-[11px] font-medium text-primary">الرعد: ٢٨</p>
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  { icon: Moon, title: "صلاة الفجر", time: "٥:١٦ صباحًا" },
                  { icon: BookOpen, title: "ورد القرآن", time: "بعد الفجر" },
                  { icon: Sunrise, title: "أذكار الصباح", time: "عند الاستيقاظ" },
                  { icon: Sunset, title: "أذكار المساء", time: "قبل النوم" },
                ].map((row) => (
                  <div
                    key={row.title}
                    className="glass-tile flex items-center justify-between rounded-2xl px-4 py-3"
                  >
                    <span className="flex items-center gap-2.5 text-xs font-medium">
                      <span className="flex size-8 items-center justify-center rounded-xl bg-primary/12 text-primary">
                        <row.icon className="size-4" />
                      </span>
                      {row.title}
                    </span>
                    <span className="text-[11px] text-muted-foreground">{row.time}</span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex items-center justify-between rounded-2xl bg-white/60 px-4 py-3 text-[11px]">
                <span>الصلوات في وقتها</span>
                <span className="font-semibold text-primary">٣ / ٥</span>
              </div>
            </GlassCard>

            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="glass-strong absolute -bottom-5 right-6 rounded-2xl px-4 py-2 text-[11px] font-medium"
            >
              🕌 إشعار عند الأذان
            </motion.span>
          </motion.div>
        </div>
      </section>

      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <motion.h2 {...fadeUp} className="text-center text-2xl font-bold tracking-tight">
          ثلاث خطوات فقط
        </motion.h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-muted-foreground">
          لا إعدادات معقّدة، ولا جداول تديرها بنفسك.
        </p>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.div
              key={step.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: index * 0.08 }}
            >
              <GlassCard hover className="h-full p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <step.icon className="size-5" />
                </span>
                <p className="mt-4 text-[11px] font-semibold text-muted-foreground">
                  الخطوة {arabicNumber(index + 1)}
                </p>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-foreground/70">{step.text}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <motion.h2 {...fadeUp} className="text-center text-2xl font-bold tracking-tight">
          ما يوجد داخله
        </motion.h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-muted-foreground">
          ستة أبواب تعمل معًا: الصلاة، الذكر، القرآن، الحديث، الشعر، والمناسبات.
        </p>

        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature, index) => (
            <motion.div
              key={feature.title}
              {...fadeUp}
              transition={{ duration: 0.5, delay: (index % 3) * 0.08 }}
            >
              <GlassCard hover className="h-full p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/20 to-indigo-400/20 text-primary">
                  <feature.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{feature.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-foreground/70">{feature.text}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      <section id="content" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <GlassCard strong className="p-6 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">المحتوى وأرقامه</h2>
              <p className="mt-3 text-sm leading-7 text-foreground/75">
                كل نص في التطبيق مذكور معه راويه أو مصدره، وما لم يثبت شرعًا نُبّهن عليه
                بصراحة بدل تمريره.
              </p>
              <div className="mt-6 grid grid-cols-2 gap-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="glass-tile rounded-2xl p-4">
                    <p className="text-xl font-bold text-primary">{stat.value}</p>
                    <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <ul className="space-y-3">
              {[
                `مواقيت الصلاة من خدمة مواقيت موثوقة، تُحسب على إحداثياتك أو مدينتك`,
                `القرآن بالرسم العثماني، مع نسخة محفوظة داخل التطبيق تعمل دون شبكة`,
                `${arabicNumber(OCCASIONS.length)} مناسبة دينية بمواعيدها الهجرية وبأفضل عمل فيها`,
                "أحاديث مبوّبة في ١٨ بابًا: من مغفرة الذنوب إلى فكّ الكرب واستجابة الدعاء",
                "أذكار الصباح والمساء والنوم وبعد الصلاة وعند الهمّ",
                "تنبيه صريح لما لا يثبت فيه عمل مخصّوص، مثل ليلة النصف من شعبان",
              ].map((item) => (
                <li
                  key={item}
                  className="glass-tile flex items-start gap-3 rounded-2xl p-4 text-[13px] leading-6"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </section>

      <section id="audience" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <GlassCard strong className="p-6 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">صُنع لك إن كنت في البداية</h2>
              <p className="mt-3 text-sm leading-7 text-foreground/75">
                لا يطلب منك أن تكون ملتزمًا لتستخدمه؛ يبدأ معك من صلاة واحدة في وقتها،
                وذكر في مكانه، وورد لا تتركه.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild size="lg" className="rounded-full px-7 text-sm">
                  <Link to="/auth?returnTo=%2Fonboarding">ابدأ بخطّتي</Link>
                </Button>
                {install.canInstall ? (
                  <Button
                    size="lg"
                    variant="outline"
                    className="rounded-full px-6 text-sm"
                    onClick={() => void install.promptInstall()}
                  >
                    <Smartphone className="size-4" />
                    ثبّت التطبيق
                  </Button>
                ) : null}
              </div>
            </div>

            <ul className="space-y-3">
              {AUDIENCE.map((item) => (
                <li
                  key={item}
                  className="glass-tile flex items-start gap-3 rounded-2xl p-4 text-[13px] leading-6"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                    <Check className="size-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </GlassCard>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <GlassCard strong className="relative overflow-hidden p-8 text-center sm:p-12">
          <div className="absolute -left-10 top-0 size-52 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="absolute -right-8 bottom-0 size-52 rounded-full bg-sky-300/30 blur-3xl" />
          <p className="quran-text relative text-2xl leading-[2.4]">﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾</p>
          <h2 className="relative mt-5 text-2xl font-bold tracking-tight">
            ابدأ بسؤال واحد: متى تستيقظ؟
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            أكمل الأسئلة الخمسة عشر، وسيظهر لك «ذكر اليوم» مباشرة مع مواقيتك وأذكارك ووردك.
          </p>
          <Button asChild size="lg" className="relative mt-7 rounded-full px-8 text-sm">
            <Link to="/auth?returnTo=%2Fonboarding">
              ابدأ الآن
              <Compass className="size-4" />
            </Link>
          </Button>
        </GlassCard>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            سكينة — ترتيب يومك حول الصلاة
          </span>
          <span>كل نص بمصدره • مواقيت بحسب مدينتك أو موقعك • يعمل دون إنترنت</span>
        </div>
      </footer>
    </div>
  );
}
