/**
 * PHASE 3.x — اختبار رسم الصفحة.
 *
 * **لماذا نرسم الصفحة فعلا؟** أغلب ما نريد حمايته لا يظهر في قراءة
 * الشيفرة: أن يبقى الرقم مخفيا، وأن لا يظهر اسم مستخدم نصّا، وأن
 * لا يوجد رابط ثالث مخترع. الشيفرة تكذب بسهولة في هذه، أما الرسم فلا.
 *
 * **بلا متصفح:** `renderToStaticMarkup` ينتج ما سيراه المتصفح من
 * نصوص وسمات، بلا فتح نافذة ولا قياس مقاسات. وهذا يكفي للأسئلة
 * النصّية، ولا يكفي لغيرها.
 */
import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { DeveloperView } from "@/components/app/DeveloperView";
import { SupportDialog } from "@/components/app/SupportDialog";
import {
  DEVELOPER_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  SUPPORT,
} from "@/lib/developer";

// بلا JSX: امتداد `.ts` لا يترجم JSX، و`createElement` يُنهي الجدال.
const html = renderToStaticMarkup(createElement(DeveloperView));

/** النص المرئي فقط: كل ما بين السمات مستثنى، والكيانات تُفكّ. */
const visibleText = html
  .replace(/<[^>]*>/g, " ")
  .replace(/&amp;/g, "&")
  .replace(/&lt;/g, "<")
  .replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"');

/** كل الروابط الخارجية في الصفحة. */
const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((match) => match[1]);

describe("رسم صفحة المطوّر", () => {
  test("تُرسم بلا أن ترمي", () => {
    expect(html.length).toBeGreaterThan(0);
    expect(html.startsWith("<div")).toBe(true);
  });

  test("الهوية كاملة: الاسم والدور والفكرة", () => {
    expect(visibleText).toContain("عمر صبري");
    expect(visibleText).toContain("Founder & Developer of OUD");
    expect(visibleText).toContain("حول صلاته وعبادته");
  });

  test("الأقسام الستة بالترتيب", () => {
    const order = [
      "عمر صبري",
      "لماذا OUD؟",
      "تواصل معي",
      "ادعم OUD",
      "شارك OUD",
      "صُنع بعناية في مصر",
    ].map((text) => visibleText.indexOf(text));
    // كل قسم موجود، وأي `-1` يعني أنه غائب.
    for (const at of order) expect(at).toBeGreaterThan(-1);
    // والترتيب كما في التصميم: من ← لماذا ← تواصل ← ادعم ← شارك ← بيانات.
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  test("الإصدار معروض من الحزمة", () => {
    expect(visibleText).toContain("الإصدار 1.0.0");
  });

  test("رقم المحفظة غائب عن الصفحة كلّها", () => {
    // لا في النص ولا في أي سمة. النافذة وحدها تحمله.
    expect(html).not.toContain(SUPPORT.walletDisplay);
    expect(html).not.toContain(SUPPORT.walletCopy);
    expect(html).not.toContain("015");
  });

  test("لا اسم مستخدم في النص المرئي", () => {
    // المعرّف يبقى داخل `href` فقط — هذا ما يجعل فتح الحساب صحيحا.
    for (const platform of SOCIAL_PLATFORMS) {
      const url = DEVELOPER_SOCIAL_LINKS[platform];
      if (url === null) continue;
      const handle = new URL(url).pathname.replace(/^\//, "");
      expect({ platform, inText: visibleText.includes(handle) }).toEqual({
        platform,
        inText: false,
      });
      // وفي `href` موجود فعلا، وإلا فالزر لا يفتح شيئا.
      expect(hrefs).toContain(url);
    }
    expect(visibleText).not.toContain("@");
  });

  test("رابطان فقط: تيليجرام وإنستغرام. لا ثالث مخترع", () => {
    const external = hrefs.filter((href) => href.startsWith("https://"));
    expect(external.length).toBe(2);
    expect(external).toContain("https://t.me/omarsaabry");
    expect(external).toContain("https://instagram.com/_rcfo");
  });

  test("بلا GitHub وبلا أي رابط TikTok", () => {
    expect(html.toLowerCase()).not.toContain("github");
    expect(html).not.toContain("tiktok.com");
    // بطاقة TikTok موجودة، لكن بلا رابط: «قريبًا».
    expect(visibleText).toContain("TikTok");
    expect(visibleText).toContain("قريبًا");
  });

  test("حسابات التواصل مسمّاة باسم المنصة لا بمعرّفها", () => {
    for (const label of ["Telegram", "Instagram", "TikTok"]) {
      expect(visibleText).toContain(label);
    }
  });

  test("نوافذ المشاركة والدعم مغلقتان: لا رقم ولا ورقة في الصفحة", () => {
    // Radix لا يرسم شيئا قبل الفتح، وهذا هو السلوك المطلوب.
    expect(html).not.toContain("role=\"dialog\"");
    expect(html).not.toContain("تم نسخ رقم المحفظة");
  });

  test("لا لغة دفع شخصية في المرسوم", () => {
    for (const phrase of ["ادفع لي", "تبرع لي", "حوّل لي", "محفظتي", "دعم عمر"]) {
      expect({ phrase, present: visibleText.includes(phrase) }).toEqual({
        phrase,
        present: false,
      });
    }
  });

  test("دعم OUD مذكور في الصفحة نفسها", () => {
    expect(visibleText).toContain("دعم OUD");
    expect(visibleText).toContain("الدعم اختياري");
    // «مساهمة في استمرار المشروع» هي اللغة المعتمدة.
    expect(visibleText).toContain("مساهمة في استمرار المشروع");
  });
});

describe("حدّ التحقق الآلي — ما لا يستطيع هذا الاختبار أن يحكم فيه", () => {
  test("نافذة الدعم لا تُرسم بلا DOM، فمحتواها محروس على المصدر لا على الرسم", () => {
    // Radix ينقل المحتوى إلى `portal`، وهو يحتاج `document`. بلا متصفح
    // بلا JSDOM، الخرج فارغ — وهذا **ليس** فشلًا في النافذة.
    const portalHtml = renderToStaticMarkup(
      createElement(SupportDialog, { open: true, onOpenChange: () => {} }),
    );
    expect(portalHtml).toBe("");

    // فمحتواها محروس في `phase3x-developer.test.ts` على مستوى الشيفرة:
    // الرقم، والسبب، والنسخ، ورسالة الفشل، والبقاء ظاهرا. أمّا ظهورها
    // على الشاشة فعلا فـBrowser QA، وهو NOT VERIFIED.
  });
});
