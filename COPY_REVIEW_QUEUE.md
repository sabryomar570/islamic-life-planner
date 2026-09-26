# COPY_REVIEW_QUEUE

> **These lines are placeholders written by the assistant, not final OUD voice.**
> Nothing here should ship as final copy. The owner supplies the wording; the code keeps the
> slot. Technical labels (screen titles, section headers, button verbs, accessibility strings)
> are exempt and are already final.

Status legend: `PLACEHOLDER` = written by me, waiting for the owner. `TECHNICAL` = final.

---

## BATCH 1 — Qibla (new in this phase)

| ID | Context | Current proposed copy | Why it exists |
| --- | --- | --- | --- |
| Q-01 | No location yet, asking for it | `نحتاج موقعك مرة واحدة` | Heading for the permission ask |
| Q-02 | Why we need location | `علشان أحدد اتجاه القبلة بدقة حسب مكانك.` | Must be said *before* the system prompt |
| Q-03 | Allow button | `السماح بالموقع` | Verb on the primary action |
| Q-04 | Permission refused | `الموقع مرفوض` | Badge on the refused state |
| Q-05 | Permission refused, recovery | `الصفحة تعمل بلا موقع. فعّله من الإعدادات إن أردت زاوية من موضعك.` | Must not feel like a dead end |
| Q-06 | Refused, secondary action | `الإعدادات` | Row label |
| Q-07 | No compass sensor | `الزاوية محسوبة من موقعك، وبوصلة جهازك غير متاحة هنا.` | Honest fallback line |
| Q-08 | Sensor unsteady | `حرّك الموبايل بهدوء لحد ما الاتجاه يثبت.` | Calibration instruction, deliberately short |
| Q-09 | Sensor ready | `البوصلة تعمل` | Confirmation state |
| Q-10 | Compass permission ask | `فعّل البوصلة` | Button verb |
| Q-11 | Compass denied | `لم يُسمح للبوصلة. الزاوية أعلاه محسوبة من موقعك، وتظل صحيحة بلا مستشعر.` | Denial explanation |
| Q-12 | Reading under the dial | `درجة من الشمال` | Unit of the bearing |
| Q-13 | Mosque link card | `افتح بطاقة المسجد` / `أقرب مسجد إليك، والمسافة والاتجاهات` | Links to the existing mosque service |
| Q-14 | Screen subtitle | `اتجاه الكعبة من موقعك` | Screen subtitle |
| Q-15 | Hero note | `الموقع يحدّد الزاوية فقط. لا يثبت أنك صليت، ولا أن صلاتك في القبلة.` | The honesty contract. **Suggested to keep as is** — it is a claim about behaviour, not personality. |

## BATCH 2 — Developer

| ID | Context | Current proposed copy | Why it exists |
| --- | --- | --- | --- |
| D-01 | Social section title | `تواصل معي` | Provided by the owner in the spec |
| D-02 | Social section hint | `ثلاث قنوات مفتوحة. اختار ما يناسبك.` | Hints at the section |
| D-03 | Support eyebrow | `مساهمة في استمرار المشروع` | Required wording from the spec |
| D-04 | Link without a URL | `قريبًا` | Honest state instead of a fake link |
| D-05 | Feedback button | `اقتراح أو ملاحظة` | Existing, from `developer.ts` |

## BATCH 3 — Services hub

| ID | Context | Current proposed copy | Why it exists |
| --- | --- | --- | --- |
| S-01 | Hub subtitle | `${n} خدمة، مجمّعة بحسب صلتها بيومك` | One line explaining the grouping |
| S-02 | Quick access heading | `ابدأ من هنا` | Provided by the owner in the spec |
| S-03 | Everything else heading | `كل عبادتك` | Provided by the owner in the spec |
| S-04 | Search label | `ابحث في خدماتك` | Field label |
| S-05 | Search placeholder | `الصلاة، القرآن، الأذكار…` | Placeholder examples |
| S-06 | No search result title | `لا توجد خدمة بهذا الاسم` | Empty state |
| S-07 | No search result body | `جرّب كلمة أقصر، أو افتح كل الأقسام من أعلى الشاشة.` | Empty state body |

## BATCH 4 — Settings

| ID | Context | Current proposed copy | Why it exists |
| --- | --- | --- | --- |
| C-01 | Section index labels | `حسابك · التنبيهات · الصلاة · تجربتك · التطبيق · بياناتك` | Names taken from the spec |

## BATCH 5 — Already waiting from earlier phases

These were flagged before and are still machine-written:

- The 17 personality contexts in `src/lib/oud-voice.ts`.
- The 11 chat replies in `src/lib/oud-chat.ts`.
- Achievement labels and details, level labels in `src/lib/oud-progress.ts`.
- Notification and reminder bodies in `use-reminders.ts`.
- Permission copy in `PermissionReasonDialog` (`PERMISSION_COPY`).
- Onboarding, Auth, and empty/error states across the app.

---

## How to answer

Reply with the final Arabic line for any ID. I will place it verbatim and only make technical
adjustments for length or layout — never a change of voice or meaning. Nothing is deleted before
its replacement exists, so a partial answer is safe.
