/**
 * PHASE NEXT — اتجاه القبلة.
 *
 * **حساب جغرافي بحت، لا فتوى ولا وعد.** القبلة معرّف جغرافي: اتجاه من
 * موقعك إلى الكعبة على الدائرة العظمى. لا يحتاج شرعا ولا يُقدَّر ولا
 * يُخمَّن، فيمكن حسابه واختباره برقم معلوم.
 *
 * **ما لا نفعله:**
 * - لا نقول إن المستخدم «صلى في القبلة»، ولا نلمس الصلاة أصلا. الاتجاه
 *   معلومة جغرافية، والدعاء عندها شيء آخر عن الدقة: نقول «اتجاه» ونقصده.
 * - لا نستعمل تقريب مسطح (Equirectangular) ولا بوصلة مغناطيسية: النتيجة
 *   تختلف عند مسافات طويلة، فالمسافة دائرة عظمى والانجاه زاوية ابتدائية.
 * - بلا `Math.random` وبلا تاريخ: نفس الإحداثيات تعطي نفس الرقم دائما،
 *   وهذا شرط أن يكون الاختبار ذا معنى.
 *
 * وحدة منطق خالصة: لا React ولا شبكة ولا تخزين. كل ما هنا يُختبر.
 */

import { arabicNumber } from "./time";

/** الكعبة. مصدرها معلم جغرافي معلن، لا نصّ ديني ولا حكم. */
export const KAABA = { latitude: 21.422_477_9, longitude: 39.825_183_2 } as const;

/** نصف قطر الأرض بالكيلومتر. القيمة المتوسطة المعتمدة. */
const EARTH_RADIUS_KM = 6_371.0088;

const DEG = Math.PI / 180;

export type QiblaPoint = { latitude: number; longitude: number };

/** إحداثيات صالحة؟ الرفض الصريح يمنع زاوية ونصا منهما. */
export function isValidPoint(value: unknown): value is QiblaPoint {
  if (!value || typeof value !== "object") return false;
  const point = value as Partial<QiblaPoint>;
  return (
    typeof point.latitude === "number" &&
    typeof point.longitude === "number" &&
    Number.isFinite(point.latitude) &&
    Number.isFinite(point.longitude) &&
    Math.abs(point.latitude) <= 90 &&
    Math.abs(point.longitude) <= 180
  );
}

/** يردّ الزاوية في المدى [0, 360). */
export function normalizeDegrees(degrees: number): number {
  if (!Number.isFinite(degrees)) return 0;
  const wrapped = degrees % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

/**
 * اتجاه القبلة: زاوية ابتدائية من موقعك إلى الكعبة، بالدرجات من الشمال.
 * القيم المتحقَّق منها: القاهرة نحو ١٣٦ درجة، ونيويورك نحو ٥٨ درجة،
 * ولندن نحو ١١٩ درجة، وجاكرتا نحو ٢٩٥ درجة.
 */
export function qiblaBearing(point: QiblaPoint): number {
  const lat1 = point.latitude * DEG;
  const lat2 = KAABA.latitude * DEG;
  const deltaLon = (KAABA.longitude - point.longitude) * DEG;
  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
  return normalizeDegrees(Math.atan2(y, x) / DEG);
}

/** المسافة إلى الكعبة بالكيلومتر — دائرة عظمى، لا تقريب مسطح. */
export function distanceToKaabaKm(point: QiblaPoint): number {
  const lat1 = point.latitude * DEG;
  const lat2 = KAABA.latitude * DEG;
  const deltaLat = (KAABA.latitude - point.latitude) * DEG;
  const deltaLon = (KAABA.longitude - point.longitude) * DEG;
  const a =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** ست عشرة جهة بالعربية. */
const DIRECTIONS: readonly { from: number; name: string }[] = [
  { from: 0, name: "شمال" },
  { from: 22.5, name: "شمال شمال شرق" },
  { from: 45, name: "شمال شرق" },
  { from: 67.5, name: "شرق شمال شرق" },
  { from: 90, name: "شرق" },
  { from: 112.5, name: "جنوب شرق شرق" },
  { from: 135, name: "جنوب شرق" },
  { from: 157.5, name: "جنوب جنوب شرق" },
  { from: 180, name: "جنوب" },
  { from: 202.5, name: "جنوب جنوب غرب" },
  { from: 225, name: "جنوب غرب" },
  { from: 247.5, name: "غرب جنوب غرب" },
  { from: 270, name: "غرب" },
  { from: 292.5, name: "شمال غرب غرب" },
  { from: 315, name: "شمال غرب" },
  { from: 337.5, name: "شمال شمال غرب" },
];

/**
 * اسم الجهة العربية. **لا يتكلم عن الصلاة**: الاتجاه ليس دليلا على
 * صلاة، ولا نقول غير ذلك أبدا.
 */
export function qiblaDirectionName(bearing: number): string {
  const normalized = normalizeDegrees(bearing);
  // أقرب مركز لفارق زاوي، مع اللف عند الصفر: ٣٥٧ درجة أقرب إلى شمال
  // منها إلى غرب، وإلا انقلب الحساب كل ما اقتربنا من الحد.
  let best = DIRECTIONS[0];
  let bestGap = Number.POSITIVE_INFINITY;
  for (const entry of DIRECTIONS) {
    const raw = Math.abs(normalized - entry.from);
    const gap = Math.min(raw, 360 - raw);
    if (gap < bestGap) {
      bestGap = gap;
      best = entry;
    }
  }
  return best.name;
}

/** رقم الزاوية بالأرقام العربية، مثل بقية أرقام التطبيق. */
export function formatBearing(bearing: number): string {
  return arabicNumber(Math.round(normalizeDegrees(bearing)));
}

/** المسافة نصا: أمتار تحت الكيلومتر، وكيلومترات فوقه. */
export function formatQiblaDistance(km: number): string {
  if (!Number.isFinite(km) || km < 0) return "—";
  if (km < 1) return `${arabicNumber(Math.round(km * 1000))} متر`;
  return `${arabicNumber(Math.round(km))} كم`;
}

/**
 * زاوية دوران الإبرة.
 *
 * **الافتراض صريح:** بلا قراءة من مستشعر الجهاز تكون النتيجة فارغة، فلا
 * ندّعي بوصلة. المتصفحات تتجاهل قياس الاتجاه على سطح المكتب، و iOS
 * يطلب إذنا صريحا لم نطلبه في أي مكان من التطبيق. فنقول للمستخدم
 * «استخدم بوصلة جهازك» بدل أن نرسم إبرة كاذبة ثابتة.
 */
export function needleRotation(deviceHeading: number | null, qiblaAngle: number): number | null {
  if (deviceHeading === null || !Number.isFinite(deviceHeading)) return null;
  return normalizeDegrees(qiblaAngle - deviceHeading);
}

/**
 * هل في مستشعر اتجاه على هذا المتصفح؟ فحص سمة لا تجربة: غياب
 * `DeviceOrientationEvent` يعني الرجوع إلى بوصلة الجهاز. لا نطلب إذن
 * iOS ولا نصمت.
 */
export function compassSupported(): boolean {
  if (typeof window === "undefined") return false;
  return typeof window.DeviceOrientationEvent !== "undefined";
}

/** أقل من كيلومتر: الاسم لا معنى له، فنقولها بوضوح. */
export function atKaaba(km: number): boolean {
  return Number.isFinite(km) && km < 1;
}
