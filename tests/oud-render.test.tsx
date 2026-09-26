/**
 * PHASE NEXT — المكوّنات الجديدة تُرسَم فعلا.
 *
 * خادم التطوير غير متاح في هذه البيئة، فالتحقق هنا **على مستوى الشيفرة
 * المرسومة** لا على المتصفح: نركّب المكوّنات على خادم React ونقرأ النص
 * الناتج. هذا ليس بديلا عن QA في متصفح حقيقي، وهو موثّق كذلك في التقرير،
 * لكنه يمنع أخطر خطأ ممكن: أن يُكتب المكوّن ولا يُرسَم.
 */
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { AchievementToast, OudLineCard } from "../src/components/app/OudLineCard";
import { MosqueCard } from "../src/components/app/MosqueCard";
import { OudChatView } from "../src/components/app/OudChatView";
import { PERMISSION_COPY, PermissionReasonBody } from "../src/components/app/PermissionReasonDialog";
import { QiblaCard, QiblaView } from "../src/components/app/QiblaView";
import { ZakatView } from "../src/components/app/ZakatView";
import { distanceToKaabaKm, qiblaBearing, qiblaDirectionName } from "../src/lib/qibla";
import { oudLine } from "../src/lib/oud-voice";
import { arabicNumber } from "../src/lib/time";
import { distanceMeters } from "../src/lib/oud-mosque";

const origin = { latitude: 30.0444, longitude: 31.2357 };
const noon = new Date(2026, 8, 26, 16, 2, 0, 0);

const place = {
  id: "node-1",
  name: "مسجد النور",
  latitude: origin.latitude + 0.0016,
  longitude: origin.longitude,
  distanceMeters: distanceMeters(origin, { latitude: origin.latitude + 0.0016, longitude: origin.longitude }),
};

const html = (node: React.ReactElement) => renderToStaticMarkup(node);

describe("سطر الشخصية في الرئيسية", () => {
  const line = oudLine({
    now: noon,
    lastPrayer: { name: "العصر", minutesAgo: 1, logged: false },
  });

  test("يرسم النص المحسوب من اللقطة، لا نصا ثابتا", () => {
    const markup = html(
      <OudLineCard line={line} xp={{ total: 40, today: 4, levelLabel: "ثابت" }} />,
    );
    expect(markup).toContain(line!.text);
    expect(markup).toContain("عود");
  });

  test("الجزء مُسمّى لقارئات الشاشة بالعربية", () => {
    const markup = html(<OudLineCard line={line} xp={{ total: 0, today: 0, levelLabel: "بتبدأ" }} />);
    expect(markup).toContain('aria-label="عود معك"');
    expect(markup).toContain('class="sr-only"');
  });

  test("بلا سبب للكلام يبقى هادئا، ولا يقحم مدحا", () => {
    const markup = html(
      <OudLineCard
        line={oudLine({ now: noon, loggedToday: 1 } as never)}
        xp={{ total: 0, today: 0, levelLabel: "بتبدأ" }}
      />,
    );
    expect(markup).toContain("أنا هنا… يومك معاك");
  });

  test("صف النقاط يظهر فقط عند وجود نقاط اليوم", () => {
    const withXp = html(
      <OudLineCard line={line} xp={{ total: 40, today: 4, levelLabel: "ثابت" }} />,
    );
    const withoutXp = html(
      <OudLineCard line={line} xp={{ total: 40, today: 0, levelLabel: "ثابت" }} />,
    );
    expect(withXp).toContain("نقطة");
    expect(withoutXp).not.toContain("نقطة");
  });

  test("لا إيموجي في النص المرسوم", () => {
    const markup = html(
      <OudLineCard line={line} xp={{ total: 40, today: 4, levelLabel: "ثابت" }} />,
    );
    expect(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(markup)).toBe(false);
  });
});

describe("إعلان الإنجاز", () => {
  test("لا شيء يُرسَم بلا إنجاز", () => {
    expect(html(<AchievementToast achievement={null} onDismiss={() => {}} />)).toBe("");
  });

  test("يُعلن مرة واحدة بنصّه، ولا يفتح نوافذ مصفوفة", () => {
    const markup = html(
      <AchievementToast
        achievement={{ id: "first-prayer", label: "أول صلاة مسجّلة", detail: "سجّلت أول صلاة في عود." }}
        onDismiss={() => {}}
      />,
    );
    expect(markup).toContain("أول صلاة مسجّلة");
    expect(markup).toContain('role="status"');
    expect(markup).toContain('aria-live="polite"');
  });
});

describe("بطاقة المسجد — الصدق في الفشل", () => {
  test("بلا موقع ولا طلب: لا شيء يُرسَم ولا إزعاج", () => {
    expect(html(<MosqueCard state="unknown" places={[]} />)).toBe("");
  });

  test("رفض الإذن: يشرح ولا يهدّد ولا يمنع", () => {
    const markup = html(<MosqueCard state="denied" places={[]} onOpenSettings={() => {}} />);
    expect(markup).toContain("رفضت إذن الموقع");
    expect(markup).toContain("الإعدادات");
  });

  test("تعذّر الجلب: يقول ما عرفش، ولا يخترع مسجدا", () => {
    const markup = html(<MosqueCard state="none" places={[]} onRetry={() => {}} />);
    expect(markup).toContain("ما لقيتش مسجد قريب");
    expect(markup).not.toContain("مسجد النور");
  });

  test("الجاري: حالة انتظار مسمّاة، لا فراغ", () => {
    const markup = html(<MosqueCard state="loading" places={[]} />);
    expect(markup).toContain("بجيب أقرب مسجد لك");
    expect(markup).toContain('role="status"');
  });

  test("جاهز: الاسم والمسافة والتنبيه الصريح أن الموقع لا يثبت الصلاة", () => {
    const markup = html(<MosqueCard state="ready" places={[place]} />);
    expect(markup).toContain("مسجد النور");
    expect(markup).toContain("متر");
    expect(markup).toContain("لا يثبت أنك صلّيت");
    expect(markup).toContain("افتح الاتجاهات");
  });

  test("الرابط خارجي آمن وبروتوكول https", () => {
    const markup = html(<MosqueCard state="ready" places={[place]} />);
    expect(markup).toContain('href="https://www.google.com/maps/dir/');
    expect(markup).toContain('rel="noopener noreferrer"');
  });
});

describe("المحادثة", () => {
  const context = {
    now: noon,
    lastPrayer: { name: "العصر", minutesAgo: 40, logged: false },
    remainingSteps: 2,
    nextTaskTitle: "المذاكرة",
  };

  test("تبدأ برسالة شخصية، لا بترحيب عام", () => {
    const markup = html(<OudChatView context={context} onOpenSection={() => {}} />);
    // الصيغة تختارها الذرة، فنتحقق من الجذر لا من جملة بعينها.
    expect(markup).toContain("العصر");
    expect(markup).not.toContain("السلام عليكم");
  });

  test("تقول للمستخدم ما لا تفعله", () => {
    const markup = html(<OudChatView context={context} onOpenSection={() => {}} />);
    expect(markup).toContain("بجاوب في الدين من نفسي");
    expect(markup).toContain("معاه مصدره");
  });

  test("سجل المحادثة مُعلَن لقارئات الشاشة", () => {
    const markup = html(<OudChatView context={context} onOpenSection={() => {}} />);
    expect(markup).toContain('role="log"');
    expect(markup).toContain('aria-live="polite"');
    expect(markup).toContain('aria-label="محادثة عود"');
  });

  test("حقل الكتابة مُسمّى وسهل الوصول", () => {
    const markup = html(<OudChatView context={context} onOpenSection={() => {}} />);
    expect(markup).toContain('id="oud-chat-input"');
    expect(markup).toContain("اكتب لعود");
  });
});

describe("حوار الإذن", () => {
  /**
   * Radix يعرض عبر بوابة (Portal)، فلا يُرسَم على خادم React. لذلك نقرأ
   * **نصّ العقد** لا الشيفرة المرسومة: وهو نفس المصدر الذي يعرضه الحوار.
   */
  test("يشرح الموقع ولماذا، ويقول ما لا يفعله", () => {
    const copy = PERMISSION_COPY.location;
    expect(copy.title).toBe("ليه الموقع؟");
    expect(copy.bullets.join(" ")).toContain("أقرب مسجد");
    expect(copy.promise).toContain("مش بنحفظ تاريخ");
    expect(copy.promise).toContain("ما بيثبتش إنك صلّيت");
  });

  test("يشرح الإشعارات ويطمئن أن الرفض لا يضر", () => {
    const copy = PERMISSION_COPY.notifications;
    expect(copy.title).toBe("ليه الإشعارات؟");
    expect(copy.bullets.join(" ")).toContain("وقت الصلاة");
    expect(copy.promise).toContain("لو رفضت");
  });

  test("كلاهما يعرض خيار «مش دلوقتي» فلا يُحتج المستخدم", () => {
    for (const kind of ["location", "notifications"] as const) {
      expect(PERMISSION_COPY[kind].later).toBe("مش دلوقتي");
      expect(PERMISSION_COPY[kind].allow.length).toBeGreaterThan(0);
    }
  });

  test("الوعد المكتوب للخصوصية في النصوص المعروضة، لا في تعليقات", () => {
    const all = [
      PERMISSION_COPY.location.promise,
      PERMISSION_COPY.notifications.promise,
    ].join(" ");
    expect(all).toContain("مش");
    expect(all).not.toContain("مضمون");
  });

  /**
   * **الحارس الذي كان ناقصا:** النصوص أعلاه عقد، والجسم كان مغلّفا داخل
   * بوابة Radix فلا يُرسَم. فصار الجسم `PermissionReasonBody` مكوّنًا
   * مستقلا، وهذا يرسمه فعلا. فلو انكسر تنسيقه أو اختفى زر الرفض،
   * سقط الاختبار.
   */
  test("الجسم يُرسَم فعلا: العنوان والسبب والوعد وزر الرفض", () => {
    const markup = html(
      <PermissionReasonBody kind="location" onAllow={() => {}} onLater={() => {}} />,
    );
    expect(markup).toContain(PERMISSION_COPY.location.title);
    expect(markup).toContain(PERMISSION_COPY.location.reason);
    expect(markup).toContain("مش بنحفظ تاريخ مواقع");
    expect(markup).toContain(PERMISSION_COPY.location.later);
    expect(markup).toContain("button");
  });

  test("الوعد يظهر قبل زر الموافقة، لا بعده", () => {
    const markup = html(
      <PermissionReasonBody kind="notifications" onAllow={() => {}} onLater={() => {}} />,
    );
    expect(markup.indexOf("لو رفضت")).toBeGreaterThan(-1);
    expect(markup.indexOf("لو رفضت")).toBeLessThan(markup.indexOf("مش دلوقتي"));
  });

  test("الوصف مُربوط بالحقل لقارئ الشاشة", () => {
    const markup = html(
      <PermissionReasonBody kind="location" onAllow={() => {}} onLater={() => {}} />,
    );
    expect(markup).toContain('id="oud-permission-title"');
    expect(markup).toContain('id="oud-permission-description"');
  });
});

describe("الأرقام العربية في الواجهة", () => {
  test("نقاط المسافة تخرج بالعربية لا بالأرقام اللاتينية", () => {
    const markup = html(<MosqueCard state="ready" places={[place]} />);
    expect(markup).toContain(arabicNumber(place.distanceMeters));
  });
});

describe("القبلة: زاوية محسوبة، ونصّ صادق", () => {
  test("بلا موقع: لا شيء يُرسم ولا إذن يُطلب", () => {
    const markup = html(<QiblaCard coords={null} />);
    expect(markup).toBe("");
  });

  test("الرفض يشرح ولا يهدّد، ويعرض مفتاح الإعدادات", () => {
    const markup = html(<QiblaCard coords={null} denied onOpenSettings={() => {}} />);
    expect(markup).toContain("الزاوية مش معروفة");
    expect(markup).toContain("الصلاة كالمعتاد");
    expect(markup).toContain("الإعدادات");
  });

  test("جاهز: يرسم الزاوية والمسافة، ويعلن أن الموقع لا يثبت صلاة", () => {
    const markup = html(<QiblaCard coords={origin} onOpenQibla={() => {}} />);
    expect(markup).toContain(qiblaDirectionName(qiblaBearing(origin)));
    expect(markup).toContain(arabicNumber(Math.round(distanceToKaabaKm(origin))));
    expect(markup).toContain("الموقع لا يثبت أنك صليت");
  });

  test("بلا مستشعر بوصلة: يقول ذلك ولا يرسم إبرة كاذبة", () => {
    const markup = html(<QiblaCard coords={origin} />);
    expect(markup).toContain("ما فيهوش مستشعر بوصلة");
    expect(markup).toContain("بوصلة جهازك");
  });

  test("الإبرة لها بديل نصي لقارئ الشاشة", () => {
    const markup = html(<QiblaCard coords={origin} />);
    expect(markup).toContain('role="img"');
    expect(markup).toContain("درجة من الشمال");
  });

  test("الصفحة الكاملة بلا موقع: تطلب الموقع وتشرح، بلا لوم", () => {
    const markup = html(<QiblaView coords={null} />);
    expect(markup).toContain("محتاجين موقعك مرة واحدة");
    expect(markup).toContain("من الإعدادات");
  });

  test("الصفحة الكاملة مرفوضة: صريحة، وغير مغلقة", () => {
    const markup = html(<QiblaView coords={null} denied />);
    expect(markup).toContain("الموقع مرفوض");
    expect(markup).toContain("كل حاجة تانية شغالة عادي");
  });

  test("لا نصّ في الصفحة يدّعي أن الموقع صلاتك", () => {
    const markup = html(<QiblaView coords={origin} />);
    expect(markup).toMatch(/لا يثبت أنك صليت/);
  });
});

describe("الزكاة: حساب وبلا حكم", () => {
  test("الحدود مكتوبة قبل أي حقل", () => {
    const markup = html(<ZakatView />);
    expect(markup).toContain("مش فتوى");
    expect(markup.indexOf("مش فنوان")).toBe(-1);
    expect(markup.indexOf("مش فتوى")).toBeLessThan(markup.indexOf("النصاب عندك"));
  });

  test("كل حقل له تسمية مرتبطة ووصف مرتبط", () => {
    const markup = html(<ZakatView />);
    for (const id of ["zakat-cash", "zakat-bank", "zakat-nisab", "zakat-rate", "zakat-debt"]) {
      expect(markup, id).toContain(`for="${id}"`);
      expect(markup, id).toContain(`id="${id}"`);
      expect(markup, id).toContain(`aria-describedby="${id}-hint"`);
    }
  });

  test("بلا أرقام: يقول ذلك بدل صفر لاثنتين", () => {
    const markup = html(<ZakatView />);
    expect(markup).toContain("اكتب أرقامك فوق");
  });

  test("الحقول نصّية واتجاهها لاتيني مع العربية", () => {
    const markup = html(<ZakatView />);
    expect(markup).toContain('inputMode="decimal"');
    expect(markup).toContain('dir="ltr"');
  });

  test("زرّ الحفظ وزرّ التصفير موجودان", () => {
    const markup = html(<ZakatView />);
    expect(markup).toContain("احفظ التقدير");
    expect(markup).toContain("صفّر الأرقام");
  });

  test("الخصوصية مكتوبة: على جهازك وحده", () => {
    const markup = html(<ZakatView />);
    expect(markup).toContain("على جهازك وحده");
    expect(markup).toContain("مسح بيانات التطبيق يمحوه");
  });
});
