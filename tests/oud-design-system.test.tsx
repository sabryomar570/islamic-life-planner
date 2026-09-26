/**
 * OUD — Design System contract.
 *
 * These tests are about the *new* UI rules, so a future screen cannot quietly
 * reintroduce the old look. They are structural, not visual: they read the
 * source and the rendered markup.
 *
 * What they lock:
 *   1. Exactly four depth levels exist, and nothing invents a fifth.
 *   2. The gel material is one class, with four icon sizes.
 *   3. The bottom bar has four zones and a travelling droplet.
 *   4. The rebuilt screens do not import the old surface vocabulary.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { ActionButton, IconTile, ServiceCard, StatCard, Toggle } from "../src/components/oud/primitives";
import { Compass, Sparkles } from "lucide-react";

const css = readFileSync("src/index.css", "utf8");
const index = readFileSync("src/components/oud/index.ts", "utf8");

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

describe("أربعة مستويات عمق، لا خامس", () => {
  test("الرموز الأربعة موجودة ومسمّاة", () => {
    for (const token of ["--oud-canvas", "--oud-surface", "--oud-elevated", "--oud-hero"]) {
      expect(css, token).toContain(`${token}:`);
    }
  });

  test("الوضع الداكن يكرّر السلّم نفسه لا ألوانا جديدة", () => {
    const dark = css.slice(css.indexOf(".dark {"));
    for (const token of ["--oud-canvas", "--oud-surface", "--oud-elevated", "--oud-hero"]) {
      expect(dark, token).toContain(`${token}:`);
    }
  });

  test("لا مستوى خامس: كل ما هو card أو hero يأخذ واحدا من الأربعة", () => {
    const levels = (css.match(/--oud-(canvas|surface|elevated|hero):/g) ?? []).map((line) =>
      line.replace(/[--:]/g, ""),
    );
    expect(new Set(levels).size).toBe(4);
  });
});

describe("مادة الجلي: صنف واحد وأربعة مقاسات", () => {
  test("البلاطة الجلية مفتاح واحد", () => {
    const gel = css.match(/\.oud-gel-[a-z-]+/g) ?? [];
    // المسموح: البلاطة وقطرة الشريط. لا أكثر.
    expect(gel.every((name) => name === ".oud-gel-droplet" || name === ".oud-icon-tile")).toBe(true);
  });

  test("أربعة مقاسات فقط للأيقونات", () => {
    const sizes = (index + css).match(/--oud-icon-(sm|md|lg|xl)/g) ?? [];
    expect(new Set(sizes).size).toBe(4);
  });

  test("البلاطة تحمل لمعة وحدا داخليا", () => {
    expect(css).toContain(".oud-icon-tile::after");
    expect(css).toContain("inset 0 1px 0 var(--oud-gel-highlight)");
  });
});

describe("الشريط السفلي: أربع مناطق وقطرة تنتقل", () => {
  const source = readFileSync("src/components/oud/BottomNav.tsx", "utf8");

  test("القطرة لها معرّف تخطيط واحد، فتنتقل لا تقفز", () => {
    expect(source).toContain('layoutId="oud-nav-droplet"');
  });

  test("الحركة بين 170 و300 مللي ثانية، ولا ارتداد مبالغ", () => {
    expect(source).toContain("stiffness");
    expect(source).toContain("damping");
    // لا دالة ارتداد: ارتداد القطرة يجعل التنقّل يبدو لعبة.
    expect(source).not.toContain("bounce");
  });

  test("تقليل الحركة له مسار صريح", () => {
    expect(source).toContain("useReducedMotion");
    expect(source).toContain("duration: 0");
  });

  test("الشريط ملتصق بزوايا علوية خفيفة، بلا ظل ثقيل", () => {
    expect(source).toContain("rounded-t-[1.75rem]");
    expect(source).toContain("fixed inset-x-0 bottom-0");
  });
});

describe("الشاشات المعاد بناؤها لا تستخدم مفردات السطح القديمة", () => {
  const rebuilt = [
    "src/components/app/HomeView.tsx",
    "src/components/oud/BottomNav.tsx",
    "src/components/oud/primitives.tsx",
    "src/components/app/NextPrayerHero.tsx",
    "src/components/app/OudLineCard.tsx",
  ];

  test("لا زجاج ولا ظل قديم في الشاشات الجديدة", () => {
    for (const file of rebuilt) {
      const source = readFileSync(file, "utf8");
      expect(source.includes("glass-strong"), file).toBe(false);
      expect(source.includes("shadow-lg"), file).toBe(false);
    }
  });

  test("المكوّنات الجديدة ترسم على الطبقات الأربع", () => {
    const markup = html(
      <div>
        <StatCard icon={Sparkles} label="XP" value="12" />
        <ServiceCard icon={Compass} title="القبلة" description="زاويتك" onClick={() => {}} />
        <ActionButton>فعل</ActionButton>
        <Toggle checked label="مفتاح" onCheckedChange={() => {}} />
      </div>,
    );
    expect(markup).toContain("oud-card");
  });

  test("الزر الأساسي متدرّج لا لون مصمت، وهذا مقصود", () => {
    expect(html(<ActionButton>فعل</ActionButton>)).toContain("linear-gradient");
  });

  test("البلاطة تعلن دورها لصارئ الشاشة", () => {
    const markup = html(<IconTile icon={Sparkles} title="الصلاة" />);
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="الصلاة"');
  });
});
