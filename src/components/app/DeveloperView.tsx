/**
 * PHASE 3.x — «المطوّر».
 *
 * **صفحة منتج، لا سيرة ذاتية.** الفرق: السيرة تفتخر، والصفحة تعرّف.
 * فكل بطاقة هنا تجيب سؤالًا: من هذا، لماذا، كيف تواصل، كيف تدعم،
 * كيف تشارك. ولا تخرج عن ذلك.
 *
 * **لا اسم مستخدم في الواجهة أبدًا.** الحسابات في `developer.ts`،
 * والواجهة تعرض اسم المنصة فقط. فمن يعرف الرابط يفتحه، ومن لا يعرفه
 * لا يحتاج أن يعرف: ثلاث بطاقات مرتّبة، لا معرّفات متناثرة.
 *
 * **لا رقم محفظة في الصفحة.** يظهر في نافذة الدعم وحدها.
 *
 * **الترتيب هو الحجة:** من ← لماذا ← تواصل ← ادعم ← شارك ← بيانات.
 */

import { SupportDialog } from "@/components/app/SupportDialog";
import { Editorial, Tag } from "@/components/app/Surfaces";
import {
  ActionButton,
  ElevatedCard,
  HeroCard,
  SecondaryButton,
  SectionHeader,
} from "@/components/oud/primitives";
import { APP_VERSION } from "@/lib/app-meta";
import {
  APP_CREDITS,
  DEVELOPER,
  FEEDBACK,
  SHARE_OUD,
  SOCIAL_PLATFORM_DESCRIPTIONS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  SUPPORT,
  WHY_OUD,
  hasLinkFor,
  shareOud,
  socialHref,
  type SocialPlatform,
} from "@/lib/developer";
import { ArrowUpLeft, Instagram, Music2, Send, Share2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useCallback, useState } from "react";

/** عناوين الأقسام تقنية، لا شخصية. */
const SOCIAL_TITLE = "تواصل معي";
const SOCIAL_HINT = "ثلاث قنوات مفتوحة. اختار ما يناسبك.";

/**
 * أيقونة كل منصة. مكتبة الأيقونات لا تحمل شعارات تجارية، فهذه رموز مجردة
 * تقابل وظيفة المنصة لا علامتها: ورقة إرسال، ومربع، ونغمة قصيرة.
 */
const SOCIAL_ICONS: Record<SocialPlatform, LucideIcon> = {
  telegram: Send,
  instagram: Instagram,
  tiktok: Music2,
};

/**
 * بطاقة حساب واحدة.
 *
 * **اسم المنصة فقط.** لا `handle`، ولا نصّ يُشتقّ من الرابط. والاسم
 * الفعلي للقارئ يأتي من الرابط نفسه عند الفتح، لا من تسميتنا له.
 */
function SocialCard({ platform }: { platform: SocialPlatform }) {
  const Icon = SOCIAL_ICONS[platform];
  const label = SOCIAL_PLATFORM_LABELS[platform];
  const description = SOCIAL_PLATFORM_DESCRIPTIONS[platform];
  const href = socialHref(platform);

  // **بلا رابط: بطاقة صادقة بلا زر.** «قريبًا» أصدق من فتح صفحة خطأ،
  // ومخترع رابط لا يكلّف شيئا في اللحظة وكلّف حسابا حقيقيا في الثانية.
  if (!href) {
    return (
      <div
        className="oud-card flex items-center gap-3.5 rounded-3xl p-4 opacity-70"
        aria-label={`${label} — ${description}. الرابط قيد الإضافة`}
      >
        <span className="oud-icon-tile oud-icon-md shrink-0" aria-hidden>
          <Icon className="size-5" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold text-foreground">{label}</span>
          <span className="label-meta block text-muted-foreground">{description}</span>
        </span>
        <Tag>قريبًا</Tag>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — ${description}. يفتح في تطبيق جديد`}
      className="oud-press oud-card oud-tap focus-ring flex items-center gap-3.5 rounded-3xl p-4"
    >
      <span className="oud-icon-tile oud-icon-md shrink-0" aria-hidden>
        <Icon className="size-5" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-foreground">{label}</span>
        <span className="label-meta block text-muted-foreground">{description}</span>
      </span>
      {/* سهم الخارج: في RTL يبدأ من اليمين، فالسهم إلى اليسار. */}
      <ArrowUpLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

export function DeveloperView() {
  const [supportOpen, setSupportOpen] = useState(false);
  const [shared, setShared] = useState(false);

  const onShare = useCallback(async () => {
    const url = typeof window === "undefined" ? "" : window.location.origin;
    // المنطق كله في `shareOud`: المشاركة الأصلية أولا، والنسخ بديل.
    // هنا أثر العرض فقط، حتى يبقى السلوك مغطى باختبار.
    const outcome = await shareOud({ url });
    setShared(outcome === "copied");
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* ١ — Identity. البطل الوحيد في الصفحة: monogram جليّ ثم اسم ودور. */}
      <HeroCard className="motion-swap overflow-hidden p-6 text-center sm:p-8">
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-20 start-1/2 size-72 -translate-x-1/2 rounded-full bg-[radial-gradient(circle,oklch(0.88_0.06_250/0.6),transparent_66%)]" />
        </div>
        <div className="relative flex flex-col items-center gap-3">
          <span className="oud-icon-tile oud-icon-xl" aria-hidden>
            <span className="text-[15px] font-bold tracking-[0.1em] text-primary">
              {DEVELOPER.monogram}
            </span>
          </span>
          <h1 className="text-[24px] leading-9 font-bold text-foreground">{DEVELOPER.name}</h1>
          <p className="label-meta text-muted-foreground">{DEVELOPER.role}</p>
          <p className="label-body mt-1 max-w-md text-foreground/85">{DEVELOPER.statement}</p>
        </div>
      </HeroCard>

      {/* ٢ — Why. ورق تحريري: مسألة فكرية، لا عنصر واجهة. */}
      <Editorial className="p-5 sm:p-6">
        <p className="eyebrow" style={{ color: "var(--editorial-ink)" }}>
          الفكرة
        </p>
        <h2 className="mt-1 text-[19px] leading-7 font-bold" style={{ color: "var(--editorial-ink)" }}>
          {WHY_OUD.title}
        </h2>
        <p className="label-body mt-2.5" style={{ color: "var(--editorial-ink)" }}>
          {WHY_OUD.body}
        </p>
      </Editorial>

      {/* ٣ — Social. ثلاث بطاقات كبيرة. اسم المنصة فقط، ولا شيفرة مستودع. */}
      <section aria-label={SOCIAL_TITLE} className="flex flex-col gap-3">
        <SectionHeader title={SOCIAL_TITLE} subtitle={SOCIAL_HINT} />
        <ul className="flex flex-col gap-2.5">
          {SOCIAL_PLATFORMS.map((platform) => (
            <li key={platform}>
              <SocialCard platform={platform} />
            </li>
          ))}
        </ul>
        {hasLinkFor(FEEDBACK.via) ? (
          <SecondaryButton
            icon={Send}
            className="self-start"
            onClick={() => window.open(socialHref(FEEDBACK.via) ?? "", "_blank", "noopener,noreferrer")}
            aria-label={`${FEEDBACK.label} — يفتح محادثة مباشرة`}
          >
            {FEEDBACK.label}
          </SecondaryButton>
        ) : null}
      </section>

      {/* ٤ — Support. عن التطبيق، لا عن شخص. الرقم داخل النافذة وحدها. */}
      <ElevatedCard className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="min-w-0 flex-1">
            <p className="label-meta text-muted-foreground">مساهمة في استمرار المشروع</p>
            <h2 className="mt-0.5 text-[17px] leading-7 font-bold text-foreground">{SUPPORT.title}</h2>
            <p className="label-body mt-1 text-muted-foreground">{SUPPORT.lead}</p>
            <p className="label-meta mt-1 text-muted-foreground">{SUPPORT.note}</p>
          </div>
          <ActionButton onClick={() => setSupportOpen(true)} className="shrink-0 px-5">
            {SUPPORT.button}
          </ActionButton>
        </div>
      </ElevatedCard>

      {/* ٥ — Share. النص يصف ما يفعله التطبيق، لا من يروّج له. */}
      <ElevatedCard className="p-5 sm:p-6">
        <SectionHeader title={SHARE_OUD.title} subtitle={SHARE_OUD.text} />
        <div className="mt-3.5">
          <SecondaryButton
            icon={Share2}
            onClick={() => void onShare()}
            state={shared ? "success" : "default"}
            aria-label={`${SHARE_OUD.button} — ${SHARE_OUD.text}`}
          >
            {shared ? SHARE_OUD.copiedLabel : SHARE_OUD.button}
          </SecondaryButton>
        </div>
      </ElevatedCard>

      {/* ٦ — Credits. الإصدار من الحزمة، لا من ذاكرة الكاتب. */}
      <footer className="px-1 text-center">
        <p className="text-[15px] font-bold text-foreground">{APP_CREDITS.product}</p>
        <p className="label-meta mt-0.5 text-muted-foreground">{APP_CREDITS.tagline}</p>
        <p className="label-meta mt-2 text-muted-foreground">{APP_CREDITS.madeIn}</p>
        <p className="label-meta mt-0.5 text-muted-foreground">الإصدار {APP_VERSION}</p>
      </footer>

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
