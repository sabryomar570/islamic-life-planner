/**
 * PHASE NEXT — تقدير الزكاة.
 *
 * **هذه أداة حساب، وليست فتوى.** هذا أهم سطر في الملف، ولهذا هو أول
 * سطر فيه:
 *
 * 1. التطبيق **لا يقول** ما يجب عليك وما لا يجب. لا نصاب مقرَّر، ولا نسبة
 *    مقرَّرة، ولا حكم على ما يدخل وما لا يدخل. أي رقم يظهر هنا ناتج عن
 *    **رقمين أدخلهما أنت من مرجعك أنت**.
 * 2. لذلك **النصاب والنسبة حقول يكتبها المستخدم، لا ثوابت في الشيفرة.**
 *    النصاب يتغيّر بتغيّر أسعار المعادن والسنة، وثبّته هنا معناه أن التطبيق
 *    ينطق علما لا يملكه. فتركناه لك.
 * 3. ما نحسبه فقط: (أموالك − ما عليك) − نصابك، ثم × نسبتك. عملية حسابية
 *    على أرقام كتبها المستخدم، لا اجتهاد.
 * 4. بلا حديث ولا آية ولا نسبة مقرّرة بلا مصدر. أي نص ديني في التطبيق
 *    يأتي من `data/` ومعاه مصدره.
 *
 * وحدة منطق خالصة: لا React ولا شبكة. التخزين المحلي تحت `readZakatDraft`.
 */

const ZAKAT_STORAGE_KEY = "oud:zakat:v1";

/** ما يُدخله المستخدم. الحقول نصوص لأن الحقل يبقى نصا حتى لو تخطّاه. */
export type ZakatAssetKey = "cash" | "bank" | "gold" | "silver" | "trade" | "receivable";

/** بنود المال. تسميات وصفية محايدة: التطبيق لا يقرّر ما يدخل. */
export const ZAKAT_ASSETS: readonly { key: ZakatAssetKey; label: string; hint: string }[] = [
  { key: "cash", label: "نقد في البيت", hint: "ما تملكه من عملة نقدا" },
  { key: "bank", label: "حسابات وودائع", hint: "أرصدة وحسابات، وسهل سحبها" },
  { key: "gold", label: "ذهب", hint: "ما تملكه من ذهب معدني" },
  { key: "silver", label: "فضة", hint: "ما تملكه من فضة" },
  { key: "trade", label: "بضاعة للتجارة", hint: "ما تبيعه وتنتفع به" },
  { key: "receivable", label: "حقوق لك عند غيرك", hint: "ما لك عند الناس" },
];

export type ZakatDraft = {
  values: Record<ZakatAssetKey, string>;
  /** ما عليك من ديون حالّة. يطرح من المال. */
  debt: string;
  /** نصاب مرجعك. صفر أو فارغ = لم تكتبه بعد، فلا حساب. */
  nisab: string;
  /** نسبة مرجعك مئوية. مثال: 2.5 يعني النسبة الحالية الشائعة. */
  rate: string;
  /** ما أخرجته فعلا هذه السنة، للمقارنة لا للخصم. */
  paid: string;
};

export const EMPTY_ZAKAT_DRAFT: ZakatDraft = {
  values: { cash: "", bank: "", gold: "", silver: "", trade: "", receivable: "" },
  debt: "",
  nisab: "",
  rate: "2.5",
  paid: "",
};

/**
 * يقرأ الأرقام العربية-الهندية والفواصل، ويرفض كل ما لا معنى له.
 * الحقل الحر تاريخ لا رقم، فمنعنا `NaN` من التسريب إلى المجموع.
 */
export function parseAmount(raw: string | number | null | undefined): number {
  // الرقم السالب ليس مالا. نفس القاعدة في الفرعين: ما دون الصفر يُرمَض.
  if (typeof raw === "number") return Number.isFinite(raw) ? Math.max(0, raw) : 0;
  if (typeof raw !== "string") return 0;
  const normalized = raw
    .replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    // الفاصلة العشرية العربية تصبح نقطة، وإلا صار الحقل كله صفرا.
    .replace(/٫/g, ".")
    .replace(/[,\s٬،]/g, "")
    .trim();
  if (!normalized) return 0;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

/** هل الحقل رقم مكتوب فعلا؟ يفرّق بين «فارغ» و«صفر مكتوب». */
export function hasAmount(raw: string | null | undefined): boolean {
  if (typeof raw !== "string") return false;
  return raw.trim().length > 0;
}

export type ZakatTotals = {
  assets: number;
  debt: number;
  net: number;
  nisab: number;
  rate: number;
  /** المال فوق النصاب. سالب=no لم يبلغ النصاب أصلا. */
  aboveNisab: number;
  /** ما يخرج على النسبة. */
  due: number;
  /** بلا نصاب مكتوب فلا حساب، وقول ذلك أصدق من تخمين. */
  needsNisab: boolean;
  /** المال كله تحت النصاب أو مساوٍ له. */
  belowNisab: boolean;
  /** لا يوجد أصل مال مكتوب. */
  empty: boolean;
};

/** كل الحساب في دالة واحدة قابلة للاختبار بلا واجهة. */
export function zakatTotals(draft: ZakatDraft): ZakatTotals {
  const assets = ZAKAT_ASSETS.reduce(
    (sum, entry) => sum + parseAmount(draft.values[entry.key]),
    0,
  );
  const debt = parseAmount(draft.debt);
  const net = Math.max(0, assets - debt);
  const nisab = parseAmount(draft.nisab);
  const rate = parseAmount(draft.rate);
  const needsNisab = !hasAmount(draft.nisab) || nisab <= 0;
  const aboveNisab = needsNisab ? 0 : Math.max(0, net - nisab);
  const due = aboveNisab * (rate / 100);
  return {
    assets,
    debt,
    net,
    nisab,
    rate,
    aboveNisab,
    due,
    needsNisab,
    belowNisab: !needsNisab && net > 0 && net <= nisab,
    empty: ZAKAT_ASSETS.every((entry) => !hasAmount(draft.values[entry.key])),
  };
}

/**
 * النصّ الذي يُعرض في الواجهة، مكتوبًا في الكود لا في التصميم:
 * **حدود الأداة مكتوبة في الأداة نفسها**، فلا تعتمد على من صمّم الشاشة.
 */
export const ZAKAT_NO_RULING =
  "التقدير ده حسابي على أرقام إنت اللي كتبتها، ومش فتوى. التطبيق مش بيقول لك إيه اللي عليك وإيه اللي مش عليك.";

export const ZAKAT_WHY_USER_INPUT =
  "النصاب والنسبة مش ثوابت في التطبيق: النصاب بيتغيّر مع أسعار المعادن والسنة، والنسبة تختلف باختلاف المذهب. اكتبهم من مرجعك إنت، والتطبيق يحسبها على طول.";

export const ZAKAT_ASK_SCHOLAR =
  "لو مش متأكد من مرجعك، اسأل مسجدك أو دار الإفتاء. أحسن من رقم جاهز غلط.";

/* ————————————————————— الحفظ على الجهاز ————————————————————— */

/** يُقرأ ويُكتب في الذاكرة وحدها. لا حساب، لا تتبّع، لا رفع. */
export function readZakatDraft(
  store: Pick<Storage, "getItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
): ZakatDraft {
  if (!store) return EMPTY_ZAKAT_DRAFT;
  try {
    const raw = store.getItem(ZAKAT_STORAGE_KEY);
    if (!raw) return EMPTY_ZAKAT_DRAFT;
    const parsed = JSON.parse(raw) as Partial<ZakatDraft>;
    if (!parsed || typeof parsed !== "object") return EMPTY_ZAKAT_DRAFT;
    const values = { ...EMPTY_ZAKAT_DRAFT.values };
    for (const entry of ZAKAT_ASSETS) {
      const value = parsed.values?.[entry.key];
      if (typeof value === "string") values[entry.key] = value.slice(0, 24);
    }
    const text = (value: unknown, fallback: string) =>
      typeof value === "string" ? value.slice(0, 24) : fallback;
    return {
      values,
      debt: text(parsed.debt, EMPTY_ZAKAT_DRAFT.debt),
      nisab: text(parsed.nisab, EMPTY_ZAKAT_DRAFT.nisab),
      rate: text(parsed.rate, EMPTY_ZAKAT_DRAFT.rate),
      paid: text(parsed.paid, EMPTY_ZAKAT_DRAFT.paid),
    };
  } catch {
    return EMPTY_ZAKAT_DRAFT;
  }
}

export function writeZakatDraft(
  draft: ZakatDraft,
  store: Pick<Storage, "setItem"> | null =
    typeof window === "undefined" ? null : window.localStorage,
): boolean {
  if (!store) return false;
  try {
    store.setItem(ZAKAT_STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export { ZAKAT_STORAGE_KEY };
