/**
 * فهرس القرآن الكريم — بيانات السور (مكية/مدنية وعدد الآيات) محليًا،
 * ونصوص الآيات تُدار عبر مخزن المصحف (ذاكرة + جهاز + شبكة).
 */
import { loadSurah, type Ayah } from "@/lib/quran-store";

export type { Ayah } from "@/lib/quran-store";

export type Surah = {
  number: number;
  name: string;
  ayahs: number;
  type: "مكية" | "مدنية";
};

export const SURAHS: Surah[] = [
  { number: 1, name: "الفاتحة", ayahs: 7, type: "مكية" },
  { number: 2, name: "البقرة", ayahs: 286, type: "مدنية" },
  { number: 3, name: "آل عمران", ayahs: 200, type: "مدنية" },
  { number: 4, name: "النساء", ayahs: 176, type: "مدنية" },
  { number: 5, name: "المائدة", ayahs: 120, type: "مدنية" },
  { number: 6, name: "الأنعام", ayahs: 165, type: "مكية" },
  { number: 7, name: "الأعراف", ayahs: 206, type: "مكية" },
  { number: 8, name: "الأنفال", ayahs: 75, type: "مدنية" },
  { number: 9, name: "التوبة", ayahs: 129, type: "مدنية" },
  { number: 10, name: "يونس", ayahs: 109, type: "مكية" },
  { number: 11, name: "هود", ayahs: 123, type: "مكية" },
  { number: 12, name: "يوسف", ayahs: 111, type: "مكية" },
  { number: 13, name: "الرعد", ayahs: 43, type: "مدنية" },
  { number: 14, name: "إبراهيم", ayahs: 52, type: "مكية" },
  { number: 15, name: "الحجر", ayahs: 99, type: "مكية" },
  { number: 16, name: "النحل", ayahs: 128, type: "مكية" },
  { number: 17, name: "الإسراء", ayahs: 111, type: "مكية" },
  { number: 18, name: "الكهف", ayahs: 110, type: "مكية" },
  { number: 19, name: "مريم", ayahs: 98, type: "مكية" },
  { number: 20, name: "طه", ayahs: 135, type: "مكية" },
  { number: 21, name: "الأنبياء", ayahs: 112, type: "مكية" },
  { number: 22, name: "الحج", ayahs: 78, type: "مدنية" },
  { number: 23, name: "المؤمنون", ayahs: 118, type: "مكية" },
  { number: 24, name: "النور", ayahs: 64, type: "مدنية" },
  { number: 25, name: "الفرقان", ayahs: 77, type: "مكية" },
  { number: 26, name: "الشعراء", ayahs: 227, type: "مكية" },
  { number: 27, name: "النمل", ayahs: 93, type: "مكية" },
  { number: 28, name: "القصص", ayahs: 88, type: "مكية" },
  { number: 29, name: "العنكبوت", ayahs: 69, type: "مكية" },
  { number: 30, name: "الروم", ayahs: 60, type: "مكية" },
  { number: 31, name: "لقمان", ayahs: 34, type: "مكية" },
  { number: 32, name: "السجدة", ayahs: 30, type: "مكية" },
  { number: 33, name: "الأحزاب", ayahs: 73, type: "مدنية" },
  { number: 34, name: "سبأ", ayahs: 54, type: "مكية" },
  { number: 35, name: "فاطر", ayahs: 45, type: "مكية" },
  { number: 36, name: "يس", ayahs: 83, type: "مكية" },
  { number: 37, name: "الصافات", ayahs: 182, type: "مكية" },
  { number: 38, name: "ص", ayahs: 88, type: "مكية" },
  { number: 39, name: "الزمر", ayahs: 75, type: "مكية" },
  { number: 40, name: "غافر", ayahs: 85, type: "مكية" },
  { number: 41, name: "فصلت", ayahs: 54, type: "مكية" },
  { number: 42, name: "الشورى", ayahs: 53, type: "مكية" },
  { number: 43, name: "الزخرف", ayahs: 89, type: "مكية" },
  { number: 44, name: "الدخان", ayahs: 59, type: "مكية" },
  { number: 45, name: "الجاثية", ayahs: 37, type: "مكية" },
  { number: 46, name: "الأحقاف", ayahs: 35, type: "مكية" },
  { number: 47, name: "محمد", ayahs: 38, type: "مدنية" },
  { number: 48, name: "الفتح", ayahs: 29, type: "مدنية" },
  { number: 49, name: "الحجرات", ayahs: 18, type: "مدنية" },
  { number: 50, name: "ق", ayahs: 45, type: "مكية" },
  { number: 51, name: "الذاريات", ayahs: 60, type: "مكية" },
  { number: 52, name: "الطور", ayahs: 49, type: "مكية" },
  { number: 53, name: "النجم", ayahs: 62, type: "مكية" },
  { number: 54, name: "القمر", ayahs: 55, type: "مكية" },
  { number: 55, name: "الرحمن", ayahs: 78, type: "مدنية" },
  { number: 56, name: "الواقعة", ayahs: 96, type: "مكية" },
  { number: 57, name: "الحديد", ayahs: 29, type: "مدنية" },
  { number: 58, name: "المجادلة", ayahs: 22, type: "مدنية" },
  { number: 59, name: "الحشر", ayahs: 24, type: "مدنية" },
  { number: 60, name: "الممتحنة", ayahs: 13, type: "مدنية" },
  { number: 61, name: "الصف", ayahs: 14, type: "مدنية" },
  { number: 62, name: "الجمعة", ayahs: 11, type: "مدنية" },
  { number: 63, name: "المنافقون", ayahs: 11, type: "مدنية" },
  { number: 64, name: "التغابن", ayahs: 18, type: "مدنية" },
  { number: 65, name: "الطلاق", ayahs: 12, type: "مدنية" },
  { number: 66, name: "التحريم", ayahs: 12, type: "مدنية" },
  { number: 67, name: "الملك", ayahs: 30, type: "مكية" },
  { number: 68, name: "القلم", ayahs: 52, type: "مكية" },
  { number: 69, name: "الحاقة", ayahs: 52, type: "مكية" },
  { number: 70, name: "المعارج", ayahs: 44, type: "مكية" },
  { number: 71, name: "نوح", ayahs: 28, type: "مكية" },
  { number: 72, name: "الجن", ayahs: 28, type: "مكية" },
  { number: 73, name: "المزمل", ayahs: 20, type: "مكية" },
  { number: 74, name: "المدثر", ayahs: 56, type: "مكية" },
  { number: 75, name: "القيامة", ayahs: 40, type: "مكية" },
  { number: 76, name: "الإنسان", ayahs: 31, type: "مدنية" },
  { number: 77, name: "المرسلات", ayahs: 50, type: "مكية" },
  { number: 78, name: "النبأ", ayahs: 40, type: "مكية" },
  { number: 79, name: "النازعات", ayahs: 46, type: "مكية" },
  { number: 80, name: "عبس", ayahs: 42, type: "مكية" },
  { number: 81, name: "التكوير", ayahs: 29, type: "مكية" },
  { number: 82, name: "الانفطار", ayahs: 19, type: "مكية" },
  { number: 83, name: "المطففين", ayahs: 36, type: "مكية" },
  { number: 84, name: "الانشقاق", ayahs: 25, type: "مكية" },
  { number: 85, name: "البروج", ayahs: 22, type: "مكية" },
  { number: 86, name: "الطارق", ayahs: 17, type: "مكية" },
  { number: 87, name: "الأعلى", ayahs: 19, type: "مكية" },
  { number: 88, name: "الغاشية", ayahs: 26, type: "مكية" },
  { number: 89, name: "الفجر", ayahs: 30, type: "مكية" },
  { number: 90, name: "البلد", ayahs: 20, type: "مكية" },
  { number: 91, name: "الشمس", ayahs: 15, type: "مكية" },
  { number: 92, name: "الليل", ayahs: 21, type: "مكية" },
  { number: 93, name: "الضحى", ayahs: 11, type: "مكية" },
  { number: 94, name: "الشرح", ayahs: 8, type: "مكية" },
  { number: 95, name: "التين", ayahs: 8, type: "مكية" },
  { number: 96, name: "العلق", ayahs: 19, type: "مكية" },
  { number: 97, name: "القدر", ayahs: 5, type: "مكية" },
  { number: 98, name: "البينة", ayahs: 8, type: "مدنية" },
  { number: 99, name: "الزلزلة", ayahs: 8, type: "مدنية" },
  { number: 100, name: "العاديات", ayahs: 11, type: "مكية" },
  { number: 101, name: "القارعة", ayahs: 11, type: "مكية" },
  { number: 102, name: "التكاثر", ayahs: 8, type: "مكية" },
  { number: 103, name: "العصر", ayahs: 3, type: "مكية" },
  { number: 104, name: "الهمزة", ayahs: 9, type: "مكية" },
  { number: 105, name: "الفيل", ayahs: 5, type: "مكية" },
  { number: 106, name: "قريش", ayahs: 4, type: "مكية" },
  { number: 107, name: "الماعون", ayahs: 7, type: "مكية" },
  { number: 108, name: "الكوثر", ayahs: 3, type: "مكية" },
  { number: 109, name: "الكافرون", ayahs: 6, type: "مكية" },
  { number: 110, name: "النصر", ayahs: 3, type: "مدنية" },
  { number: 111, name: "المسد", ayahs: 5, type: "مكية" },
  { number: 112, name: "الإخلاص", ayahs: 4, type: "مكية" },
  { number: 113, name: "الفلق", ayahs: 5, type: "مكية" },
  { number: 114, name: "الناس", ayahs: 6, type: "مكية" },
];

export const getSurah = (number: number) =>
  SURAHS.find((surah) => surah.number === number);

/** يجلب آيات سورة كاملة (المصحف العثماني) من الذاكرة أو الجهاز أو الشبكة. */
export async function fetchSurahAyahs(number: number): Promise<Ayah[]> {
  const { ayahs } = await loadSurah(number);
  return ayahs;
}

export const SURAH_COUNT = SURAHS.length;

/** السورة التي تلي رقمًا معيّنًا (للتنقّل بالأسهم). */
export function clampSurahNumber(value: number) {
  if (!Number.isFinite(value)) return 1;
  return Math.min(Math.max(Math.round(value), 1), SURAH_COUNT);
}

/** آيات مختارة تظهر كـ«آية اليوم» وتتبدّل بتبدّل التاريخ. */
export const DAILY_AYAHS: { text: string; ref: string }[] = [
  {
    text: "أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ",
    ref: "الرعد: ٢٨",
  },
  {
    text: "وَأَقِمِ الصَّلَاةَ لِذِكْرِي",
    ref: "طه: ١٤",
  },
  {
    text: "إِنَّ الصَّلَاةَ كَانَتْ عَلَى الْمُؤْمِنِينَ كِتَابًا مَّوْقُوتًا",
    ref: "النساء: ١٠٣",
  },
  {
    text: "وَاذْكُر رَّبَّكَ فِي نَفْسِكَ تَضَرُّعًا وَخِيفَةً",
    ref: "الأعراف: ٢٠٥",
  },
  {
    text: "إِنَّ مَعَ الْعُسْرِ يُسْرًا",
    ref: "الشرح: ٦",
  },
  {
    text: "وَأَن لَّيْسَ لِلْإِنسَانِ إِلَّا مَا سَعَىٰ",
    ref: "النجم: ٣٩",
  },
  {
    text: "وَقُل رَّبِّ زِدْنِي عِلْمًا",
    ref: "طه: ١١٤",
  },
  {
    text: "وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ",
    ref: "الطلاق: ٣",
  },
  {
    text: "فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ",
    ref: "البقرة: ١٥٢",
  },
  {
    text: "وَمَن يَتَّقِ اللَّهَ يَجْعَل لَّهُ مَخْرَجًا",
    ref: "الطلاق: ٢",
  },
  {
    text: "إِنَّ اللَّهَ مَعَ الصَّابِرِينَ",
    ref: "البقرة: ١٥٣",
  },
  {
    text: "وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ",
    ref: "النحل: ١٢٧",
  },
  {
    text: "وَمَا تَوْفِيقِي إِلَّا بِاللَّهِ عَلَيْهِ تَوَكَّلْتُ وَإِلَيْهِ أُنِيبُ",
    ref: "هود: ٨٨",
  },
  {
    text: "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ",
    ref: "البقرة: ٢٠١",
  },
  {
    text: "وَأَنِ اسْتَغْفِرُوا رَبَّكُمْ ثُمَّ تُوبُوا إِلَيْهِ",
    ref: "هود: ٣",
  },
  {
    text: "إِنَّ الْحَسَنَاتِ يُذْهِبْنَ السَّيِّئَاتِ",
    ref: "هود: ١١٤",
  },
  {
    text: "وَاللَّهُ يُحِبُّ الْمُحْسِنِينَ",
    ref: "آل عمران: ١٣٤",
  },
  {
    text: "فَإِنَّ مَعَ الْعُسْرِ يُسْرًا",
    ref: "الشرح: ٥",
  },
  {
    text: "وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا",
    ref: "آل عمران: ١٠٣",
  },
];

/** آية اليوم بحسب رقم اليوم — يتغيّر تلقائيًا كل يوم. */
export function ayahOfTheDay(date: Date = new Date()) {
  const seed = date.getFullYear() * 372 + (date.getMonth() + 1) * 31 + date.getDate();
  return DAILY_AYAHS[seed % DAILY_AYAHS.length];
}
