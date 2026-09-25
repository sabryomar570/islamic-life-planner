/**
 * PHASE 3.x — هوية المطوّر ووسيلة الدعم.
 *
 * **قاعدة واحدة: الروابط في مكان واحد، ولا تُعرض في مكان واحد آخر.**
 * كل Component يقرأ من هنا، فلا يكرّر رابطا ولا ينسخه. والعكس: ما في
 * هذا الملف لا يظهر للمستخدم إلا حيث يجب.
 *
 * **قاعدة أخطر: لا رابط مخترع.** إن كان حساب غير معروف برابطه الكامل
 * فالحقل `null`، والواجهة تعرض «قريبًا» بدل أن تفتح صفحة خاطئة. رابط
 * مخترع لا يكلّف شيئا في اللحظة، وكلّف حسابا حقيقيا في الثانية.
 *
 * وهذا الملف منطق خالص: بلا React وبلا Convex، ليبقى قابلا للاختبار آليا.
 */

/* ————————————————————— هوية المطوّر ————————————————————— */

export const DEVELOPER = {
  name: "عمر صبري",
  role: "Founder & Developer of OUD",
  /**
   * حروف بدل صورة. لا صورة ملف شخصي في المشروع، ولا يجوز اختلاق وجه.
   * Monogram اسم-product لا اسم شخص، فيبقى رهن الموضوع لا الفضول.
   */
  monogram: "OUD",
  /** الفكرة التي بُني عليها التطبيق — بنص صاحبها، لا بصياغتنا عنه. */
  statement:
    "بنيت OUD بفكرة بسيطة: أن تساعد التكنولوجيا المسلم على تنظيم يومه حول صلاته وعبادته، بدل أن تسرق منه يومه.",
} as const;

/** لماذا وُجد التطبيق. بلا أرقام ولا ادّعاءات — الأرقام تحتاج مصدرا. */
export const WHY_OUD = {
  title: "لماذا OUD؟",
  body: "OUD ليس تطبيق مهام تقليديًا. هو محاولة لبناء نظام حياة هادئ يساعدك على التخطيط، والالتزام، ومراجعة يومك، والعودة إلى الطريق عندما تتعثر.",
} as const;

/* ————————————————————— الحسابات ————————————————————— */

export type SocialPlatform = "telegram" | "instagram" | "tiktok";

/**
 * الترتيب مقصود: الأوضح أولا. **لا يعرض الـUI أي اسم مستخدم**،
 * فالرابط يصلح ولا يحتاج أن يُقرأ. أسماء المنصات وحدها تكفي.
 */
export const SOCIAL_PLATFORMS: readonly SocialPlatform[] = [
  "telegram",
  "instagram",
  "tiktok",
] as const;

/**
 * الروابط الفعلية. `null` تعني: **غير معروف بعد**، لا «لا يوجد».
 * الفرق كبير: الأول واجهة صادقة، والثاني ادّعاء.
 */
export const DEVELOPER_SOCIAL_LINKS: Readonly<Record<SocialPlatform, string | null>> = {
  telegram: "https://t.me/omarsaabry",
  instagram: "https://instagram.com/_rcfo",
  // الرابط الكامل لم يُكتب بعد. لا نخمّن آخر المعرّف: نُظهر «قريبًا».
  tiktok: null,
};

/** اسم المنصة كما يُعرض. لا اسم مستخدم، ولا يُشتقّ من الرابط. */
export const SOCIAL_PLATFORM_LABELS: Readonly<Record<SocialPlatform, string>> = {
  telegram: "Telegram",
  instagram: "Instagram",
  tiktok: "TikTok",
};

/** جملة القارئ لقارئ الشاشة. بلا رابط ولا اسم مستخدم. */
export const SOCIAL_PLATFORM_DESCRIPTIONS: Readonly<Record<SocialPlatform, string>> = {
  telegram: "محادثة مباشرة",
  instagram: "صور ومشاركات",
  tiktok: "مقاطع قصيرة",
};

/** هل لهذه المنصة رابط صالح اليوم؟ */
export function hasLinkFor(platform: SocialPlatform): boolean {
  return typeof DEVELOPER_SOCIAL_LINKS[platform] === "string";
}

/**
 * الرابط الجاهز للـ`href`، أو `null`.
 * **هذا هو الحارس الوحيد**:_component لا يمرر رابطا قط، فيصير
 * استخراج اسم المستخدم من الرابط مستحيلًا ببناء الشيفرة لا بالحارس.
 */
export function socialHref(platform: SocialPlatform): string | null {
  const url = DEVELOPER_SOCIAL_LINKS[platform];
  if (typeof url !== "string") return null;
  return isSafeExternalUrl(url) ? url : null;
}

/** رابط خارجي آمن فقط: `https` بلا `javascript:` ولا `data:`. */
export function isSafeExternalUrl(url: string): boolean {
  try {
    return new URL(url).protocol === "https:";
  } catch {
    return false;
  }
}

/* ————————————————————— الدعم ————————————————————— */

/**
 * **الدعم للتطبيق، لا للشخص.**
 * هنا لا يوجد «ادفع لي» ولا «محفظتي» ولا «حوّل لي». المحفظة أداة
 * supportive من أجل بقاء المشروع، واللغة تقال عن OUD لا عن صاحبها.
 */
export const SUPPORT = {
  title: "ادعم OUD",
  /** الغرض: التطبيق. */
  lead: "إذا ساعدك OUD ولو بخطوة واحدة، يمكنك دعم استمرار تطويره وتحسينه.",
  /** أن الدعم اختياري بوضوح، فلا يحسّ المستخدم بأنه مدين بشيء. */
  note: "الدعم اختياري، ويساعد في استمرار تطوير التطبيق وتحسين تجربته.",
  button: "ادعم OUD",
  dialogTitle: "دعم OUD",
  dialogLead:
    "شكرًا لرغبتك في دعم OUD. مساهمتك تساعد على استمرار تطوير التطبيق وتحسين تجربته.",
  methodLabel: "وسيلة الدعم",
  /** الرقم كما يُعرض: مجموعات بصرية تريح العين أثناء القراءة. */
  walletDisplay: "015 50324450",
  /** ما يُنسخ: أرقام فقط، لأن حقل المحفظة في We Pay يقبلها هكذا. */
  walletCopy: "01550324450",
  /** purpose صريح، حتى لا يظن أحد أنه يشتري خدمة أو اشتراكا. */
  purpose: "هذه المحفظة مخصصة لاستقبال دعم تطوير تطبيق OUD.",
  /** لا زر We Pay وهمي: لا deep link موثوق، فلا نعد بغير ما نقدر. */
  howTo:
    "يمكنك فتح We Pay وإرسال الدعم إلى رقم المحفظة أعلاه.",
  copyLabel: "نسخ الرقم",
  copiedLabel: "تم نسخ رقم المحفظة",
  copyFailedLabel: "تعذّر النسخ تلقائيًا. الرقم ظاهر، انسخه يدويًا.",
} as const;

/* ————————————————————— المشاركة ————————————————————— */

export const SHARE_OUD = {
  title: "شارك OUD",
  /** نص المشاركة: يصف ما يفعله التطبيق، لا من المعلِن. */
  text: "OUD — نظام حياة يساعدك على تنظيم يومك حول صلاتك وعبادتك.",
  button: "شارك OUD",
  copyLabel: "انسخ الرابط",
  copiedLabel: "تم نسخ رابط OUD",
} as const;

/** اقتراح أو ملاحظة: قناة حقيقية موجودة، فلا نصنع نظام تذاكر. */
export const FEEDBACK = {
  label: "اقتراح أو ملاحظة",
  hint: "ما ينقص OUD أن تسمعه منك مباشرة.",
  /** يُفتح عبر Telegram: قناة اتصال حقيقية موجودة في الإعدادات. */
  via: "telegram" as SocialPlatform,
} as const;

/* ————————————————————— الحافظة ————————————————————— */

/** واجهة الحافظة، واجهة فقط حتى يمكن اختبارها بمزيّف. */
export type ClipboardLike = { writeText: (text: string) => Promise<void> };

/**
 * ثلاث حالات لا اثنتين: نجحت، رُفضت، أو غير متاحة أصلا.
 * التمييز مهم: **«غير متاحة» ليست فشلًا**، فهي سياق غير آمن، والمستخدم
 * عنده حل آخر — الرقم أمامه ينسخه بيده. فلا نخبره بالخطأ وهو ليس مخطئًا.
 */
export type CopyResult = "copied" | "failed" | "unavailable";

function clipboardOf(clipboard?: ClipboardLike | null): ClipboardLike | null {
  if (clipboard) return clipboard;
  if (typeof navigator === "undefined") return null;
  const candidate = (navigator as Navigator & { clipboard?: ClipboardLike }).clipboard;
  return candidate && typeof candidate.writeText === "function" ? candidate : null;
}

/** ينسخ نصا ويعيد الحالة. **لا يرمي أبدا:** فشل الحافظة لا يُسقط واجهة. */
export async function copyToClipboard(
  text: string,
  clipboard?: ClipboardLike | null,
): Promise<CopyResult> {
  const target = clipboardOf(clipboard);
  if (!target) return "unavailable";
  try {
    await target.writeText(text);
    return "copied";
  } catch {
    return "failed";
  }
}

/* ————————————————————— المشاركة ————————————————————— */

/** واجهة `navigator.share`، واجهة فقط لتبقى قابلة للاختبار. */
export type ShareLike = (data: {
  title: string;
  text: string;
  url: string;
}) => Promise<void>;

/** ما نتج فعلا. `shared` لا تعني «نجح المستخدم»، بل «فُتحت ورقة المشاركة». */
export type ShareOutcome = "shared" | "copied" | "failed";

function shareOf(share?: ShareLike | null): ShareLike | null {
  if (share) return share;
  if (typeof navigator === "undefined") return null;
  const candidate = (navigator as Navigator & { share?: ShareLike }).share;
  return typeof candidate === "function" ? candidate.bind(navigator) : null;
}

/**
 * يشارك رابط OUD، ويرجع بالنسخ إن لم تتوفر المشاركة.
 *
 * **الترتيب مقصود:** المشاركة الأصلية أولا لأنها تعطي المستخدم اختيار
 * المستلم، والنسخ بديل لا بديل أول. فإن فشلت المشاركة — إلغاء أو رفض
 * المتصفح — ننسخ الرابط، فلا يخرج أحد بنقرة لم تفعل شيئا.
 */
export async function shareOud({
  url,
  share,
  clipboard,
}: {
  url: string;
  share?: ShareLike | null;
  clipboard?: ClipboardLike | null;
}): Promise<ShareOutcome> {
  const native = shareOf(share);
  if (native) {
    try {
      await native({ title: APP_CREDITS.product, text: SHARE_OUD.text, url });
      return "shared";
    } catch {
      // تراجع المستخدم أو رفض المتصفح: نكمل بالنسخ.
    }
  }
  const result = await copyToClipboard(url, clipboard);
  return result === "copied" ? "copied" : "failed";
}

/* ————————————————————— بيانات التذييل ————————————————————— */

export const APP_CREDITS = {
  product: "OUD",
  tagline: "Premium Islamic Life Companion",
  madeIn: "صُنع بعناية في مصر",
} as const;
