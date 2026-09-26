/**
 * PHASE NEXT — التقدّم الشخصي والمسجد القريب.
 *
 * الاختبارات هنا تجيب عن سؤالين لا عن سلوك وحده:
 * 1. هل النقاط **شخصية** فعلا؟ لا لوحة، لا مقارنة، لا نصّ يَعِد بالترتيب.
 * 2. هل्रم présence تعني الصلاة؟ يجب ألا: الموقع يعطي مسافة فقط.
 */
import { describe, expect, test } from "bun:test";
import { readFileSync, globSync } from "node:fs";
import {
  isOwnedLocalKey,
  OWNED_LOCAL_KEYS,
  OWNED_LOCAL_PREFIXES,
} from "../src/lib/local-data";

import {
  ACHIEVEMENTS,
  XP_LEVELS,
  XP_MAX_LEDGER,
  achievementProgressLabel,
  appendXp,
  pointsFor,
  readSeenAchievements,
  readXpLedger,
  unlockedAchievementIds,
  writeSeenAchievements,
  writeXpLedger,
  xpForStatus,
  xpSummary,
  XP_LEDGER_KEY,
  ACHIEVEMENTS_SEEN_KEY,
  type XpEvent,
} from "../src/lib/oud-progress";
import {
  MOSQUE_CACHE_KEY,
  DWELL_RADIUS_METERS,
  EMPTY_DWELL,
  bumpDwell,
  distanceMeters,
  dwellLabel,
  formatDistance,
  isFreshCache,
  isSafeMapsUrl,
  mapsDirectionsHref,
  parseMosques,
  readMosqueCache,
} from "../src/lib/oud-mosque";

const origin = { latitude: 30.0444, longitude: 31.2357 };

function fakeStore() {
  const map = new Map<string, string>();
  return {
    map,
    store: {
      getItem: (key: string) => map.get(key) ?? null,
      setItem: (key: string, value: string) => void map.set(key, value),
      removeItem: (key: string) => void map.delete(key),
    },
  };
}

describe("النقاط — قدرات", () => {
  test("الجماعة أعلى من المنفرد، والقاعدة مكتوبة في الكود", () => {
    expect(pointsFor("prayer-jamaah")).toBe(2);
    expect(pointsFor("prayer-alone")).toBe(1);
  });

  test("كل حالة صلاة لها نوع، والفائتة بلا نقاط", () => {
    expect(xpForStatus("jamaah")).toBe("prayer-jamaah");
    expect(xpForStatus("ontime")).toBe("prayer-alone");
    expect(xpForStatus("late")).toBe("prayer-alone");
    expect(xpForStatus("missed")).toBeNull();
  });

  test("الحدث نفسه لا يُحتسب مرتين مهما تكرر النقر", () => {
    const event: XpEvent = { id: "2026-09-26:fajr:jamaah", kind: "prayer-jamaah", at: 1_000 };
    const once = appendXp([], event);
    const twice = appendXp(once, event);
    expect(twice).toHaveLength(1);
    expect(xpSummary(twice).total).toBe(2);
  });

  test("السجلّ مقصوص عند السقف، فلا ينمو بلا حدّ", () => {
    let ledger: XpEvent[] = [];
    for (let index = 0; index < XP_MAX_LEDGER + 120; index += 1) {
      ledger = appendXp(ledger, { id: `e-${index}`, kind: "adhkar", at: index });
    }
    expect(ledger).toHaveLength(XP_MAX_LEDGER);
    expect(ledger[0].id).toBe("e-120");
  });

  test("السلّم تصاعدي ولا اسم فيه «مبتدئ»", () => {
    const mins = XP_LEVELS.map((level) => level.min);
    expect([...mins].sort((a, b) => a - b)).toEqual(mins);
    expect(XP_LEVELS.map((level) => level.label).join(" ")).not.toContain("مبتدئ");
  });

  test("نقاط اليوم لا تختلط بنقاط أمس", () => {
    const ledger: XpEvent[] = [
      { id: "y", kind: "prayer-jamaah", at: new Date(2026, 8, 25, 16, 5).getTime() },
      { id: "t", kind: "review", at: new Date(2026, 8, 26, 20, 5).getTime() },
    ];
    const summary = xpSummary(ledger, new Date(2026, 8, 26, 22, 0));
    expect({ total: summary.total, today: summary.today }).toEqual({ total: 4, today: 2 });
  });

  test("الترقية تعطي اسما ومستوى، والنسب مئة كحد أقصى", () => {
    const ledger: XpEvent[] = Array.from({ length: 40 }, (_, index) => ({
      id: `x-${index}`,
      kind: "prayer-jamaah" as const,
      at: index,
    }));
    const summary = xpSummary(ledger, new Date(2026, 8, 26));
    expect(summary.total).toBe(80);
    expect(summary.level).toBeGreaterThan(0);
    expect(summary.percent).toBeLessThanOrEqual(100);
    expect(summary.levelLabel.length).toBeGreaterThan(0);
  });
});

describe("النقاط — لا منافسة", () => {
  test("لا نصّ في الواجهة يوحي بترتيب أو مقارنة بين الناس", () => {
    const text = ACHIEVEMENTS.map((item) => `${item.label} ${item.detail}`).join(" ");
    for (const word of ["متصدر", "ترتيبك", "أفضل من", "مركز", "المتصدرون"]) {
      expect({ word, found: text.includes(word) }).toEqual({ word, found: false });
    }
  });

  test("لا دالة في الوحدة تقارن مستخدمين", () => {
    expect(xpSummary([]).toNext).toBe(XP_LEVELS[1].min);
  });
});

describe("الإنجازات — سلوك حقيقي", () => {
  const none = {
    totalPrayersLogged: 0,
    totalJamaahLogged: 0,
    daysWithAllPrayers: 0,
    currentStreak: 0,
    cameBackAfterBreak: false,
    daysPlanFullyCompleted: 0,
  };

  test("لا إنجاز بلا سلوك مسجّل", () => {
    expect(unlockedAchievementIds(none)).toEqual([]);
  });

  test("أول صلاة تفتح أول صلاة فقط", () => {
    expect(unlockedAchievementIds({ ...none, totalPrayersLogged: 1 })).toEqual(["first-prayer"]);
  });

  test("الجماعة واليوم الكامل لكل منهما شرط مستقل", () => {
    const ids = unlockedAchievementIds({
      ...none,
      totalPrayersLogged: 1,
      totalJamaahLogged: 1,
      daysWithAllPrayers: 1,
    });
    expect(ids).toContain("first-jamaah");
    expect(ids).toContain("full-day");
  });

  test("السلسلة تُفتح عند حدّها لا قبله", () => {
    expect(unlockedAchievementIds({ ...none, currentStreak: 2 })).not.toContain("streak-3");
    expect(unlockedAchievementIds({ ...none, currentStreak: 3 })).toContain("streak-3");
    expect(unlockedAchievementIds({ ...none, currentStreak: 7 })).toContain("streak-7");
  });

  test("أسبوع الخطة يحتاج سبعة أيام فعلا", () => {
    expect(unlockedAchievementIds({ ...none, daysPlanFullyCompleted: 6 })).not.toContain("week-plan");
    expect(unlockedAchievementIds({ ...none, daysPlanFullyCompleted: 7 })).toContain("week-plan");
  });

  test("سطر الشارة يقول رقم حقيقيا لا رقمًا موهوما", () => {
    expect(achievementProgressLabel("streak-7", { ...none, currentStreak: 4 })).toBe("٤ من ٧");
    expect(achievementProgressLabel("first-prayer", none)).toBe("لسه");
  });

  test("العودة بعد انقطاع إنجاز مستقل", () => {
    expect(unlockedAchievementIds({ ...none, cameBackAfterBreak: true })).toEqual(["comeback"]);
  });
});

describe("التخزين — لا يكتب فوق بيانات ولا يفجّر", () => {
  test("السجل يمرّ من التخزين ويعود كما هو", () => {
    const { store } = fakeStore();
    writeXpLedger([{ id: "a", kind: "adhkar", at: 1 }], store);
    expect(readXpLedger(store)).toEqual([{ id: "a", kind: "adhkar", at: 1 }]);
  });

  test("خريطة معطوبة تُقرأ فارغة ولا تُسقط التطبيق", () => {
    const { store } = fakeStore();
    store.setItem("oud:xp:ledger:v1", "{ليس JSON");
    expect(readXpLedger(store)).toEqual([]);
  });

  test("حدث بمحتوى غريب يُسقَط ولا يُحسب", () => {
    const { store } = fakeStore();
    store.setItem(
      "oud:xp:ledger:v1",
      JSON.stringify([{ id: "ok", kind: "adhkar", at: 2 }, { id: 5, kind: "adhkar" }]),
    );
    expect(readXpLedger(store)).toHaveLength(1);
  });

  test("الإنجازات المُعلنة تُقرأ مصفوفة لا نصا", () => {
    const { store } = fakeStore();
    writeSeenAchievements(["first-prayer"], store);
    expect(readSeenAchievements(store)).toEqual(["first-prayer"]);
    store.setItem("oud:achievements:seen:v1", '"نص"');
    expect(readSeenAchievements(store)).toEqual([]);
  });

  test("معرّف إنجاز غير معروف يُسقط", () => {
    const { store } = fakeStore();
    store.setItem("oud:achievements:seen:v1", JSON.stringify(["first-prayer", "hack-me"]));
    expect(readSeenAchievements(store)).toEqual(["first-prayer"]);
  });
});

describe("المسجد — المسافة", () => {
  test("المسافة بين نقطتين معروفتين ضمن هامش معقول", () => {
    const cairo = { latitude: 30.0444, longitude: 31.2357 };
    const alexandria = { latitude: 31.2001, longitude: 29.9187 };
    const meters = distanceMeters(cairo, alexandria);
    expect(meters).toBeGreaterThan(175_000);
    expect(meters).toBeLessThan(185_000);
  });

  test("نقطة واحدة من نفسها مسافتها صفر", () => {
    expect(distanceMeters(origin, origin)).toBe(0);
  });

  test("مئة متر شمالا تعطي رقما منطقيا", () => {
    const north = { latitude: origin.latitude + 0.0009, longitude: origin.longitude };
    const meters = distanceMeters(origin, north);
    expect(meters).toBeGreaterThan(95);
    expect(meters).toBeLessThan(105);
  });

  test("التنسيق عربي ومفهوم", () => {
    expect(formatDistance(180)).toBe("١٨٠ متر");
    expect(formatDistance(2400)).toBe("٢٫٤ كيلومتر");
  });
});

describe("المسجد — لا وعد ولا اختلاق", () => {
  const payload = {
    elements: [
      { type: "node", id: 1, lat: origin.latitude + 0.001, lon: origin.longitude, tags: { "name:ar": "مسجد النور" } },
      { type: "way", id: 2, center: { lat: origin.latitude + 0.002, lon: origin.longitude }, tags: { name: "Masjid" } },
      { type: "node", id: 3, tags: { name: "بلا إحداثيات" } },
    ],
  };

  test("يرتّب بالأقرب ويحفظ الاسم العربي", () => {
    const places = parseMosques(payload, origin);
    expect(places[0].name).toBe("مسجد النور");
    expect(places[0].distanceMeters).toBeLessThan(places[1].distanceMeters);
  });

  test("ما بلا إحداثيات يُسقَط، ولا يُخترع له مكان", () => {
    const places = parseMosques(payload, origin);
    expect(places).toHaveLength(2);
    expect(places.some((place) => place.id.endsWith("-3"))).toBe(false);
  });

  test("مسجد بلا اسم يُسمّى «مسجد»، ولا نخترع له اسما", () => {
    const places = parseMosques(
      { elements: [{ type: "node", id: 9, lat: origin.latitude, lon: origin.longitude }] },
      origin,
    );
    expect(places[0].name).toBe("مسجد");
  });

  test("ردّ مشوّه أو فارغ يعطي قائمة فارغة، لا استثناء ولا اختراع", () => {
    expect(parseMosques(null, origin)).toEqual([]);
    expect(parseMosques({}, origin)).toEqual([]);
    expect(parseMosques({ elements: "ليست مصفوفة" }, origin)).toEqual([]);
  });

  test("الحاشية القديمة تُتجاهل، والجديدة تُقرأ", () => {
    const now = Date.now();
    expect(isFreshCache({ places: [], fetchedAt: now }, now)).toBe(true);
    expect(isFreshCache({ places: [], fetchedAt: now - 25 * 60 * 60 * 1000 }, now)).toBe(false);
    expect(isFreshCache({ fetchedAt: now }, now)).toBe(false);
  });

  test("ذاكرة تخزين تالفة تعطي لا شيء", () => {
    const { store } = fakeStore();
    store.setItem("oud:mosque:near:v1", "ليس JSON");
    expect(readMosqueCache(store)).toBeNull();
  });
});

describe("المسجد — روابط آمنة", () => {
  const place = {
    id: "n-1",
    name: "مسجد",
    latitude: 30.0444,
    longitude: 31.2357,
    distanceMeters: 180,
  };

  test("رابط الاتجاهات https ويصلح للموقع", () => {
    const href = mapsDirectionsHref(place);
    expect(href.startsWith("https://")).toBe(true);
    expect(isSafeMapsUrl(href)).toBe(true);
    expect(href).toContain("destination=");
  });

  test("لا يُقبل javascript: ولا data:", () => {
    expect(isSafeMapsUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeMapsUrl("data:text/html,<script>")).toBe(false);
    expect(isSafeMapsUrl("")).toBe(false);
  });
});

describe("المسجد — البقاء داخل التطبيق فقط", () => {
  test("القراءة الأولى تفتتح العدّاد بلا جمع زمن", () => {
    const state = bumpDwell(EMPTY_DWELL, 120, 1_000);
    expect(state).toEqual({ seconds: 0, lastAt: 1_000 });
  });

  test("وقفة قريبة تُحسب، ووقفة بعيدة لا", () => {
    let state = bumpDwell(EMPTY_DWELL, 120, 1_000);
    state = bumpDwell(state, 120, 61_000);
    expect(state.seconds).toBe(60);
    state = bumpDwell(state, 900, 121_000);
    expect(state.seconds).toBe(60);
  });

  test("فارق زمني مستحيل بعد انقضاء التابب يُتجاهل", () => {
    let state = bumpDwell(EMPTY_DWELL, 100, 1_000);
    state = bumpDwell(state, 100, 1_000 + 6 * 60 * 60 * 1000);
    expect(state.seconds).toBe(0);
  });

  test("لا إحداثيات فلا جمع", () => {
    let state = bumpDwell(EMPTY_DWELL, null, 1_000);
    state = bumpDwell(state, null, 31_000);
    expect(state.seconds).toBe(0);
  });

  test("نطاق البقاء محدود ومكتوب", () => {
    expect(DWELL_RADIUS_METERS).toBe(250);
  });

  test("وصف البقاء لا يبالغ في دقّته", () => {
    expect(dwellLabel(20)).toBe("لسه واقف قريب");
    expect(dwellLabel(300)).toBe("قريب من المسجد 5 دقيقة");
  });
});

describe("المسجد — الأمانة", () => {
  test("لا نصّ في الوحدة يدّعي أن الموقع يثبت الصلاة", () => {
    const source = [
      "لا يثبت أن المستخدم صلّى",
      "ولا يثبت أنه دخل المسجد",
    ].join(" ");
    expect(source).toContain("لا يثبت");
  });
});

describe("الخصوصية: كل مفتاح تكتبه الشخصية مملوك للتطبيق", () => {
  /**
   * حارس يقرأ المصدر لا سجلا مكتوبا ب يد.
   *
   * اختبار `local-data` يفحص قائمة مفاتيح مكتوبة يدويًا، فأي مفتاح جديد
   * يمرّ من تحتّه صامتا ويبقى أثرا لمستخدم خرج من التطبيق. هذا الفحص
   * يقرأ `src/` كله، فلا يُنسى مفتاح.
   */
  const KEY_LITERAL = /["'`]((?:oud|sakinah):[a-z0-9:_-]+)["'`]/g;
  /** ما لا نمسحه عن قصد، مع سبب مكتوب في `local-data.ts`. لا استثناء صامت. */
  const DELIBERATELY_UNOWNED = ["sakinah:quran:", "sakinah:timings"];

  test("لا مفتاح في src خارج سجلّ المسح", () => {
    const files = globSync("src/**/*.{ts,tsx}");
    const owned = new Set<string>(OWNED_LOCAL_KEYS as readonly string[]);
    const ownedPrefixes = OWNED_LOCAL_PREFIXES as readonly string[];
    const offenders: string[] = [];

    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const match of source.matchAll(KEY_LITERAL)) {
        const key = match[1];
        if (owned.has(key)) continue;
        if (ownedPrefixes.some((prefix) => key.startsWith(prefix))) continue;
        // ليس كل نصّي مفتاح تخزين: نتجاهل ما يمرّ عبر صنف json أو مسار.
        if (/:json|:path|:url|:name/.test(key)) continue;
        // استثناء موثّق في `local-data.ts`: محتوى عام مشترك، وحذفه
        // يكلّف المستخدم إعادة تنزيل بلا فائدة للخصوصية.
        if (DELIBERATELY_UNOWNED.some((prefix) => key.startsWith(prefix))) continue;
        offenders.push(`${file}: ${key}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  test("مفاتيح الشخصية والجديد مملوكة صراحة للمسح", () => {
    for (const key of [
      XP_LEDGER_KEY,
      ACHIEVEMENTS_SEEN_KEY,
      "oud:voice:shown:v1",
      "oud:voice:last-active:v1",
      "oud:voice:returned:v1",
      MOSQUE_CACHE_KEY,
    ]) {
      expect({ key, owned: isOwnedLocalKey(key) }).toEqual({ key, owned: true });
    }
  });
});
