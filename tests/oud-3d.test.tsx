/**
 * OUD — the 3D contract.
 *
 * Depth is presentation, so these tests are about the presentation and
 * about what it must never cost: no new runtime, no WebGL, no information
 * that exists only as a transform, and no movement for a user who asked
 * for stillness.
 *
 * What they lock:
 *   1. The depth tokens exist, and the dark mode mirrors them.
 *   2. Every one of the four levels has thickness, not only a shadow.
 *   3. The gel glyph, the nav droplet and the compass needle are really
 *      transformed, and the 3D is not flattened by an ancestor.
 *   4. Nothing new was added to the bundle to achieve it.
 *   5. Tilt is behind a pointer and a motion query, and reduced motion
 *      switches the movement off while keeping the depth.
 */

import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";

import { CompassDial, angleDelta, headingFromEvent, isStable } from "../src/components/oud/CompassDial";
import { IconTile } from "../src/components/oud/primitives";
import { Compass } from "lucide-react";

const css = readFileSync("src/index.css", "utf8");
const navSource = readFileSync("src/components/oud/BottomNav.tsx", "utf8");
const dialSource = readFileSync("src/components/oud/CompassDial.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

const html = (node: Parameters<typeof renderToStaticMarkup>[0]) => renderToStaticMarkup(node);

/** The 3D foundation block, so a test never reads the flat original. */
const threeD = css.slice(css.indexOf("OUD 3D FOUNDATION"));

/** The block inside the 3D foundation that starts at `open`. */
const blockStartingAt = (open: string) => {
  const start = threeD.indexOf(open);
  expect(start, `no 3D block for ${open}`).toBeGreaterThan(-1);
  const end = threeD.indexOf("\n  }", start);
  return threeD.slice(start, end === -1 ? start : end);
};

describe("رموز العمق موجودة، والوضع الداكن يكرّرها", () => {
  test("العدسة والسماكة والانزياح كلها رموز واحدة", () => {
    for (const token of [
      "--oud-3d-lens-tile",
      "--oud-3d-lens-card",
      "--oud-3d-lens-nav",
      "--oud-3d-lens-dial",
      "--oud-3d-thickness-surface",
      "--oud-3d-thickness-card",
      "--oud-3d-thickness-hero",
      "--oud-3d-lift-glyph",
      "--oud-3d-lift-needle",
      "--oud-3d-lift-droplet",
      "--oud-3d-tilt-dial",
    ]) {
      expect(css, token).toContain(`${token}:`);
    }
  });

  test("ألوان الضوء والحدّ تُعاد في الوضع الداكن، لا ألوان جديدة", () => {
    const dark = css.slice(css.indexOf(".dark {", css.indexOf("--oud-3d-light")));
    for (const token of ["--oud-3d-light:", "--oud-3d-edge:", "--oud-3d-rim:"]) {
      expect(dark, token).toContain(token);
    }
  });

  test("لا مشهد على مستوى الجذر: المنظور محلي لكل عنصر", () => {
    // A root-level perspective on a document-height element would make the
    // same translateZ mean a different thing at the top of the page and at
    // the bottom, so it is banned by contract.
    expect(css).not.toMatch(/\.oud-canvas\s*\{[^}]*perspective/);
  });
});

describe("كل مستوى من الأربعة له سماكة، لا ظل وحده", () => {
  test("السطح والبطاقة والبطل تحمل كلّها حافّة صمّاء", () => {
    for (const [selector, thickness] of [
      [".oud-surface", "--oud-3d-thickness-surface"],
      [".oud-card", "--oud-3d-thickness-card"],
      [".oud-hero", "--oud-3d-thickness-hero"],
    ] as const) {
      const block = blockStartingAt(`${selector} {`);
      expect(block, selector).toContain(`0 var(${thickness}) 0 -1px var(--oud-3d-edge)`);
    }
  });

  test("البطل وحده يحمل لمعة حافته العليا", () => {
    expect(blockStartingAt(".oud-hero {")).toContain("inset 0 1px 0 var(--oud-3d-light)");
  });

  test("المستوى الرابع (الغائر) لا يطفو: الغوص يعني البقاء في المستوى", () => {
    // The sunken well is the fourth level: it must never be given a lift,
    // otherwise a recess and a slab stop meaning different things.
    const sunken = threeD.slice(threeD.indexOf("Recessed"), threeD.indexOf("Recessed") + 400);
    expect(sunken).not.toContain("translateZ");
  });
});

describe("الجليّ والأيقونات: الأجسام تقف فوق سطحها", () => {
  test("الرمز يرتفع فوق بلاطته بـ translateZ حقيقي", () => {
    expect(css).toContain("transform: translateZ(var(--oud-3d-lift-glyph));");
  });

  test("البلاطة لا تسطّح مشهدها: لا overflow hidden", () => {
    const tile = blockStartingAt(".oud-icon-tile {");
    expect(tile).toContain("perspective(var(--oud-3d-lens-tile))");
    expect(tile).not.toContain("overflow: hidden");
  });

  test("البلاطة المسطّحة تبقى مسطّحة، الصف الكثيف لا يحمل أربعين جسماً", () => {
    expect(css).toContain(".oud-icon-flat > *");
  });

  test("البلاطة المعلّنة في الوسم تحمل الصنف", () => {
    expect(html(<IconTile icon={Compass} title="القبلة" />)).toContain("oud-icon-tile");
  });
});

describe("الشريط السفلي: القطرة جسم له حجم، والقياس ليس هو", () => {
  test("العنصر الذي يحرّكه framer-motion فارغ، والمادة داخله", () => {
    expect(navSource).toContain('className="oud-3d-droplet"');
    expect(navSource).toContain('className="oud-gel-droplet oud-3d-droplet-skin"');
  });

  test("العدسة والـ preserve-3d يصلان إلى القطرة عبر li و button", () => {
    const block = blockStartingAt(".oud-3d-nav-slab {");
    expect(block).toContain("perspective: var(--oud-3d-lens-nav)");
    expect(css).toContain("transform-style: preserve-3d;");
  });

  test("الأيقونة ترتفع فوق القطرة", () => {
    expect(css).toContain("transform: translateZ(var(--oud-3d-lift-nav-icon));");
  });

  test("المعرّف وتقليل الحركة كما كانا", () => {
    expect(navSource).toContain('layoutId="oud-nav-droplet"');
    expect(navSource).toContain("duration: 0");
  });
});

describe("البوصلة: قرص بسماكة، وإبرة فوق الوردة", () => {
  test("لوحان خلف القرص يعطياه حافّة", () => {
    expect(dialSource).toContain("oud-3d-dial-slab");
    expect(dialSource).toContain("translateZ(calc(-1 * 14px))");
  });

  test("الإبرة مرفوعة وظلّها على الوردة", () => {
    expect(css).toContain(".oud-3d-needle {");
    expect(css).toContain("translateZ(var(--oud-3d-lift-needle))");
    expect(css).toContain(".oud-3d-needle-shadow {");
    expect(dialSource).toContain("oud-3d-needle-shadow");
  });

  test("الوردة تدور داخل المستوى المائل، فلا يغادر الشمال حافّتها", () => {
    expect(dialSource).toContain("rotateX(var(--oud-3d-tilt-dial)) rotate(${dialRotation}deg)");
    expect(dialSource).toContain("rotateX(var(--oud-3d-tilt-dial)) rotate(${needleRotation}deg)");
  });

  test("الرقم يبقى نصًّا: بعدُ ما زال يُقرأ", () => {
    const markup = html(<CompassDial qiblaBearing={151} heading={null} state="calibrating" />);
    expect(markup).toContain('role="status"');
    expect(markup).toContain("sr-only");
    expect(markup).toContain("القبلة");
  });

  test("منطق الحساب لم يتغيّر مع العرض", () => {
    expect(isStable([10, 11, 12])).toBe(true);
    expect(isStable([10, 40, 80])).toBe(false);
    expect(angleDelta(350, 10)).toBe(20);
    expect(
      headingFromEvent({ alpha: 90 } as unknown as DeviceOrientationEvent),
    ).toBe(270);
  });
});

describe("لا ثمن مخفي: نفس الاعتماديات، ونفس الحركة المحترَمة", () => {
  test("لا WebGL ولا canvas ولا مكتبة ثلاثية الأبعاد جديدة", () => {
    for (const forbidden of ["three", "react-three-fiber", "@react-three/drei", "babylonjs", "pixi.js"]) {
      expect(pkg, forbidden).not.toContain(`"${forbidden}`);
    }
  });

  test("لا سياق WebGL في المصدر", () => {
    for (const file of [navSource, dialSource, readFileSync("src/components/oud/primitives.tsx", "utf8")]) {
      expect(file).not.toContain("getContext");
    }
  });

  test("الميل خلف مؤشّر حقيقي واستعلام حركة", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    const tiltBlock = css.slice(css.indexOf("@media (hover: hover)"));
    expect(tiltBlock).toContain(".oud-card:hover");
    expect(tiltBlock).toContain(".oud-3d-lift:hover");
  });

  test("تقليل الحركة يوقف الميل ويُبقي السماكة", () => {
    const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
    expect(reduced).toContain(".oud-card:hover");
    expect(reduced).toContain("transform: none");
    // The static depth survives: a fixed thickness is not an animation.
    expect(reduced).not.toContain("perspective: none");
  });
});
