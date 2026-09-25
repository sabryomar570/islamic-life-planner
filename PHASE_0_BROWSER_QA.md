# PHASE 0 — Browser QA Guide

هذا الدليل تشغيلي فقط. لا счита أي اختبار لم يُنفذ داخل Browser حقيقي نجاحًا، ولا يغيّر حالة المشروع الرسمية:

**IMPLEMENTATION COMPLETE — VERIFICATION PENDING**

## Current execution record — 25 September 2026

### Browser availability

- **Browser حقيقي:** غير متاح في البيئة. `chromium` و`chromium-browser` و`google-chrome` و`google-chrome-stable` و`firefox` و`playwright` غير موجودة، ولا توجد أداة Browser/DevTools آلية متاحة في هذه الجلسة.
- **Preview process:** كان Vite يعمل فعليًا على المنفذ `5173`، وكانت عملية Convex dev تعمل. هذا يثبت توفر processes فقط، ولا يثبت أي Browser execution.
- **DevTools observation:** لم تُفتح DevTools Console/Network/Application لأن Browser غير متاح.
- **Static blocker:** **No static blocker identified.**
- **Browser QA status:** **BLOCKED / NOT VERIFIED**. لم يتم ادعاء PASS لأي Browser أو Device test.

### Actual Browser QA results for this run

| Test group | Status | Actual evidence |
|---|---|---|
| First Launch | BLOCKED | لا Browser متاح لفتح `/` أو قياس أول useful UI. |
| White Screen / Runtime Errors | BLOCKED / NOT VERIFIED | لا Browser أو Console/Network session. |
| Onboarding | BLOCKED / NOT VERIFIED | لم تُنفذ أي نقرات Onboarding. |
| Auth | BLOCKED / NOT VERIFIED | لم يُختبر دخول أو خروج أو Auth loop. |
| Email OTP | BLOCKED / NOT VERIFIED | لم يُختبر OTP؛ لا Browser/OTP session. |
| Convex connection from the app | NOT VERIFIED | Convex process was present, but no in-app request could be observed. |
| Dashboard | BLOCKED / NOT VERIFIED | لم تُفتح Dashboard في Browser. |
| Daily Plan | BLOCKED / NOT VERIFIED | لم يتم فحص Daily Plan بصريًا أو تفاعليًا. |
| Daily Review | BLOCKED / NOT VERIFIED | لم تُفتح أو تُحفظ أي مراجعة. |
| Navigation | BLOCKED / NOT VERIFIED | لم يُختبر التنقل المتكرر. |
| RTL | BLOCKED / NOT VERIFIED | لم تُختبر العربية/RTL في Browser. |
| Responsive 360px | BLOCKED / NOT VERIFIED | لا Browser/device viewport. |
| Responsive 390px | BLOCKED / NOT VERIFIED | لا Browser/device viewport. |
| Responsive 412px | BLOCKED / NOT VERIFIED | لا Browser/device viewport. |
| Keyboard / input | BLOCKED / NOT VERIFIED | لم تُختبر Keyboard أو input behavior. |
| Safe Areas | BLOCKED / NOT VERIFIED | لا جهاز/محاكي ذو safe areas حقيقي. |
| Refresh / persistence | BLOCKED / NOT VERIFIED | لم يُنفذ reload أو persistence check. |
| Console errors | BLOCKED / NOT VERIFIED | لا Console session. |
| Network failures | BLOCKED / NOT VERIFIED | لا Network session. |
| Loading / empty / error states | BLOCKED / NOT VERIFIED | لم تُفحص cases في Browser. |
| PWA behavior | BLOCKED / NOT VERIFIED | لم يُفحص Service Worker أو install/offline behavior. |
| Performance / chunk loading | BLOCKED / NOT VERIFIED | لا Browser performance/network measurements. |

**Bugs fixed in this run:** None. No product code, UX, schema, or database logic was changed.

**Automated checks recorded separately:** `bun test` PASS؛ `bun tsc -b --noEmit` PASS؛ `bun run lint` PASS مع 24 warnings؛ `bun run build` PASS مع ملاحظة `convex-vendor` chunk فارغ. هذه النتائج لا تحوّل Browser QA من BLOCKED إلى PASS.

**Official report:** `PHASE_0_FINAL_REPORT.md` لم يتغير، ولا تزال حالته `NOT VERIFIED`/`BLOCKED` كما هي.

---

## 0. قاعدة الاستخدام

- استخدم Preview/Convex test deployment، وليس بيانات production.
- استخدم Browser حقيقيًا على جهاز حقيقي أو محاكي جهاز موثوق، مع DevTools.
- لا تستخدم نتيجة `bun test` أو TypeScript أو Build كبديل عن Browser QA.
- سجّل وقت كل ظاهرةوخاصةً White Screen أو تأخر تحميل chunk.
- لا تغيّر كود التطبيق أثناء تنفيذ هذا الدليل. إذا ظهر Bug، سجّله وأوقفه عند حدود Bug policy.
- كل بند في هذا الدليل يبدأ بحالة `NOT RUN`. لا تحوّل الحالة إلى PASS إلا بعد تنفيذ Action وكتابة Actual.

---

## 1. Requirements وRunbook

### 1.1 Runtime requirements

| Requirement | Purpose | Required؟ |
|---|---|---|
| Bun | التثبيت والاختبارات والتشغيل | نعم |
| Vite dependency | تشغيل الواجهة | نعم، من `package.json` |
| Convex deployment | الـ backend والـ Auth | نعم، لـ Browser QA التفاعلي |
| Browser حقيقي | اختبار UX/Refresh/RTL/Keyboard/Safe Areas | نعم |
| DevTools Console + Network | رصد أخطاء React وConvex وchunks | نعم |
| اتصال بالإنترنت | Convex، الخطوط، مواقيت الصلاة، وخدمات القرآن الخارجية | نعم للاختبار الكامل |
| جهاز بخصائص safe areas | اختبار notch/gesture area | مطلوب لاختبار Safe Areas الحقيقي |

### 1.2 Environment variables

لا تضع أسرارًا في Git ولا تنسخها إلى التقرير. استخدم لوحة Keys/API keys في Freebuff أو بيئة العملية الآمنة.

| Variable | Where it is read | Requirement |
|---|---|---|
| `VITE_CONVEX_URL` | `src/main.tsx` / Vite client | **مطلوب**؛ يجب أن يكون رابط Convex deployment نفسه المستخدم للواجهة. |
| `CONVEX_SITE_URL` | `src/convex/auth.config.ts` / Convex deployment | **مطلوب** لـ Auth؛ يجب أن يطابق رابط deployment. |
| `FREEBUFF_OTP_KEY` | `src/convex/auth/emailOtp.ts` / Convex environment | مطلوب فقط لاختبار Email OTP؛ Anonymous login لا يكفي لإثبات OTP. |
| `VLY_APP_NAME` | `src/convex/auth/emailOtp.ts` | اختياري؛ يؤثر في نص البريد فقط. |
| `VLY_CONVEX_AUTH_ISSUER` | `src/convex/auth.config.ts` | اختياري؛ القيمة الافتراضية في المصدر هي `https://freebuff.com`. |
| `VLY_INTEGRATION_KEY` | Convex actions التي تستخدم VLY integrations | مطلوب فقط إذا تم استخدام تكامل VLY؛ ليس شرطًا لعرض التطبيق الأساسي. |
| `VLY_INTEGRATION_BASE_URL` | VLY integration helpers | اختياري، إلا إذا استخدمت البيئة gateway مخصصًا. |

> لا يوجد Blocker ثابت في الكود يثبت أن Preview مستحيل. لكن غياب `VITE_CONVEX_URL` أو deployment Access أو `FREEBUFF_OTP_KEY` يجعل اختبار الواجهة/OTP BLOCKED، ولا يُعامل كـ PASS.

### 1.3 Convex setup

في Freebuff، تُدار عملية Convex-development تلقائيًا. لا تبدأ أو توقف Managed Dev Server من داخل جلسة الاختبار.

لمن يعمل خارج Freebuff:

1. أنشئ deployment لـ Convex أو اربط المشروع بحساب Convex موثّق وفق تعليمات Convex CLI.
2. ضع `CONVEX_SITE_URL` و`FREEBUFF_OTP_KEY` في Convex environment حسب الحاجة.
3. شغّل Convex محليًا في terminal منفصل:

```bash
bunx convex dev
```

4. اترك Convex يعمل، ثم استخدم رابط deployment الذي يطبعه/يوفره.
5. ضع الرابط نفسه في `VITE_CONVEX_URL` لواجهة Vite.
6. إذا كانت ملفات Convex generated غير موجودة، دع Convex CLI ينفّذ codegen. لا تعدّل generated files يدويًا.

لا تستخدم production deployment لإدخال بريد حقيقي أو تعديل بيانات اختبار دائمة.

### 1.4 Vite development

من project root:

```bash
bun install
bun run dev
```

السلوك المتوقع:

- Vite يستمع على المنفذ `5173` وفق `vite.config.ts`.
- افتح `http://localhost:5173/` في Browser، أو استخدم Preview URL الذي توفره Freebuff.
- لا تعدّل `vite.config.ts` أثناء QA.
- لا تستخدم `curl` أو mock كبديل عن فتح الصفحة في Browser.

### 1.5 Production-like local Preview

بعد نجاح build، يمكن اختبار ملفات الإنتاج محليًا:

```bash
bun run build
bun run preview -- --host 0.0.0.0
```

- Vite preview غالبًا يستمع على المنفذ `4173` ما لم يُحدَّد غير ذلك.
- لا يعني نجاح `build` أن Browser QA اجتاز.
- لا توقف أو تعِد تشغيل Managed Freebuff servers.

### 1.6 PWA وService Worker

المصدر يحتوي على:

- `public/manifest.webmanifest` مع `lang: ar` و`dir: rtl` و`start_url: /dashboard`.
- `public/sw.js` مع app shell، runtime/API caches، وإشعارات.
- تسجيل Service Worker من `src/lib/pwa.ts` عند تحميل التطبيق.

للاختبار:

- افتح DevTools → Application.
- تحقق من تسجيل `/sw.js` ومن manifest.
- اختبر Install Prompt فقط إذا عرضه Browser؛ عدم ظهوره ليس دائمًا defect.
- لا تستخدم اختبار Offline بدل اختبار أول تحميل عبر Convex.
- Safe-area behavior يحتاج جهازًا/محاكيًا حقيقيًا؛ CSS أو الكود وحده لا يثبت ذلك.

---

## 2. Browser QA Session Setup

قبل أول اختبار:

- [ ] تم فتح Browser حقيقي، وليس محاكاة DOM فقط.
- [ ] تم فتح DevTools: Console + Network + Application.
- [ ] تم تسجيل Browser/OS/الجهاز وعرض النافذة.
- [ ] تم استخدام fresh browser profile أو test account معزول.
- [ ] تم تسجيل إن كان Clear Site Data سيُستخدم.
- [ ] تم التأكد من أن `VITE_CONVEX_URL` وConvex deployment متصلان.
- [ ] تم فتح Network مع Preserve Log قبل التنقل.
- [ ] تم تحديد وقت القياس قبل First Launch.
- [ ] لم يتم تعديل source أو UX أو schema أثناء الجلسة.

لتشغيل First Launch نظيفًا، استخدم Browser profile جديدًا أو امسح site data في browser test environment فقط. لا تمسح بيانات production.

---

## 3. QA Test Matrix

في كل اختبار املأ الحقول الأربعة التالية. `Actual` لا تتركه فارغًا.

### 3.1 First Launch / Useful UI

- **Action:** افتح `/` من Browser profile جديد، ثم سجّل لحظة فتح الصفحة، أول واجهة مفيدة، أول crash/white screen، وأي chunk request فاشل. افتح Console وNetwork أولًا.
- **Expected:** تظهر Landing أو Auth/Onboarding أو شاشة loading مرئية قابلة للفهم؛ لا توجد صفحة بيضاء صامتة، crash، أو loop لا ينتهي.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

### 3.2 Onboarding — forward/back/select/time/complete/persist

- **Action:** ادخل Onboarding، ابدأ بالـ Intro، تنقل للأمام ثم للخلف، غيّر اختيارات، سجّل selected state، أدخل wake/sleep time، أكمل المراحل الأساسية، ثم راجع حالة الحفظ وأعد فتح التطبيق.
- **Expected:** كل شاشة قابلة للقراءة، الاختيارات Selected واضحة، time input يحفظ قيمة، زر Advance/Back يعمل، ولا تظهر White Screen بعد الضغط؛ البيانات تبقى بعد إعادة الفتح.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

#### سجل Onboarding السريع

| Step | Actual value/state | Result |
|---|---|---|
| Intro → first stage | `NOT RUN` | ☐ PASS ☐ FAIL |
| Next stage | `NOT RUN` | ☐ PASS ☐ FAIL |
| Back navigation | `NOT RUN` | ☐ PASS ☐ FAIL |
| Change choice and selected state | `NOT RUN` | ☐ PASS ☐ FAIL |
| Wake time | `NOT RUN` | ☐ PASS ☐ FAIL |
| Sleep time | `NOT RUN` | ☐ PASS ☐ FAIL |
| Core stages complete | `NOT RUN` | ☐ PASS ☐ FAIL |
| Save + reopen | `NOT RUN` | ☐ PASS ☐ FAIL |

### 3.3 Auth — email OTP, anonymous, sign-out, persistence

- **Action:** اختبر Anonymous login ثم Email OTP باستخدام عنوان test inbox. أكمل OTP، افتح Dashboard، sign out، أعد فتح الصفحة، ثم سجّل هل يحدث Auth loop.
- **Expected:** الانتقال بعد المصادقة يعمل، returnTo محفوظ، sign-out يعيد المستخدم خارج المسار المحمي، وإعادة الفتح لا تفقد جلسة صحيحة أو تدخل في loop.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

> إذا كان `FREEBUFF_OTP_KEY` غير متاح، سجّل Email OTP كـ `BLOCKED` مع الدليل، ولا تسجله PASS.

### 3.4 Navigation Stress

- **Action:** نفّذ الدورة التالية عدة مرات، ويفضل 5 دورات كاملة:
  `Dashboard → Onboarding (ملف اليوم) → Dashboard → Daily Review card → Dashboard`.
  سجّل كل click، route، blank/white screen، loading، React error، أو فقدان بيانات.
- **Expected:** الواجهة تعيد رسم المحتوى الصحيح، navigation لا يفرض reload غير ضروري، ولا توجد White Screen أو chunk error أو فقدان حالة غير مبرر.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

### 3.5 Daily Review

- **Action:** افتح Daily Review من Dashboard، اختر mood وblocker، اكتب note اختيارية، اضغط حفظ، ارجع إلى Dashboard، ثم refresh وافتح Daily Review مجددًا.
- **Expected:** الزر disabled قبل اكتمال mood/blocker، تظهر حالة saving، تظهر رسالة نجاح/خطأ واضحة، ولا تظهر المراجعة كأنها حُفظت إذا فشل request.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

#### سجل Daily Review

| Step | Actual | Result |
|---|---|---|
| Open review | `NOT RUN` | ☐ PASS ☐ FAIL |
| Select mood | `NOT RUN` | ☐ PASS ☐ FAIL |
| Select blocker | `NOT RUN` | ☐ PASS ☐ FAIL |
| Enter note | `NOT RUN` | ☐ PASS ☐ FAIL |
| Save and confirmation | `NOT RUN` | ☐ PASS ☐ FAIL |
| Reopen after refresh | `NOT RUN` | ☐ PASS ☐ FAIL |

### 3.6 Refresh / Reload

- **Action:** نفّذ refresh فعليًا في `/onboarding`، `/dashboard`، ومع Daily Review مفتوح أو بعد الحفظ. كررها أثناء lazy chunk load إذا أمكن.
- **Expected:** لا White Screen، لا Auth loop، لا infinite loading، لا broken route، ولا فقدان بيانات غير مبرر.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

### 3.7 Responsive QA — 360px / 390px / 412px

- **Action:** استخدم responsive device toolbar، وحدد العرض والارتفاع يدويًا للعرضين/الثلاثة: 360px، 390px، 412px. افحص Landing وAuth وOnboarding وDashboard وDaily Review وكل bottom navigation.
- **Expected:** لا horizontal overflow، لا أزرار مقصوصة، لا نصوص خارج cards، لا تداخل، المسافات مقبولة، bottom navigation قابلة للضغط، ولا safe-area clipping.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

| Width | Actual overflow/clipping/tap issue | Result |
|---:|---|---|
| 360px | `NOT RUN` | ☐ PASS ☐ FAIL |
| 390px | `NOT RUN` | ☐ PASS ☐ FAIL |
| 412px | `NOT RUN` | ☐ PASS ☐ FAIL |

### 3.8 RTL / Arabic

- **Action:** افتح التطبيق باللغة/الاتجاه العربي الحقيقي، وافحص Landing وAuth وOnboarding وDashboard وDaily Review. راقب النصوص، المحاذاة، الأسهم، cards، navigation، forms، وtime picker.
- **Expected:** اتجاه RTL صحيح، RTL text غير مقلوب أو مقصوص، الأسهم والأيقونات الاتجاهية منطقية، والـ time input يبقي LTR كما هو مصمم.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

### 3.9 Keyboard وInput

- **Action:** على شاشة فيها input، افتح Keyboard، اكتب قيمة، تنقل بين الحقول بـ Tab/Shift+Tab، استخدم Enter/Space حيث متوقع، ثم أغلق Keyboard وأكمل.
- **Expected:** الحقل الحالي ظاهر، النص لا يختفي، Continue/Save لا يغطيه Keyboard، والزر قابل للوصول/التفعيل.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

### 3.10 Safe Areas / Mobile

- **Action:** اختبر جهازًا/محاكيًا ذا notch/status bar وbottom gesture area، ثم افتح Browser في standalone/PWA mode إن أمكن. افحص أعلى وأسفل الشاشة.
- **Expected:** لا يوجد عنصر تحت status bar/notch، bottom navigation مرئية فوق gesture area، والأزرار последinquica قابلة للضغط.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

### 3.11 White Screen / Chunk Loading / Performance

- **Action:** افتح Preserve Log، ثم اضغط أزرار Next/Back ووجّه Dashboard إلى lazy sections عدة مرات. سجّل أي white screen، blank screen، loading طويل، React error، أو failed chunk request مع الوقت.
- **Expected:** fallback مرئي أثناء chunk loading، لا شاشة بيضاء صامتة، لا dynamic import failure، ولا route transition تُفقد التطبيق.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

| Event | Time / request | Result |
|---|---:|---|
| Initial route | `NOT RUN` | ☐ PASS ☐ FAIL |
| Onboarding next/back | `NOT RUN` | ☐ PASS ☐ FAIL |
| Dashboard lazy section | `NOT RUN` | ☐ PASS ☐ FAIL |
| Repeated navigation | `NOT RUN` | ☐ PASS ☐ FAIL |

### 3.12 Console / Network / Convex

- **Action:** أثناء كل الاختبارات، راقب Console وNetwork. صنف كل message إلى JavaScript/React/Chunk/Failed Request/404/Auth/Convex، ثم افصل harmless warning عن user-facing defect.
- **Expected:** لا uncaught runtime error، لا auth loop، لا failed required request، ولا 404/chunk error أثناء المسارات الطبيعية. سجّل warnings دون اعتبارها crash.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

| Source | Message/status | Classification | Result |
|---|---|---|---|
| Console | `NOT RUN` | `NOT RUN` | ☐ PASS ☐ FAIL |
| Network | `NOT RUN` | `NOT RUN` | ☐ PASS ☐ FAIL |
| Convex | `NOT RUN` | `NOT RUN` | ☐ PASS ☐ FAIL |

### 3.13 PWA / Offline (readiness follow-up)

- **Action:** بعد نجاح أول تحميل، افتح DevTools → Application → Service Workers، ثم جرّب Offline mode على الصفحات الأساسية.
- **Expected:** Service Worker مسجل، app shell/المحتوى المحفوظ لا يعتمد كليًا على الشبكة، والمراجعة/بيانات Convex تُعامل بصدق عند فشل الشبكة.
- **Actual:** `NOT RUN — ______________________________`
- **Result:** ☐ PASS ☐ FAIL

---

## 4. Executable QA Checklist

### Preflight

- [ ] `bun install` اكتمل أو dependencies موجودة.
- [ ] `VITE_CONVEX_URL` موجود ومضبوط.
- [ ] Convex deployment قابل للوصول.
- [ ] `CONVEX_SITE_URL` مضبوط في Convex environment.
- [ ] `FREEBUFF_OTP_KEY` موجود إذا كان Email OTP ضمن النطاق.
- [ ] Browser حقيقي و DevTools متاحان.
- [ ] تم تسجيل browser/device/viewport.
- [ ] تم استخدام test profile/test deployment.

### Test execution

- [ ] First Launch وقياس أول useful UI.
- [ ] Onboarding forward/back/edit/time/complete/persist.
- [ ] Auth anonymous + Email OTP + sign-out + reopen.
- [ ] Navigation stress بعدد دورات مسجل.
- [ ] Daily Review save/return/refresh/reopen.
- [ ] Refresh في Onboarding وDashboard وDaily Review.
- [ ] responsive 360px.
- [ ] responsive 390px.
- [ ] responsive 412px.
- [ ] RTL/Arabic.
- [ ] keyboard/input.
- [ ] safe areas/mobile/PWA.
- [ ] white screen/chunk loading.
- [ ] Console/Network/Convex review.

### Evidence capture

- [ ] Screenshots للـ white screen أو أي blank state إن وجدت.
- [ ] HAR أو Network export عند وجود failed request.
- [ ] Console log مختصر ومصنف.
- [ ] Browser/device/viewport details.
- [ ] وقت كل symptom قابل للتسليم.
- [ ] Reproduction steps مكتوبة قبل أي Bug fix.

### Stop conditions

- [ ] لا Bug fix أثناء جمع QA evidence.
- [ ] لا Features أو refactor أو UX redesign.
- [ ] لا تعديل schema أو product logic.
- [ ] لا اعتبار `NOT RUN` أو `BLOCKED` كـ PASS.
- [ ] لا كتابة Phase 0 verified/closed قبل اجتياز critical gates الفعلية.

---

## 5. Static Readiness Assessment

**No static blocker identified.**

الملفات الحالية عبارة عن تطبيق Vite/React/TypeScript فيه build/typecheck/lint scripts، وConvex backend/auth code، وPWA manifest/service worker. لم يظهر blocker ثابت من مراجعة الملفات فقط.

هذا لا يعني أن كل Browser Gate جاهز أو ناجح. المتطلبات التشغيلية في القسم 1.2 يجب توفيرها، وعلى وجه الخصوص:

- `VITE_CONVEX_URL` صالح يشير إلى Convex deployment يمكن الوصول إليه؛
- `CONVEX_SITE_URL` مطابق داخل Convex environment؛
- `FREEBUFF_OTP_KEY` صالح لاختبار Email OTP؛
- Browser حقيقي وdevice session.

أي متطلب تشغيلي مفقود يجب تسجيله كـ `BLOCKED` للاختبار المتأثر، لا تجاهله بصمت.

---

## 6. Result recording template

```text
Date:
Tester:
Browser / version:
OS / device:
Viewport(s):
Convex deployment (identifier only, no secrets):
Build commit/identifier if available:

First Launch: PASS / FAIL / BLOCKED
Onboarding: PASS / FAIL / BLOCKED
Auth: PASS / FAIL / BLOCKED
Navigation: PASS / FAIL / BLOCKED
Daily Review: PASS / FAIL / BLOCKED
Responsive 360/390/412: PASS / FAIL / BLOCKED
RTL: PASS / FAIL / BLOCKED
Keyboard: PASS / FAIL / BLOCKED
Safe Areas: PASS / FAIL / BLOCKED
Refresh: PASS / FAIL / BLOCKED
White Screen / Chunks: PASS / FAIL / BLOCKED
Runtime / Console / Network: PASS / FAIL / BLOCKED

Bugs:
1. Bug:
   Reproduction:
   Expected:
   Actual:
   Root Cause:
   Minimal Fix:

Notes:
```

لا تستخدم هذا القالب لتحويل `BLOCKED` إلى `PASS`، ولا تحذف `NOT VERIFIED` من التقرير الرسمي دون Browser/Device evidence.
