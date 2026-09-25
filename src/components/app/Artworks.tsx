/**
 * PHASE 3 — رسوم تجريدية هادئة.
 *
 * **ليست صورًا.** كلها SVG مبنيّة من أشكال هندسية، ترث ألوان نظام التصميم
 * عبر `currentColor` ومتغيرات CSS. لا ملف خارجي، ولا بايت إضافي في الحزمة
 * خارج الشيفرة نفسها، ولا اعتماد جديد.
 *
 * **قاعدة الرسم:** خط واحد رفيع، ولا تدرّج لوني، ولا ظل. التدرّجات في هذا
 * التطبيق الوحيد هو الخلفية. الرسم هنا إشارة لا زينة: يوحي بالمعنى
 * في قراءة واحدة ثم يتوارى.
 *
 * كل الرسوم `aria-hidden` لأن لفظها ليس زخرفا ولا يضيف معنى لقرأ الشاشة.
 */

export type ArtworkName = "prayer" | "habits" | "review" | "hadith" | "progress";

/** مقاس موحد حتى لا يقفز شيء عند التبديل بين الأقسام. */
const BOX = 48;

type ArtworkProps = {
  name: ArtworkName;
  className?: string;
  /** خفة الرسم. الافتراضي متوسط يليق بلوح صغير. */
  tone?: "soft" | "normal";
};

const STROKE = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** هلال: رمز الفجر والوقت في التقويم الإسلامي. */
function Crescent() {
  return (
    <g {...STROKE}>
      <path d="M31 9a17 17 0 1 0 8 20 14 14 0 0 1-8-20Z" />
    </g>
  );
}

/** الصلاة: ظلّ مسجد مبسّط جداً — قوس واحد وعمودان وقبة. */
function Mosque() {
  return (
    <g {...STROKE}>
      <path d="M7 38h34" />
      <path d="M11 38V26a13 13 0 0 1 26 0v12" />
      <path d="M24 13V8" />
      <path d="M15 38v-8a4 4 0 0 1 8 0v8" />
      <path d="M25 38v-8a4 4 0 0 1 8 0v8" />
    </g>
  );
}

/** العادات: مسار وخطوات صاعدة نحو نقطة. */
function Path() {
  return (
    <g {...STROKE}>
      <path d="M8 40c6 0 8-6 8-11s-3-7-3-11 4-8 10-8h17" />
      <circle cx="8" cy="40" r="2" />
      <circle cx="40" cy="10" r="2.5" />
    </g>
  );
}

/** المراجعة: مرآة وقلم — لا صورة وجه، فقط إطار وانعكاس. */
function Mirror() {
  return (
    <g {...STROKE}>
      <path d="M24 6c8 0 13 6 13 14s-5 15-13 22c-8-7-13-14-13-22S16 6 24 6Z" />
      <path d="M18 18c3-3 7-4 10-2" />
      <path d="M24 32v6" />
    </g>
  );
}

/** الحديث: صفحة مفتوحة وخطّان — الكتاب لا الصورة. */
function OpenPage() {
  return (
    <g {...STROKE}>
      <path d="M24 12c-4-3-9-4-16-3v26c7-1 12 0 16 3" />
      <path d="M24 12c4-3 9-4 16-3v26c-7-1-12 0-16 3" />
      <path d="M24 12v26" />
      <path d="M12 19h7" />
      <path d="M29 19h7" />
    </g>
  );
}

/** التقدّم: مدار ونقطة تدور — رحلة لا سباق. */
function Orbit() {
  return (
    <g {...STROKE}>
      <circle cx="24" cy="24" r="16" opacity="0.45" />
      <path d="M24 8a16 16 0 0 1 14 8" />
      <circle cx="24" cy="24" r="4" />
      <circle cx="36" cy="15" r="2" />
    </g>
  );
}

const ART: Record<ArtworkName, () => React.ReactElement> = {
  prayer: Mosque,
  habits: Path,
  review: Mirror,
  hadith: OpenPage,
  progress: Orbit,
};

/**
 * رسم واحد. `aria-hidden` دائمًا: هو تمييز بصري لا معلومة، وقارئ الشاشة
 * لا يحتاج وصفًا لـ«هلال في أعلى زاوية».
 */
export function Artwork({ name, className, tone = "normal" }: ArtworkProps) {
  const Shape = ART[name];
  return (
    <svg
      viewBox={`0 0 ${BOX} ${BOX}`}
      width={BOX}
      height={BOX}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{
        color: "var(--primary)",
        opacity: tone === "soft" ? 0.55 : 0.8,
        flexShrink: 0,
      }}
    >
      <Shape />
    </svg>
  );
}

/** نسخة هلال وحدها — لشريط الترويسة حين تكون المساحة ضيقة جدًا. */
export function CrescentMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={20}
      height={20}
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{ color: "var(--primary)", opacity: 0.75, flexShrink: 0 }}
    >
      <Crescent />
    </svg>
  );
}
