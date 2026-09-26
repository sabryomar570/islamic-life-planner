# OUD — Conversation Implementation State

> **This file is an internal decision log, not app copy.** Nothing in it is shown to the user.
> It exists so no decision is lost between phases. No secrets, no user data, no keys.

**Last updated:** Phase NEXT — second audit pass.

---

## 1. Product Vision

OUD is an Arabic-first, RTL Islamic life companion for one person. Not a task manager, not a
habit tracker, not a chatbot, not a preacher. The day is organised **around the prayer**, and the
rest of the day (plan, adhkar, review, accountability) hangs off that axis.

The product promise is a calm system that a person keeps returning to, and that makes returning
easy after a lapse.

Non-goals that are decisions, not omissions:

- No leaderboard, no social comparison, no streaks used as punishment.
- No digital religious reward claims ("مليون حسنة", "٢٧ درجة"). Digital rewards are app-only.
- No location check-in that claims to prove a prayer happened.
- No AI-generated religious content.

---

## 2. Product Personality

- Egyptian colloquial, masculine, short. OUD is a friend who follows you, not an assistant.
- **No user-selectable tone or mode.** One fixed voice. This is a decision, not a missing feature.
- No emoji in the personality layer.
- Praise is rare and specific. Never generic.
- Teasing is playful, never insulting.
- Memory-based phrasing ("فاكر…", "قلت افكرك…") when the app genuinely holds the fact.
- Not always sweet, not always harsh. The tone is decided per situation — **by the owner, not by me.**

---

## 3. Confirmed Requirements (accumulated across the conversation)

### Core system
- Prayer-centric Home with the next prayer as the hero.
- Daily plan, weekly plan, daily review, accountability scoring — all retained from Phase 0–3.x.
- Notification Intelligence (classification, priority, dedupe, quieting) — kept, extended with voice.
- Audio: prayer reminder, important task, completion, gentle feedback, notification sound. No music.
- Hadith / Quran / duas / adhkar content, all traceable to a real source class.

### Personality system (Phase NEXT)
- 17 line contexts, deterministic per `(id, dayKey)`, no `Math.random`.
- Cooldowns and priority ordering so the user is not spammed.
- No religious claims anywhere in the personality layer.
- In-app chat as an extension of the same personality, never a separate assistant.

### Services
- Qibla computed from coordinates, with honest accuracy and a clear "use your device compass" path.
- Mosque proximity (Overpass, cached 24h) with distance and directions; never claimed as proof of prayer.
- Zakat as a **local arithmetic estimate only**, explicitly not a ruling.

### Progress
- Personal XP only. Group = 2, single = 1, plan completed = 2, partial = 1, adhkar = 1,
  review = 2, comeback = 3. Capped ledger, idempotent appends.
- Seven achievements derived from real behaviour.

### Privacy / platform
- Location is foreground-only, coarse, cached; no movement history by default.
- Notification actions capability-detected, deep-link reply fallback, service worker forwards actions.
- No Web Push, no background geofence, no exact alarms — platform cannot do these.

---

## 4. Existing Implementation (verified by reading the code)

| Area | Where | State |
| --- | --- | --- |
| IA / nav | `src/components/app/Navigation.tsx` | 19 `DashView`s, 4 library groups, `PRIMARY_NAV` of 4 |
| Home | `src/components/app/HomeView.tsx` | Prayer hero → Oud line → mosque → qibla → plan |
| Prayer | `src/components/app/PrayerView.tsx`, `src/lib/prayers.ts` | Times, log, missed detection |
| Daily / weekly plan | `src/lib/daily-plan.ts`, `src/lib/weekly-plan.ts`, `src/convex/*` | Convex-backed |
| Review | `src/components/app/DailyReview.tsx` | One light question per day |
| Accountability | `src/lib/accountability.ts` | Score + outcomes + merge of prayer logs |
| Streaks / stats | `src/lib/progress.ts` | Streaks, weekly progress, summary |
| Notifications | `src/lib/notification-intelligence.ts`, `src/lib/notification-templates.ts`, `src/hooks/use-reminders.ts`, `public/sw.js` | Classify, prioritise, dedupe, quiet, actions, reply deep link |
| Audio | `src/lib/audio.ts` | 4 channels, 6 cues, mute + volume + autoplay unlock |
| Personality | `src/lib/oud-voice.ts`, `src/hooks/use-oud.ts` | 17 contexts, cooldowns, single bridge to app state |
| Chat | `src/lib/oud-chat.ts`, `src/components/app/OudChatView.tsx` | 11 intents, `basedOn` provenance, religious refusal |
| XP / achievements | `src/lib/oud-progress.ts` | Rules, 7 levels, 7 achievements, local ledger |
| Mosque | `src/lib/oud-mosque.ts`, `src/components/app/MosqueCard.tsx` | Haversine, Overpass, 24h cache, honest states |
| Qibla | `src/lib/qibla.ts`, `src/components/app/QiblaView.tsx` | Bearing, distance, distance-to-Kaaba |
| Zakat | `src/lib/zakat.ts`, `src/components/app/ZakatView.tsx` | Arithmetic estimate, not a ruling |
| Developer | `src/lib/developer.ts`, `src/components/app/DeveloperView.tsx` | Identity, social (no usernames), support, share |
| PWA / offline | `src/lib/pwa.ts`, `public/sw.js`, `src/lib/offline-store.ts` | SW registration, update flow, offline store |
| Privacy | `src/lib/local-data.ts` | Owned key allowlist, guarded by a source-scanning test |
| Design system | `src/components/app/Surfaces.tsx`, `src/index.css` | 5-step depth ladder, unified button states |

---

## 5. Missing / Partial Implementation

| # | Item | Status |
| --- | --- | --- |
| 1 | **All user-visible personality copy is currently written by me** | Needs owner wording |
| 2 | Notification / reminder / recovery / permission / empty / error copy | Needs owner wording |
| 3 | Achievement names and level names | Needs owner wording |
| 4 | UX states: `Skeleton` used in `Dashboard` only; explicit empty states missing in Home, Weekly, DailyReview, Stats, Occasions, AdhkarIndex, Quran, Tasbih | Partial |
| 5 | Chat is intent-recipe based; no live LLM | Partial, by design until a key exists |
| 6 | XP / achievements are local-only, no cloud sync | Known limit |
| 7 | Audio: every channel is covered, including achievement unlock | Complete |
| 8 | Bottom navigation does not match the owner's stated target IA (الرئيسية / عبادتي / يومي / الإعدادات) | Decision pending |
| 9 | Browser QA not performed | Blocked |
| 10 | Onboarding and Auth copy not reviewed for voice | Needs owner wording |

---

## 6. UI Decisions Pending

- Home composition and what is the single most prominent element.
- Bottom navigation shape (see #8 above).
- Whether `DeveloperView` should stay in the app group or move under Settings.
- Depth intensity: whether the current five-step ladder is calm enough.

None of these were executed unilaterally. They are waiting on the owner.

---

## 7. Copy Decision Queue

Owner-authored wording is required for:

**Batch 1 — Prayer:** before adhan / adhan entered / prayer overdue / prayer logged / prayer missed.
**Batch 2 — Plan:** task due / task delayed / task skipped / procrastination repeated.
**Batch 3 — Day:** day complete / big win / streak milestone.
**Batch 4 — Return:** absence / comeback after a break.
**Batch 5 — Achkar & worship:** adhkār missed / late night / suhoor / iftar / salawat / Friday.
**Batch 6 — Achievement & XP:** level up / achievement unlock / XP earned.
**Batch 7 — Permissions:** location / notifications, and the reason each is requested.
**Batch 8 — Mosque & Qibla:** no coordinates / denied / nothing nearby / ready.
**Batch 9 — Chat:** greeting / complaint / justification / religious question / unknown.
**Batch 10 — States:** loading / empty / error / offline / success / retry.
**Batch 11 — Developer, Onboarding, Auth, Support, Share.**

Until the owner answers, the current text stays in place. Nothing is deleted before its
replacement exists.

---

## 8. Religious Integrity Rules

- Never invent Quran, hadith, adhkar, duas, virtues, or a specific reward figure.
- Distinguish marfu' / athar / mansub / unverified. Content provenance is stored per text.
- Motivational copy must never read as a hadith.
- Location never proves a prayer.
- Zakat output is arithmetic, explicitly not a fi ruling.
- Automated checks: `tests/religious-content.test.ts` and the claim guard in
  `tests/oud-personality.test.ts`.

---

## 9. Technical Decisions

- Convex stays the backend. No second backend.
- Personality, chat, XP, mosque, qibla and zakat logic are pure modules, so they are testable
  without a browser or network.
- `use-oud.ts` is the only bridge from app state into the personality layer.
- Deterministic seeds instead of randomness, so the UI is stable and tests are meaningful.
- Notification actions are capability-detected, never assumed.
- Camera check-in was considered and deliberately **not** added: no real need, real privacy cost.

---

## 10. Browser QA Status

**Not verified in a browser.** The managed dev server is not reachable from this environment and
platform policy forbids starting one, so no real browser session was possible.

What stands in for it: server-side render tests, structural guards, and lint.

Not verified: 360 / 390 / 412 / 768 / 1024 widths, light and dark rendering, keyboard and focus
restoration, reduced motion, touch targets on a real device, safe areas, overflow, notification
buttons on a device, PWA install, and the permission denial flows.

---

## 11. Tests

| Command | Purpose |
| --- | --- |
| `bun test` | Unit + SSR render + source guards |
| `bun tsc -b --noEmit` | Types |
| `bun run lint` | Lint |
| `bun run build` | Production build |
| `bun convex dev --once` | Backend push and codegen |
| `bun run check:glyphs` | No CJK or replacement characters in code or reports |
| `bun run check:schema` | Convex schema unchanged |

Never edit a test just to make it pass. If a test is genuinely wrong, the reason and the change
must be documented here.

---

## 12. Known Risks

- Personality copy is machine-written. It is consistent but it is not the owner's voice. This is
  the single largest gap between the code and the intent.
- Without browser QA, visual regressions on small screens can survive to release.
- Local-only progress means XP resets if local storage is cleared.
- A live LLM behind chat needs a provider key the owner has not supplied.

---

## 13. Deferred Items

- Qibla magnetometer-driven needle (device compass API) — optional refinement.
- Cloud sync for XP and achievements.
- Occasion-driven proactive notifications beyond what already exists.
- Any copy batch the owner has not answered yet.
