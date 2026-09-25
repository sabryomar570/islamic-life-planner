/**
 * تحديد المكان تلقائيًا من المنطقة الزمنية للجهاز.
 * لا نسأل المستخدم عن مدينته: نستخرجها من منطقته الزمنية، وإن كانت إحداثيات
 * الجهاز متاحة (بإذنه) فهي الأدق وتتقدّم عليها.
 */

export type DetectedLocation = {
  /** اسم المدينة كما يُرسل لخدمة التوقيت (يدعم العربية والإنجليزية). */
  city: string;
  /** الاسم المعروض في الواجهة. */
  label: string;
  timeZone: string;
};

/** مدن رئيسة بمنطقتها الزمنية — تُغني عن السؤال وتغطّي الاستخدام الشائع. */
const ZONE_MAP: Record<string, { city: string; label: string }> = {
  "Africa/Cairo": { city: "القاهرة", label: "القاهرة" },
  "Africa/Alexandria": { city: "الإسكندرية", label: "الإسكندرية" },
  "Africa/Khartoum": { city: "الخرطوم", label: "الخرطوم" },
  "Africa/Tripoli": { city: "طرابلس", label: "طرابلس" },
  "Africa/Tunis": { city: "تونس", label: "تونس" },
  "Africa/Algiers": { city: "الجزائر", label: "الجزائر" },
  "Africa/Casablanca": { city: "الدار البيضاء", label: "الدار البيضاء" },
  "Africa/El_Aaiun": { city: "العيون", label: "العيون" },
  "Africa/Nouakchott": { city: "نواكشوط", label: "نواكشوط" },
  "Africa/Mogadishu": { city: "مقديشو", label: "مقديشو" },
  "Africa/Djibouti": { city: "جيبوتي", label: "جيبوتي" },
  "Africa/Moroni": { city: "موروني", label: "موروني" },
  "Africa/Lagos": { city: "لاغوس", label: "لاغوس" },
  "Africa/Nairobi": { city: "نيروبي", label: "نيروبي" },
  "Africa/Dakar": { city: "داكار", label: "داكار" },
  "Africa/Bamako": { city: "باماكو", label: "باماكو" },
  "Africa/Abidjan": { city: "أبيدجان", label: "أبيدجان" },
  "Africa/Accra": { city: "أكرا", label: "أكرا" },
  "Africa/Addis_Ababa": { city: "أديس أبابا", label: "أديس أبابا" },

  "Asia/Riyadh": { city: "الرياض", label: "الرياض" },
  "Asia/Mecca": { city: "مكة المكرمة", label: "مكة المكرمة" },
  "Asia/Jeddah": { city: "جدة", label: "جدة" },
  "Asia/Medina": { city: "المدينة المنورة", label: "المدينة المنورة" },
  "Asia/Dubai": { city: "دبي", label: "دبي" },
  "Asia/Abu_Dhabi": { city: "أبوظبي", label: "أبوظبي" },
  "Asia/Qatar": { city: "الدوحة", label: "الدوحة" },
  "Asia/Kuwait": { city: "الكويت", label: "مدينة الكويت" },
  "Asia/Bahrain": { city: "المنامة", label: "المنامة" },
  "Asia/Muscat": { city: "مسقط", label: "مسقط" },
  "Asia/Aden": { city: "عدن", label: "عدن" },
  "Asia/Sanaa": { city: "صنعاء", label: "صنعاء" },
  "Asia/Amman": { city: "عمّان", label: "عمّان" },
  "Asia/Damascus": { city: "دمشق", label: "دمشق" },
  "Asia/Beirut": { city: "بيروت", label: "بيروت" },
  "Asia/Jerusalem": { city: "القدس", label: "القدس" },
  "Asia/Gaza": { city: "غزة", label: "غزة" },
  "Asia/Hebron": { city: "الخليل", label: "الخليل" },
  "Asia/Baghdad": { city: "بغداد", label: "بغداد" },
  "Asia/Basra": { city: "البصرة", label: "البصرة" },
  "Asia/Tehran": { city: "طهران", label: "طهران" },
  "Asia/Istanbul": { city: "إستنبول", label: "إستنبول" },
  "Europe/Istanbul": { city: "إستنبول", label: "إستنبول" },
  "Asia/Karachi": { city: "كراتشي", label: "كراتشي" },
  "Asia/Lahore": { city: "لاهور", label: "لاهور" },
  "Asia/Kabul": { city: "كابول", label: "كابول" },
  "Asia/Kolkata": { city: "دلهي", label: "دلهي" },
  "Asia/Dhaka": { city: "دكا", label: "دكا" },
  "Asia/Kuala_Lumpur": { city: "كوالالمبور", label: "كوالالمبور" },
  "Asia/Jakarta": { city: "جاكرتا", label: "جاكرتا" },
  "Asia/Tashkent": { city: "طشقند", label: "طشقند" },
  "Asia/Baku": { city: "باكو", label: "باكو" },
  "Asia/Tbilisi": { city: "تبليسي", label: "تبليسي" },
  "Asia/Bishkek": { city: "بيشكيك", label: "بيشكيك" },
  "Asia/Almaty": { city: "ألماتي", label: "ألماتي" },
  "Asia/Shanghai": { city: "شنغهاي", label: "شنغهاي" },
  "Asia/Tokyo": { city: "طوكيو", label: "طوكيو" },
  "Asia/Seoul": { city: "سول", label: "سول" },

  "Europe/London": { city: "لندن", label: "لندن" },
  "Europe/Paris": { city: "باريس", label: "باريس" },
  "Europe/Berlin": { city: "برلين", label: "برلين" },
  "Europe/Amsterdam": { city: "أمستردام", label: "أمستردام" },
  "Europe/Brussels": { city: "بروكسل", label: "بروكسل" },
  "Europe/Madrid": { city: "مدريد", label: "مدريد" },
  "Europe/Rome": { city: "روما", label: "روما" },
  "Europe/Stockholm": { city: "ستوكهولم", label: "ستوكهولم" },
  "Europe/Oslo": { city: "أوسلو", label: "أوسلو" },
  "Europe/Copenhagen": { city: "كوبنهاغن", label: "كوبنهاغن" },
  "Europe/Vienna": { city: "فيينا", label: "فيينا" },
  "Europe/Zurich": { city: "زيورخ", label: "زيورخ" },
  "Europe/Athens": { city: "أثينا", label: "أثينا" },
  "Europe/Moscow": { city: "موسكو", label: "موسكو" },
  "Europe/Kyiv": { city: "كييف", label: "كييف" },

  "America/New_York": { city: "نيويورك", label: "نيويورك" },
  "America/Chicago": { city: "شيكاغو", label: "شيكاغو" },
  "America/Denver": { city: "دنفر", label: "دنفر" },
  "America/Los_Angeles": { city: "لوس أنجلوس", label: "لوس أنجلوس" },
  "America/Toronto": { city: "تورونتو", label: "تورونتو" },
  "America/Vancouver": { city: "فانكوفر", label: "فانكوفر" },
  "America/Sao_Paulo": { city: "ساو باولو", label: "ساو باولو" },

  "Australia/Sydney": { city: "سيدني", label: "سيدني" },
  "Australia/Melbourne": { city: "ملبورن", label: "ملبورن" },
};

/** مدن شائعة نُصحّح كتابتها حين يأتي الاسم من المنطقة الزمنية بالإنجليزية. */
const CITY_LABELS: Record<string, string> = {
  Riyadh: "الرياض",
  Jeddah: "جدة",
  Mecca: "مكة المكرمة",
  Medina: "المدينة المنورة",
  Cairo: "القاهرة",
  Alexandria: "الإسكندرية",
  Dubai: "دبي",
  Doha: "الدوحة",
  Kuwait: "مدينة الكويت",
  Muscat: "مسقط",
  Amman: "عمّان",
  Beirut: "بيروت",
  Baghdad: "بغداد",
  Istanbul: "إستنبول",
  Tunis: "تونس",
  Algiers: "الجزائر",
  Casablanca: "الدار البيضاء",
  Khartoum: "الخرطوم",
  Sanaa: "صنعاء",
  Aden: "عدن",
  Gaza: "غزة",
  Jerusalem: "القدس",
  London: "لندن",
  Paris: "باريس",
  Berlin: "برلين",
  Toronto: "تورونتو",
  "New York": "نيويورك",
  Chicago: "شيكاغو",
  "Los Angeles": "لوس أنجلوس",
  Sydney: "سيدني",
  Melbourne: "ملبورن",
  Jakarta: "جاكرتا",
  Karachi: "كراتشي",
  Lahore: "لاهور",
  Dhaka: "دكا",
  Delhi: "دلهي",
  Kolkata: "كلكتا",
  Mumbai: "مومباي",
};

const FALLBACK: DetectedLocation = {
  city: "مكة المكرمة",
  label: "مكة المكرمة",
  timeZone: "Asia/Riyadh",
};

/** يقرأ منطقتنا الزمنية من الجهاز. */
export function deviceTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function prettify(segment: string) {
  const spaced = segment.replace(/_/g, " ");
  return CITY_LABELS[segment] ?? CITY_LABELS[spaced] ?? spaced;
}

/** المدينة المستنتجة من المنطقة الزمنية (بلا أي طلب إذن). */
export function detectLocation(): DetectedLocation {
  const zone = deviceTimeZone();
  if (!zone) return FALLBACK;

  const mapped = ZONE_MAP[zone];
  if (mapped) return { ...mapped, timeZone: zone };

  // نستخرج اسم المدينة من الجزء الأخير للمنطقة، ونرسله للخدمة كما هو.
  const segment = zone.split("/").pop();
  if (segment && segment !== "UTC" && !/^GMT|^Etc/.test(zone)) {
    return { city: segment.replace(/_/g, " "), label: prettify(segment), timeZone: zone };
  }

  return { ...FALLBACK, timeZone: zone };
}

