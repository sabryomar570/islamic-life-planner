/**
 * PHASE 2 — حارس سلامة المحتوى الديني.
 *
 * القاعدة: لا نص منسوب لمصدر بلا مصدر. الأنواع تفرض وجود الحقل، لكنها
 * تسمح بـ`source: ""`، وهذه الاختبارات تسدّ تلك الفجوة بالبيانات نفسها.
 *
 * ليست اختبار أسلوب: لا تفحص صياغة ولا خط ولا ذوقًا. تفحص فقط ثلاثة أشياء:
 * نص غير فارغ، مصدر غير فارغ، ومرجع قابل للتتبّع.
 */
import { describe, expect, test } from "bun:test";

import { ADHKAR_GROUPS } from "../src/data/adhkar";
import { DUA_SECTIONS, DUAS } from "../src/data/duas";
import { HADITHS } from "../src/data/hadith";
import { POEMS } from "../src/data/poetry";
import { PROPHET_STORIES } from "../src/data/prophets";

const isFilled = (value: unknown) => typeof value === "string" && value.trim().length > 0;

describe("adhesive: every dhikr names its source", () => {
  const items = ADHKAR_GROUPS.flatMap((group) => group.items);
  test("the dataset is not empty", () => {
    expect(items.length).toBeGreaterThan(40);
  });
  test("no dhikr has an empty text, repeat, or source", () => {
    for (const item of items) {
      expect(isFilled(item.text)).toBe(true);
      expect(isFilled(item.source)).toBe(true);
      expect(item.repeat).toBeGreaterThan(0);
    }
  });
  test("ids are unique inside every group", () => {
    for (const group of ADHKAR_GROUPS) {
      const ids = group.items.map((item) => item.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe("duas: every dua is Quran or Sunnah and says which", () => {
  test("the dataset is not empty", () => {
    expect(DUAS.length).toBeGreaterThan(30);
  });
  test("source is one of the two closed values, and reference is filled", () => {
    const allowed = new Set(["قرآن كريم", "السنة النبوية"]);
    for (const dua of DUAS) {
      expect(allowed.has(dua.source)).toBe(true);
      expect(isFilled(dua.reference)).toBe(true);
      expect(isFilled(dua.text)).toBe(true);
    }
  });
  test("every dua belongs to a declared section", () => {
    const sections = new Set<string>(DUA_SECTIONS.map((section) => section.id));
    for (const dua of DUAS) expect(sections.has(dua.section)).toBe(true);
  });
});

describe("hadith: every narration carries narrator, source, and section", () => {
  test("the dataset is not empty", () => {
    expect(HADITHS.length).toBeGreaterThan(100);
  });
  test("narrator and source are never blank", () => {
    for (const hadith of HADITHS) {
      expect(isFilled(hadith.narrator)).toBe(true);
      expect(isFilled(hadith.source)).toBe(true);
      expect(isFilled(hadith.text)).toBe(true);
    }
  });
  test("ids are unique", () => {
    const ids = HADITHS.map((hadith) => hadith.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("poetry: every verse is attributed to a poet and a collection", () => {
  test("the dataset is not empty", () => {
    expect(POEMS.length).toBeGreaterThan(0);
  });
  test("poet, source, and every line are filled", () => {
    for (const poem of POEMS) {
      expect(isFilled(poem.poet)).toBe(true);
      expect(isFilled(poem.source)).toBe(true);
      expect(poem.lines.length).toBeGreaterThan(0);
      for (const line of poem.lines) expect(isFilled(line)).toBe(true);
    }
  });
});

describe("prophets: every story names its primary source", () => {
  test("the dataset is not empty", () => {
    expect(PROPHET_STORIES.length).toBeGreaterThan(0);
  });
  test("source is filled, paragraphs are non-empty, and any ayah carries a ref", () => {
    for (const story of PROPHET_STORIES) {
      expect(isFilled(story.source)).toBe(true);
      expect(story.paragraphs.length).toBeGreaterThan(0);
      for (const paragraph of story.paragraphs) expect(isFilled(paragraph)).toBe(true);
      // آية بارزة اختيارية، لكن إن وردت فمرجعها لازم.
      if (story.ayah) expect(isFilled(story.ayah.ref)).toBe(true);
    }
  });
});

describe("quran: the text is fetched or bundled, never generated", () => {
  test("the offline bundle and the API are the only two sources named in code", async () => {
    const quran = await Bun.file("src/data/quran.ts").text();
    const offline = await Bun.file("src/data/quran-offline.ts").text();
    // لا مصدر ثالث: لا توليد محلي ولا مزوّد نصّي.
    expect(quran).not.toMatch(/openai|anthropic|gemini|generate/i);
    expect(offline).not.toMatch(/openai|anthropic|gemini|generate/i);
  });
});
