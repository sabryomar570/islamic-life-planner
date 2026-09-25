# PHASE_2_MASTER_PLAN.md

**التاريخ:** 2026-09-25
**الحالة:** `IMPLEMENTED — AUTOMATION VERIFIED — BROWSER QA PENDING`
كود المرحلة الثانية منجَز ومتحقَّق آليًا · **بوابة المتصفح لم تُنفَّذ بعد**
**ما قبلها:** Phase 0 IMPLEMENTATION COMPLETE / Browser QA NOT VERIFIED · Phase 1 IMPLEMENTED + AUTOMATION-VERIFIED / Browser QA NOT VERIFIED

> هذا المستند **لا يعيد بناء ما نُفِّذ**. الجولة الأخيرة أغلقت الفجوات الحقيقية المذكورة في §4، والتفاصيل الكاملة في `PHASE_2_FINAL_REPORT.md`. البنود المنجزة موسومة بـ`DONE`، وما تبقّى منها هو **ما خلف بوابة المتصفح فقط**، وهو `NOT VERIFIED` لا `PASS`.

---

## 1) Current state

| الطبقة | الحالة |
|---|---|
| Stack | Vite 7 · React 19 · TypeScript 5.9 · React Router 7 · Tailwind v4 · shadcn/ui · Convex + Convex Auth · Bun · PWA (service worker يدوي) |
| Routes | `/` (Landing) · `/auth` · `/dashboard` · `/onboarding?edit=1` · `*` (NotFound) — كلها lazy مع `RouteLoading` skeleton |
| شاشات داخل Dashboard | 15 `DashView`: today · prayers · adhkar · hadith · duas · tasbih · quran · poetry · prophets · saved · occasions · stats · weekly · review · settings |
| Backend | `planner.ts` (17 function) + `weeklyPlans.ts` (11 function) + `users.ts` + `auth.ts` |
| الجداول | users · profiles · prayerLogs · adhkarLogs · favorites · dayReviews · planItemLogs · weeklyPlans · weeklyReviews · adaptiveApprovals |
| طبقة منطق خالصة | 9 ملفات في `src/lib` بلا React وبلا Convex، مغطاة بـ116 اختبارًا |
| Design System | 5 tokens سطح + tokens دلالية + 4 درجات طباعة + motion tokens + `touch-target` + `:focus-visible` موحّد + 20 primitive في `Surfaces.tsx` |
| بوابات آلية | test **149** · tsc PASS · lint 0 errors / 24 warnings · build PASS (entry 351.68 kB) · convex PASS · glyphs clean |

---

## 2) ما الذي تعنيه Phase 2 هنا

Phase 2 **ليست** تجميلًا. هي تحويل product architecture الحالي إلى تجربة موحدة:

1. **DESIGN SYSTEM** — لغة بصرية واحدة عبر 15 شاشة، لا 15 لهجات.
2. **UX ARCHITECTURE** — لكل feature مكان واضح ومسار وصول معلوم.
3. **FEATURE INTEGRATION** — لا feature معزول؛ كل شيء في الحلقة.
4. **RESPONSIVE** — الموبايل تصميم أول، وليس Desktop مصغّرًا.
5. **ACCESSIBILITY** — semantic + focus + touch + reduced motion.
6. **PERFORMANCE** — chunk، استعلامات، rerender.
7. **PWA POLISH** — install، offline، update، standalone.

---

## 3) Phase 2 work ALREADY DONE (لا يُعاد)

هذا العمل موجود في الكود ومغطى بـ`tsc` و`build` و`bun run check:glyphs` — **لكن لم يُختبر بصريًا بعد**.

### 3.1 نظام التصميم
- `src/index.css`: tokens السطح (`primary` `secondary` `sunken` `quiet` `editorial`)، tokens دلالية (`success` `attention` `missed`)، سلّم طباعة 4 درجات، **حد أدنى 11px** (كان 9–10)، motion 180–300ms ملغاة كليًا تحت `prefers-reduced-motion`، `touch-target` 44px، focus ring واحدة.
- `src/components/app/Surfaces.tsx`: 20 primitive (Panel · Sunken · SectionHead · Meter · StatusDot · PrimaryButton · QuietButton · Skeleton · EmptyState · OfflineNote …).
- glassmorphism مقيَّد: يظهر حيث تحتاجه الكتابة فوق الخلفية، لا كزينة.

### 3.2 هيكل المعلومات والتنقل
- شريط سفلي 5 وجهات (اليوم · الصلاة · القرآن · الأذكار · المزيد) + 4 مجموعات في «المزيد» (عبادتي · المعرفة · متابعتي · التطبيق) بدل 11 بطاقة متساوية.
- تنقّل أفقي على سطح المكتب، بلا rails مفروضة.
- 4 وجهات جديدة لمنتج موجود بلا عنوان: `adhkar` · `weekly` · `stats` · `review`.

### 3.3 إعادة بناء الشاشات
| الشاشة | الحالة | ملاحظة |
|---|---|---|
| الرئيسية | ✅ مُعاد بناؤها | هيراركي: ترويسة → بطل الصلاة القادمة → خط زمني مرتبط بالصلاة → تركيزك اليوم → وصفتا القرآن/الأذكار → مراجعة اليوم → الأسبوع |
| الصلاة | ✅ | إيقاع خمس صلوات + إحصاء أساسي لا 12 بطاقة |
| القرآن | ✅ | سطح ورقي دافئ، آيات متصلة لا بطاقة لكل آية |
| الأذكار | ✅ | طقس: النص هو البطل، والتكرار والتقدم، والمصدر ثانوي |
| الأحاديث / الأدعية | ✅ | تجربة تحريرية |
| المسبحة | ✅ | عدّاد مسيطر بملء الشاشة |
| الأبيات / الأنبياء / المناسبات | ✅ | تحريرية |
| المحفوظات | ✅ | مكتبة موحّدة بأنواع وفلاتر |
| الخطة الأسبوعية | ✅ | تحريرية، 7 أيام، تعديل في المكان |
| المراجعة اليومية | ✅ | خطوات قصيرة: سؤال ← إجابة ← تأمل |
| الإعدادات | ✅ | مجموعات: الحساب/الصلاة/الأذكار/القرآن/المناسبات/التطبيق/البيانات |
| Onboarding | ✅ | choice tiles + سياق + تقدم هادئ |

### 3.4 الحالات
`Skeleton` (route + section) · `EmptyState` · `ErrorState` · `OfflineNote` · `RootErrorBoundary` و`ToolbarErrorBoundary` في `main.tsx` · `SectionLoading` بـ`aria-busy` · `ViewBoundary` حاجز خطأ لكل شاشة (أُضيف في الجولة الأخيرة — `main.tsx` حول `Dashboard` و`Onboarding`، وداخل `Dashboard` حول المحتوى).

### 3.5 إصلاحات حقيقية نتجت عن هذا العمل
- `groupByPrayerAnchor` كان يُسقط عنصرين من عشرة من الخط الزمني (`anchored.pop()`) — أُصلح واختبار انحدار.
- 5 أسطر تالفة أُصلحت + `bun run check:glyphs`.

---

## 4) ما ينقص فعلًا (العمل الحقيقي المتبقي)

مرتّب بالأولوية. **لا شيء هنا يبدأ قبل اعتماد (3).**

> **تحديث 2026-09-25 — كل بنود P0 وP1 وP2 في هذا القسم نُفِّذت في الكود ومتحقَّقة آليًا.**
> التفاصيل الكاملة والأرقام في `PHASE_2_FINAL_REPORT.md`. البنود الموسومة `DONE` تعني: **متحقَّق آليًا** لا **متحقَّق بصريًا**. ما تبقّى هو بوابة المتصفح في §9 وحدها.

### P0 — حالات الخطأ والفراغ (من Phase 2N) — ✅ DONE
`ErrorState` كان مكتوبًا في `Surfaces.tsx` بلا أي استخدام. المطلوب كان:
- كل query في `Dashboard` يفصل: loading (`Skeleton`) · error (`ErrorState` + إعادة محاولة) · empty (`EmptyState` + action) · loaded.
- قائمة الاستعلامات: `getProfile` · `getDayState` · `getWeeklyPlan` (×2) · `getPlanItemLogs` · `getPlanProgress` · `getWeeklyReview` · `getAdaptiveSuggestions` · `getHistory` · `getStats` · `getFavorites` · `ensureWeeklyPlan`.
- الأخطاء كانت **تظهر كـ toast** وتختفي؛ فصار لها **حالة دائمة على الشاشة** مع زر «أعد المحاولة» (`ViewBoundary`).
- **Acceptance:** لا شاشة تبقى فارغة أو بيضاء بسبب خطأ شبكة؛ كل خطأ له نص عربي + زر «أعد المحاولة».

### P0 — حالات الخطأ أولًا — ✅ DONE
نُفِّذ قبل أي شيء آخر، ولا شيء بُني فوق شاشة لا تُعرف حالتها. النتيجة: `ViewBoundary` على مستويين، وتمييز `loading` عن `empty` في الإحصاءات والخطة الأسبوعية، و`ErrorState` + «إعادة المحاولة» بدل toast يختفي.

### P1 — PWA polish — ✅ DONE (مع استثناء واحد معلن)
| البند | قبل | بعد |
|---|---|---|
| manifest | موجود | **DONE** — أيقونات PNG مضافة وبناؤها متحقَّق منه · **فحص Lighthouse يبقى متبقيًا** |
| أيقونات | SVG فقط، وPNG 192/512 مفقودة (شرط install على Android) | **DONE** — `icon-192` · `icon-512` · `icon-maskable-512` · `apple-touch-icon` مولَّدة برمجيًا ومتحقَّق من أبعادها وتوقيعها |
| standalone | `isStandalone()` موجود، غير مُختبر | **DONE في الكود** · **غير مُختبر** |
| update flow | `SKIP_WAITING` تلقائي، بلا إشعار | **DONE** — `skipWaiting` حُذف، وأُضيفت لافتة «يتوفّر تحديث للتطبيق» مع زر «تحديث الآن» |
| iOS safe areas | `viewport-fit=cover` موجود | **DONE في الكود** (`pb` يأخذ `env(safe-area-inset-bottom)`) · **لم يُختبر على iPhone** |
| offline | يعمل للمصحف | **بلا تغيير عمدًا** — لا طابور للـmutations (حدّ معروف وموثّق) |
- `storageEstimate` و`formatBytes` و`clearOfflineCaches` — **DONE**: مربوطة في مجموعة «البيانات» مع `clearLocalData`.

### P1 — RTL الحقيقي (لا `dir="rtl"` فقط) — ✅ DONE في الكود · التحقق البصري متبقٍ
نُفِّذت مراجعة `inset-inline` و`me-` و`ms-` بدل `left/right` في كل الملفات. ما يلي يبقى **بصريًا**:
- **الأسهم الاتجاهية:** `ChevronLeft` في RTL لازم يقلب اتجاهه. يحتاج بصريًا.
- **الأرقام:** `٠١٢٣` في النصوص، و`١٢:٣٠` في الوقت — تحقّق من عدم اختلاطها.
- **mix Arabic/English:** نصوص مصادر الأحاديث، أسماء السور، روابط.
- **النماذج:** `input-otp` في `/auth` يجب أن يقبل المدخل العربي ويتقدّم بشكل صحيح.
- **قوائم من اليسار:** `toast` (sonner) و`AlertDialog` و`Sheet` — Radix افتراضي LTR.
- **Acceptance:** لا عنصر يعتمد على `left/right`؛ كل سهم اتجاهي صحيح؛ لا نص يخرج عن حافته.

### P1 — Responsive: ما لم يُختبر — ⚠️ كود مصلَح · القياس متبقٍ
| المقاس | ما يجب فحصه |
|---|---|
| 360px | أضيق حالة — `Dashboard` top bar + شريط سفلي + sheet «المزيد» + `AlertDialog` |
| 390px / 412px | السلوك الأساسي |
| 768px | Tablet: سلوك 2-col |
| 1024px+ | سطح المكتب: `max-w-5xl` هل يستغل 12-col؟ |
- **horizontal overflow** على كل شاشة (بما فيها Quran Reader وTasbih).
- **bottom nav** يغطي آخر عنصر؟ `pb-28` كافٍ مع `safe-area-inset-bottom`؟
- **sticky** في QuranView وQuran toolbar: هل يختفي خلف لوحة المفاتيح؟
- **dialogs** على 360px: `max-w-sm` هل يخرج؟

### P1 — Accessibility — ✅ DONE في الكود · القياس البصري متبقٍ
- **RTL لا يكفي:** `aria-label` بالعربية، `dir` على الجداول، `aria-live` على التغيّرات.
- **focus trap** في Dialogs (Radix يفعلها) — تحقّق بصري.
- **focus ring** مفقودة على بعض الأزرار المخصّصة.
- **44×44:** كل زر أصغر يحتاج `touch-target`.
- **contrast:** `text-muted-foreground` على `surface-secondary` — يُقاس.
- **reduced motion:** motion tokens تلغى، لكن `animate-pulse` في `RouteLoading` و`motion-swap` تحتاج تحقّق.
- **screen reader:** `NextPrayerHero` ينبض كل 30s — هل يُعلن؟ يحتاج `aria-live="off"`.

### P2 — Performance — ✅ DONE (قياس ثم إجراء واحد مُبرَّر)
| البند | الوضع | الإجراء |
|---|---|---|
| `convex-vendor` chunk فارغ (1 byte) | **harmless build artifact** — `convex` ينتهي في الـindex chunk | **بلا إصلاح.** توثيق فقط. سطر واحد في `vite.config.ts` لو أُراد |
| `index-*.js` 482.68 kB (gzip 150.45) | كبير | **DONE** — فصل `VlyToolbar` كسولًا ينقل `framer-motion` و`snapdom` خارج المسار الحرج: صار **351.68 kB / gzip 107.89**. لم تُضَف manual chunks جديدة |
| lazy views | ✅ 10 views lazy | — |
| rerender | `Dashboard`.useMemo على 12 قيمة | `times.timings` يتغير كل تنزيل؟ يحتاج قياس |
| queries | ✅ مقيّدة | `getStats` 30 يوم — 3 نطاقات مفهرسة |
| `useNow(30_000)` | يعيد render كل 30s | مقبول، لكن `NextPrayerHero` و`DayTimeline` فقط |
| PWA cache | `sw.js` يدوي | يحتاج مراجعة TTL |

**قاعدة:** لا تحسين بلا قياس. **لا يوجد متصفح في هذه البيئة** — أي رقم أداء يُقاس لاحقًا في QA.

### P2 — إظهار ما يُحسب ولا يُعرض — ✅ DONE (قرار لكل عنصر)
بيانات Phase 1 صحيحة لكن بلا سطح:
- `progress.achievements` (3) · `longestStreak` · `totalCompleted` · `weekly.activeDays` · `weekly.postponed` · `weekly.averageScore`.
- `weeklyReview.successfulPeriods` / `difficultPeriods` / `mostConsistentHabit` / `mostPostponed` — محسوبة ومخزَّنة، معروضة جزئيًا فقط.
- `adaptiveSuggestions.protect` — لا يظهر (يُرشَّح `move|reduce` فقط).
- **القرار المتَّخذ:** عُرض كل ما له معنى للمستخدم (`activeDays` · `postponed` · `averageScore` + `changeFromPrevious` · `longestStreak` · `mostConsistentHabit` · `mostPostponed` · `successfulPeriods` · `difficultPeriods`) · حُذفت `achievements` تمامًا مع حارس اختبار يمنع عودتها · وبقي `adaptiveSuggestions.protect` نصًّا لا زرًّا لأن `changed: false` دائمًا · وبقي `totalCompleted` في النوع بلا عرض.

### P2 — تنظيف الملفات الميتة — ✅ DONE
`LogoDropdown.tsx` · `QuoteMarquee.tsx` · `GlassPill` · `SectionTitle` · `ACCOUNT_ACTIONS` · `isSameDay` · `modelForAnswers` · `usePageVisible` · `saveOfflineFavorites` · `readOfflineFavorites` · `FOCUS_LABELS` · `DISTRACTION_LABELS` · `DISCIPLINE_LABELS` · إضافة إلى `onServiceWorkerMessage` و`coordsLabel` و`daysToRamadan` و`Subpanel` و`QuietPanel` و`Rule` و`DisplayTitle` و`SkeletonLines` و`FAVORITES_KEY`.
→ حُذفت جميعها، وكلها **بعد** التحقّق برمجيًا من أن مرجعها صفر خارج ملف التصريح وصفر استيراد.

---

## 5) Dependencies

```
Phase 2A (Design System)   ██████████ DONE
Phase 2B (IA + Navigation) ██████████ DONE
Phase 2C (Home)            ██████████ DONE
Phase 2D (Per-screen UX)   ██████████ DONE
Phase 2E (States)          ██████████ DONE  ← ViewBoundary + loading/empty/error لكل استعلام
Phase 2F (RTL)             ██████████ DONE  ← خصائص منطقية في كل الملفات + تصحيح سهم /auth
Phase 2G (Responsive)      ████████░░ 80%  ← pb آمن مع safe-area · القياس على أجهزة متبقٍ
Phase 2H (A11y)            ██████████ DONE  ← aria-live + 44×44 + أسماء عربية
Phase 2I (PWA)             ██████████ DONE  ← أيقونات PNG + تدفّق تحديث + بيانات الجهاز
Phase 2J (Perf)            ██████████ DONE  ← قياس ثم إجراء واحد مُبرَّر (فصل شريط المعاينة)
Phase 2K (Parity sweep)    ██████████ DONE (PHASE_2_FEATURE_PARITY_AUDIT.md: 38/38)
```

**لماذا يبقى المتبقّي خلف بوابة المتصفح:** كل بند منها ليس كلُّه بصريًا. الكود يجهّز البنية الصحيحة (tokens · primitives · semantics · `aria` · `inset-inline` · safe-area)، و**الحكم النهائي يحتاج جهازًا**: «يتمدد بشكل صحيح عند 360px» و«التطبيق يُثبَّت على Android» و«الشريط لا يغطي آخر عنصر» لا تُثبَت بقراءة كود. **الحالة هنا `DONE` تعني: البنية جاهزة ومتحقَّقة آليًا — لا أن النتيجة البصرية مثبتة.**

---

## 6) Feature parity

`PHASE_2_FEATURE_PARITY_AUDIT.md` يسجّل **38/38** feature محفوظة. القاعدة الملزمة:

> أي عمل في Phase 2 يتناقض مع 38 feature = عمل مرفوض.

---

## 7) Religious content integrity — قاعدة غير قابلة للتفاوض

- **لا توليد ولا اختلاق** لأي نص: قرآن · حديث · ذكر · فقه · تفسير.
- كل نص منسوب لمصدر يجب أن يكون قابلًا للتتبع إلى **ملف** في `src/data/` + **مصدر مذكور** على عنصره.
- **بلا استثناء** في أي feature جديدة: «بطاقة حصن» أو «دعاء مولّد» أو «آية مناسبة لـ...» = مرفوض.
- المحتوى الحالي: `quran.ts` (AlQuran.cloud + نسخة محلية `quran-offline.ts`)، `hadith.ts` مع الراوي والمصدر، `adhkar.ts` مع المصدر، `duas.ts`، `poetry.ts`، `prophets.ts` — كلها ملفات ثابتة مع مصادر.
- **مراجعة مطلوبة قبل الإغلاق:** هل كل عنصر في `adhkar.ts` و`duas.ts` و`hadith.ts` يحمل مصدره؟ (تحقق آلي: كل سجل فيه `source` غير فارغ).

---

## 8) Privacy & security

- `deleteMyData` متاحة من الإعدادات الآن (Confirm dialog + حذف خادم + جهاز + خروج).
- كل query/mutation مربوطة بـ Convex Auth user ID.
- لا secrets في Git. `.env.local` / `.env.keys` غير مُلمسين.
- **✅ DONE:** `src/lib/local-data.ts` فيه سجل صريح (١٨ مفتاحًا مملوكًا + بادئة `sakinah:fired:` + نمط محميّ `__convexAuth` / `__vly`)، ودالة `clearLocalData()` تُستدعى عند sign-out وعند delete-data، ومختبَرة في `tests/local-data.test.ts` (٧ اختبارات: الملكية، البادئات، الحماية، المسح، التكرار، وغياب رميه عند `QuotaExceededError`). المصحف المنزَّل (IndexedDB) ونصوص المواقيت المخزَّنة **لا تُمسّان عمدًا** — محتوى عام مشترَك.

---

## 9) Browser QA requirements (البوابة المغلقة)

يُنفَّذ على جهاز حقيقي. **لا يُغلق شيء قبله.**

### الجهاز
Chrome/Edge/Safari حديث · iPhone (390×844) و Android (360×800) · 1440×900 · reduced-motion مفعّل/مطفأ.

### المصفوفة
| # | الاختبار | النتيجة المطلوبة |
|---|---|---|
| 1 | First launch من الصفر | أول واجهة مفيدة < 2s · لا white screen |
| 2 | Chunk loading | لا chunk error عند التنقل |
| 3 | Onboarding كامل | تقديم/رجوع/تغيير/حفظ · إعادة فتح والنتيجة صحيحة |
| 4 | **تصفّح أسبوع آخر ثم العودة لليوم** | تسجيل حالة عنصر اليوم ينجح (G1) |
| 5 | Auth دخول/خروج/refresh | لا auth loop · لا فقدان حالة |
| 6 | تنقّل متكرر ×5 | لا white screen · لا فقدان بيانات |
| 7 | **مقارنة النتيجة** | نتيجة اليوم = نتيجة المراجعة الأسبوعية لنفس اليوم (G2) |
| 8 | **الفرق عن الأسبوع الماضي** | يظهر بعد بيانات كافية (G3) |
| 9 | **نقرتان على زر الحفظ** | يبقى محفوظًا (G4) |
| 10 | زر حذف البيانات | يحذف ويخرج (G6) |
| 11 | 360 / 390 / 412 | لا horizontal overflow |
| 12 | 768 / 1024 / 1440 | لا كسر · استغلال معقول |
| 13 | RTL | اتجاه · أسهم · محاذاة · قوائم |
| 14 | Keyboard | إدخال · تنقّل · الزر ظاهر · لا يغطيه |
| 15 | Safe areas | أعلى/أسفل · notch · bottom nav |
| 16 | PWA install + standalone + offline | يثبّت ويعمل دون إنترنت |
| 17 | Update flow | `SKIP_WAITING` لا يكسر الجلسة |
| 18 | Console + Network | **صفر** خطأ مستخدم-واجه |
| 19 | خطأ شبكة مقصود | `ErrorState` + retry · لا شاشة بيضاء |
| 20 | Stale `convex-vendor` | بلا أثر |

### الأدلة المطلوبة
لكل اختبار: `Action → Expected → Actual → PASS/FAIL` في `PHASE_2_BROWSER_QA.md`.
**«لم أختبر» = NOT VERIFIED. ليس PASS.**

---

## 10) Definition of Done

- [x] 38/38 feature تعمل ومحدَّدة مكانها الجديد
- [x] كل query له loading + empty + error + offline · **صفر** شاشة بيضاء (آليًا)
- [x] RTL صحيح في الكود على كل شاشة (لا `left/right` حسب الاتجاه)
- [ ] لا horizontal overflow على 360 / 390 / 412 — **يحتاج قياسًا على جهاز**
- [ ] Keyboard كامل + focus ظاهر + 44×44 + reduced motion — **البنية جاهزة، القياس متبقٍ**
- [ ] المصحف يعمل دون إنترنت · التطبيق يُثبَّت على Android — **الأيقونات جاهزة، التثبيت لم يُختبر**
- [x] `localStorage` يُمسح عند sign-out وdelete
- [x] `bun test` 149 PASS · `tsc -b --noEmit` PASS · `lint` 0 errors · `build` PASS · `convex dev --once` PASS · `check:glyphs` نظيف
- [ ] **Browser QA: 20/20 PASS موثّقة** — **صفر اختبار مُنفَّذ**
- [ ] `PHASE_2_BROWSER_QA.md` مملوء بأدلة فعلية
- [ ] Phase 0 وPhase 1 يُغلقان ببوابة المتصفح

**الحالة الآن: `PHASE 2 = IMPLEMENTED — AUTOMATION VERIFIED — BROWSER QA PENDING`.**
**ليست جاهزة للإطلاق.** البنود المعلَّمة أعلاه تعني «متحقَّق آليًا»؛ والبنود غير المعلَّمة تحتاج جهازًا حقيقيًا.

---

## 11) Explicitly out of scope

شبكة اجتماعية · إعلانات · اشتراكات · AI chatbot · AI recommendation engine · نظام تحقق بالكاميرا · منصّة رياضية · لغة إنجليزية · توسيع القرآن · أي feature لا يخدم الحلقة:

> اهتمام → فهم → خطة → تذكير → تنفيذ → محاسبة → تعلّم → تكيّف
