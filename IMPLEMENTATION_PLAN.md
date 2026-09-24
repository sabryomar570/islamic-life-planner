# IMPLEMENTATION_PLAN — مراحل التنفيذ الفعلي

> القاعدة: لا مكتبات جديدة، لا إعادة بناء، تغييرات دقيقة قابلة للتحقق، واختبار بعد كل مرحلة بـ `bunx convex dev --once && bunx tsc -b --noEmit` (التحقق الوحيد الممكن في هذه البيئة — يُصرّح به في كل تقرير).

## PHASE 0 — Stabilization (تُنفَّذ الآن)
- **GOAL**: إزالة الأخطاء الوظيفية الحقيقية والوعود الكاذبة من الواجهة.
- **TASKS/FILES**:
  1. `src/convex/planner.ts`: إضافة `removeFavorite` mutation (حذف by_user_and_item فقط، لا إدراج إطلاقًا) + تحويل `getHistory` إلى استعلامي نطاق (gte/lte) لكل جدول + بناء تواريخ getStats بـ `dateKey` محلي.
  2. `src/hooks/use-favorites.ts`: `remove()` يستدعي `removeFavorite`.
  3. `src/pages/Landing.tsx`: نص المصحف يصف القارئ المستمر بلا «صفحات».
  4. `src/hooks/use-nudges.ts`: نص نudge quran يصف القارئ المستمر (وأيضًا «ورد» يبقى روحيًا دون وعود صفحات).
- **DEPENDENCIES**: لا شيء.
- **ACCEPTANCE**: codegen + typecheck صفر أخطاء؛ لا إشارة لـ toggleFavorite من remove؛ grep لا يجد «المصحف الورقي».
- **TESTS**: `bunx convex dev --once` ثم `bunx tsc -b --noEmit`، ومراجعة التغييرات بالقراءة.

## PHASE 1 — Core Value (أغلق الحلقة)
- **GOAL**: بطاقة «أسبوعك» على الرئيسية — الاستبقاء بالمعنى التنافسي (نمط Quran.com المبسّط).
- **TASKS/FILES**: `HomeView.tsx` بطاقة تقرأ getStats الموجود (rate، streak، أضعف صلاة، جملة واحدة)؛ تُخفى إن لم توجد بيانات. لا backend جديد.
- **ACCEPTANCE**: تظهر بعد يوم واحد من البيانات، تخفى عند الصفر، نصوص عربية متسقة.
- **TESTS**: كما في P0 + قراءة حالة البيانات الصفرية.

## PHASE 2 — Trust (التمييز المعلن)
- **GOAL**: سطر الخصوصية في صفحة الهبوط (أقوى سلاح ضد المنافسين المبحوثين).
- **TASKS/FILES**: `Landing.tsx` جملتان في القسم الختامي/أعلى CTA.
- **ACCEPTANCE**: لا مبالغة («موقعك يُرسل لخدمة المواقيت فقط» — صحيح وفق إعداداتنا الموثقة).

## PHASE 3 — Quality Net
- **GOAL**: اختبارات Bun الأصلية (بدون إعداد vitest) على `lib/time.ts`, `lib/hijri.ts` منطق التواريخ الخالص + إصلاح ما تفضحه.
- **ملحوظة**: bun test متاح بالأمر المباشر `bun test` دون تكوين (bun يتعرف على *.test.ts)؛ إن رفضت البيئة، نُوثّق ذلك ونكتفي بالتحقق الحالي.

## NOT PLANNED (من DO NOT BUILD)
اشتراكات، إعلانات، مجتمع، قبلة، مصحف صوتي، أدوات دراسية، ترقيم صفحات المحفوظات الآن.

## Self-Critique Checkpoints
بعد كل Phase: هل تغيّر شيء لم يكن يجب؟ هل الزيادة في التعقيد تساويها؟ هل النص الجديد يطابق السلوك الفعلي؟ هل بقيت الأوفلاين والخصوصية سلامًا؟
