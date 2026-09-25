# PHASE 2 FINAL REPORT — Design System, Integration, Hardening

**التاريخ:** 2026-09-25
**الحالة الرسمية:** `IMPLEMENTED — AUTOMATION VERIFIED — BROWSER QA PENDING`
**ما قبلها:** Phase 0 IMPLEMENTATION COMPLETE / Browser QA NOT VERIFIED · Phase 1 IMPLEMENTED + AUTOMATION-VERIFIED / Browser QA NOT VERIFIED

---

## 1) Executive summary

المرحلة الثانية لم تكن بناءً من الصفر: نحو ٨٠٪ من واجهتها ونظام تصميمها كانا منفذين قبل هذه الجولة (انظر `PHASE_2_FEATURE_PARITY_AUDIT.md`). هذه الجولة كانت **تدقيقًا ثم إغلاقًا للفجوات الحقيقية**، لا إعادة بناء.

**ما كان مخطَّطًا ولم يكن موجودًا فعليًا:**

| البند | قبل | بعد |
|---|---|---|
| `ErrorState` | معرَّف في `Surfaces.tsx`، **صفر استخدام** | مستخدم في `ViewBoundary` على المسارين + داخل الشاشات |
| حاجز خطأ لكل شاشة | **غير موجود** — استعلام فاشل واحد كان يُسقط التطبيق كله | `ViewBoundary` في `main.tsx` و`Dashboard` |
| خطأ الشبكة لا يساوي شاشة فارغة | الإجابة toast تختفي | حالة دائمة + «أعد المحاولة» |
| أيقونات PNG | SVG فقط، و`apple-touch-icon` يشير إلى SVG (iOS يتجاهله) | ١٩٢ و٥١٢ وmaskable وapple-touch مولَّدة ومتحقَّق منها |
| تدفّق التحديث | `skipWaiting` عند التثبيت **و** `SKIP_WAITING` تلقائي، أي تبديل صامت تحت جلسة مفتوحة | تحديث ينتظر موافقة المستخدم مع زر «تحديث الآن» |
| `clearLocalData` | **غير موجود** — تسجيل الخروج يترك الإجابات والموقع والمحفوظات على الجهاز | سجل صريح + استدعاء عند الخروج وعند الحذف |
| `storageEstimate` و`formatBytes` و`clearOfflineCaches` | مكتوبة وغير مستخدمة | مربوطة في مجموعة «البيانات» |
| `achievements` | تُحسب وتُخزَّن ولا تُعرض | **حُذفت** (لا سطح لها، وضغط تنافسي يخالف الهوية) |
| حقائق المراجعة الأسبوعية | تُحسَب وتُخزَّن ولا تُقرأ | سطران يقرآن «ما علّمه الأسبوع» |
| الخصائص الفيزيائية | ٩٦ موضعًا (٢٠ منها في كود التطبيق) | صفر في كود التطبيق عدا `inset-x-0` و`text-left` لـstack trace |
| سهم «التأكيد» في `/auth` | `ArrowRight` — اتجاه خاطئ في RTL | `ArrowLeft` + خصائص منطقية |
| محارف تالفة | محرفا هانغول + محارف إبدال | صفر، والحارس صار يرصد `U+FFFD` أيضًا |
| حارس المحتوى الديني | الأنواع تفرض الحقل، وتسمح بـ`source: ""` | ١٤ اختبارًا على البيانات نفسها |
| ملفات ميتة | ملفان + ١٧ رمزًا | صفر |
| branding ظاهر للمستخدم | `"a freebuff.com application"` في بريد التحقق | `"عود"` |

**ما لم يُنفَّذ ولم يُدَّعَ:** أي اختبار بصري. لا توجد أداة متصفح في هذه البيئة. كل ما يلي `NOT VERIFIED` — انظر §7.

---

## 2) Before / after state

| المقياس | قبل | بعد |
|---|---|---|
| `bun test` | 129 | **149** (٢٠ اختبارًا جديدًا) |
| `bun run lint` | 0 errors / 30 warnings | **0 errors / 24 warnings** |
| entry chunk (`index-*.js`) | 482.68 kB · gzip 150.45 | **351.68 kB · gzip 107.90** |
| استخدامات `ErrorState` | 0 | 3 |
| استعلامات بلا حالة خطأ | ١١ | 0 |
| مفاتيح تخزين محلية غير ممسوحة عند الخروج | ١٨ | 0 |
| رموز ميتة | ١٩ | 0 |
| خصائص اتجاه فيزيائية في كود التطبيق | نحو ٢٠ | 0 |
| حارس سلامة المحتوى الديني | 0 | 14 اختبارًا |

---

## 3) Exact files changed

### جديد
- `src/components/app/ViewBoundary.tsx` — حاجز خطأ لكل شاشة
- `src/lib/local-data.ts` — سجل مفاتيح الجهاز + `clearLocalData`
- `scripts/generate-icons.ts` — مولّد أيقونات PNG بلا اعتماديات
- `tests/religious-content.test.ts` — حارس المصادر
- `tests/local-data.test.ts` — عقد الخصوصية
- `public/icon-192.png` · `public/icon-512.png` · `public/icon-maskable-512.png` · `public/apple-touch-icon.png`

### مُعدَّل
- `src/pages/Dashboard.tsx` — حاجز الخطأ، حالات loading وempty، `clearLocalData`، لافتة التحديث، `pb` آمن، إظهار أرقام الأسبوع
- `src/main.tsx` — حاجز الخطأ على المسارين، تحميل كسول لشريط المعاينة، و`<pre>` بـ`text-left`
- `src/lib/pwa.ts` — `onUpdateReady` و`applyUpdate`، وحذف `SKIP_WAITING` التلقائي
- `public/sw.js` — حذف `skipWaiting` من التثبيت، وإضافة الأيقونات إلى الـshell
- `public/manifest.webmanifest` — أيقونات PNG
- `index.html` — `apple-touch-icon` بصيغة PNG + `<title>` باسم عود
- `src/components/app/SettingsView.tsx` — مساحة التخزين + تفريغ الحفظ + `clearLocalData` API
- `src/pages/Auth.tsx` — سهم RTL صحيح + خصائص منطقية
- `src/components/app/{QuranView,HadithView,DuasView,PrayerView,WeeklyView,HomeView,NextPrayerHero}.tsx` — خصائص RTL منطقية، أرقام، و`aria-live`
- `src/lib/progress.ts` + `tests/progress.test.ts` — حذف `achievements`
- `src/convex/auth/emailOtp.ts` — اسم التطبيق في البريد
- `scripts/check-stray-glyphs.ts` — رصد `U+FFFD`
- `package.json` — سكربت `icons`
- ١٠ ملفات استُبدل فيها `text-right` بـ`text-start` آليًا

### محذوف (بعد تحقّق أن مرجعها صفر)
`src/components/LogoDropdown.tsx` · `src/components/app/QuoteMarquee.tsx` · `GlassPill` · `SectionTitle` · `ACCOUNT_ACTIONS` · `isSameDay` · `modelForAnswers` · `usePageVisible` · `saveOfflineFavorites` · `readOfflineFavorites` · `FOCUS_LABELS` · `DISTRACTION_LABELS` · `DISCIPLINE_LABELS` · `onServiceWorkerMessage` · `coordsLabel` · `daysToRamadan` · `Subpanel` · `QuietPanel` · `Rule` · `DisplayTitle` · `SkeletonLines`

---

## 4) P0 / P1 / P2 completed

### P0 — Error / Empty / Loading

- **`ViewBoundary`** (class component لأن React لا يقبل `try/catch` حول `useQuery`). يلتقط استثناء أي استعلام فاشل ويعرض `ErrorState` بالعربية مع زر «إعادة المحاولة». مثبَّت في مستويين:
  - `main.tsx` حول `<Dashboard>` و`<Onboarding>` — **هذا هو المستوى الذي يهم**: استعلامات `Dashboard` تُقرأ في جسم المكوّن نفسه، فحاجز داخل `children` كان لا يلتقط فشل `getProfile`.
  - `Dashboard` حول منطقة المحتوى — يعزل فشل شاشة واحدة عن قشرة التطبيق.
  - `componentDidUpdate` يلغي حالة الفشل عند تبديل الشاشة، ومفتاح `nonce` يُعيد تركيب الشجرة فتُعاد قراءة الاستعلامات.
- **تمييز loading عن empty** — كان `stats === undefined` (أي: جارٍ التحميل) يعرض «لا يوجد سجلّ بعد». صار `undefined` تعني `SectionLoading`، و`null` أو `0` تعني `EmptyState`.
- **الخطة الأسبوعية** — كان `plan === null` يعرض أيامًا فارغة بلا تفسير. صار: تحميل يعني skeleton، وغياب الخطة يعني `EmptyState` مع زر الذهاب إلى «اليوم».
- **`RootErrorBoundary` و`ToolbarErrorBoundary`** — مراجَعان: الأول يعطي رسالة عربية وإعادة تحميل بدل شاشة بيضاء، والثاني يمنع أداة المعاينة من إسقاط التطبيق. **بلا تعديل** — كانا يفيان بالغرض.

### P1 — PWA polish

- **الأيقونات**: `scripts/generate-icons.ts` يرسم هندسة `public/icon.svg` نفسها (bezier إلى polyline، دوران ‎-18°، تدرّجات، supersampling بمعامل 3×3) ويشفّر PNG بلا مكتبة. التحقّق: توقيع PNG صالح، أبعاد ١٩٢ و٥١٢ و١٨٠ صحيحة، البكسل في الزاوية شفاف (استدارة) بينما الخلفية والأخضر والأزرق مطابقة للتدرّجات، والنسخة maskable بلا استدارة.
- **تدفّق التحديث**: حُذف `self.skipWaiting()` من `install`، وحُذف `postMessage(SKIP_WAITING)` التلقائي. الآن: `onUpdateReady` و`applyUpdate` ولافتة «يتوفّر تحديث للتطبيق» مع زر. الجلسة محفوظة لأن رمز ConvexAuth في التخزين الدائم.
- **Offline**: لم يُمَس. لم يُبنَ طابور للـmutations (تغيير معماري جديد) — موثّق كحدّ في §6.
- **بيانات الجهاز**: `storageEstimate` و`formatBytes` في سطر «مساحة التخزين»، و`clearOfflineCaches` في سطر «تفريغ الحفظ المؤقت» مع نص صريح بأنه لا يمسّ المصحف ولا الحساب.

### P1 — RTL حقيقي

- **الخصائص الفيزيائية إلى المنطقية**: `pr-10` و`ps-10`، و`right-3` و`start-3`، و`left-3` و`start-3`، و`pl-9` و`ps-9`، و`pl-1` و`ps-1`، و`mr-2` و`me-2`، و`ml-2` و`me-2`، و`text-right` و`text-start` في ١٠ ملفات.
- **سهم حقيقي خاطئ**: `/auth` كان يعرض `ArrowRight` على «تأكيد الرمز» — اتجاه معكوس في RTL. صار `ArrowLeft` في موضعين.
- **الأسهم غير الاتجاهية لم تُعكس**: `Mail` و`UserX` و`Search` و`Check` و`Loader2` والرموز التطبيقية بقيت كما هي. أما `ChevronLeft` و`ChevronRight` في التنقّل فتُستعمل بمعنى «السابق/التالي» لا «يمين/يسار»، فسليمة.
- **`text-left` باقية عمدًا** على `<pre>` في `main.tsx`: محتوى كود لاتيني، والمحاذاة لليسار هي الصحيحة له.
- **الأرقام والتاريخ والوقت لم تُمسّ**: `arabicNumber` و`toArabicDigits` و`formatArabicTime` تعمل كما هي. **والنصوص الدينية لم تُمسّ.**

### P1 — Responsive

- **تداخل الشريط السفلي مع آخر محتوى** (عيب حقيقي): `pb-28` أي ٧rem كان ثابتًا، والشريط السفلي يساوي نحو ٧٦px + 8px + `env(safe-area-inset-bottom)`. على iPhone بمؤشّر ٣٤px يصبح المجموع ١١٨px وهو أكبر من ١١٢px، فيغطي آخر عنصر. صار `pb-[calc(7rem+env(safe-area-inset-bottom))]`.
- **لم يُضَف `overflow-x-hidden`** — لم يُخفَّف أي عَرَض بإخفائه.
- `overflow-x-auto` كان موجودًا على جدول الإحصاءات بـ`min-w-[32rem]` — تحقّق لا تعديل.
- **لم يُقَس** العرض الفعلي على ٣٦٠ و٣٩٠ و٤١٢ و٧٦٨ و١٠٢٤ و١٤٤٠ — `NOT VERIFIED`.

### P1 — Accessibility

- **العدّاد لا يُعلن نفسه**: `LiveCountdown` يتحدّث كل ٣٠ ثانية. أُضيف `aria-live="off"` صريحًا، فصار القصد ضمانًا لا نتيجة عرضية.
- **حالة الصلوات صارت `aria-live="polite"`** — تغيّر حالة الصلاة فعل نادر يستحق الإعلان، بخلاف عدّاد يتبدّل كل ثلاثين ثانية.
- **`reduced-motion`**: `motion-swap` و`motion-press` و`skeleton` و`stage-enter` و`float-soft` و`btn-edge` كلها ملغاة تحت `prefers-reduced-motion`، و`RouteLoading` يستخدم `motion-reduce:animate-none`. **تحقّق بالقراءة من `index.css`؛ لم يُختبر في متصفح.**
- **أسماء عربية**: كل `aria-label` مكتوب بالعربية، مثل `التنقّل الرئيسي` و`الأسبوع السابق` واسم العنصر متبوعًا بحالته.
- **٤٤×٤**: `touch-target` على عناصر التنقّل. **لم يُقاس بصريًا.**

### P2 — Performance (قياس قبل تعديل)

| القياس | قبل | بعد | الإجراء |
|---|---|---|---|
| entry chunk | 482.68 kB / gzip 150.45 | **351.68 kB / gzip 107.90** | `VlyToolbar` كسول: شريط المعاينة كان يجرّ `framer-motion` (١٢٧ kB) و`snapdom` إلى المسار الحرج. الآن منفصل ويُحمَّل بعد أول رسم. |
| `convex-vendor` | chunk فارغ ١ بايت | كما هو | **بلا إصلاح**: أثره طلب HTTP واحد بلا قيمة؛ و`convex` ينتهي داخل `index` فلا يبقى ما يُقسَّم. تعديل `vite.config.ts` لإزالة تحذير بلا فائدة = تحسين عشوائي. |
| `recharts` و`date-fns` | `recharts` في chunk منفصل ولا يُستورد من `src` (مجموعة shadcn فقط) · `date-fns` **غير مستورد إطلاقًا** | كما هو | **`date-fns` مُعلن في `package.json` بلا استخدام** — أثره صفر على الحزمة (tree-shaken)، فلم نُمسّ. توثيق فقط. |
| lazy views | ١٠ شاشات lazy | كما هي + شريط المعاينة | لم نُضِف manual chunks جديدة. |
| queries | مقيّدة بالشاشة | كما هي | لم نلمس. |

### P2 — Data/UI parity (قرار لكل عنصر)

| البيانات | القرار | السبب |
|---|---|---|
| `weekly.activeDays` | **عُرض** | المقام الحقيقي لـ`completed`؛ بدونه الرقم معلَّق |
| `weekly.postponed` | **عُرض** | هو المدخل المباشر لمحرك التكييف؛ إخفاؤه يُخفي سبب الاقتراح |
| `weekly.averageScore` و`changeFromPrevious` | **عُرض** | المقارنة بالأسبوع الماضي كانت معطلة بلا هذه |
| `longestStreak` | **عُرض** | يكمّل `currentStreak` بسطر واحد |
| `mostConsistentHabit` و`mostPostponed` | **عُرض** | «ما ثبت» و«ما تأجّل» هو جوهر تعلّم الأسبوع |
| `successfulPeriods` و`difficultPeriods` | **عُرض** | النوافذ الناجحة والمتعثرة — مُدخَل التوصية القادمة |
| `achievements` | **حُذف** | كانت تُحسب وتُخزَّن ولا تُعرض. الشارات ضغط تنافسي يخالف «هادئ بلا gamification». حُذفت الدالة والنوع والحقل، وأُضيف اختبار يمنع عودتها صامتة. |
| `adaptiveSuggestions.protect` | **بقي خارج القائمة** | `applyApprovedSuggestion` عليه `changed: false` دائمًا، فزرٌّ عليه لن يفعل شيئًا. إظهاره كإجراء زر كاذب؛ فظهر كنص داخل `WeeklyView` مع الاقتراحات الأخرى. |
| `totalCompleted` | **بقي في النوع ولا يُعرض** | تراكمي ويكرّر ما تقوله `weekly.completed`؛ سطر `reduce` لا يكلّف شيئًا، وحذفه يكسر واجهة `ProgressSummary` بلا فائدة |

### P2 — Dead code

كل رمز **تحقُّقت مراجعه برمجيًا** قبل حذفه: صفر مرجع خارج ملف التصريح **وصفر استيراد**. ما حُذف: ملفان كاملان + ١٧ تصديرًا. المحذوفات كلها واجهات ميتة، لا ميزات.

---

## 5) Tests and exact results

```text
bun test                         149 pass / 0 fail / 1427 expect() calls / 18 files
bun tsc -b --noEmit              PASS
bun run lint                     0 errors / 24 warnings
bun run build                    PASS — 351.68 kB entry (gzip 107.90)
bun convex dev --once            PASS — Convex functions ready
bun run check:glyphs             نظيف
```

### الاختبارات الجديدة (٢٠)

**`tests/religious-content.test.ts` — ١٤ اختبارًا (حارس، لا اختبار شكل):**
- كل ذكر: نص غير فارغ + مصدر غير فارغ + `repeat > 0` + معرّفات فريدة داخل المجموعة
- كل دعاء: مصدره من قيمتين مغلقتين فقط، ومرجعه ونصّه غير فارغين، وينتمي لقسم معرَّف
- كل حديث: راوٍ ومصدر ونصّ غير فارغين، ومعرّفات فريدة
- كل بيت: شاعر ومصدر وكل سطر غير فارغ
- كل قصة نبي: مصدر وفقرات غير فارغة، وأي آية بارزة لها مرجع
- القرآن: لا يشير أيٌّ من ملفَّي المصدر إلى مزوّد توليد

**`tests/local-data.test.ts` — ٧ اختبارات (عقد الخصوصية):**
- إجابات الملف والموقع والمحفوظات وموضع القراءة والمسبحة **مملوكة للتطبيق**
- مفاتيح التذكير المؤرَّخة مملوكة عبر البادئة
- `__convexAuth*` **غير مملوكة ومحميّة** — لا تُمسّ
- المصحف المنزَّل (`sakinah:quran:1`) والمواقيت المخزَّنة **ليست بيانات مستخدم**
- `clearLocalData` تمحو المملوك وتُبقي المحميّ والغريب
- **idempotent**: التشغيل الثاني لا يحذف جديدًا
- **لا ترمي** عند غياب التخزين أو رفع `QuotaExceededError`

**`tests/progress.test.ts` — +١:** حارس يمنع عودة طبقة «الإنجازات» صامتة.

> ملاحظة: العدد انتقل من ١٢٩ إلى ١٤٩. اختباران من `Milestones` أُزيلا مع الكود المحذوف، وأُضيف ٢٢ (١٤ + ٧ + ١). هذه اختبارات تحرس عقودًا، لا أرقامًا.

---

## 6) Known limitations

1. **Browser QA = NOT VERIFIED.** لا أداة متصفح في البيئة. لا ادعاء عن RTL بصري أو المقاسات أو safe areas أو PWA install.
2. **لا طابور offline للـmutations.** تسجيل حالة عنصر خطة أو مراجعة يحتاج اتصالًا واحدًا، والواجهة تعلن ذلك ولا تدّعي حفظًا لم يحدث. بناؤه تغيير معماري خارج Phase 2.
3. **`schemaValidation: false`** في `schema.ts`. للـmutations validators يدوية. التفعيل مؤجل حتى تكتمل أي migration.
4. **المواقيت تُحسب على جهاز المستخدم** عبر Aladhan. و`buildDayItems` على الخادم يعمل بلا مواقيت، فالنتيجة والـbreakdown متطابقان، لكن الترتيب الزمني للعرض مسؤولية العميل.
5. **المنطقة الزمنية**: `weekStartOfDateKey` بالتقويم لا بالمنطقة، لكن `dateKey()` في العميل ما زال محليًا — مسافر عبر المناطق قد يرى «أمس» ليومين. قرار صريح مطلوب لاحقًا.
6. **`date-fns` مُعلن بلا استخدام.** أثره صفر على الحزمة. لم نُمسّ الاعتماديات في هذه الجولة.
7. **`convex-vendor` chunk فارغ.** بلا أثر وظيفي، وإصلاحه سطر في `vite.config.ts` — خارج النطاق.
8. **HMR في `vite.config.ts`** لم يُمَس.
9. **التكييف يحتاج أدلة**: `move` يتطلّب تأجيلين ونجاحًا لا يقل عن ٧٠٪ في نافذة أخرى، و`reduce` خمسة أيام. بيانات أقل = `keep` صراحة.
10. **لا Convex integration tests** للصلاحيات — مغطّاة بالفهرسة والمراجعة اليدوية.
11. **الأيقونات مولَّدة برمجيًا**، لا من ملف تصميم قابل للتحرير. لتغيير الشكل: عدّل `public/icon.svg` ثم `bun run icons`.

---

## 7) Browser QA status

> **NOT VERIFIED — browser unavailable**
> لا توجد أداة Browser أو Chromium أو Playwright في هذه البيئة. لم يُنفَّذ أي اختبار بصري، **ولم يُحوَّل أي `NOT VERIFIED` إلى `PASS`**.

| # | الاختبار | الحالة |
|---|---|---|
| 1 | First launch / white screen | NOT VERIFIED |
| 2 | Chunk loading (بعد فصل شريط المعاينة) | NOT VERIFIED |
| 3 | Onboarding كامل | NOT VERIFIED |
| 4 | تصفّح أسبوع آخر ثم العودة لليوم (G1) | NOT VERIFIED |
| 5 | Auth / OTP / **بريد التحقق باسم «عود»** | NOT VERIFIED |
| 6 | تنقّل متكرر خمس مرات | NOT VERIFIED |
| 7 | نتيجة اليوم = نتيجة المراجعة (G2) | NOT VERIFIED |
| 8 | الفرق عن الأسبوع الماضي (G3) | NOT VERIFIED |
| 9 | نقرتان على زر الحفظ (G4) | NOT VERIFIED |
| 10 | حذف البيانات + مسح الجهاز (G6) | NOT VERIFIED |
| 11 | **شاشة خطأ حقيقية** + «أعد المحاولة» (P0 الجديد) | NOT VERIFIED |
| 12 | **لافتة «يتوفّر تحديث»** + بقاء الجلسة | NOT VERIFIED |
| 13 | 360 / 390 / 412 / 768 / 1024 / 1440 | NOT VERIFIED |
| 14 | **عدم تغطية الشريط السفلي** للمحتوى + safe area | NOT VERIFIED |
| 15 | RTL بصري · أسهم · Radix (Sheet/Dialog/toast/OTP) | NOT VERIFIED |
| 16 | Keyboard + focus trap + 44×44 | NOT VERIFIED |
| 17 | PWA install (Android PNG 192/512) + standalone + offline | NOT VERIFIED |
| 18 | Update flow (SKIP_WAITING بضغط المستخدم) | NOT VERIFIED |
| 19 | Console / Network | NOT VERIFIED |
| 20 | قياس أداء فعلي على جهاز | NOT VERIFIED |

**ما يمكن إثباته آليًا وقد أُثبت:** اختبارات الوحدة والتكامل المنطقي · TypeScript · Lint · البناء · codegen · سلامة المحارف · سلامة المحتوى الديني · عقد مسح بيانات الجهاز · أبعاد وصحة صور PNG · بُنى الـmanifest.

---

## 8) Security / privacy review

- **`clearLocalData()`** يُستدعى عند **تسجيل الخروج** وعند **حذف البيانات**. يزيل: إجابات الملف · حالة اليوم · إحداثيات الموقع وتسميته · المحفوظات · موضع القراءة وآخر سورة · المسبحة · تقدم الأنبياء · التفضيلات · الإخفات · مفاتيح التذكير المؤرَّخة.
- **ما لا يُمسّ عمدًا**: `__convexAuthJWT_oudapp` و`__convexAuthRefreshToken_oudapp` (تديرها Convex Auth نفسها)، والمصحف المنزَّل (IndexedDB)، ونصوص المواقيت المخزَّنة. السبب: محتوى عام مشترَك، وحذفه يكلّف المستخدم إعادة تنزيل بلا فائدة للخصوصية.
- **محميّ بنمط** (`PROTECTED_KEY_PATTERNS`) ومختبَر: أداة الحذف تتجاوز أي مفتاح يبدأ بـ`__` ولو تطابق بادئة.
- **لا تحليلات ولا تتبّع جديد** أُضيف. و`reportErrorToVly` في `instrumentation.tsx` سابق هذه الجولة ولم يُمسّ.
- **ملفات `.env` لم تُقرأ ولم تُكتب.** `FREEBUFF_OTP_KEY` يُقرأ من `process.env` في `convex/auth/emailOtp.ts` كما كان.
- **الصلاحيات**: كل query وmutation مربوطة بمعرّف مستخدم Convex Auth؛ والقراءات غير المسجَّلة تُعيد `null` أو `[]` بدل التسريب؛ و`applyPlanSuggestion` لا يثق بـpatch من العميل.
- **مخاطرة متبقّية**: مفتاح OTP يُمرَّر من الخادم إلى خدمة خارجية عبر HTTPS مع `x-api-key` في الترويسة. المفتاح في `process.env` على Convex فقط، ولا يظهر في الكود ولا في Git.

---

## 9) Religious-content integrity review

**القاعدة: لا توليد ولا اختلاق.** لم يُضف أي نص ديني في هذه الجولة، ولم يُعدَّل نص ديني قائم.

- الأنواع في `src/data/*` تفرض `source: string` إجباريًا. وكانت الفجوة أن `source: ""` يمرّ من الأنواع — سدّتها `tests/religious-content.test.ts` على البيانات نفسها (٩٧٦ تحقّقًا).
- **المصحف**: `quran.ts` (AlQuran.cloud) + `quran-offline.ts` (حزمة داخل التطبيق). واختبار يتحقق من عدم ذكر أي مزوّد توليد في أيٍّ منهما.
- **الأذكار**: ٥ مجموعات، كل ذكر يحمل مصدره. **الأدعية**: مصدره من قيمتين مغلقتين (`قرآن كريم` / `السنة النبوية`) مع مرجع. **الأحاديث**: راوٍ + مصدر + قسم. **الأبيات**: شاعر + مصدر، وما اختلف نسبته موسوم «منسوب». **الأنبياء**: مصدر أساسي + آية بارزة بمرجعها.
- `occasions.ts` بلا `source` عمدًا: تواريخ ومناسبات محسوبة، لا نصوص منسوبة.
- التغطية في الواجهة: `AdhkarDialog` و`AdhkarIndex` و`HadithView` و`DuasView` تعرض المصدر. و`QuranView` يعرض اسم السورة والآية.

---

## 10) Performance review

تم بالقياس قبل أي تعديل، والإجراء الوحيد كان مدعومًا برقم:

- **فصل شريط المعاينة (كسول)**: entry chunk من **482.68 kB / gzip 150.45** إلى **351.68 kB / gzip 107.90**. السبب: `main.tsx` كان يستورد `vly-toolbar-readonly.tsx` مباشرةً، فيسحب `framer-motion` (١٢٧ kB) و`snapdom` إلى المسار الحرج. **الاعتماد نفسه لم يُحذف** — التحميل تأجَّل فقط.
- **`convex-vendor` الفارغ**: **بلا إصلاح.** `convex` ينتهي داخل `index` فلا يبقى شيء للـmanual chunk. الأثر: طلب HTTP إضافي ١ بايت + تحذير build. وإصلاحه سطر في `vite.config.ts` بلا فائدة وظيفية = تحسين عشوائي.
- **لم تُضَف manual chunks جديدة.** التقسيم الحالي كافٍ: ١٠ شاشات + صفحات lazy + vendor chunks منفصلة.
- **الاستعلامات**: لم تُمسّ. `getStats` و`getHistory` مقيّدتان بالشاشة منذ Phase 1.
- **لم تُضحِّ بسرعة أول فتح**: التقسيم الجديد يجعل أول رسم أسرع لا أبطأ.
- **الأثر على البيانات**: `Dashboard` و`SettingsView` و`Onboarding` نمت جميعها (`Dashboard` من 128 إلى 131 kB) بسبب `ViewBoundary` وحالة التحديث والإحصاءات المعروضة. مقايضة مقصودة: خطأ مرئي بدل شاشة بيضاء.

---

## 11) Dead-code review

| العنصر | الدليل قبل الحذف |
|---|---|
| `LogoDropdown.tsx` | صفر استيراد + صفر مرجع |
| `QuoteMarquee.tsx` | صفر استيراد + صفر مرجع |
| ١٧ تصديرًا | `refs = 0` خارج ملف التصريح، عبر مسح كل `src/` و`tests/` و`scripts/` |
| `calculateAchievements` و`Achievement` | كانت تُحسب في كل تحميل، ولا تُعرض أبدًا |
| `FAVORITES_KEY` في `offline-store` | تصدير الحفظ المحلي المحذوف جعله بلا مرجع |
| `buildLifeModel` import في `weekly-plan` | كان لازمًا فقط من أجل `modelForAnswers` المحذوف |

**أُبقي عمدًا:** ٢٠ primitive في `Surfaces.tsx` المستخدَمة فعلًا · دوال `src/data/*` المصدَّرة كواجهة عامة · `setFavorite` و`deleteMyData` (مربوطان بالواجهة) · `errorState` (مستخدم الآن).

---

## 12) Feature parity = 38/38

لم يُحذف أي ملف feature ولم تُحذف أي شاشة. و`PHASE_2_FEATURE_PARITY_AUDIT.md` (38/38) ما زال صحيحًا: كل شاشة بقيت، والتغييرات كانت داخل الشاشة لا عليها.

| الشاشة | التغيير في هذه الجولة |
|---|---|
| اليوم | أرقام الأسبوع (نشطة/مؤجّل/متوسط/الفرق/أطول سلسلة) |
| الصلاة | `me-2` بدل `mr-2` |
| القرآن | `start-3` و`ps-10` و`ps-1`، و`text-start` |
| الأذكار | `text-start` |
| الأحاديث · الأدعية | `start-3` و`ps-10` |
| المسبحة | — |
| الأبيات · الأنبياء · المناسبات | — |
| المحفوظات | — |
| الخطة الأسبوعية | **أسطر «ما علّمه الأسبوع»** + حالة تحميل وفراغ |
| المراجعة اليومية | — |
| الإعدادات | **مساحة التخزين + تفريغ الحفظ + صف الحذف** |
| Onboarding | `text-start` |
| الإحصاءات | **تمييز loading عن empty** |
| `/auth` | سهم RTL صحيح + خصائص منطقية |
| PWA shell | أيقونات PNG + تدفّق تحديث |
| Privacy | `clearLocalData` عند الخروج والحذف |

**+1 ميزة مُضافة فعلًا:** حاجز خطأ لكل شاشة. وهي ليست ميزة بل غياب خطأ كان يُسقط التطبيق. مُسجَّلة هنا لأنها تغيّر ما يراه المستخدم عند الفشل.

---

## 13) Explicit out-of-scope

لم يُنفَّذ ولا يُقترح في هذه الجولة: AI assistant · brain-rot blocker · porn blocker · شبكة اجتماعية · مجتمع · سوق · مدفوعات · إعلانات · واجهة إنجليزية · توسيع ضخم للمصحف · منصّة رياضية · تحقّق بالكاميرا · بنية AI سحابية · ميزات جديدة كبرى · إعادة تصميم كامل · إعادة كتابة Phase 1 · تغيير معمارية الـbackend.

**Phase 2 هنا كانت: Finish + Harden + Integrate + Verify — لا Add Features.**

---

## 14) Final status

| البوابة | الحالة |
|---|---|
| 38/38 features موجودة ومتصلة | PASS |
| P0 error/empty/loading مكتملة | PASS (آليًا) |
| PWA remaining work | PASS (آليًا) — **التثبيت نفسه NOT VERIFIED** |
| RTL code review | PASS |
| Responsive code review | PASS — **القياس NOT VERIFIED** |
| Accessibility code review | PASS — **القياس NOT VERIFIED** |
| Privacy/local-data cleanup | PASS |
| Religious content integrity | PASS — ١٤ اختبارًا |
| Dead code reviewed | PASS — صفر |
| Performance reviewed بلا تحسين عشوائي | PASS — قياس ثم إجراء واحد مُبرَّر |
| `bun test` | PASS — 149/149 |
| `bun tsc -b --noEmit` | PASS |
| `bun run lint` | PASS — 0 errors |
| `bun run build` | PASS |
| `bun convex dev --once` | PASS |
| `bun run check:glyphs` | PASS |
| التوثيق محدَّث | PASS — هذا الملف + `PHASE_2_MASTER_PLAN.md` |
| **Browser QA** | **PENDING / NOT VERIFIED** |

> ### `PHASE 2 — IMPLEMENTED · AUTOMATION VERIFIED · BROWSER QA PENDING`
>
> **ليست جاهزة للإطلاق.** لا يُغلق أي مرحلة قبل اجتياز بوابة المتصفح الحقيقية.
