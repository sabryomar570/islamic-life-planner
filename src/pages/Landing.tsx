import { GlassCard } from "@/components/app/GlassCard";
import { Button } from "@/components/ui/button";
import { HADITHS } from "@/data/hadith";
import { POEMS } from "@/data/poetry";
import { ADHKAR_GROUPS } from "@/data/adhkar";
import { SURAHS } from "@/data/quran";
import { arabicNumber } from "@/lib/time";
import { motion } from "framer-motion";
import {
  BookOpen,
  CalendarClock,
  Check,
  Clock,
  Compass,
  Feather,
  Heart,
  ListChecks,
  Moon,
  Quote,
  ScrollText,
  Sparkles,
  Sunrise,
  Sunset,
} from "lucide-react";
import { Link } from "react-router";

const STEPS = [
  {
    icon: ListChecks,
    title: "١٥ سؤالًا عن نظام حياتك",
    text: "متى تستيقظ وتنام، صلَاتك، عملك، رياضتك، وما يشوّش يومك — إجاباتك هي الأساس.",
  },
  {
    icon: CalendarClock,
    title: "خطّة يوم مصمّمة لك",
    text: "نبني فترات يومك بالدقيقة: الفجر وأذكار الصباح، الرياضة، العمل، ورد القرآن، والعائلة.",
  },
  {
    icon: Sparkles,
    title: "تذكير يُلازمك",
    text: "تنبيه عند دخول وقت الصلاة، وأذكار المساء وأذكار النوم في مكانها من خطّتك.",
  },
];

const FEATURES = [
  {
    icon: Sunrise,
    title: "أذكار الصباح عند الاستيقاظ",
    text: "١٦ ذكرًا كاملًا بترتيب حصن المسلم مع عدد التكرار والمصدر والفضل.",
  },
  {
    icon: Sunset,
    title: "أذكار المساء وأذكار النوم",
    text: "لا تنم قبل أن تذكر ربك: آية الكرسي والمعوذات وسيد الاستغفار وتسبيح فاطمة.",
  },
  {
    icon: Clock,
    title: "مواقيت الصلاة والتذكير",
    text: "مواقيت مدينتك على مدار اليوم، وسجّل لكل صلاة: جماعة، في الوقت، أو متأخرة.",
  },
  {
    icon: ScrollText,
    title: "أحاديث الخشوع بالراوي والمصدر",
    text: "كروت تجمع نص الحديث والراوي والمصدر ودرسًا عمليًا يُقوّي قلبك في الصلاة.",
  },
  {
    icon: BookOpen,
    title: "القرآن الكريم كاملًا",        text: "١١٤ سورة بالنص العثماني مع فهرس للبحث وتتبّع آخر ما قرأت ووردك اليومي.",
  },
  {
    icon: Feather,
    title: "أبيات تحفّزك",
    text: "شعر عربي في العزيمة والشجاعة والرياضة، مع معنى يربط البيت بحياتك اليومية.",
  },
];

const AUDIENCE = [
  "بدأتَ للتو وتريد ترتيب يومك حول الصلاة دون تعقيد",
  "تُصلّي لكن قلبك مشغول، وتريد الخشوع لا الحركات فقط",
  "تريد وردًا ثابتًا من القرآن ولا تعرف من أين تبدأ",
  "تسهر وتستيقظ متأخرًا، وتريد نظامًا واقعيًا لا مثاليًا",
];

const fadeUp = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.5 },
};

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* الشريط العلوي */}
      <header className="glass-strong sticky top-0 z-40 rounded-none border-x-0 border-t-0 border-b border-white/70">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-400/90 to-indigo-400/90 text-white shadow-lg shadow-sky-500/25">
              <Sparkles className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block text-base font-bold">سكينة</span>
              <span className="block text-[11px] text-muted-foreground">
                رفيقك إلى الالتزام
              </span>
            </span>
          </div>

          <nav className="hidden items-center gap-1 lg:flex">
            {[
              { href: "#how", label: "كيف يعمل" },
              { href: "#features", label: "المزايا" },
              { href: "#hadith", label: "الأحاديث" },
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
            <Button asChild variant="ghost" className="rounded-full text-xs">
              <Link to="/auth">تسجيل الدخول</Link>
            </Button>
            <Button asChild className="rounded-full text-xs">
              <Link to="/auth?returnTo=%2Fonboarding">ابدأ الآن</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* الواجهة الرئيسية */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-10 pt-14 sm:px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="glass-tile inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-[11px] font-medium text-foreground/75">
              <Heart className="size-3.5 text-rose-500" />
              مصمّم للمبتدئين في الالتزام
            </span>
            <h1 className="mt-5 text-3xl font-bold leading-[1.35] tracking-tight sm:text-[2.7rem] sm:leading-[1.3]">
              يجيب على ١٥ سؤالًا عن يومك،
              <br />
              ثم يبني لك يومًا
              <span className="text-primary"> منظّمًا مليئًا بالذكر</span>
            </h1>
            <p className="mt-5 max-w-xl text-sm leading-7 text-foreground/75">
              سكينة يسألك أولًا: متى تصحو، متى تنام، كيف صلاتك، وما مواعيدك؟ ثم يُنظّم
              يومك، ويذكّرك بالصلاة، ويضع أذكار الصباح عند استيقاظك وأذكار المساء قبل
              نومك، مع أحاديث الخشوع والقرآن الكريم وأبيات تُشعل عزيمتك.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg" className="rounded-full px-7 text-sm">
                <Link to="/auth?returnTo=%2Fonboarding">
                  ابدأ الأسئلة الخمسة عشر
                  <Compass className="size-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="rounded-full px-6 text-sm">
                <Link to="/auth">لدي حساب بالفعل</Link>
              </Button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" /> يظهر لك «ذكر اليوم» أول ما
                تفتح
              </span>
              <span className="flex items-center gap-1.5">
                <Check className="size-3.5 text-emerald-500" /> كل نص بمصدره وراويه
              </span>
            </div>
          </motion.div>

          {/* نموذج بصري لشاشة «ذكر اليوم» */}
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
                <span>الاثنين • ١٠ ربيع الآخر</span>
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
                  { icon: Sparkles, title: "أذكار الصباح", time: "عند الاستيقاظ" },
                  { icon: Feather, title: "رياضة خفيفة", time: "بعد العصر" },
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
              🕌 تذكير عند الأذان
            </motion.span>
          </motion.div>
        </div>
      </section>

      {/* كيف يعمل */}
      <section id="how" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <motion.h2 {...fadeUp} className="text-center text-2xl font-bold tracking-tight">
          كيف يبني سكينة يومك؟
        </motion.h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-muted-foreground">
          ثلاث خطوات فقط، بلا إعدادات معقّدة ولا جداول تديرها بنفسك.
        </p>

        <div className="mt-9 grid gap-5 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <motion.div key={step.title} {...fadeUp} transition={{ duration: 0.5, delay: index * 0.08 }}>
              <GlassCard hover className="h-full p-6">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                  <step.icon className="size-5" />
                </span>
                <p className="mt-4 text-[11px] font-semibold text-muted-foreground">
                  الخطوة {index + 1}
                </p>
                <h3 className="mt-1 text-base font-semibold">{step.title}</h3>
                <p className="mt-2 text-[13px] leading-6 text-foreground/70">{step.text}</p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* المزايا */}
      <section id="features" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <motion.h2 {...fadeUp} className="text-center text-2xl font-bold tracking-tight">
          كل ما تحتاجه في مكان واحد
        </motion.h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-sm leading-6 text-muted-foreground">
          {arabicNumber(ADHKAR_GROUPS.reduce((total, group) => total + group.items.length, 0))}{" "}
          ذكرًا بمصادرها، و{arabicNumber(HADITHS.length)} حديثًا، و
          {arabicNumber(SURAHS.length)} سورة، و{arabicNumber(POEMS.length)} بيتًا من
          عيون الشعر.
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
                <p className="mt-2 text-[13px] leading-6 text-foreground/70">
                  {feature.text}
                </p>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </section>

      {/* الأحاديث والشعر */}
      <section id="hadith" className="mx-auto w-full max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <motion.div {...fadeUp}>
            <GlassCard strong className="h-full p-6 sm:p-7">
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <ScrollText className="size-5 text-primary" />
                كروت تُلين قلبك
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                أحاديث في الخشوع والصلاة، مع الراوي والمصدر ودرس عملي بعد كل حديث.
              </p>

              <div className="mt-6 space-y-4">
                {HADITHS.slice(0, 3).map((hadith) => (
                  <div key={hadith.id} className="glass-tile rounded-2xl p-5">
                    <Quote className="size-4 text-primary/50" />
                    <p className="mt-2 text-sm leading-7 font-medium">«{hadith.text}»</p>
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      الراوي: {hadith.narrator} — {hadith.source}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>

          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.1 }}>
            <GlassCard className="h-full p-6 sm:p-7">
              <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight">
                <Feather className="size-5 text-primary" />
                أبيات تُشعل عزيمتك
              </h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                في العزيمة والشجاعة والرياضة وطلب العلم — كل بيت بقائله وديوانه.
              </p>

              <div className="mt-6 space-y-4">
                {POEMS.slice(0, 3).map((poem) => (
                  <div key={poem.id} className="glass-tile rounded-2xl p-5 text-center">
                    <div className="poetry-text text-[1.05rem] leading-9">
                      {poem.lines.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                    <p className="mt-3 text-[11px] font-medium text-primary">
                      {poem.poet}
                    </p>
                    <p className="mt-0.5 text-[10px] text-muted-foreground">
                      {poem.source}
                    </p>
                  </div>
                ))}
              </div>
            </GlassCard>
          </motion.div>
        </div>
      </section>

      {/* لمن هذا الموقع */}
      <section id="audience" className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
        <GlassCard strong className="p-6 sm:p-9">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                صُنع لك إن كنت في البداية
              </h2>
              <p className="mt-3 text-sm leading-7 text-foreground/75">
                سكينة لا يطلب منك أن تكون ملتزمًا لتستخدمه، بل يرتّب لك الطريق خطوة
                خطوة: صلاة واحدة في وقتها، ذكر في مكانه، وورد لا تتركه.
              </p>
              <Button asChild size="lg" className="mt-7 rounded-full px-7 text-sm">
                <Link to="/auth?returnTo=%2Fonboarding">ابدأ بخطّتي الآن</Link>
              </Button>
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

      {/* الدعوة الأخيرة */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6">
        <GlassCard
          strong
          className="relative overflow-hidden p-8 text-center sm:p-12"
        >
          <div className="absolute -left-10 top-0 size-52 rounded-full bg-indigo-300/30 blur-3xl" />
          <div className="absolute -right-8 bottom-0 size-52 rounded-full bg-sky-300/30 blur-3xl" />
          <p className="quran-text relative text-2xl leading-[2.4]">
            ﴿وَأَقِمِ الصَّلَاةَ لِذِكْرِي﴾
          </p>
          <h2 className="relative mt-5 text-2xl font-bold tracking-tight">
            يومك أفضل يبدأ بذكر اليوم
          </h2>
          <p className="relative mx-auto mt-3 max-w-lg text-sm leading-6 text-muted-foreground">
            سجّل الدخول، أكمل الأسئلة الخمسة عشر، وسيصلك يوم منظّم مع أذكارك ومواقيت
            صلاتك ووردك — كل ذلك على شاشة واحدة.
          </p>
          <Button asChild size="lg" className="relative mt-7 rounded-full px-8 text-sm">
            <Link to="/auth?returnTo=%2Fonboarding">
              ابدأ الآن مجانًا
              <Compass className="size-4" />
            </Link>
          </Button>
        </GlassCard>
      </section>

      <footer className="mx-auto w-full max-w-6xl px-4 pb-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/60 pt-6 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles className="size-3.5 text-primary" />
            سكينة — رفيقك إلى الالتزام
          </span>
          <span>
            النصوص الشرعية من مصادرها المذكورة على كل كارت • مواقيت الصلاة بالتوقيت
            المحلي لمدينتك
          </span>
        </div>
      </footer>
    </div>
  );
}
