/**
 * PHASE 3.x — «المطوّر» و«دعم OUD».
 *
 * هذه الاختبارات تحرس ثلاثة أشياء لا يحميها الكود وحده:
 *
 *   ١. **الأمانة:** لا اسم مستخدم يظهر، ولا رابط مخترع، ولا GitHub.
 *   ٢. **الهوية:** الدعمُ للتطبيق لا للشخص، واللغة لا تنزلق إلى «ادفع لي».
 *   ٣. **الخصوصية:** رقم المحفظة في نافذة الدعم وحدها، لا في الصفحة.
 *
 * وكلها آلية، أي بلا متصفح. **ما لا تقدر الاختبارات الآلية على الحكم فيه
 * يبقى غير محكوم**: التخطيط عند كل مقاس، وسلوك النسخ على جهاز حقيقي.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import {
  APP_CREDITS,
  DEVELOPER,
  DEVELOPER_SOCIAL_LINKS,
  FEEDBACK,
  SHARE_OUD,
  SOCIAL_PLATFORM_DESCRIPTIONS,
  SOCIAL_PLATFORM_LABELS,
  SOCIAL_PLATFORMS,
  SUPPORT,
  WHY_OUD,
  copyToClipboard,
  hasLinkFor,
  isSafeExternalUrl,
  shareOud,
  socialHref,
  type ClipboardLike,
  type SocialPlatform,
} from "../src/lib/developer";

const read = (file: string) => readFileSync(file, "utf8");

const VIEW = "src/components/app/DeveloperView.tsx";
const DIALOG = "src/components/app/SupportDialog.tsx";
const CONFIG = "src/lib/developer.ts";
const NAV = "src/components/app/Navigation.tsx";
const DASHBOARD = "src/pages/Dashboard.tsx";

/** كل ملفات src، لفحص أين يظهر كل نص. */
function sourceFiles(dir = "src"): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...sourceFiles(full));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

const ALL_SOURCES = sourceFiles();

/** كل النصوص التي يراها المستخدم في ملف الإعدادات. */
function userVisibleStrings(config: string): string[] {
  return [...config.matchAll(/"([^"\n]{2,})"/g)].map((match) => match[1]);
}

/** مسارات كل ملفات الشيفرة التي تحوي نصا معينا. */
function filesContaining(needle: string): string[] {
  return ALL_SOURCES.filter((file) => read(file).includes(needle));
}

/* ————————————————— ١ · القسم موجود في الخريطة ————————————————— */

describe("قسم المطوّر — الوصول عبر الخريطة الحالية", () => {
  test("مسجَّل في خريطة الشاشات بنصّه", () => {
    const nav = read(NAV);
    expect(nav).toContain('| "developer"');
    expect(nav).toContain('developer: "المطوّر"');
  });

  test("يُعرض من لوحة التطبيق، لا من مسار مستقل", () => {
    const dashboard = read(DASHBOARD);
    expect(dashboard).toContain('import("@/components/app/DeveloperView")');
    expect(dashboard).toContain('view === "developer"');
  });

  test("لا وجهة جديدة في الشريط السفلي", () => {
    // «المطوّر» داخل مجموعة التطبيق، والشريط السفلي fünf وجهات.
    const nav = read(NAV);
    const primary = nav.slice(nav.indexOf("PRIMARY_NAV"), nav.indexOf("LIBRARY_GROUPS"));
    expect(primary).not.toContain("developer");
    expect(nav).toContain('{ key: "developer", label: "المطوّر"');
  });

  test("الصفحة محمّلة كسولا فلا تدخل المسار الحرج", () => {
    const dashboard = read(DASHBOARD);
    expect(dashboard).toMatch(/const DeveloperView = lazy\(/);
  });
});

/* ————————————————— ٢ · هوية المطوّر ————————————————— */

describe("هوية المطوّر", () => {
  test("الاسم والدور ونص الفكرة كما هي", () => {
    expect(DEVELOPER.name).toBe("عمر صبري");
    expect(DEVELOPER.role).toBe("Founder & Developer of OUD");
    expect(DEVELOPER.statement).toContain("حول صلاته وعبادته");
    expect(DEVELOPER.statement).toContain("بدل أن تسرق منه يومه");
  });

  test("Monogram بدل صورة: لا صورة ولا رابط صورة مخترع", () => {
    expect(DEVELOPER.monogram).toBe("OUD");
    for (const file of [VIEW, CONFIG, DIALOG]) {
      expect(read(file)).not.toMatch(/\.(png|jpe?g|webp|avif)\b/);
    }
  });

  test("الهوية معروضة في صفحة واحدة لا في Portfolio", () => {
    const view = read(VIEW);
    expect(view).toContain("DEVELOPER.name");
    expect(view).toContain("DEVELOPER.statement");
    // نص «لماذا» في بطاقة تحريرية، لا في بطاقة زجاجية.
    expect(view).toContain("<Editorial");
  });

  test("«لماذا OUD؟» بنصّه، بلا أرقام ولا ادّعاءات", () => {
    expect(WHY_OUD.title).toBe("لماذا OUD؟");
    expect(WHY_OUD.body).toContain("ليس تطبيق مهام تقليديًا");
    // رقم في هذا القسم سيصبح دعوى بلا مصدر.
    expect(WHY_OUD.body).not.toMatch(/\d/);
    expect(WHY_OUD.body).not.toMatch(/(مليون|ألف|مستخدم|تحميل|تقييم)/);
  });
});

/* ————————————————— ٣-٥ · الروابط الصحيحة ————————————————— */

describe("الحسابات — الروابط", () => {
  test("Telegram يفتح رابطه الصحيح", () => {
    expect(DEVELOPER_SOCIAL_LINKS.telegram).toBe("https://t.me/omarsaabry");
    expect(socialHref("telegram")).toBe("https://t.me/omarsaabry");
    expect(hasLinkFor("telegram")).toBe(true);
  });

  test("Instagram يفتح رابطه الصحيح", () => {
    expect(DEVELOPER_SOCIAL_LINKS.instagram).toBe("https://instagram.com/_rcfo");
    expect(socialHref("instagram")).toBe("https://instagram.com/_rcfo");
    expect(hasLinkFor("instagram")).toBe(true);
  });

  test("TikTok بلا رابط مخترع", () => {
    // الرابط الكامل غير معروف، فالحقل null والواجهة تقول «قريبًا».
    expect(DEVELOPER_SOCIAL_LINKS.tiktok).toBeNull();
    expect(socialHref("tiktok")).toBeNull();
    expect(hasLinkFor("tiktok")).toBe(false);
  });

  test("لا رابط TikTok مخترع في أي مكان بالشيفرة", () => {
    for (const file of ALL_SOURCES) {
      expect({ file, has: /tiktok\.com/.test(read(file)) }).toEqual({
        file,
        has: false,
      });
    }
    // ولا رابط عام لأي منصة بأسماء مخترعة.
    expect(read(CONFIG)).not.toMatch(/https:\/\/(www\.)?tiktok/);
  });

  test("كل الروابط https، ولا javascript: ولا data:", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      const url = DEVELOPER_SOCIAL_LINKS[platform];
      if (url === null) continue;
      expect(isSafeExternalUrl(url)).toBe(true);
    }
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("data:text/html,x")).toBe(false);
    expect(isSafeExternalUrl("ليس رابطا")).toBe(false);
  });

  test("الرابط يمرّ من `socialHref` وحده، فلا تمرّر Component رابطا", () => {
    const view = read(VIEW);
    expect(view).toContain("socialHref(platform)");
    // أي رابط مكتوب داخل Component يعني أن التكرار بدأ.
    expect(view).not.toMatch(/https?:\/\//);
  });
});

/* ————————————————— ٦-٧ · لا أسماء مستخدمين ولا GitHub ————————————————— */

describe("الحسابات — ما لا يظهر للمستخدم", () => {
  test("لا اسم مستخدم يظهر في البطاقات", () => {
    const view = read(VIEW);
    for (const platform of SOCIAL_PLATFORMS) {
      const url = DEVELOPER_SOCIAL_LINKS[platform];
      if (url === null) continue;
      const handle = new URL(url).pathname.replace(/^\//, "");
      expect(handle.length).toBeGreaterThan(0);
      // الاسم الحقيقي للقارئ يأتي من الرابط عند الفتح، لا من نص على الشاشة.
      expect({ platform, leaked: view.includes(handle) }).toEqual({
        platform,
        leaked: false,
      });
    }
  });

  test("لا علامة @ في أي نص معروض", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      expect(SOCIAL_PLATFORM_LABELS[platform]).not.toContain("@");
      expect(SOCIAL_PLATFORM_DESCRIPTIONS[platform]).not.toContain("@");
    }
    expect(read(VIEW)).not.toContain('@"');
  });

  test("التسميات هي أسماء المنصات وحدها", () => {
    expect(SOCIAL_PLATFORMS.map((p) => SOCIAL_PLATFORM_LABELS[p])).toEqual([
      "Telegram",
      "Instagram",
      "TikTok",
    ]);
  });

  test("لا GitHub في المنصة ولا في الواجهة", () => {
    expect(SOCIAL_PLATFORMS).not.toContain("github" as SocialPlatform);
    for (const file of [VIEW, CONFIG, DIALOG]) {
      expect(read(file).toLowerCase()).not.toContain("github");
    }
  });

  test("منصة بلا رابط تُعرض «قريبًا» ولا تفتح شيئا", () => {
    const view = read(VIEW);
    // البطاقة بلا `href` ت render في div لا في a.
    expect(view).toContain("قريبًا");
    expect(view).toMatch(/if \(!href\)[\s\S]{0,400}<div/);
  });
});

/* ————————————————— ٨ · قسم الدعم ————————————————— */

describe("قسم الدعم", () => {
  test("العنوان والزر بالنص المطلوب", () => {
    expect(SUPPORT.title).toBe("ادعم OUD");
    expect(SUPPORT.button).toBe("ادعم OUD");
  });

  test("النص الأساسي والاختيارية كما هما", () => {
    expect(SUPPORT.lead).toBe(
      "إذا ساعدك OUD ولو بخطوة واحدة، يمكنك دعم استمرار تطويره وتحسينه.",
    );
    expect(SUPPORT.note).toBe(
      "الدعم اختياري، ويساعد في استمرار تطوير التطبيق وتحسين تجربته.",
    );
  });

  test("القسم معروض بزر يفتح النافذة", () => {
    const view = read(VIEW);
    expect(view).toContain("SUPPORT.title");
    expect(view).toContain("SUPPORT.lead");
    expect(view).toContain("SUPPORT.note");
    expect(view).toContain("setSupportOpen(true)");
    expect(view).toContain("<SupportDialog");
  });

  test("لا زر «ادعم المطور» ولا «حوّل لي» ولا «تبرع لي»", () => {
    const view = read(VIEW);
    for (const phrase of ["ادعم المطور", "ادعم المطوّر", "حوّل لي", "حول لي", "تبرع لي"]) {
      expect({ phrase, present: view.includes(phrase) }).toEqual({ phrase, present: false });
    }
  });

  test("الوعد ليس خدمة ولا اشتراكا", () => {
    // النصوص المعروضة فقط: كلام الشرح في التعليقات ليس ما يقرأه المستخدم.
    const strings = userVisibleStrings(read(CONFIG));
    for (const word of ["اشتراك", "خدمة مدفوعة", "مقابل", "ضمان"]) {
      const hits = strings.filter((text) => text.includes(word));
      expect({ word, hits }).toEqual({ word, hits: [] });
    }
  });
});

/* ————————————————— ٩-١٠ · رقم We Pay ————————————————— */

describe("وسيلة الدعم — We Pay", () => {
  test("الرقم صحيح في العرض والنسخ", () => {
    expect(SUPPORT.walletDisplay).toBe("015 50324450");
    // ما يُنسخ أرقام فقط: حقل المحفظة يقبلها هكذا.
    expect(SUPPORT.walletCopy).toBe("01550324450");
    expect(SUPPORT.walletCopy.replace(/\D/g, "")).toBe(SUPPORT.walletDisplay.replace(/\D/g, ""));
  });

  test("الوسيلة We Pay، وسبب التحويل مذكور", () => {
    expect(read(DIALOG)).toContain("We Pay");
    expect(SUPPORT.methodLabel).toBe("وسيلة الدعم");
    expect(SUPPORT.purpose).toBe("هذه المحفظة مخصصة لاستقبال دعم تطوير تطبيق OUD.");
    expect(SUPPORT.howTo).toContain("We Pay");
  });

  test("لا زر We Pay وهمي ولا رابط deep link مخترع", () => {
    for (const file of [VIEW, DIALOG, CONFIG]) {
      expect(read(file)).not.toMatch(/wepay|we-pay|wepay:/i);
    }
  });

  test("الرقم لا يظهر إلا في نافذة الدعم", () => {
    // **الرقم مكتوب في مكان واحد في الشيفرة كلها**: ملف الإعدادات.
    // النافذة تقرأ الثابت ولا تكتب رقما، والصفحة لا تذكره إطلاقا.
    expect(filesContaining(SUPPORT.walletDisplay)).toEqual([CONFIG]);
    expect(filesContaining(SUPPORT.walletCopy)).toEqual([CONFIG]);
    // النافذة تعرضه من الثابت، لا من نص مكتوب يدويا.
    expect(read(DIALOG)).toContain("SUPPORT.walletDisplay");
    expect(read(VIEW)).not.toContain("015");
  });

  test("الرقم في النافذة يبقى ظاهرًا حتى بعد فشل النسخ", () => {
    const dialog = read(DIALOG);
    // الشرط يبدّل الرسالة فقط، ولا يخفي الرقم.
    expect(dialog).toContain("SUPPORT.walletDisplay");
    expect(dialog).toMatch(/copy !== "copied"[\s\S]{0,200}copyFailedLabel/);
    expect(dialog).not.toMatch(/setSupportOpen\(false\)/);
  });
});

/* ————————————————— ١١-١٢ · النسخ ————————————————— */

describe("نسخ الرقم", () => {
  test("ينسخ رقم المحفظة ويعكس نجاحه", async () => {
    let received = "";
    const result = await copyToClipboard(SUPPORT.walletCopy, {
      writeText: async (text) => {
        received = text;
      },
    });
    expect(result).toBe("copied");
    expect(received).toBe("01550324450");
  });

  test("رفض الحافظة يُعالَج ولا يرمي", async () => {
    // الحافظة نفسها ترمي، فالدالة ترجع حالة لا ترمي استثناء.
    const hostile: ClipboardLike = {
      writeText: async () => {
        throw new Error("NotAllowedError");
      },
    };
    expect(await copyToClipboard(SUPPORT.walletCopy, hostile)).toBe("failed");
  });

  test("غياب الحافظة حالة ثالثة لا خطأ", async () => {
    // سياق غير آمن: الحافظة غير موجودة أصلا. لا نخبر المستخدم بالخطأ.
    expect(await copyToClipboard(SUPPORT.walletCopy, null)).toBe("unavailable");
  });

  test("رسالة النجاح ورسالة الفشل موجودتان", () => {
    expect(SUPPORT.copiedLabel).toBe("تم نسخ رقم المحفظة");
    expect(SUPPORT.copyLabel).toBe("نسخ الرقم");
    expect(SUPPORT.copyFailedLabel).toContain("انسخه يدويًا");
  });

  test("الزر يعلن نجاحه بعلامة لا بلون وحده", () => {
    const dialog = read(DIALOG);
    expect(dialog).toContain('state={copy === "copied" ? "success" : "default"}');
    expect(dialog).toContain("aria-live");
  });
});

/* ————————————————— ١٣-١٤ · لغة الدعم ————————————————— */

describe("لغة الدعم — عن التطبيق لا عن الشخص", () => {
  /** كل ما يراه المستخدم في ملف الإعدادات، لا التعليقات. */
  const strings = userVisibleStrings(read(CONFIG));

  test("الغرض مذكور: دعم OUD وتطوير التطبيق", () => {
    const supportText = [SUPPORT.title, SUPPORT.lead, SUPPORT.note, SUPPORT.dialogLead, SUPPORT.purpose].join(" ");
    expect(supportText).toContain("OUD");
    expect(supportText).toContain("تطوير التطبيق");
    expect(supportText).toContain("اختياري");
  });

  test("لا لغة دفع شخصية في أي نص معروض", () => {
    // القائمة من بند «لغة الدفع الشخصية» في الطلب. تطابق حرفي.
    const banned = [
      "ادفع لي",
      "ادفعلي",
      "حوّل لي",
      "حول لي",
      "تبرع لي",
      "تبرعلي",
      "محفظتي",
      "رقمي الشخصي",
      "دعم عمر",
      "ادعم المطور",
      "ادعم المطوّر",
      "ساعدني شخصيًا",
      "ساعدني شخصيا",
    ];
    for (const phrase of banned) {
      const hits = strings.filter((text) => text.includes(phrase));
      expect({ phrase, hits }).toEqual({ phrase, hits: [] });
    }
  });

  test("المحرّمة لا تصل إلى الواجهة حتى لو سقطت من الإعدادات", () => {
    // حارس أخير على الملفين اللذين يعرضان هذه النصوص.
    for (const file of [VIEW, DIALOG]) {
      for (const phrase of ["ادفع لي", "تبرع لي", "محفظتي", "دعم عمر"]) {
        expect({ file, phrase, present: read(file).includes(phrase) }).toEqual({
          file,
          phrase,
          present: false,
        });
      }
    }
  });

  test("«الدعم» و«المساهمة» هما اللفظان المستعملان", () => {
    const all = [SUPPORT.title, SUPPORT.lead, SUPPORT.note, SHARE_OUD.title].join(" ");
    expect(all).toContain("دعم");
    expect(FEEDBACK.label).toBe("اقتراح أو ملاحظة");
  });
});

/* ————————————————— ١٥ · المشاركة ————————————————— */

describe("شارك OUD", () => {
  test("نص المشاركة يصف التطبيق", () => {
    expect(SHARE_OUD.text).toBe(
      "OUD — نظام حياة يساعدك على تنظيم يومك حول صلاتك وعبادتك.",
    );
  });

  test("يستخدم المشاركة الأصلية حين توجد", async () => {
    let seen: { title: string; text: string; url: string } | null = null;
    const outcome = await shareOud({
      url: "https://oud.app",
      share: async (data) => {
        seen = data;
      },
    });
    expect(outcome).toBe("shared");
    expect(seen!.url).toBe("https://oud.app");
    expect(seen!.text).toBe(SHARE_OUD.text);
    expect(seen!.title).toBe(APP_CREDITS.product);
  });

  test("بلا مشاركة أصلية ينسخ الرابط", async () => {
    let copied = "";
    const outcome = await shareOud({
      url: "https://oud.app",
      share: null,
      clipboard: {
        writeText: async (text) => {
          copied = text;
        },
      },
    });
    expect(outcome).toBe("copied");
    expect(copied).toBe("https://oud.app");
  });

  test("إلغاء المشاركة لا يترك المستخدم بلا نتيجة", async () => {
    let copied = "";
    const outcome = await shareOud({
      url: "https://oud.app",
      share: async () => {
        throw new Error("AbortError");
      },
      clipboard: {
        writeText: async (text) => {
          copied = text;
        },
      },
    });
    expect(outcome).toBe("copied");
    expect(copied).toBe("https://oud.app");
  });

  test("ولا مشاركة ولا حافظة: يقول «لم ينجح» لا «نجح»", async () => {
    const outcome = await shareOud({ url: "https://oud.app", share: null, clipboard: null });
    expect(outcome).toBe("failed");
  });

  test("المنطق خارج Component حتى يبقى مغطى بالاختبار", () => {
    expect(read(VIEW)).toContain("shareOud");
  });
});

/* ————————————————— ١٦ · الوصولية ————————————————— */

describe("الوصولية", () => {
  const view = read(VIEW);
  const dialog = read(DIALOG);

  test("كل رابط حساب يحمل تسمية عربية تصف ما يفعله", () => {
    expect(view).toContain("aria-label={`${label} — ${description}");
    for (const platform of SOCIAL_PLATFORMS) {
      expect(SOCIAL_PLATFORM_LABELS[platform]).toBeTruthy();
      expect(SOCIAL_PLATFORM_DESCRIPTIONS[platform]).toBeTruthy();
    }
  });

  test("الروابط الخارجية آمنة: noopener بلا مرجع لنفسه", () => {
    expect(view).toContain('rel="noopener noreferrer"');
    expect(view).toContain('target="_blank"');
  });

  test("أزرار الصفحة عبر نظام التصميم، لا أزرارًا مبنية يدويًا", () => {
    // `QuietButton` و`PrimaryButton` يحملان `touch-target` و`aria-busy`.
    expect(view).toContain("<PrimaryButton");
    expect(view).toContain("<QuietButton");
    expect(view).not.toMatch(/<button/);
  });

  test("حلقة تركيز واحدة على البطاقات القابلة للضغط", () => {
    expect(view).toContain("focus-ring");
    expect(view).toContain("motion-press");
  });

  test("النافذة عنوانها ووصفها وبياناتها كاملة", () => {
    expect(dialog).toContain("<DialogTitle");
    expect(dialog).toContain("<DialogDescription");
    // Radix يتولى التركيز والإغلاق بمفتاح Escape واستعادة التركيز.
    expect(dialog).toContain("onOpenChange");
  });

  test("رقم المحفظة معلن لقارئ الشاشة عند النسخ", () => {
    expect(dialog).toContain('aria-live="polite"');
    expect(dialog).toContain('aria-label={`${SUPPORT.copyLabel}');
  });

  test("الأيقونات الزخرفية مخفية عن قارئ الشاشة", () => {
    // كل أيقونة داخل عنصر له نص، فلا تُقرأ مرتين.
    const icons = [...view.matchAll(/<[A-Z][A-Za-z]*\s+className="[^"]*size-[^"]*"[^>]*>/g)];
    expect(icons.length).toBeGreaterThan(0);
    for (const icon of icons) {
      expect({ icon: icon[0].slice(0, 40), hidden: icon[0].includes("aria-hidden") }).toEqual({
        icon: icon[0].slice(0, 40),
        hidden: true,
      });
    }
  });
});

/* ————————————————— ١٧ · بيانات التذييل ————————————————— */

describe("بيانات التذييل", () => {
  test("الاسم والوصف ومكان الصنع", () => {
    expect(APP_CREDITS.product).toBe("OUD");
    expect(APP_CREDITS.tagline).toBe("Premium Islamic Life Companion");
    expect(APP_CREDITS.madeIn).toBe("صُنع بعناية في مصر");
  });

  test("الإصدار من الحزمة، لا من ذاكرة الكاتب", () => {
    const pkg = JSON.parse(read("package.json"));
    const meta = read("src/lib/app-meta.ts");
    // القيمة تُقرأ من package.json ولا تُكتب في أي Component.
    expect(meta).toContain('from "../../package.json"');
    expect(read(VIEW)).toContain("APP_VERSION");
    expect(read(VIEW)).not.toMatch(/\d+\.\d+\.\d+/);
    // والحزمة نفسها لها إصدار صالح.
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
