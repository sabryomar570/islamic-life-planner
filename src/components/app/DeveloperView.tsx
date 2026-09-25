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
import {
  Editorial,
  Panel,
  PrimaryButton,
  QuietButton,
  SectionHead,
  Tag,
} from "@/components/app/Surfaces";
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

  const shell =
    "surface-secondary rounded-2xl p-4 transition-colors duration-200";

  // بلا رابط: بطاقة صادقة بلا زر. «قريبًا» أصدق من فتح صفحة خطأ.
  if (!href) {
    return (
      <div
        className={shell}
        aria-label={`${label} — ${description}. الرابط قيد الإضافة`}
      >
        <div className="flex items-center gap-3">
          <span
            className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
            aria-hidden
          >
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="min-w-0 flex-1">
            <span className="label-section block text-foreground">{label}</span>
            <span className="label-meta block text-muted-foreground">{description}</span>
          </span>
          <Tag>قريبًا</Tag>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} — ${description}. يفتح في تطبيق جديد`}
      className={`${shell} motion-press block hover:bg-white/80 focus-ring`}
    >
      <div className="flex items-center gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
          aria-hidden
        >
          <Icon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="label-section block text-foreground">{label}</span>
          <span className="label-meta block text-muted-foreground">{description}</span>
        </span>
        {/* سهم الخارج: في RTL يبدأ من اليمين، فالسهم إلى اليسار. */}
        <ArrowUpLeft className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </div>
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
    <div className="stack">
      {/* ١ — من. بطل الشاشة: الاسم والدور والفكرة في مساحة واحدة. */}
      <Panel className="motion-swap p-5 sm:p-6">
        <div className="flex items-start gap-4">
          {/* Monogram بدل صورة. لا صورة شخصية في المشروع، ولا تخترع. */}
          <span
            className="grid size-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"
            aria-hidden
          >
            <span className="label-section tracking-[0.08em]">{DEVELOPER.monogram}</span>
          </span>
          <div className="min-w-0 flex-1">
            <p className="eyebrow">{DEVELOPER.role}</p>
            <h1 className="label-display mt-1 text-foreground">{DEVELOPER.name}</h1>
          </div>
        </div>

        <p className="label-body mt-4 text-foreground/85">{DEVELOPER.statement}</p>
      </Panel>

      {/* ٢ — لماذا. ورق تحريري لا زجاج: مسألة فكرية لا عنصر واجهة. */}
      <Editorial className="p-5 sm:p-6">
        <p className="eyebrow" style={{ color: "var(--editorial-ink)" }}>
          الفكرة
        </p>
        <h2 className="label-display mt-1" style={{ color: "var(--editorial-ink)" }}>
          {WHY_OUD.title}
        </h2>
        <p
          className="label-body mt-3 leading-[2]"
          style={{ color: "var(--editorial-ink)" }}
        >
          {WHY_OUD.body}
        </p>
      </Editorial>

      {/* ٣ — تواصل. ثلاث بطاقات، لا أكثر. */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          eyebrow="قنوات"
          title="تواصل معي"
          hint="ثلاث قنوات مفتوحة. اختار ما يناسبك."
        />
        <ul className="stack-sm mt-4">
          {SOCIAL_PLATFORMS.map((platform) => (
            <li key={platform}>
              <SocialCard platform={platform} />
            </li>
          ))}
        </ul>

        {/* اقتراح أو ملاحظة: قناة موجودة فعلا، لا نظام تذاكر جديد. */}
        {hasLinkFor(FEEDBACK.via) ? (
          <div className="rule-t mt-4 pt-4">
            <p className="label-meta text-muted-foreground">{FEEDBACK.hint}</p>
            <QuietButton
              className="mt-2"
              onClick={() => window.open(socialHref(FEEDBACK.via) ?? "", "_blank", "noopener,noreferrer")}
              aria-label={`${FEEDBACK.label} — يفتح محادثة مباشرة`}
            >
              <Send className="size-3.5" aria-hidden />
              {FEEDBACK.label}
            </QuietButton>
          </div>
        ) : null}
      </Panel>

      {/* ٤ — الدعم. عن التطبيق، لا عن شخص. */}
      <Panel className="p-5 sm:p-6">
        <SectionHead eyebrow="مساهمة في استمرار المشروع" title={SUPPORT.title} />
        <p className="label-body mt-3 text-foreground/85">{SUPPORT.lead}</p>
        <p className="label-meta mt-2 text-muted-foreground">{SUPPORT.note}</p>
        <PrimaryButton className="mt-4" onClick={() => setSupportOpen(true)}>
          {SUPPORT.button}
        </PrimaryButton>
      </Panel>

      {/* ٥ — شارك. النص يصف ما يفعله التطبيق، لا من يروّج له. */}
      <Panel className="p-5 sm:p-6">
        <SectionHead
          title={SHARE_OUD.title}
          hint={SHARE_OUD.text}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <QuietButton
            state={shared ? "success" : "default"}
            onClick={() => void onShare()}
            aria-label={`${SHARE_OUD.button} — ${SHARE_OUD.text}`}
          >
            <Share2 className="size-3.5" aria-hidden />
            {shared ? SHARE_OUD.copiedLabel : SHARE_OUD.button}
          </QuietButton>
        </div>
      </Panel>

      {/* ٦ — بيانات. الإصدار من الحزمة، لا من ذاكرة الكاتب. */}
      <footer className="px-1 pt-1 text-center">
        <p className="label-section text-foreground">{APP_CREDITS.product}</p>
        <p className="label-meta mt-1 text-muted-foreground">{APP_CREDITS.tagline}</p>
        <p className="label-meta mt-2 text-muted-foreground">{APP_CREDITS.madeIn}</p>
        <p className="label-meta mt-1 text-muted-foreground">
          الإصدار {APP_VERSION}
        </p>
      </footer>

      <SupportDialog open={supportOpen} onOpenChange={setSupportOpen} />
    </div>
  );
}
