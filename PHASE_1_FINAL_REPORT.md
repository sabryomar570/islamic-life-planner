# PHASE 1 FINAL REPORT — Personal Life System

**التاريخ:** 2026-09-25
**النطاق:** Phase 1 — Personal Life System
**Phase 0:** FROZEN. لم يُعد تنفيذ Phase 0 ولم يُعدّل `PHASE_0_FINAL_REPORT.md`.
**الحالة:** IMPLEMENTED + VERIFIED BY AUTOMATED TESTS · NOT VERIFIED IN BROWSER

---

## 1) حالة Phase 1 الفعلية بعد التدقيق

قبل هذا التقرير كان للحالة أربعة أوصاف ممكنة. النتيجة بعد قراءة `src/lib/*` و`src/convex/*` و`src/pages/*` و`tests/*`:

| البُعد | الحكم | الدليل |
|---|---|---|
| Personal Life Model | **A — مكتمل** | `life-model.ts` يبني النموذج من إجابات صريحة، و`profileProgress` يفصل الأساسي عن التحسين. مستخدم في التوليد وفي `Onboarding`. |
| Weekly Plan Engine | **A — مكتمل** | `generateWeeklyPlan` + `updateWeeklyPlanItems` (idempotent) + `expectedVersion` على الخادم. |
| Daily Plan + Prayer Anchoring | **A — مكتمل** | `buildDailyPlan` يستخدم مواقيت الصلاة الفعلية، و`DayTimeline` يعرضها. |
| Accountability + Daily Score | **B/C — كان ناقصًا** | `calculateDailyScore` كانت تعمل، لكن **الصلاة weren't تُقاس على الخادم**: `mergePrayerOutcomes` كانت تعمل في العميل فقط. أُصلح. |
| Streaks / Daily Score comparison | **B/C — كان ناقصًا** | `changeFromPrevious` و`previousAverage` كانتا تُحسبان دائمًا `null`. المنطق موجود والبيانات غائبة. أُصلح. |
| Daily Review | **A — مكتمل** | `daily-review.ts` + `saveDayReview` بعدّادات مشتقة من `planItemLogs`. |
| Weekly Review | **C — كان غير مربوط** | `buildWeeklyReview` تعمل على الخادم لكن بدون سجل الصلاة. أُصلح. |
| Adaptive Planning | **C/A — كان مبنيًا على بيانات ناقصة** | القواعد سليمة، لكن مدخلاتها كانت تستثني الصلوات. أُصلح + عرض سببه وأثره. |
| Notification Intelligence | **A — مكتمل** | `use-reminders.ts` يستدعي `prioritizeNotifications` فعليًا. |
| الخصوصية (حذف البيانات) | **B — كانت ناقصة** | `deleteMyData` كانت على الخادم بلا أي مدخل في الواجهة. أُصلح. |

**الخلاصة:** Phase 1 لم تكن ناقصة كمنتج، بل كانت **مكسورة الوصلة عند ثلاث نقاط**. الحلقة كانت تعمل، لكن ثلاث قطع منها كانت تتغذى من مصدر أضيق من المصدر الذي تعرضه الواجهة.

---

## 2) الفجوات الحقيقية التي أُصلحت في هذه الجولة

### G1 — تسريب أسبوع التصفّح إلى عمليات اليوم (Bug مستخدم)

**السبب الجذري:** `Dashboard` يحتفظ بـ `weekStart` قابلًا للتصفّح (لشاشة الخطة الأسبوعية)، واستُخدم نفس المتغيّر في:
- إنشاء أول خطة (`ensureWeeklyPlan`) بينما الاستعلام المراقب يقرأ `activeWeekStart`،
- `setPlanItemStatus`،
- `saveWeeklyReview`،
- `applyPlanSuggestion`.

**الأثر:** بعد التصفّح إلى أسبوع آخر في شاشة الخطة والعودة إلى «اليوم»، يفشل تسجيل حالة أي عنصر من عناصر اليوم على الخادم (`عنصر الخطة لا ينتمي لهذا اليوم`)، ولا تُنشأ خطة الأسبوع الحالي.

**الإصلاح:** الأسبوع لم يعد متغيّرًا واحدًا لسببين. أُضيف اشتقاق أسبوع العنصر من العنصر نفسه:

```ts
// src/lib/weekly-plan.ts
export function planItemWeekStart(itemId: string): string | undefined
```

`handleSetPlanOutcome` يمرّر `planItemWeekStart(itemId)`. لأن `id` العنصر يحمل تاريخه، يصبح إرسال أسبوع خاطئ مستحيلًا بنيويًا لا اتفاقًا. و`handleSaveWeeklyReview` / `handleApplySuggestion` صار لهما نسختان: واحدة لأسبوع اليوم (الرئيسية) وأخرى للأسبوع المعروض (شاشة الخطة).

### G2 — الصلاة لم تكن في مصدر الحقيقة على الخادم

**السبب الجذري:** `mergePrayerOutcomes` كانت helper في العميل فقط. `getPlanProgress` و`getAdaptiveSuggestions` و`saveWeeklyReview` كانت تشتق كل شيء من `planItemLogs`. فالنتيجة المعروضة في الرئيسية تشمل الصلوات، والمراجعة الأسبوعية والتكييف لا تشملها. **رقمان مختلفان لنفس اليوم.**

**الإصلاح:** رُقّي الدمج إلى دالة واحدة في الطبقة الخالصة واستُدعيت من الطرفين:

```ts
// src/lib/accountability.ts
export function mergePrayerLogsIntoOutcomes(input: {
  items: readonly Pick<WeeklyPlanItem, "id" | "date" | "kind" | "enabled" | "prayerAnchor">[];
  outcomes: readonly PlanItemOutcome[];
  prayerLogs: readonly PrayerOutcomeLog[];
}): PlanItemOutcome[]
```

قاعدة الدمج (مختبرة):
1. **سجل الصلاة يحكم حيث يوجد** — يروي جماعة/وقت/تأخر/فاتت، وهو أدق من تعليم عنصر الخطة.
2. **«مؤجّل» ينجو** — قرار خاص بالخطة لا تعبّر عنه سجل الصلاة.
3. **لا سجل = لا اختراع** — لا ناتج بلا سجل.
4. **آخر تصحيح يفوز** إن تغيّرت الحالة في اليوم نفسه.

`mergePrayerOutcomes` (الواجهة) صار غلافًا يستدعيها، ولا_fromطق مكرر.

### G3 — «مقارنة بالأسبوع الماضي» كانت كودًا ميتًا

**السبب الجذري:** `buildProgressSummary(records)` كانت تُستدعى بلا `previousDays`، و`calculateDailyScore` بلا `previousAverage`. فالنتيجة `comparison` دائمًا `"no-baseline"` و`changeFromPrevious` دائمًا `null` — منطق مكتوب ومختبَر لا يعرض شيئًا.

**الإصلاح:** `getPlanProgress` صار يُرجع `records` و`previous` معًا، ويحسب نتيجة كل يوم بـ `calculateDailyScore` نفسها (مغلقة، فالفائت يُحسب فائتًا). والمقارنة صارت على مستوى `Dashboard`:
- `previousAverage` ← متوسط نتائج الأسبوع السابق,
- `buildProgressSummary(records, previousRecords)`,
- `calculateDailyScore({ ..., previousAverage })`.

وفصل مصغّر داخل `HomeView` يعرض الفرق. **لا مقارنة بلا أساس:** إن لم تكن هناك خطة سابقة فالنتيجة `null` ولا يُقارن أحد بأحد.

ولإتاحة ذلك بلا تكرار، استُخرج من `daily-plan.ts`:

```ts
export function buildDayItems(items, date, timings?): DailyPlanItem[]
```

يستطيع الخادم أن يشتق عناصر اليوم فيصنّفها ويحتسبها **دون مواقيت الصلاة** (تُحسب على جهاز المستخدم)، والعميل يمرّرها فيرتب اليوم بالساعة. نفس الدالة، نفس الترتيب، نفس النتيجة.

### G4 — `toggleFavorite` غير idempotent (حفظ كاذب)

**السبب الجذري:** الـmutation كانت تبديلًا (toggle). نقرتان متلاحقتان على زر الحفظ تُرسلان طلبين، كلٌّ ينقلبه، فيعود العنصر إلى حالته الأولى بينما الواجهة تعرضه محفوظًا حتى يصل التحديث التفاعلي.

**الإصلاح:** استُبدل التبديل بنية صريحة:

```ts
export const setFavorite = mutation({
  args: { itemId, kind, title, saved: v.boolean() }, ...
})
```

- `saved: true` وهو موجود = لا تغيير. `saved: false` وهو غائب = لا تغيير.
- في الواجهة: النقر الثاني يُتجاهل ما دام الأول جاريًا (`pendingRef`)، ويُرسل قصدًا لا انعكاسًا.

### G5 — أسبوع اليوم: مصدران مختلفان للحساب

`weekStartForDate` في `planner.ts` كانت تكرّر حساب الاثنين بـ UTC. استُبدلت بدالة مشتركة:

```ts
// src/lib/time.ts
export function weekStartOfDateKey(date: string): string
```

الاختبار يتحقق أن `startOfWeekKey` (محلي) و`weekStartOfDateKey` (UTC) يتّفقان على نفس تاريخ التقويم — فلا يتغيّر الأسبوع عند سفر المستخدم بين مناطق زمنية.

### G6 — `deleteMyData` بلا مدخل (وعد خصوصية غير قابل للتنفيذ)

كانت mutation تحذف كل الجداول ومذكورة في التقارير، ولا يوجد في التطبيق أي زر يستدعيها. أُضيف في مجموعة «البيانات» في الإعدادات زر «حذف بياناتي» داخل `AlertDialog` يشرح ما سيُحذف، وعند التأكيد: حذف على الخادم + مسح النسخة المحلية + إعادة التفضيلات + خروج.

### G7 — بيانات لا أحد يقرأها + استعلامات أثقل من اللازم

- `getStats` و`getHistory` كانا يعملان في كل شاشة؛ صارا يعملان في الشاشات التي تقرأهما فقط (`today` / `prayers` / `stats`).
- `getDayState` كان يجلب **كل** المحفوظات بلا حد؛ صار `take(MAX_FAVORITES)`.

### G8 — نصوص تالفة

سطران فيهما محارف تالفة (محرفا هانغول داخل تعليق عربي في `planner.ts`، وكلمة ملتصقة في `adaptive-planning.ts`) + تعليق مشوّه في `schema.ts`. أُصلحت، و`bun run check:glyphs` يبقى حارسًا لها.

---

## 3) حالة الحلقة بعد الإصلاح

```
Profile ──► generateWeeklyPlan ──► getPlanItemLogs + prayerLogs
                                          │
                                   mergePrayerLogsIntoOutcomes  ◄── مصدر واحد
                                          │
              ┌───────────────────────────┼───────────────────────────┐
              ▼                           ▼                           ▼
       buildDayItems            calculateDailyScore          buildAdaptiveSuggestions
              │                           │                           │
       DayTimeline (اليوم)        getPlanProgress (score)      getAdaptiveSuggestions
              │                    + previous week baseline
              ▼
        planItemLogs ──► saveDayReview ──► dayReviews ──► getPlanProgress.reviewed
              │                                                    
              └────────────────► saveWeeklyReview ──► weeklyReviews
                                                        │
                                            WeeklyView + HomeView (بموافقة صريحة فقط)
```

كل خطوة تقرأ من `planItemLogs ∪ prayerLogs` عبر الدالة نفسها. لا يوجد مسار يقيس الصلاة وآخر لا يقيسها.

---

## 4) الاختبارات

```text
bun test                         129 pass / 0 fail / 428 expectations / 16 files
bun tsc -b --noEmit              PASS
bun run lint                     0 errors / 30 warnings
bun run build                    PASS
bun convex dev --once            PASS — Convex functions ready
bun run check:glyphs             نظيف
```

`(كان: 116 اختبارًا قبل هذه الجولة)`.

### `tests/phase1-closure.test.ts` — 13 اختبارًا جديدًا

| المجموعة | ما تحرسه |
|---|---|
| week arithmetic | الاثنين لكل يوم من أيام الأسبوع · تطابق المحلي مع UTC · اشتقاق أسبوع العنصر من مُعرّفه |
| prayer outcomes | السجل يحكم بلا كتابة في الخطة · السجل الأدق يعلو على التعليم الخام · «مؤجّل» ينجو · لا سجل = لا ناتج · آخر تصحيح يفوز · الغلاف يسلّم لنفس القاعدة |
| day scores | تطابق `buildDayItems` بلا مواقيت مع `buildDailyPlan` المرتّب · يوم بلا سجل = صفر لا غياب · الصلوات ترفع النتيجة · السلسلة والفرق عن الأسبوع الماضي |

### التغطية القائمة (بلا تغيير)
Progressive profiling · توليد الأسبوع والتعديل idempotent · ترتيب اليوم وanchors الصلاة · outcomes والتأجيل والتكرار والنتيجة · السلسلة والتقدم · تعلّم المراجعة اليومية · مراجعة الأسبوع وسلوك «لا بيانات» · قواعد التكييف move/reduce/protect/keep · تصنيف الإشعارات وكبحها · `dateKey` و`startOfWeekKey` · Phase 0 · توحّد Phase 2.

---

## 5) NOT VERIFIED IN BROWSER

لا توجد أداة Browser أو Chromium أو Playwright في هذه البيئة. **لم يُنفَّذ أي اختبار بصري، ولم يُدَّعَ أنه نُفِّذ.**

| البند | الحالة |
|---|---|
| First launch / white screen / chunk loading | NOT VERIFIED |
| Onboarding كامل (تقديم/رجوع/حفظ) | NOT VERIFIED |
| Auth / OTP | NOT VERIFIED |
| عرض «اليوم» بعد تصفّح أسبوع آخر (G1) | NOT VERIFIED — مُغطّى بمنطق، لا بجهاز |
| نتيجة اليوم vs نتيجة المراجعة الأسبوعية على شاشة حقيقية (G2) | NOT VERIFIED |
| الفرق عن الأسبوع الماضي معروضًا (G3) | NOT VERIFIED |
| نقرتان متلاحقتان على زر الحفظ (G4) | NOT VERIFIED — مُغطّى بالـmutation، لا بجهاز |
| حفظ الإعدادات وزر الحذف | NOT VERIFIED |
| RTL · 360/390/412 · keyboard · safe areas | NOT VERIFIED |
| PWA install / offline / update | NOT VERIFIED |
| Console / Network | NOT VERIFIED |
| قياس الأداء الفعلي | NOT VERIFIED |

---

## 6) KNOWN LIMITATIONS

1. **لا Push Server.** `Notification Intelligence` تحكم في جدولة العميل. الإشعار يعمل والتطبيق مفتوح فقط.
2. **لا طابور offline للـmutations.** يُحفظ ملف المستخدم وحالة اليوم محليًا؛ تسجيل حالة عنصر خطة أو مراجعة يحتاج اتصالًا واحدًا، والواجهة **تقرّ بذلك** ولا تدّعي حفظًا لم يحدث.
3. **`schemaValidation: false`** ما زال في `schema.ts`. الـmutations الجديدة لها validators يدوية، لكن تفعيل التحقق العام مؤجل حتى تكتمل أي migration.
4. **المواقيت من العميل.** `buildDayItems` على الخادم يعمل بلا مواقيت، فالترتيب بالساعة في `DayTimeline` يعرفها العميل فقط. النتيجة والـbreakdown متطابقان؛ الترتيب الزمني للعرض ليس مسؤولية الخادم.
5. **المنطقة الزمنية.** `weekStartOfDateKey` يحسب بالتقويم لا بالمنطقة، فلا يتغير الأسبوع بتغير الجهاز. لكن `dateKey()` في العميل ما زال محليًا: مستخدم سافر عبر المناطق قد يرى «أمس» ليومين. يحتاج Phase 2 قرارًا صريحًا (تثبيت منطقة في الملف أو عرض تاريخ الخادم).
6. **التكيفي يحتاج أدلة.** `move` يتطلّب تأجيلين في نافذة ونجاحًا ≥70% في أخرى، و`reduce` خمسة أيام على الأقل. بيانات أقل = `keep` صراحة. لا AI ولا ML ولا استنتاج بلا سجل.
7. **لا Convex integration tests** للصلاحيات (ownership) — مغطّاة بالاستعلامات المفهرسة والمراجعة اليدوية، لا باختبار آلي.
8. **achievements و`longestStreak` و`activeDays` تُحسب ولا تُعرض.** بيانات صحيحة بلا سطح؛ موعدها Phase 2 (§PHASE_2_MASTER_PLAN).
9. **`convex-vendor` chunk فارغ (1 بايت).** أثره: طلب HTTP إضافي وتحمذير build. سببه أن `convex` ينتهي داخل الـindex chunk فلا يبقى شيء للـmanual chunk. **بلا أثر وظيفي.** إصلاحه سطر واحد في `vite.config.ts`، ولم يُنفَّذ لأن تعديل إعدادات البناء خارج نطاق هذه الجولة.
10. **HMR** في `vite.config.ts` لم يُمَس (Phase 0 frozen).

---

## 7) ملفات ميتة أو معلّقة (سُجّلت ولم تُحذف)

| الملف/الرمز | الحالة | القرار |
|---|---|---|
| `src/components/LogoDropdown.tsx` | لا يُستورد من أي مكان | **مهمل** — يُحذف في جولة لاحقة أو يُعاد استخدامه؛ لم يُحذف هنا لتفادي لمس نطاق غير مطلوب |
| `src/components/app/QuoteMarquee.tsx` | لا يُستورد | مهمل — نفس الملاحظة |
| `Surfaces.tsx`: `Subpanel` `QuietPanel` `Rule` `DisplayTitle` `ErrorState` `SkeletonLines` | مصمَّمة ولم تُستخدم بعد | **مقصودة** — هي سطح Phase 2 (error/empty states) وسنستخدمها بدل أن نخترع أنماطًا |
| `GlassCard.tsx`: `GlassPill` `SectionTitle` | `GlassCard` مستخدم، الاثنان لا | مهملان |
| `Navigation.tsx`: `ACCOUNT_ACTIONS` | غير مستخدم | مهمل |
| `pwa.ts`: `storageEstimate` `formatBytes` `clearOfflineCaches` `onServiceWorkerMessage` | غير مستخدمة | جاهزة لـ Phase 2 (PWA polish) |
| `offline-store.ts`: `saveOfflineFavorites` `readOfflineFavorites` | غير مستخدمتين | مهملتان — الحفظ الموحّد يمر بالخادم |
| `time.ts`: `isSameDay` · `weekly-plan.ts`: `modelForAnswers` · `coach.ts`: 3 سجلات labels · `use-clock.ts`: `usePageVisible` | غير مستخدمة | دوال ثانوية — تُنظَّف في جولة مستقلة |
| `src/data/*`: dizaines الدوال المصدَّرة | واجهة عامة لمكتبة محتوى | **مقصودة** |

---

## 8) الخصوصية والأمان

- `deleteMyData` لم تعد معلّقة: مدخل في الإعدادات + `AlertDialog` + تنفيذ يمسح الخادم والجهاز.
- Convex Auth user ID أساس كل query/mutation؛ `getWeeklyPlan` و`getPlanItemLogs` و`getPlanProgress` و`getAdaptiveSuggestions` و`getWeeklyReview` ترجع `null`/`[]` لغير المسجَّل بدل التسريب.
- `applyPlanSuggestion` لا يثق بـpatch من العميل: يعيد اشتقاق الاقتراح على الخادم ويطابقه بـ`suggestionId` و`expectedVersion`.
- `setPlanItemStatus` يتحقق أن العنصر ينتمي لأسبوعه وتاريخه قبل الكتابة.
- `setFavorite` لا يكتب إلا داخل `by_user_and_item` لمستخدمه، وبحد `MAX_FAVORITES`.
- لا secrets في Git ولا في الكود. `.env.local` و`.env.keys` غير مُلمسين ولا يُقرآنان في أي مسار.
- لا نص ديني مولَّد. المحتوى كله ملفات ثابتة مع مصادرها.

---

## 9) بوابة Phase 1

| البوابة | النتيجة | الدليل |
|---|---|---|
| تدقيق الحالة | ✅ | هذا التقرير §1 |
| فجوات Phase 1 مُحدَّدة | ✅ | §2 (G1–G8) |
| الفجوات الحقيقية منفَّذة | ✅ | §2 + `git diff` غير متاح (انظر أدناه) |
| الحلقة مترابطة | ✅ | §3 |
| Business logic مغطى باختبارات | ✅ | 129 اختبارًا |
| TypeScript | ✅ PASS | `bun tsc -b --noEmit` |
| Lint | ✅ 0 errors | 30 warnings غير مانعة |
| Build | ✅ PASS | `bun run build` |
| Convex | ✅ PASS | `bun convex dev --once` |
| Browser QA | ❌ NOT VERIFIED | §5 |

**الحكم: PHASE 1 — IMPLEMENTED AND AUTOMATION-VERIFIED. BROWSER QA PENDING.**
لا يُغلق رسميًا قبل اجتياز بوابة المتصفح الحقيقية.

---

## 10) Git / VCS

`git` و`gh` محجوبان في هذه البيئة بأمر من Vly («Git and GitHub commands are blocked; Vly manages version control»). **لم يُنشئ هذا الـagent أي commit ولم يستطع.** لا يوجد SHA يذكر. إدارة نسخ هذا الفرع مسؤولية Freebuff/Vly.
