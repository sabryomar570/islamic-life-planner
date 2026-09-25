# PHASE_3_FINAL_REPORT.md

**التاريخ:** 2026-09-25
**الحالة الرسمية:** `IMPLEMENTED — AUTOMATION VERIFIED — BROWSER QA PENDING`
**ما قبلها:** Phase 0 · Phase 1 · Phase 2 — كلها `AUTOMATION VERIFIED` و`BROWSER QA NOT VERIFIED`

---

## 1) What changed

المرحلة الثالثة كانت **تجربة وانخراطا ومحتوى دينا وإشعارات وصوتا**. لم تُبنَ ميزة جديدة خارج النطاق،
ولم يُمسّ محرّك الحياة ولا منطق التخطيط والصلاة والمراجعة.

أهم ما خرج من التدقيق قبل أي تعديل: **قاعدة الأحاديث ليست على درجة واحدة من التوثيق**،
كانت تعرض ١٨ محادثة منسوبة بصيغة موصوفة («يُنسب») وأثرا من كلام الصحابة
بمظهر حديث مرفوع. هذه أهم مخاطرة في التطبيق كله، وقد صارت الآن معروضة لا مخفية.

---

## 2) Files changed

### جديد — منطق خالص (بلا React وبلا Convex)
- `src/lib/hadith-metadata.ts` — المواضيع وحالة التوثيق وسطر الاستشهاد
- `src/lib/audio.ts` — نظام الصوت والتفضيلات والنغمات
- `src/lib/notification-templates.ts` — طبقة الصياغة والتوقيت والتهدئة
- `src/lib/notification-center.ts` — سجل الإشعارات وحالة القراءة
- `src/lib/insights.ts` — محتوى مستطيل الإحصاء

### جديد — مكوّنات
- `src/components/app/Artworks.tsx` — خمسة رسوم تجريدية
- `src/components/app/InsightCarousel.tsx` — المستطيل المتحرك
- `src/components/app/InsightSlot.tsx` — غلاف كسول للمستطيل
- `src/components/app/HadithReader.tsx` — قارئ الحديث
- `src/components/app/NotificationCenter.tsx` — المركز والجرس
- `src/hooks/use-notification-center.ts` — محرّك التقييم

### جديد — اختبارات
- `tests/hadith-metadata.test.ts` (٢١) · `tests/audio.test.ts` · `tests/notification-hooks.test.ts` (٣٨) · `tests/phase3-ux.test.ts` (١٧)

### مُعدَّل
- `src/data/hadith.ts` — حقول `book` و`hadithNumber` و`grade` اختيارية
- `src/lib/notification-intelligence.ts` — فئة `hadith` بأولوية دنيا
- `src/lib/local-data.ts` — `oud:notifications:v1` مفتاح مملوك
- `src/hooks/use-preferences.ts` — مفاتيح الصوت + `audioPreferencesOf`
- `src/components/app/Surfaces.tsx` — `ActionState` وحالات التحميل والنجاح
- `src/index.css` — `action-active` · `action-success` · `action-disabled` · `action-spinner`
- `src/components/app/HadithView.tsx` — أُعيدت كتابته كبيت أحاديث
- `src/components/app/AppHeader.tsx` — فتحة للجرس
- `src/components/app/{HomeView,PrayerView,DailyReview}.tsx` — المستطيل الكسول
- `src/components/app/SettingsView.tsx` — قسم الصوت الكامل
- `src/pages/Dashboard.tsx` — المركز، فتح الصوت، لقطة الحالة

---

## 3) Components added

| المكوّن | الغرض | ملاحظة |
|---|---|---|
| `Artwork` | رسم تجريدي لكل معنى | `aria-hidden`، بلا ملف، بلا بايت إضافي خارج الشيفرة |
| `InsightCarousel` | الاقتباس مع مصدره ورسمه | ٢٤٠ms · توقف عند أول تفاعل · يلغي تحت reduced motion |
| `InsightSlot` | غلاف كسول | أخرج ٥٦ kB من المسار الحرج |
| `HadithReader` | قراءة مريحة | نص حريري + مصدر منفصل + شريط تقدّم |
| `NotificationCenter` | سجل اليوم | حدّ ٥٠ · لا تفاعل ولا تعليق |
| `NotificationBell` | جرس الترويسة | الشارة تحمل رقما مكتوبا |

---

## 4) Hadith architecture

**لم يخترع شيء.** البنية جاهزة لمصدر موثوق، وغير مملوءة بتخمينات.

```text
Hadith { id, text, narrator, source, section, action,
         book?, hadithNumber?, grade? }   ← الثلاثة الأخيرة فارغة اليوم
```

المصنِّف `reviewStatusOf` يشتق الحالة من الحقول القائمة:

| الحالة | الشرط | النتيجة |
|---|---|---|
| `verified` | كتاب + رقم + راوٍ ومصدر + لا نسبة موصوفة | ٠ اليوم |
| `attributed` | راوٍ ومصدر محددان، بلا رقم | الأغلبية |
| `needs-review` | نسبة موصوفة، أو أثر صحابي، أو نقص | ١٨ فأكثر |

`canClaimVerified` **ترفض** الوصف بلا كتاب ورقم، واختبار يحرس أن لا شيء يوصف بـ«موثّق» اليوم.

**المواضيع:** ٢٦ بابا ← ١١ موضوعا. الأبواب باقية، والموضوع طبقة تصفية فوقها.

---

## 5) Content sources

| النوع | المصدر | الحالة |
|---|---|---|
| الأحاديث | `src/data/hadith.ts` | ١٣٣ حديثا، راوٍ ومصدر لكل واحد |
| الأذكار | `src/data/adhkar.ts` | كما هي |
| الأدعية | `src/data/duas.ts` | كما هي |
| المصحف | AlQuran.cloud + نسخة محلية | كما هي |
| اقتباسات المستطيل | **من قاعدة الأحاديث نفسها** | كل شريحة تحمل `id` حديثها |

**اقتباس المستطيل ليس نصا مؤلَّفا.** اختبار يثبت أن نص كل شريحة هو جزء من حديث قائم
وأن مصدره مصدر ذلك الحديث.

**يحتاج مراجعة بشرية:** إثبات رقم كل حديث في مصدره · إثبات درجته · مراجعة الـ١٨ المحادثة ذات النسبة الموصوفة.
هذه مهمة علماء لا مهمة كود.

---

## 6) Notification architecture

**ليس نظاما موازيا.** `prioritizeNotifications` في `notification-intelligence.ts`
ظلّ هو مرتّب الأولويات. الجديد طبقة صياغة تسبقه:

```text
NOTIFICATION_TEMPLATES (١٢ قالبا)
   ↓ resolveApplicableTemplates  ← منطق: هل القالب ينطبق الآن؟
   ↓ selectNotifications        ← نافذة التوقيت + التهدئة
   ↓ prioritizeNotifications    ← الترتيب (المحرّك القائم)
   ↓ appendNotification         ← السجل: سقف ٥٠ + منع التكرار
```

**ضد الإغراق، ثلاث طبقات مستقلة:** الشرط يقرر أن يظهر · الأولوية تقرر متى · التهدئة تقرر لا يتكرر.

**الوقار:** اختبار يرفض ٨ عبارات لوم أو ضغط في كل قالب، ويرفض نصا أطول من ١١٠ حرفا.

**تسلسل الصلاة بلا إزعاج:** تذكير قبل الوقت (`prayer-lead`) · نغمة عند الوقت (`prayer-time`) ·
ولا شيء بعده، لأن `prayer-time` بمهلة ٢٤٠ دقيقة لا يتكرر في اليوم نفسه.

---

## 7) Audio architecture

**لا موسيقى ولا مؤثرات ولا ملفات صوتية.** كل نغمة مولّدة من Web Audio ومدة أقصر من ثانية.

| النغمة | القناة | المدة |
|---|---|---|
| `tap` · `toggle-on/off` | رد الفعل الخفيف | ٩٠–١٥٠ms |
| `complete` | الإنجاز | ٦٢٠ms |
| `reminder` | التنبيه | ٧٠٠ms |
| `prayer` | الصلاة (مستقلة) | ١٥٠٠ms |

**البوابة نقية** `cueAllowed` لا تلمس المتصفح، فكل قاعدة منع قابلة للاختبار آليا.
**الافتراضي صامت.** `soundOn` مفتاح عام، و`prayerRing` قناة الصلاة نفسها — فلا إعداد ثانٍ لنفس الشيء.
**لا تشغيل تلقائي:** يُفتح سياق الصوت عند أول `pointerdown` فقط.

---

## 8) UX changes

- **حالات أزرار موحّدة:** `default` · `hover` · `pressed` · `active` · `selected` · `disabled` · `loading` · `success`.
  النشطة تحمل حلقة مزدوجة وخطا داخليا، **فلا تعتمد على اللون وحده**.
- **بيت الأحاديث:** حديث اليوم ← حديث هذا الوقت ← المكتبة. ثلاث طبقات بترتيب نية القارئ.
- **قارئ الحديث:** نص حريري بسطر ٢٫٤، المصدر في منطقة منفصلة، شريط تقدّم يظهر عند الطول فقط.
- **مركز الإشعارات:** اليوم · قبل ذلك · حالة قراءة · إدارة. لا شبكة اجتماعية.
- **قسم الصوت:** المفتاح العام + أربع قنوات + مستوى، وزر «جرّب».

---

## 9) Accessibility

| البند | الحالة |
|---|---|
| `aria-live` | حالة القراءة معلنة، والشريحة نفسها ليست |
| حالة النشطة غير اللونية | حلقة + خط داخلي + علامة صح |
| ٤٤×٤ | `touch-target` على كل شريحة وزر |
| الرسومات | `aria-hidden` + `focusable="false"`، بلا `<title>` يُقرأ |
| لوحة المفاتيح | الأسهم تنقل الشرائح، `tablist` صحيح |
| Focus | حلقة `:focus-visible` واحدة من Phase 2 |
| RTL | صفر أداة اتجاه فيزيائية في المكوّنات الجديدة (اختبار) |
| reduced motion | يلغي الانتقال والدوران وحلقة التحميل (اختبار) |

---

## 10) Performance

**قاعدة: قياس قبل أي تعديل.**

| المقياس | Phase 2 | بعد أول ربط | بعد الإصلاح | القرار |
|---|---|---|---|---|
| `index` | 351.68 kB | 352.61 | **352.64 kB** | مقبول |
| `Dashboard` | 131.51 kB | **155.63 kB** | **148.67 kB** | −٧ kB بالقياس |
| قاعدة الأحاديث | في المسار الحرج | في المسار الحرج | **`hadith` 56.54 kB منفصل** | إصلاح |

**القصة:** أول قياس كشف أن `insights.ts` سحب ٥٦ kB من المحتوى إلى المسار الحرج.
عولج بالتحميل الكسول لا بالحذف. الزيادة المتبقية ١٧ kB (٥٫٥ gzip) هي ثمن نظام
الإشعارات والصوت كاملين، وهي **مقيسة** لا مقدَّرة.

**لا اعتمادية جديدة.** لا مكتبة رسم متحركة جديدة، ولا Framer Motion في المكوّنات الجديدة (اختبار).

---

## 11) Tests

```text
bun test                    240 pass / 0 fail / 3018 expect() calls / 22 files
bun tsc -b --noEmit         PASS
bun run lint                0 errors / 25 warnings
bun run build               PASS — index 352.64 kB (gzip 108.13)
bun convex dev --once       PASS — Convex functions ready
bun run check:glyphs        نظيف
```

**٩١ اختبارا جديدا** (١٤٩ ← ٢٤٠). الاختبارات القديمة كلها سليمة.

| الملف | العدد | ما يحرسه |
|---|---|---|
| `hadith-metadata.test.ts` | ٢١ | المصدر، التكرار، الدرجة المخترعة، حالة التوثيق، المواضيع، مصدر الاقتباس |
| `notification-hooks.test.ts` | ٣٨ | الأولوية، التهدئة، منع التكرار، خلوّ النص من اللوم، نافذة التوقيت، السجل |
| `audio.test.ts` | ١٥ | البوابة، التعطيل، حدود المدة، الربط بالتفضيلات |
| `phase3-ux.test.ts` | ١٧ | RTL، ميزانية الحركة، reduced motion، حالات الأزرار، وصولية الرسومات |

---

## 12) Browser QA

**صفر اختبار بصري نُفِّذ. لا أداة متصفح في البيئة.**
الثلاثون اختبارا كلها `NOT VERIFIED` — انظر `PHASE_3_BROWSER_QA.md`.

لا ادّعاء عن: RTL بصري · أي مقاس من الستة · safe area · تركيز لوحة المفاتيح ·
التثبيت على Android · سلوك الصوت الفعلي · توقيت الإشعارات على أرض الواقع.

---

## 13) Known risks

1. **قاعدة الأحاديث تحتاج مراجعة علمية.** ١٨ محادثة منسوبة بصيغة موصوفة، و١٢ مصدرا هو
   «آثار الصحابة» لا حديث مرفوع. صار ذلك **معلَنا** لا مخفيا، لكنه يبقى نقصا في المحتوى.
2. **صفر حديث موثّق.** هذا صحيح لا فخر: لا رقم ولا مراجعة، فلا ادّعاء.
3. **`Dashboard` أكبر بـ١٧ kB.** ثمن مقيس للميزة، وقد يُراجَع إن ضاقت.
4. **الصوت لم يُختبر في متصفح.** البوابة نقية ومختبَرة، لكن سلوك Web Audio الفعلي مجرّب آليا.
5. **`weekStartOfDateKey` بالتقويم مقابل `dateKey()` المحلي** — قرار مؤجّل من Phase 2، لم يتغيّر.
6. **`schemaValidation: false`** — مؤجّل من Phase 2، خارج نطاق هذه المرحلة.

---

## 14) Remaining work

- [ ] ٣٠ اختبار Browser QA على جهاز حقيقي
- [ ] مراجعة ١٣٣ حديثا بعلماء وإثبات الأرقام والدرجات
- [ ] قرار `weekStartOfDateKey` مقابل المنطقة الزمنية
- [ ] تفعيل `schemaValidation` بعد أي migration
- [ ] قياس أداء فعلي على جهاز

---

## 15) Release readiness

| المستوى | الحالة |
|---|---|
| **IMPLEMENTED** | ✅ |
| **AUTOMATION VERIFIED** | ✅ ٢٤٠ اختبارا · tsc · lint · build · convex · glyphs |
| **BROWSER VERIFIED** | ❌ **NOT VERIFIED** |
| **RELEASE READY** | ❌ **لا** |

> ### `PHASE 3 — IMPLEMENTED · AUTOMATION VERIFIED · BROWSER QA PENDING`
>
> **ليست جاهزة للإطلاق.** أربعة مستويات لا تختلط:
> `implemented` ليس `verified`، و`automation verified` ليس `browser verified`.
> لا مرحلة تُغلق قبل بوابة المتصفح الحقيقية.
