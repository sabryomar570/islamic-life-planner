# PHASE 2 — DESIGN SYSTEM IMPLEMENTATION & FEATURE PARITY AUDIT

> **الحالة:** التنفيذ مكتمل على مستوى الكود. التحقق البصري (Browser/Device) **لم يُنفَّذ** — لا تتوفر أداة متصفح في هذه البيئة، ولم يُدَّعَ أنه تم.
> **الهدف:** تنفيذ نظام التصميم الموجود على المشروع بالكامل، ثم إثبات أن أي Feature سابقة لم تُفقد.

---

## 1) ما الذي تغيّر — منطقيًا لا تجميليًا

المشكلة التي عولجت لم تكن ألوانًا بل **بنية المعلومة**: الواجهة كانت عمود بطاقات متساوية، لا شيء فيها يتفوّق على غيره. لذلك كان التنفيذ إعادة ترتيب للأدوار، لا تغيير مظهر.

| قبل | بعد |
|---|---|
| `LifeSystemPanel` (لوح ضخم) أول عنصر في الرئيسية | **Next Prayer Hero** هو البطل: الاسم، الوقت، العدّاد، شريط التقدّم، وحالة اليوم |
| خطة اليوم = 6 أقسام في لوح قابل للطيّ | **خطّ زمني مُرسي بالصلاة**: كل خطوة تحت نافذة صلاة حقيقية، وما بلا وقت تحت «متى شئت» |
| 11 قسمًا في شبكة بطاقات متساوية داخل «المزيد» | **4 مجموعات ذات معنى**: عبادتي / المعرفة / متابعتي / التطبيق |
| الأذكار تُفتح كـ Dialog بلا فهرس | **فهرس أذكار** كمقصد مستقل، والنافذة القائمة للورد نفسه |
| الخطة الأسبوعية مطوية داخل الرئيسية | **شاشة خطة أسبوعية** مستقلة قابلة للتحرير |
| مراجعة اليوم = 7 حقول متتابعة | **طقس من 4 خطوات**: سؤال واحد ← اختيار ← تأمّل ← إنهاء |
| كل آية في بطاقة بيضاء | نص متصل على **ورق تحريري دافئ** بعلامات آية |
| الإعدادات: كل إعداد داخل صندوق | **مجموعات**: سطور مفصولة بشعرة داخل لوح واحد |

---

## 2) نظام التصميم — ما أُضيف فعلًا

### 2.1 Tokens (في `src/index.css`، داخل `:root`)

- **السطح:** `surface-primary / secondary / sunken / quiet / veil` — خمس درجات فقط، تُختار بالرتبة.
- **الحواف:** `hairline / hairline-soft / rule`.
- **الحالات:** `success / attention / missed / neutral / idle` — تُستخدم في **نقاط وشرائط**، لا في تلوين الشاشة.
- **السطح التحريري:** `editorial-wash` + `editorial-ink` — ورق كريمي للقرآن والشعر، بعيد عن الزجاج الأزرق.
- **الحركة:** `motion-fast 180ms / base 240ms / slow 300ms` + `ease-calm`.
- **المسافة:** `--page-pad` (16px → 24px من `sm`).

### 2.2 Primitive classes

`surface-*` · `rule-t / rule-b` · `label-display / label-section / label-body / label-meta` · `eyebrow` · `motion-press / motion-swap` · `touch-target` · `skeleton` · `timeline-spine / timeline-node` · `meter` · `status-dot` · `page / stack / stack-sm`.

### 2.3 Primitive components (`src/components/app/Surfaces.tsx`)

`Panel` · `Subpanel` · `Sunken` · `QuietPanel` · `Editorial` · `Rule` · `Eyebrow` · `DisplayTitle` · `SectionHead` · `ChoiceChip` · `QuietButton` · `PrimaryButton` · `Meter` · `StatusDot` · `Tag` · `EmptyState` · `ErrorState` · `Skeleton` · `SkeletonLines` · `OfflineNote`.

### 2.4 إمكانية الوصول والحركة

- `touch-target` = **44×44** على كل عنصر تفاعلي أساسي.
- حلقة تركيز واحدة على `a / button / [role=button] / input / select / textarea / [tabindex]` عبر `:focus-visible`.
- `prefers-reduced-motion` يلغي: `stage-enter`، `skeleton`، `motion-swap`، `motion-press`، `glass-hover`، `btn-edge`، `btn-primary-edge`، وانتقال `meter`.
- الحد الأدنى للبيانات المتناهية الصغر **11px** (كان 9–10px) — مُطبَّق على كل شاشات التطبيق.

---

## 3) FEATURE PARITY AUDIT

`Available` = ما زال يعمل. `Location` = موقعه الأساسي. `M/D` = موبايل/سطح مكتب.

| # | Feature (قبل Phase 2) | Available | Location | M | D | Verified |
|---|---|---|---|---|---|---|
| 1 | الرئيسية / اليوم | ✅ | `today` | ✅ | ✅ | tsc+test+build |
| 2 | مواقيت الصلاة | ✅ | `prayers` | ✅ | ✅ | tsc+test+build |
| 3 | تسجيل حالة الصلاة (جماعة/وقت/متأخرة/فائتة) | ✅ | `prayers` + Hero | ✅ | ✅ | test (`prayerState`) |
| 4 | إحصاءات الصلاة | ✅ | `stats` + داخل `prayers` | ✅ | ✅ | tsc+test+build |
| 5 | **الأذكار** | ✅ | `adhkar` (جديد) + Dialog | ✅ | ✅ | tsc+test+build |
| 6 | **فهرس الأذكار** (مضاف كواجهة) | ✅ | `adhkar` | ✅ | ✅ | tsc+test+build |
| 7 | **الخطة الأسبوعية** (مضافة كشاشة) | ✅ | `weekly` (جديد) | ✅ | ✅ | tsc+test+build |
| 8 | **الإحصاءات** كمقصد مستقل | ✅ | `stats` (جديد) | ✅ | ✅ | tsc+test+build |
| 9 | **مراجعة اليوم** كمقصد مستقل | ✅ | `review` (جديد) | ✅ | ✅ | tsc+test+build |
| 10 | المصحف — القارئ | ✅ | `quran` | ✅ | ✅ | tsc+test+build |
| 11 | فهرس السور + بحث | ✅ | `quran` (Sheet) | ✅ | ✅ | tsc+test+build |
| 12 | حجم خط المصحف | ✅ | `quran` + `settings` | ✅ | ✅ | tsc+test+build |
| 13 | العلامة / آخر موضع / استكمال | ✅ | `quran` | ✅ | ✅ | tsc+test+build |
| 14 | نسخ / مشاركة الآية | ✅ | `quran` | ✅ | ✅ | tsc+test+build |
| 15 | نزّل المصحف كاملًا (Offline) | ✅ | `quran` + `settings` | ✅ | ✅ | tsc+test+build |
| 16 | النزول التلقائي + السرعة | ✅ | `quran` | ✅ | ✅ | tsc+test+build |
| 17 | المسبحة | ✅ | `tasbih` | ✅ | ✅ | tsc+test+build |
| 18 | الأدعية + بحث + أبواب + نسخ/مشاركة | ✅ | `duas` | ✅ | ✅ | tsc+test+build |
| 19 | دعاء اليوم + عشوائي | ✅ | `duas` | ✅ | ✅ | tsc+test+build |
| 20 | الأحاديث + أبواب + بحث + عشوائي | ✅ | `hadith` | ✅ | ✅ | tsc+test+build |
| 21 | الراوي / المصدر لكل حديث | ✅ | `hadith` | ✅ | ✅ | tsc+test+build |
| 22 | الأبيات + خلط + بيت اليوم | ✅ | `poetry` | ✅ | ✅ | tsc+test+build |
| 23 | قصص الأنبياء + نافذة قراءة + عبرة + مصدر | ✅ | `prophets` | ✅ | ✅ | tsc+test+build |
| 24 | المناسبات + رمضان + عدّاد | ✅ | `occasions` | ✅ | ✅ | tsc+test+build |
| 25 | المحفوظات الموحّدة + فلاتر | ✅ | `saved` | ✅ | ✅ | tsc+test+build |
| 26 | الحفظ الموحّد (5 أنواع) | ✅ | `use-favorites` | ✅ | ✅ | tsc+test+build |
| 27 | الإعدادات: الإشعارات/الموقع/القرآن/الخط/البيانات/الخروج | ✅ | `settings` | ✅ | ✅ | tsc+test+build |
| 28 | PWA / Service Worker / التثبيت | ✅ | `pwa.ts` + `settings` | ✅ | ✅ | tsc+build |
| 29 | العمل دون إنترنت | ✅ | `offline-store` | ✅ | ✅ | tsc+test+build |
| 30 | Onboarding (Progressive) | ✅ | `/onboarding` | ✅ | ✅ | tsc+test+build |
| 31 | Nudges (تنبيهات ذكية) | ✅ | `NudgeCenter` | ✅ | ✅ | tsc+test+build |
| 32 | نافذة الصلاة على النبي ﷺ | ✅ | `OpeningGreeting` | ✅ | ✅ | tsc+build |
| 33 | سؤال «هل صلّيت؟» بعد الدخول | ✅ | `Dashboard` | ✅ | ✅ | tsc+build |
| 34 | Convex: profile / dayState / stats / history | ✅ | `planner` | ✅ | ✅ | codegen+tsc |
| 35 | Convex: weeklyPlans (7 ops) | ✅ | `weeklyPlans` | ✅ | ✅ | codegen+tsc |
| 36 | Convex Auth (Email OTP) | ✅ | `auth.ts` | ✅ | ✅ | codegen+tsc |
| 37 | تصدير البيانات | ✅ | `settings` | ✅ | ✅ | tsc+build |
| 38 | Language: عربية RTL | ✅ | `index.html` + `dir` | ✅ | ✅ | tsc+build |

**النتيجة: 38 / 38 Features متاحة. لا feature ضائعة.**

### 3.1 ما لم يتغيّر (حماية)

- **Business logic:** لم يُعدَّل أي سطر في `src/lib/*` — المحاسبة، التكيّف، الخطة، التقدير، المراجعة.
- **Backend:** لم يُعدَّل أي سطر في `src/convex/*`. اعتُمد على `updateWeeklyPlanItem` الموجود أصلًا.
- **Data:** لم تُمس أي ملف في `src/data/*`.
- **Storage keys:** لم تُغيَّر (`sakinah:*`, `oud:*`) — لا يفقد المستخدم أي موضع قراءة أو علامة.

---

## 4) Regression والإصلاح

### 4.1 Bug اكتُشف بالاختبار وأُصلح

```
Bug:           خطوات الخطة الأسبوعية تختفي من الخط الزمني
Reproduction:  HomeView ← DayTimeline مع خطة فيها عناصر بعد منتصف الليل
Expected:      كل خطوة مفعّلة تظهر مرة واحدة
Actual:        8 خطوات من أصل 10
Root Cause:    منطق تجميع النوافذ كان يستخدم anchored.pop()
               فيحذف آخر مجموعة كليًا قبل ترشيح عناصر الليل منها
Minimal Fix:   استُبدل بتوزيع مباشر: كل عنصر يذهب لمجموعة واحدة
               محسوبة من آخر صلاة دخل وقتها قبله
Verification:  tests/phase2.test.ts — "لا يُفقد أي عنصر مفعّل في يوم واحد" PASS
```

### 4.2 Gates

| Gate | Result | Evidence |
|---|---|---|
| `bun test` | **PASS 116/116** | 15 files, 379 expectations, 0 fail |
| `bun tsc -b --noEmit` | **PASS** | 0 errors |
| `bun run lint` | **PASS** | 0 errors, 30 warnings (Fast-refresh — pre-existing pattern) |
| `bun run build` | **PASS** | 2474 modules, 10 chunks lazy |
| `bun convex dev --once` | **PASS** | 16 functions ready |
| Browser/Device QA | **NOT VERIFIED** | لا أداة متصفح في البيئة — لم يُدَّعَ أنه تم |
| RTL / 360–412px / keyboard / safe areas | **NOT VERIFIED** | تحتاج متصفحًا حقيقيًا — لم تُشغَّل |
| PWA install behavior | **NOT VERIFIED** | تحتاج متصفحًا حقيقيًا — لم تُشغَّل |

---

## 5) لم يُنفَّذ — بصراحة

1. **فحص بصري على مقاسات حقيقية** (360 / 390 / 412 / tablet / desktop) — لم يتم.
2. **RTL runtime** — لم يُشغَّل في متصفح؛ التزام RTL مدعوم بنيويًا (`dir="rtl"`، `inset-inline`، `me-`/`ms-`، `text-right`) لكنه غير مُتحقَّق منه بصريًا.
3. **اختبار لوحة المفاتيح** و**safe areas** — لم تُشغَّل.
4. **Network failures / offline behavior** — لم تُشغَّل في متصفح.

كل ما سبق **NOT VERIFIED**، ولا يُقرأ كنجاح.

---

## 6) نقاط تستحق انتباه المالك

1. **`LifeSystemPanel` حُذف** بعد تفكيك محتواه إلى: الخط الزمني (الرئيسية)، الاقتراح التكيّفي (الرئيسية)، مراجعة الأسبوع (الرئيسية + `weekly`). لم تُفقد أي وظيفة.
2. **`GlassCard` ما زال موجودًا** ويستخدمه `Landing` و`NotFound` فقط. ملفات التطبيق كلها تستخدم `Surfaces`.
3. **4 مقصدات جديدة** أُضيفت: `adhkar`، `weekly`، `stats`، `review`. كلها كانت موجودة كمحتوى؛ الآن لها عنوان مباشر.
4. **`.mushaf-*` و`.quran-text` و`.poetry-text`** بقيت كما هي لأنها نظام طباعة قائم، لا زجاج.
5. **`text-[10px]` و`text-[9px]`** ما زالت في `instrumentation.tsx` (أداة Vly) و`main.tsx` (stack trace عند crash) — سيقتان تقنيتان لا محتوى.
