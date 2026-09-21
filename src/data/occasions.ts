/**
 * المناسبات الدينية والصيام: مواقيت هجرية يتابعها التطبيق ويحسب الأيام المتبقية
 * لها، مع أفضل عمل لكل مناسبة ومصدره.
 * التوضيحات المضافة تفرّق بين ما ثبت شرعًا وما لم يثبت، لأن الأصل الأمانة.
 */

import { hijriParts, daysUntilHijriSet } from "@/lib/hijri";

export type OccasionKind = "صيام" | "عيد" | "ذكرى" | "عمل صالح" | "أسبوعي";

export type Occasion = {
  id: string;
  title: string;
  when: string;
  hijri?: { month: number; days: number[] };
  weekday?: number;
  kind: OccasionKind;
  deeds: string[];
  evidence: string;
  caveat?: string;
};

export const OCCASIONS: Occasion[] = [
  {
    id: "ramadan",
    title: "شهر رمضان",
    when: "١ من رمضان",
    hijri: { month: 9, days: [1] },
    kind: "صيام",
    deeds: [
      "صيام الشهر كاملًا بنية الاحتساب",
      "صلاة التراويح مع الإمام حتى ينصرف",
      "ورد يومي مضاعف من القرآن",
      "صدقة كل يوم ولو قليلة، وإفطار صائم",
    ],
    evidence:
      "قال ﷺ: «مَنْ صَامَ رَمَضَانَ إِيمَانًا وَاحْتِسَابًا غُفِرَ لَهُ مَا تَقَدَّمَ مِنْ ذَنْبِهِ» — رواه البخاري ومسلم",
  },
  {
    id: "laylatul-qadr",
    title: "ليلة القدر",
    when: "ليالي العشر الأواخر (أرجحها الليالي الوترية)",
    hijri: { month: 9, days: [27] },
    kind: "عمل صالح",
    deeds: [
      "قيام الليل ودعاء: «اللهم إنك عفو تحب العفو فاعف عني»",
      "الاعتكاف إن أمكن ولو ساعات",
      "إحياء الوترية من العشر: ٢١، ٢٣، ٢٥، ٢٧، ٢٩",
    ],
    evidence:
      "قال ﷺ: «تَحَرَّوْا لَيْلَةَ الْقَدْرِ فِي الْعَشْرِ الْأَوَاخِرِ مِنْ رَمَضَانَ» — رواه البخاري",
  },
  {
    id: "eid-fitr",
    title: "عيد الفطر",
    when: "١ من شوال",
    hijri: { month: 10, days: [1] },
    kind: "عيد",
    deeds: [
      "إخراج زكاة الفطر قبل صلاة العيد",
      "صلاة العيد ثم صلة الرحم",
      "التكبير ليلة العيد ويومه",
    ],
    evidence:
      "«فَرَضَ رَسُولُ اللَّهِ ﷺ زَكَاةَ الْفِطْرِ» — رواه البخاري، وكان ﷺ يخرج لصلاة العيد — رواه البخاري",
  },
  {
    id: "ashura",
    title: "عاشوراء",
    when: "١٠ من محرم (ويُصام معه ٩)",
    hijri: { month: 1, days: [10] },
    kind: "صيام",
    deeds: ["صيام التاسع والعاشر", "قيام ليلته", "صدقة"],
    evidence:
      "قال ﷺ: «صِيَامُ يَوْمِ عَاشُورَاءَ يُكَفِّرُ السَّنَةَ الْمَاضِيَةَ» — رواه مسلم، وصام التاسع مخالفةً لأهل الكتاب — رواه ابن ماجه",
  },
  {
    id: "new-year",
    title: "رأس السنة الهجرية",
    when: "١ من محرم",
    hijri: { month: 1, days: [1] },
    kind: "ذكرى",
    deeds: ["محاسبة النفس على سنة مضت", "خطّة التزام جديدة", "صيام تطوّع إن أمكن"],
    evidence: "شهر الله المحرم من الأشهر الحُرُم، وأفضل الصيام بعد رمضان صيامه — رواه مسلم",
    caveat: "لا يثبت فيه عمل خاص غير عموم الصيام والدعاء والمراجعة.",
  },
  {
    id: "mawlid",
    title: "المولد النبوي",
    when: "١٢ من ربيع الأول",
    hijri: { month: 3, days: [12] },
    kind: "ذكرى",
    deeds: [
      "زيادة الصلاة على النبي ﷺ",
      "قراءة سيرته والاقتداء بخلقه",
      "إطعام الطعام وصلة الرحم",
    ],
    evidence: "من آثار الصلاة عليه ﷺ قوله: «مَنْ صَلَّى عَلَيَّ صَلَاةً صَلَّى اللَّهُ عَلَيْهِ بِهَا عَشْرًا» — رواه مسلم",
    caveat: "لا يثبت تخصيصه بعبادة معيّنة؛ والمعوّل عليه الاقتداء به ﷺ وزيادة الصلاة عليه.",
  },
  {
    id: "isra",
    title: "الإسراء والمعراج",
    when: "٢٧ من رجب",
    hijri: { month: 7, days: [27] },
    kind: "ذكرى",
    deeds: ["التأمّل في فرض الصلوات الخمس والثبات عليها", "قيام الليل", "صيام رجب عمومًا"],
    evidence: "فرض الصلوات الخمس ليلة الإسراء — رواه البخاري ومسلم",
    caveat: "لم يثبت تخصيص صيام يوم ٢٧ رجب ولا قيام ليلته بعبادة مخصوصة.",
  },
  {
    id: "mid-shaban",
    title: "النصف من شعبان",
    when: "١٥ من شعبان",
    hijri: { month: 8, days: [15] },
    kind: "عمل صالح",
    deeds: ["الاستعداد لرمضان بورد وصيام", "الاستغفار والدعاء", "صيام أيام من شعبان"],
    evidence: "كان ﷺ يكثر الصيام في شعبان — رواه البخاري ومسلم",
    caveat: "أحاديث فضل ليلتها لا تخلو من ضعف؛ فالأولى لزوم ما ثبت مثل الصيام والدعاء.",
  },
  {
    id: "first-ten-dhulhijjah",
    title: "العشر الأول من ذي الحجة",
    when: "١–٩ من ذي الحجة",
    hijri: { month: 12, days: [1] },
    kind: "عمل صالح",
    deeds: [
      "الصيام في التسع (وعرفة لغير الحاج)",
      "التكبير والتهليل والتحميد",
      "الصدقة وقراءة القرآن",
    ],
    evidence:
      "قال ﷺ: «مَا مِنْ أَيَّامٍ الْعَمَلُ الصَّالِحُ فِيهَا أَفْضَلُ مِنْ هَذِهِ الْأَيَّامِ» — رواه البخاري",
  },
  {
    id: "arafah",
    title: "يوم عرفة",
    when: "٩ من ذي الحجة",
    hijri: { month: 12, days: [9] },
    kind: "صيام",
    deeds: [
      "صيامه لغير الحاج",
      "الدعاء؛ فهو أفضل الدعاء",
      "التحرّي في قول: لا إله إلا الله وحده لا شريك له",
    ],
    evidence:
      "قال ﷺ: «صِيَامُ يَوْمِ عَرَفَةَ يُكَفِّرُ سَنَتَيْنِ: مَاضِيَةً وَمُسْتَقْبَلَةً» — رواه مسلم",
  },
  {
    id: "eid-adha",
    title: "عيد الأضحى",
    when: "١٠ من ذي الحجة",
    hijri: { month: 12, days: [10] },
    kind: "عيد",
    deeds: [
      "صلاة العيد",
      "الأضحية",
      "التكبير المطلق والمقيّد",
      "صلة الأرحام وإدخال السرور",
    ],
    evidence: "«صَلُّوا رَكْعَتَيْنِ» في صلاة العيد — رواه البخاري ومسلم، والأضحية سنّة مؤكدة",
  },
  {
    id: "tashreeq",
    title: "أيام التشريق",
    when: "١١–١٣ من ذي الحجة",
    hijri: { month: 12, days: [11] },
    kind: "ذكرى",
    deeds: ["الأكل والشرب والذكر", "التكبير بعد الصلوات", "الأضحية والصدقة"],
    evidence:
      "قال ﷺ: «أَيَّامُ التَّشْرِيقِ أَيَّامُ أَكْلٍ وَشُرْبٍ وَذِكْرٍ لِلَّهِ» — رواه مسلم",
  },
  {
    id: "white-days",
    title: "الأيام البيض",
    when: "١٣ و١٤ و١٥ من كل شهر هجري",
    hijri: { month: 0, days: [13, 14, 15] },
    kind: "صيام",
    deeds: ["صيام ثلاثة أيام في الشهر", "قراءة جزء من القرآن فيها"],
    evidence: "أوصى ﷺ بصيام الأيام البيض — رواه النسائي وأبو داود",
  },
  {
    id: "holy-months",
    title: "الأشهر الحُرُم",
    when: "ذو القعدة، ذو الحجة، محرم، رجب",
    kind: "عمل صالح",
    deeds: ["اجتناب الظلم والمعاصي", "الإكثار من الصيام", "صلة الرحم"],
    evidence: "قال ﷺ: «إِنَّ الزَّمَانَ قَدِ اسْتَدَارَ كَهَيْئَتِهِ يَوْمَ خَلَقَ اللَّهُ السَّمَاوَاتِ وَالْأَرْضَ» فذكر الأشهر الحُرُم — رواه البخاري",
  },
];

export const WEEKLY_OCCASIONS: Occasion[] = [
  {
    id: "friday",
    title: "يوم الجمعة",
    when: "كل جمعة",
    weekday: 5,
    kind: "أسبوعي",
    deeds: [
      "الغسل والتبكير إلى المسجد",
      "قراءة سورة الكهف",
      "الإكثار من الصلاة على النبي ﷺ",
      "دعاء ساعة الإجابة قبل المغرب",
    ],
    evidence:
      "قال ﷺ: «مَنْ قَرَأَ سُورَةَ الْكَهْفِ يَوْمَ الْجُمُعَةِ أَضَاءَ لَهُ مِنَ النُّورِ مَا بَيْنَ الْجُمُعَتَيْنِ» — رواه الحاكم وصحّحه الألباني",
  },
  {
    id: "monday-thursday",
    title: "الاثنين والخميس",
    when: "كل أسبوع",
    kind: "أسبوعي",
    deeds: ["صيام يوم الاثنين", "صيام يوم الخميس", "مراجعة الأسبوع"],
    evidence:
      "قال ﷺ: «تُعْرَضُ الْأَعْمَالُ يَوْمَ الِاثْنَيْنِ وَالْخَمِيسِ فَأُحِبُّ أَنْ يُعْرَضَ عَمَلِي وَأَنَا صَائِمٌ» — رواه الترمذي",
  },
];

export type UpcomingOccasion = Occasion & {
  daysAway: number;
  date: Date;
  hijriDay: number;
};

function dateAfter(offset: number, from: Date) {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  date.setDate(date.getDate() + offset);
  return date;
}

/** أقرب المناسبات مرتبة بالأيام المتبقية، مع تاريخها الميلادي. */
export function upcomingOccasions(from: Date = new Date(), limit = 8): UpcomingOccasion[] {
  const currentHijri = hijriParts(from);
  const list: UpcomingOccasion[] = [];

  for (const occasion of OCCASIONS) {
    if (!occasion.hijri) continue;
    const { month, days } = occasion.hijri;
    if (month === 0) continue; // أيام البيض تُحسب من الشهر الحالي
    const found = daysUntilHijriSet(month, days, from);
    if (!found) continue;
    list.push({
      ...occasion,
      daysAway: found.offset,
      date: dateAfter(found.offset, from),
      hijriDay: found.day,
    });
  }

  // الأيام البيض: أقرب يوم من ١٣–١٥ في الشهر الهجري الحالي أو القادم.
  let bestWhite: { offset: number; day: number } | null = null;
  for (const day of [13, 14, 15]) {
    const found = daysUntilHijriSet(currentHijri.month, [day], from);
    if (found && (!bestWhite || found.offset < bestWhite.offset)) {
      bestWhite = { offset: found.offset, day };
    }
  }
  if (!bestWhite) {
    for (let month = 1; month <= 12; month += 1) {
      const found = daysUntilHijriSet(month, [13, 14, 15], from);
      if (found && (!bestWhite || found.offset < bestWhite.offset)) {
        bestWhite = { offset: found.offset, day: found.day };
      }
    }
  }
  if (bestWhite) {
    const occasion = OCCASIONS.find((item) => item.id === "white-days");
    if (occasion) {
      list.push({
        ...occasion,
        daysAway: bestWhite.offset,
        date: dateAfter(bestWhite.offset, from),
        hijriDay: bestWhite.day,
      });
    }
  }

  return list.sort((a, b) => a.daysAway - b.daysAway).slice(0, limit);
}

/** مناسبة اليوم إن وُجدت (هجريًا)، مع مناسبات الأسبوع الثابتة. */
export function todayOccasions(date: Date = new Date()): Occasion[] {
  const parts = hijriParts(date);
  const matches: Occasion[] = [];
  for (const occasion of OCCASIONS) {
    if (!occasion.hijri) continue;
    if (occasion.hijri.month === 0) {
      if (occasion.hijri.days.includes(parts.day)) matches.push(occasion);
      continue;
    }
    if (occasion.hijri.month === parts.month && occasion.hijri.days.includes(parts.day)) {
      matches.push(occasion);
    }
    // العشر من ذي الحجة والنصف من شعبان وأيام التشريق ممتدة عبر أيام.
    if (occasion.id === "first-ten-dhulhijjah" && parts.month === 12 && parts.day <= 9) {
      matches.push(occasion);
    }
    if (occasion.id === "tashreeq" && parts.month === 12 && parts.day >= 11 && parts.day <= 13) {
      matches.push(occasion);
    }
    if (occasion.id === "holy-months" && [11, 12, 1, 7].includes(parts.month)) {
      matches.push(occasion);
    }
  }
  for (const occasion of WEEKLY_OCCASIONS) {
    if (occasion.weekday !== undefined && date.getDay() === occasion.weekday) {
      matches.push(occasion);
      continue;
    }
    if (occasion.id === "monday-thursday" && (date.getDay() === 1 || date.getDay() === 4)) {
      matches.push(occasion);
    }
  }
  return matches;
}
