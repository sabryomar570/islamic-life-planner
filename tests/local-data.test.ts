/**
 * PHASE 2 — عقد الخصوصية على الجهاز.
 *
 * تسجيل الخروج ليس مجرد استدعاء للخادم: من كتب عود على جهازه يبقى أثره
 * إن لم نمسحه. هذه الاختبارات تحرس الحدّ الفاصل: ما نملكه نمسحه، وما
 * لا نملكه (جلسة Convex، المصحف المنزَّل) لا نلمسه أبدًا.
 */
import { describe, expect, test } from "bun:test";

import {
  clearLocalData,
  isOwnedLocalKey,
  isProtectedKey,
  OWNED_LOCAL_KEYS,
  OWNED_LOCAL_PREFIXES,
  PROTECTED_KEY_PATTERNS,
} from "../src/lib/local-data";

function fakeStore(seed: Record<string, string>) {
  const map = new Map(Object.entries(seed));
  const store = {
    get length() {
      return map.size;
    },
    key: (index: number) => [...map.keys()][index] ?? null,
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
  return { map, store };
}

describe("the registry covers every personal key the app writes", () => {
  test("profile answers, coordinates, favourites, and day state are owned", () => {
    for (const key of [
      "sakinah:offline:profile:v1",
      "sakinah:offline:day:v1",
      "sakinah:coords:v1",
      "sakinah:coords:label:v1",
      "oud:favorites:local",
      "sakinah:quran:bookmark",
      "sakinah:quran:last",
      "sakinah:tasbih:v1",
    ]) {
      expect(isOwnedLocalKey(key)).toBe(true);
    }
  });

  test("dated reminder keys are owned through their prefix", () => {
    expect(isOwnedLocalKey("sakinah:fired:2026-09-25")).toBe(true);
    for (const prefix of OWNED_LOCAL_PREFIXES) {
      expect(prefix.endsWith(":")).toBe(true);
    }
  });

  test("Convex session keys and platform keys are never ours to delete", () => {
    for (const key of ["__convexAuthJWT_oudapp", "__convexAuthRefreshToken_oudapp"]) {
      expect(isOwnedLocalKey(key)).toBe(false);
      expect(isProtectedKey(key)).toBe(true);
    }
    for (const pattern of PROTECTED_KEY_PATTERNS) {
      expect(pattern.startsWith("__")).toBe(true);
    }
  });

  test("the downloaded Quran and cached timings are not user data", () => {
    // `sakinah:quran:` shares a prefix with the bookmark key, so membership is exact.
    expect(isOwnedLocalKey("sakinah:quran:bookmark")).toBe(true);
    expect(isOwnedLocalKey("sakinah:quran:1")).toBe(false);
    expect(isOwnedLocalKey("sakinah:timings:Cairo:2026-09-25")).toBe(false);
  });
});

describe("clearLocalData", () => {
  test("removes owned keys and keeps protected and unrelated ones", () => {
    const { map, store } = fakeStore({
      "sakinah:offline:profile:v1": "{}",
      "oud:favorites:local": "[]",
      "sakinah:coords:v1": "{}",
      "sakinah:fired:2026-09-25": "[]",
      "__convexAuthJWT_oudapp": "token",
      "sakinah:timings:Cairo": "{}",
      "someone-elses-key": "keep",
    });
    const result = clearLocalData(store);
    expect([...map.keys()].sort()).toEqual(
      ["__convexAuthJWT_oudapp", "someone-elses-key", "sakinah:timings:Cairo"].sort(),
    );
    expect(result.removed).toContain("sakinah:offline:profile:v1");
    expect(result.removed).toContain("sakinah:fired:2026-09-25");
    expect(result.kept).toContain("__convexAuthJWT_oudapp");
  });

  test("is idempotent: a second run removes nothing new", () => {
    const { map, store } = fakeStore({ "sakinah:tasbih:v1": "{}" });
    clearLocalData(store);
    const second = clearLocalData(store);
    expect(map.size).toBe(0);
    expect(second.removed).toHaveLength(OWNED_LOCAL_KEYS.length);
  });

  test("survives a missing or blocked store instead of throwing", () => {
    expect(clearLocalData(null).removed).toHaveLength(0);
    const hostile = {
      length: 1,
      key: () => "sakinah:tasbih:v1",
      removeItem: () => {
        throw new Error("QuotaExceededError");
      },
    };
    expect(() => clearLocalData(hostile)).not.toThrow();
  });
});
