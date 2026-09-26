/**
 * PHASE 2 — بيانات الجهاز.
 *
 * سجل صريح لكل مفتاح يخزّنه التطبيق على جهاز المستخدم. الغرض عملي:
 * عند تسجيل الخروج أو حذف البيانات لا يبقى على الجهاز أثر شخصي لمن كان
 * مستخدمًا، ولا نحذف مفتاحًا لا نملكه.
 *
 * **ما لا نلمسه عمدًا:**
 * - `__convexAuth*` : مفاتيح جلسة Convex يديرها `ConvexAuthProvider` نفسها عند
 *   تسجيل الخروج. مسحها يدويًا قد يكسر الاستئناف أو يترك جلسة حيّة.
 * - المصحف المحفوظ (IndexedDB + مفاتيح `sakinah:quran:` الأخرى) ونصوص
 *   المواقيت المخزَّنة: محتوى عام مشترك، وحذفه يكلّف المستخدم إعادة
 *   التنزيل بلا فائدة للخصوصية.
 */

/** مفاتيح تُحذف كاملة: بيانات شخصية أو حالة جهاز تخصّ هذا المستخدم. */
export const OWNED_LOCAL_KEYS = [
  // بيانات شخصية
  "oud:favorites:local",
  "sakinah:offline:profile:v1",
  "sakinah:offline:day:v1",
  "sakinah:offline:favorites:v1",
  "sakinah:coords:v1",
  "sakinah:coords:label:v1",
  "sakinah:quran:bookmark",
  "sakinah:quran:last",
  "sakinah:tasbih:v1",
  "oud:prophets:read",
  // حالة الجهاز
  "sakinah:prefs:v1",
  "oud:prefs:times-synced",
  "oud:tour:done",
  "oud:salawat:count",
  "oud:quran:scroll",
  "sakinah:nudges:v1",
  "sakinah:seen:v1",
  // PHASE 3: سجل الإشعارات محلي على الجهاز، فليس ملك المستخدم وحده.
  "oud:notifications:v1",
  // PHASE NEXT: نقاط التقدّم وفتح الإنجازات — شخصية الجهاز، فتكمل المسح.
  "oud:xp:ledger:v1",
  "oud:achievements:seen:v1",
  // PHASE NEXT: ذاكرة الشخصية وتهدئتها، وتاريخ آخر نشاط (وعلم الرجوع).
  "oud:voice:shown:v1",
  "oud:voice:last-active:v1",
  "oud:voice:returned:v1",
  // PHASE NEXT: قائمة المساجد القريبة، مخبوزة يوماً من مصدر مفتوح.
  "oud:mosque:near:v1",
  // PHASE NEXT: مسودة تقدير الزكاة، أرقام كتبها المستخدم على جهازه.
  "oud:zakat:v1",
] as const;

/** بادئات مفاتيح ديناميكية (مفاتيح تحمل تاريخ اليوم مثلًا). */
export const OWNED_LOCAL_PREFIXES = ["sakinah:fired:"] as const;

/** مفاتيح لا يجوز المساس بها لأنها ليست للتطبيق. */
export const PROTECTED_KEY_PATTERNS = ["__convexAuth", "__vly"] as const;

export function isOwnedLocalKey(key: string) {
  return (
    (OWNED_LOCAL_KEYS as readonly string[]).includes(key) ||
    OWNED_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))
  );
}

export function isProtectedKey(key: string) {
  return PROTECTED_KEY_PATTERNS.some((prefix) => key.startsWith(prefix));
}

export type ClearResult = { removed: string[]; kept: string[] };

/**
 * **حارس إعادة الكتابة بعد المسح.**
 *
 * المسح لا يكفي: أي كاتب حيّ في الذاكرة — مؤقّت الإشعارات مثلًا — قد
 * يعيد كتابة ما حُذف بعد لحظات، فيبقى على الجهاز أثر مستخدم خرج فعلا.
 * المتصفح لا يخبرنا بأن أحدا كتب، فالعهد يُدار نحن: كل مسح يرفع العدّاد،
 * ومن يحمل عهدا أقدم منه يتوقف عن الكتابة.
 *
 * في الذاكرة وحدها: لا يُحفظ ولا يصمد عبر إعادة تحميل الصفحة، وهذا مقصود.
 * الحارس يغطي نافذة تسجيل الخروج، ولا يغطي ما بعد تحديث الصفحة.
 */
let wipeEpoch = 0;

/** العهد الحالي. يُلتقط عند التركيب، ويُقارن قبل كل كتابة. */
export function localDataEpoch(): number {
  return wipeEpoch;
}

/** هل ما مرّ في الحاوية هو نفسه ما مسحناه؟ */
export function isLocalDataCurrent(epoch: number): boolean {
  return epoch === wipeEpoch;
}

/**
 * يمسح ما يملكه التطبيق على الجهاز فقط.
 * `store` معامل اختباري: نمرّر واجهة تخزين في الاختبار بدل الكائن الحقيقي.
 */
export function clearLocalData(
  store: Pick<Storage, "key" | "removeItem" | "length"> | null =
    typeof window === "undefined" ? null : window.localStorage,
): ClearResult {
  const removed: string[] = [];
  const kept: string[] = [];
  // المسح حدث، حتى إن لم يكن هناك مخزن: العقد يرفع في الحالتين كي لا
  // يكتب أحد فوق بيانات نُسخت ثم مُسحت.
  wipeEpoch += 1;
  if (!store) return { removed, kept };

  // نمسح المفاتيح المعروفة أولًا، ثم البادئات عبر التعداد — فبعضها متغيّر.
  for (const key of OWNED_LOCAL_KEYS) {
    try {
      store.removeItem(key);
      removed.push(key);
    } catch {
      kept.push(key);
    }
  }

  const dynamic: string[] = [];
  for (let index = 0; index < store.length; index += 1) {
    const key = store.key(index);
    if (key) dynamic.push(key);
  }
  for (const key of dynamic) {
    if (isProtectedKey(key)) {
      kept.push(key);
      continue;
    }
    if (!OWNED_LOCAL_PREFIXES.some((prefix) => key.startsWith(prefix))) continue;
    try {
      store.removeItem(key);
      removed.push(key);
    } catch {
      kept.push(key);
    }
  }

  return { removed, kept };
}
