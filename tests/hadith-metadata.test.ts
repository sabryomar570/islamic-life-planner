import { describe, expect, test } from "bun:test";
import { HADITHS, HADITH_SECTIONS, sectionTitle } from "../src/data/hadith";
import {
  HADITH_KIND_HINTS,
  HADITH_KIND_LABELS,
  HADITH_KIND_TONES,
  HADITH_TOPICS,
  REVIEW_STATUS_LABELS,
  canClaimVerified,
  citationLine,
  dayContextTopic,
  daySeed,
  gradeOf,
  hadithKindOf,
  isMarfu,
  needsScholarlyReview,
  reviewStatusOf,
  topicOfSection,
  topicTitle,
} from "../src/lib/hadith-metadata";
import { insightsAreSourced, insightsForArea } from "../src/lib/insights";

describe("أحاديث — سلامة المحتوى الديني", () => {
  test("لا حديث بلا نص عربي", () => {
    for (const hadith of HADITHS) {
      expect(hadith.text.trim().length).toBeGreaterThan(10);
      expect(hadith.text).toMatch(/[؀-ۿ]/);
    }
  });

  test("لا حديث بلا مصدر ولا راو", () => {
    for (const hadith of HADITHS) {
      expect(hadith.source.trim().length).toBeGreaterThan(0);
      expect(hadith.narrator.trim().length).toBeGreaterThan(0);
    }
  });

  test("لا معرّفات مكررة", () => {
    const ids = new Set<string>();
    for (const hadith of HADITHS) {
      expect(ids.has(hadith.id)).toBe(false);
      ids.add(hadith.id);
    }
    expect(ids.size).toBe(HADITHS.length);
  });

  test("كل حديث ينتمي إلى باب معرّف", () => {
    const known = new Set(HADITH_SECTIONS.map((section) => section.id));
    for (const hadith of HADITHS) {
      expect(known.has(hadith.section)).toBe(true);
    }
  });

  test("لا درجة مخترعة: ما لم يُسجَّل يبقى فارغا", () => {
    for (const hadith of HADITHS) {
      // الدرجة المسجّلة إن وُجدت منقولة نصا، والمستنتَج منها لا شيء.
      if (hadith.grade !== undefined) expect(hadith.grade.trim().length).toBeGreaterThan(0);
    }
    expect(gradeOf({})).toBeNull();
    expect(gradeOf({ grade: "   " })).toBeNull();
    expect(gradeOf({ grade: "صحيح" })).toBe("صحيح");
  });

  test("لا رقم حديث بلا كتاب", () => {
    for (const hadith of HADITHS) {
      if (hadith.hadithNumber !== undefined) {
        expect(hadith.book).toBeDefined();
      }
    }
  });
});

describe("أحاديث — حالة التوثيق", () => {
  test("لا عنصر يوصف بـ«موثّق» بلا كتاب ورقم", () => {
    for (const hadith of HADITHS) {
      if (reviewStatusOf(hadith) === "verified") {
        expect(canClaimVerified(hadith)).toBe(true);
        expect(hadith.book).toBeTruthy();
        expect(hadith.hadithNumber).toBeTruthy();
      }
    }
  });

  test("الرقم والراوي معاً لا يكفيان بلا كتاب", () => {
    const withoutBook = {
      id: "x",
      narrator: "أبو هريرة رضي الله عنه",
      source: "رواه البخاري",
      hadithNumber: "١٢٣",
    };
    expect(canClaimVerified(withoutBook)).toBe(false);
    expect(reviewStatusOf(withoutBook)).toBe("traceable");
  });

  test("النسبة الموصوفة تُخرج الحديث من «موثّق» مهما كان مكتملا", () => {
    const vague = {
      id: "y",
      narrator: "يُنسب إلى النبي ﷺ على المشهور",
      source: "رواه البخاري ومسلم",
      book: "صحيح البخاري",
      hadithNumber: "١",
    };
    expect(canClaimVerified(vague)).toBe(false);
    expect(reviewStatusOf(vague)).not.toBe("verified");
    expect(hadithKindOf(vague)).toBe("attributed");
  });

  test("أثر الصحابة ليس حديثا مرفوعا", () => {
    const athar = {
      id: "z",
      narrator: "عمر بن الخطاب رضي الله عنه",
      source: "من آثار الصحابة — التذكرة",
    };
    expect(hadithKindOf(athar)).toBe("athar");
    expect(isMarfu(athar)).toBe(false);
  });

  test("المصدر يكشف النوع قبل الراوي: الأثر يبقى أثرا", () => {
    // راويه منسوب، لكن مصدره أثر صحابية — فهو أثر لا منسوب.
    const mixed = {
      id: "m",
      narrator: "يُنسب للصحابة",
      source: "من آثار الصحابة — التذكرة",
    };
    expect(hadithKindOf(mixed)).toBe("athar");
  });

  test("لا أثر في القاعدة يُعرض على أنه مرفوع", () => {
    for (const hadith of HADITHS) {
      if (hadithKindOf(hadith) === "athar") {
        expect(isMarfu(hadith)).toBe(false);
        expect(REVIEW_STATUS_LABELS[reviewStatusOf(hadith)]).not.toContain("موثّق");
      }
    }
  });

  test("كل نص يأخذ نوعا من الأربعة، ولكل نوع اسم معنى", () => {
    const counts = { marfu: 0, athar: 0, attributed: 0, unverified: 0 };
    for (const hadith of HADITHS) {
      const kind = hadithKindOf(hadith);
      counts[kind] += 1;
      expect(HADITH_KIND_LABELS[kind].length).toBeGreaterThan(0);
      expect(HADITH_KIND_HINTS[kind].length).toBeGreaterThan(0);
    }
    expect(counts.marfu).toBeGreaterThan(0);
    expect(counts.athar).toBeGreaterThan(0);
  });

  test("لا أثر ولا منسوب يأخذ نبرة المرفوع بصريا", () => {
    for (const hadith of HADITHS) {
      if (hadithKindOf(hadith) !== "marfu") {
        expect(HADITH_KIND_TONES[hadithKindOf(hadith)]).not.toBe("raised");
      }
    }
  });

  test("كل حديث بأخذ حالة مراجعة من الثلاث، و«موثّق» صفر اليوم", () => {
    const counts = { verified: 0, traceable: 0, unverified: 0 };
    for (const hadith of HADITHS) {
      const status = reviewStatusOf(hadith);
      counts[status] += 1;
      expect(REVIEW_STATUS_LABELS[status].length).toBeGreaterThan(0);
    }
    // لا ندّعي توثيقا لم يقع بعد. صفر اليوم، وهذا صحيح لا نقص في التنفيذ.
    expect(counts.verified).toBe(0);
    expect(HADITHS.some((hadith) => canClaimVerified(hadith))).toBe(false);
  });

  test("لا نص في القاعدة يُعتمد عليه قبل مراجعة عالم", () => {
    // صفر اليوم. فائدة الاختبار تظهر يوم تبدأ مراجعة بشرية فترتفع هذه
    // القيمة: حينها يجب أن ينزل هذا الرقم إلى ما روجعت منه فعلا.
    const pending = HADITHS.filter((hadith) => needsScholarlyReview(hadith)).length;
    expect(pending).toBe(HADITHS.length);
    expect(pending).toBeGreaterThan(0);
  });

  test("سطر الاستشهاد يجمع المصدر ولا يفقده", () => {
    const hadith = HADITHS[0];
    const line = citationLine(hadith);
    expect(line).toContain(hadith.source);
  });
});

describe("أحاديث — الموضوعات", () => {
  test("أحد عشر موضوعا لا أكثر", () => {
    expect(HADITH_TOPICS.length).toBe(11);
    const titles = new Set(HADITH_TOPICS.map((topic) => topic.title));
    expect(titles.size).toBe(11);
  });

  test("كل باب يقع في موضوع واحد، ولا موضوع بلا باب", () => {
    const used = new Set<string>();
    for (const section of HADITH_SECTIONS) {
      const topic = topicOfSection(section.id);
      used.add(topic);
      expect(topicTitle(topic).length).toBeGreaterThan(0);
    }
    // لا باب خارج الاثني عشر.
    expect(used.size).toBeGreaterThan(0);
    for (const topic of HADITH_TOPICS) {
      expect(used.has(topic.id)).toBe(true);
    }
  });

  test("اسم الباب ما زال يعمل للقارئ القديم", () => {
    for (const section of HADITH_SECTIONS) {
      expect(sectionTitle(section.id)).toBe(section.title);
    }
  });
});

describe("أحاديث — سياق اليوم", () => {
  test("السياق ثابت في اليوم نفسه", () => {
    const morning = new Date(2026, 8, 25, 7, 10);
    const sameMorning = new Date(2026, 8, 25, 7, 55);
    expect(dayContextTopic(morning)).toBe(dayContextTopic(sameMorning));
    expect(daySeed(morning)).toBe(daySeed(sameMorning));
  });

  test("السياق يختلف بين الفجر وآخر الليل", () => {
    const fajr = new Date(2026, 8, 25, 5, 0);
    const night = new Date(2026, 8, 25, 23, 30);
    expect(dayContextTopic(fajr)).not.toBe(dayContextTopic(night));
  });
});

describe("الإحصاء — اقتباسات بلا اختلاق", () => {
  test("كل شريحة تحمل مصدرا حقيقيا من قاعدة البيانات", () => {
    // الأقسام الثلاثة التي بُني لها المستطيل، لا غير: وجود «الأذكار» أو
    // «الأسبوع» هنا يعني أن المستطيل تسرّب إلى قسم لم يُرد له.
    for (const area of ["today", "prayers", "review"] as const) {
      const insights = insightsForArea(area, new Date(2026, 8, 25, 9, 0), 2);
      expect(insights.length).toBeGreaterThan(0);
      expect(insightsAreSourced(insights)).toBe(true);
    }
  });

  test("الاقتباس داخل الشريحة مأخوذ من حديث قائم، لا من ذهن كاتب", () => {
    const insights = insightsForArea("prayers", new Date(2026, 8, 25, 9, 0), 2);
    for (const insight of insights) {
      const id = insight.id.replace("insight-", "");
      const hadith = HADITHS.find((item) => item.id === id);
      expect(hadith).toBeDefined();
      expect(insight.text.includes(hadith!.text.slice(0, 24))).toBe(true);
      expect(insight.source).toContain(hadith!.source);
    }
  });

  test("لا شريحة مكررة في القسم نفسه", () => {
    const insights = insightsForArea("today", new Date(2026, 8, 25, 9, 0), 3);
    const ids = new Set(insights.map((item) => item.id));
    expect(ids.size).toBe(insights.length);
  });

  test("الشرائح ثابتة خلال اليوم الواحد", () => {
    const early = insightsForArea("today", new Date(2026, 8, 25, 6, 0), 2);
    const late = insightsForArea("today", new Date(2026, 8, 25, 21, 0), 2);
    expect(early.map((item) => item.id)).toEqual(late.map((item) => item.id));
  });
});
