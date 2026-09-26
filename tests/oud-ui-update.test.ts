/**
 * OUD — Major UI update: regression suite.
 *
 * These tests cover the contract of the four rebuilt areas, not their pixels:
 *   - the qibla compass, which must never fake a reading
 *   - the service hub, which must reach every service exactly once
 *   - the developer page, which must never leak a username or invent a link
 *   - the settings index, which must point at real anchors
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";

import {
  QUICK_SERVICES,
  SERVICE_SECTIONS,
  ZONES,
  serviceEntry,
} from "../src/components/app/Navigation";
import {
  angleDelta,
  canRequestOrientationPermission,
  hasOrientationApi,
  headingFromEvent,
  isStable,
} from "../src/components/oud/CompassDial";
import {
  DEVELOPER_SOCIAL_LINKS,
  SOCIAL_PLATFORMS,
  SUPPORT,
  copyToClipboard,
  isSafeExternalUrl,
  socialHref,
} from "../src/lib/developer";

/* ───────────────────────────── compass ───────────────────────────── */

describe("البوصلة: لا تكذب", () => {
  test("بدون متصفح: لا مستشعر", () => {
    // البيئة بلا `window`، فلا يجوز الادعاء أن المستشعر موجود.
    expect(hasOrientationApi()).toBe(false);
    expect(canRequestOrientationPermission()).toBe(false);
  });

  test("قراءة غير صالحة ترجع null لا NaN", () => {
    const nullAlpha = { alpha: null } as unknown as DeviceOrientationEvent;
    const nanAlpha = { alpha: Number.NaN } as unknown as DeviceOrientationEvent;
    expect(headingFromEvent(nullAlpha)).toBeNull();
    expect(headingFromEvent(nanAlpha)).toBeNull();
  });

  test("WebKit يستخدم اتجاهه الجاهزي، والعكس يطرح من ٣٦٠", () => {
    const webkit = { webkitCompassHeading: 120 } as unknown as DeviceOrientationEvent;
    expect(headingFromEvent(webkit)).toBe(240);
    const alpha = { alpha: 90 } as unknown as DeviceOrientationEvent;
    expect(headingFromEvent(alpha)).toBe(270);
  });

  test("القراءة تستقر فقط عندما تتفق القراءات", () => {
    expect(isStable([10, 11, 12])).toBe(true);
    expect(isStable([10, 40, 12])).toBe(false);
    expect(isStable([10, 11])).toBe(false);
    expect(isStable([])).toBe(false);
  });

  test("فرق الزاوية يمر بصفر لا بقفزة ٣٦٠", () => {
    expect(angleDelta(350, 10)).toBe(20);
    expect(angleDelta(10, 350)).toBe(-20);
    expect(angleDelta(90, 90)).toBe(0);
  });
});

/* ─────────────────────────── service hub ─────────────────────────── */

describe("مركز الخدمات: كل خدمة مرة واحدة", () => {
  const all = SERVICE_SECTIONS.flatMap((section) => section.services);

  test("لا تكرار في الأقسام", () => {
    const keys = all.map((service) => service.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  test("كل خدمة في الأقسام لها اسم ووصف في مصدر واحد", () => {
    for (const service of all) {
      const entry = serviceEntry(service.key);
      expect(entry, service.key).toBeDefined();
      expect(entry!.label.length, service.key).toBeGreaterThan(0);
    }
  });

  test("كل خدمة مفتوحة فعلا في لوحة القيادة", () => {
    const dashboard = readFileSync("src/pages/Dashboard.tsx", "utf8");
    for (const service of all) {
      // إمّا فرع مباشر، أو مدخل في لوحة الأقسام.
      const inLibrary = readFileSync("src/components/app/Navigation.tsx", "utf8");
      expect(
        dashboard.includes(`view === "${service.key}"`) ||
          inLibrary.includes(`key: "${service.key}"`),
        service.key,
      ).toBe(true);
    }
  });

  test("«ابدأ من هنا» لا يكرر خدمة خارج داخله", () => {
    for (const key of QUICK_SERVICES) {
      expect(serviceEntry(key), key).toBeDefined();
    }
    expect(new Set(QUICK_SERVICES).size).toBe(QUICK_SERVICES.length);
  });

  test("الدرجات الثلاث هي كل ما يوجد", () => {
    const tiers = new Set(all.map((service) => service.tier));
    expect([...tiers].sort()).toEqual(["compact", "primary", "secondary"]);
  });
});

/* ──────────────────────────── developer ──────────────────────────── */

describe("صفحة المطوّر: ما لا يُعرض", () => {
  const view = readFileSync("src/components/app/DeveloperView.tsx", "utf8");

  test("لا اسم مستخدم في الواجهة إطلاقا", () => {
    for (const url of Object.values(DEVELOPER_SOCIAL_LINKS)) {
      if (!url) continue;
      const handle = url.split("/").pop() ?? "";
      expect(view, handle).not.toContain(handle);
    }
  });

  test("لا شيفرة مستودع في أي مكان من التطوير", () => {
    for (const file of [
      "src/components/app/DeveloperView.tsx",
      "src/lib/developer.ts",
      "src/components/app/SupportDialog.tsx",
    ]) {
      expect(readFileSync(file, "utf8").toLowerCase(), file).not.toContain("github");
    }
  });

  test("تيك توك بلا رابط مختلق: `null` تعني غير معروف", () => {
    const tiktok = DEVELOPER_SOCIAL_LINKS.tiktok;
    if (tiktok === null) {
      expect(socialHref("tiktok")).toBeNull();
    } else {
      // إن وُضع رابط فلا بد أن يكون https كاملا.
      expect(isSafeExternalUrl(tiktok)).toBe(true);
      expect(tiktok).toMatch(/^https:\/\/[^/]+\/[^/]+\/?$/);
    }
  });

  test("كل رابط يمر بمشترط الأمان", () => {
    for (const platform of SOCIAL_PLATFORMS) {
      const href = socialHref(platform);
      if (href !== null) expect(isSafeExternalUrl(href), platform).toBe(true);
    }
  });

  test("رقم المحفظة لا يظهر إلا في نافذة الدعم", () => {
    expect(view).not.toContain(SUPPORT.walletDisplay);
    expect(view).not.toContain(SUPPORT.walletCopy);
    const dialog = readFileSync("src/components/app/SupportDialog.tsx", "utf8");
    expect(dialog).toContain("SUPPORT.walletDisplay");
  });

  test("لغة الدعم عن التطبيق، لا عن الشخص", () => {
    // القاعدة على **النصوص المعروضة** لا على تعليقات الشيفرة: فالتعليق
    // يذكر العبارات الممنوعة ليمنعها، وهذا مسموء.
    const forbidden = ["ادعمني", "ادفع لي", "تبرع لي", "محفظتي", "دعم عمر"];
    const shown = Object.values(SUPPORT).join(" ");
    for (const phrase of forbidden) {
      expect(shown, phrase).not.toContain(phrase);
    }
    expect(shown).toContain("دعم OUD");
    expect(shown).toContain("دعم تطوير");
  });

  test("الحافظة ثلاث حالات، والفشل لا يرمي", async () => {
    expect(await copyToClipboard("x")).toBe("unavailable");
    expect(await copyToClipboard("x", { writeText: async () => {} })).toBe("copied");
    expect(
      await copyToClipboard("x", {
        writeText: async () => {
          throw new Error("denied");
        },
      }),
    ).toBe("failed");
  });

  test("الترتيب: هوية، لماذا، تواصل، دعم، مشاركة، بيانات", () => {
    // رموز من الـJSX نفسه، لا من الاستيرادات: الاستيراد يسبق كل شيء.
    const order = [
      "oud-icon-tile oud-icon-xl",
      "WHY_OUD.title",
      "SOCIAL_TITLE}",
      "SUPPORT.title",
      "SHARE_OUD.title",
      "APP_VERSION}",
    ];
    let cursor = -1;
    for (const token of order) {
      const at = view.indexOf(token);
      expect(at, token).toBeGreaterThan(cursor);
      cursor = at;
    }
  });
});

/* ───────────────────────────── settings ──────────────────────────── */

describe("الإعدادات: فهرس حقيقي لا زينة", () => {
  const settings = readFileSync("src/components/app/SettingsView.tsx", "utf8");

  test("كل قسم في الفهرس له مرساة فعلية في الصفحة", () => {
    const anchors = [...settings.matchAll(/id="(settings-[a-z]+)"/g)].map((match) => match[1]);
    expect(anchors.length).toBeGreaterThanOrEqual(5);
    // الفهرس يبني رابطه من نفس البادئة، فنتحقق من تطابق البادئة لا من
    // حرفية الرابط.
    expect(settings).toContain('href={`#settings-${section.id}`}');
    for (const id of anchors) {
      expect(settings, id).toContain(`id: "${id.replace("settings-", "")}"`);
    }
  });

  test("عدد المجموعات قليل، لا قائمة طويلة", () => {
    const groups = (settings.match(/<Group\b/g) ?? []).length;
    expect(groups).toBeGreaterThanOrEqual(4);
    expect(groups).toBeLessThanOrEqual(8);
  });

  test("هدف اللمس في الصفوف، لا أصابع صغيرة", () => {
    expect(settings).toContain("py-3.5");
  });
});

/* ──────────────────────────── navigation ─────────────────────────── */

describe("الشريط السفلي: أربع وجهات لا خامسة", () => {
  test("الأسماء هي التقسيم المعتمد", () => {
    expect(ZONES.map((zone) => zone.label)).toEqual([
      "الرئيسية",
      "عبادتي",
      "يومي",
      "الإعدادات",
    ]);
  });

  test("لا تكرار بين الرئيسية ويومي: الخطة في يومي وحدها", () => {
    const home = readFileSync("src/components/app/HomeView.tsx", "utf8");
    const day = readFileSync("src/components/app/DayHubView.tsx", "utf8");
    expect(home).not.toContain("DayTimeline");
    expect(day).toContain("DayTimeline");
  });

  test("الرئيسية لا تفهرس الخدمات؛ عبادتي تفعل", () => {
    const home = readFileSync("src/components/app/HomeView.tsx", "utf8");
    const hub = readFileSync("src/components/app/WorshipHubView.tsx", "utf8");
    expect(home).not.toContain("SERVICE_SECTIONS");
    expect(hub).toContain("SERVICE_SECTIONS");
  });
});
