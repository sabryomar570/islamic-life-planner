# PHASE_UI_MAJOR_UPDATE — FINAL REPORT

Scope: Developer, Qibla, Settings, the Services Hub, and their binding to the new design system.
The product engine was not touched: Convex, schema, auth, prayer maths, the plan engine,
notification intelligence, audio, XP, achievements, and the hadith database are unchanged.

---

## 1. UI changes

| Area | Before | After |
| --- | --- | --- |
| Developer | Six `Panel` cards, small text, a list of three buttons | One Level 3 hero with the gel monogram, an editorial "why", three large social cards, a split support card, a share card, centred credits |
| Qibla | An information page with a small needle and a "no sensor" note | A real service: compass dial, live bearing, calibration, permission states, link to the existing mosque service |
| Settings | Six long groups, scrolled to find anything | A section index that jumps to real anchors, then grouped rows inside cards |
| Services hub | A flat grid of the worship group only | Four logical sections, three prominence tiers, a quick-start row, real search |
| Navigation | Already four zones with a dot | Unchanged, with the gel droplet as the active state |

## 2. Developer

- Hero: gel monogram, name, role, one short statement. No portrait, no portfolio framing.
- Why OUD: editorial paper, not glass. It is an argument, not a widget.
- Social: Telegram, Instagram, TikTok. **Platform name only.** No username, no handle, no
  shortened form. TikTok has no trusted full URL, so it stays `null` and renders as an honest
  "قريبًا" card with no link. No source-code platform anywhere in the file.
- Support: the language is about the app — "ادعم OUD", "مساهمة في استمرار المشروع",
  "دعم تطوير التطبيق". The forbidden phrasings are banned by a test.
- The wallet number appears **only** inside the support dialog, never in the page. Also tested.
- Share: native share first, clipboard second, with a success state on the button.

## 3. Qibla

- Compass dial with a rotating rose, cardinal marks, a needle, and a gel centre.
- Two readings, one meaning: with a heading the dial turns under a fixed needle; without one the
  needle points at the true bearing and the dial stays still. Neither is a fake compass.
- Bearing and direction are written in text, so the direction never depends on animation.
- Device orientation: `deviceorientationabsolute` and `deviceorientation`, WebKit's ready-made
  heading, and a real permission request on platforms that gate it.
- Calibration: three agreeing readings within a small spread, otherwise one short instruction.
- Denial is a state, not a wall: the page keeps working and says the angle is still computed.
- Location is asked for with the reason shown first, and never a second time.
- No mosque data is invented. The page links to the mosque service that already exists.

## 4. Settings

- A scrollable index of six sections, each with a real anchor, so the page can be entered
  rather than read end to end.
- Rows carry a title, an optional hint, and a control. Switches are used only where the setting
  is genuinely on and off.
- Existing behaviour, permissions, audio channels, privacy actions, and deletion are untouched.

## 5. Services hub

- Four sections: الأساس · أدوات العبادة · المحتوى · المتابعة.
- Three tiers: primary cards, secondary cards, compact rows. No flat grid of fifteen.
- "ابدأ من هنا" shows four services; the search filters the same list, so nothing is shown twice.
- Names and hints come from one map, so the hub and the all-sections sheet cannot disagree.

## 6. Navigation

- Four destinations: الرئيسية · عبادتي · يومي · الإعدادات.
- The active destination is a gel droplet that travels with a spring, with an instant change when
  motion is reduced. A dot is a second, non-colour signal.

## 7. Design system

- Four depth levels and nothing else: canvas, surface, elevated card, hero.
- One gel material for every icon, in four sizes.
- One press class, one focus ring, one touch-target rule.

## 8. Accessibility

- The compass states its reading in a live region, so no direction depends on motion.
- Every icon-only element has a label; decorative icons are `aria-hidden`.
- Rows and cards are at least 44px.
- Reduced motion removes transitions and the spring, not the meaning.
- Zoom is **not** disabled. The layout is made to survive it instead: `overflow-x: clip` plus
  responsive grids. No `user-scalable=no`, no maximum-scale.

## 9. Responsive

- Mobile-first, with `sm:` re-flowing the grids rather than scaling them.
- The settings index scrolls horizontally instead of wrapping into a wall.
- The dial is a fixed 240px square with a `sm` variant on the surrounding layout, so it cannot
  overflow at 360px.

## 10. Performance

- Qibla, Developer, and the hub are behind the existing lazy boundaries in the dashboard.
- The compass dial is a separate module so it is not pulled into the home chunk.
- Dashboard chunk: 200.33 kB (62.71 kB gzip). Index: 352.40 kB (108.04 kB gzip).

## 11. Tests

611 passing across 37 files. New in this phase, in `tests/oud-ui-update.test.ts`:

- Compass: no sensor without a browser, `null` for an invalid reading, WebKit versus standard
  alpha, stability, and an angle difference that crosses zero without jumping.
- Services hub: no duplicates, every service has a label, every service is reachable, no
  duplicated quick-access entry, exactly three tiers.
- Developer: no username in the view, no source-code platform, TikTok never invents a URL, every
  URL passes the safety check, the wallet number is confined to the dialog, forbidden support
  wording is absent, the clipboard has three states, and the section order holds.
- Settings: anchors exist, groups are few, rows are tall enough.
- Navigation: four zones, the plan lives only in يومي, the service map lives only in the hub.

## 12. Browser QA

**Not performed.** This environment exposes no browser automation, and the managed dev server is
not reachable from it, so no real Chromium session was possible at 390, 412, 768 or 1024.
Everything claimed above is verified through the rendered markup and source contracts, not
through a live browser. Treat visual QA on real devices as outstanding.

## 13. Bugs discovered

- `QiblaView` computed `atKaaba` with a point where kilometres were expected, which typed wrong
  and would have reported the wrong thing.
- `QiblaView` passed `denied` where the dialog expects `locationDenied`, so the permission reason
  dialog never received the kind it needed.
- `formatBearing` renders a bare number, so the bearing had no unit on screen.
- The design-system barrel did not exist, so screens were importing primitives from three places.
- `ActionButton` and `SecondaryButton` had no success state, so a confirmed copy looked identical
  to a pending one.
- The settings anchors were not reachable: the index pointed at ids that did not exist.

## 14. Bugs fixed

All six. Each is now covered by a test; see the list above for the guards.

## 15. Remaining limitations

1. **Browser QA outstanding**, as stated above.
2. **Copy is not final.** Every new line of user-facing text is a placeholder written by me. They
   are listed in `COPY_REVIEW_QUEUE.md` and none should ship as final voice. The older batches
   from earlier phases are still waiting too.
3. **Secondary screens** (Prayer, Quran, Athkar, Hadith, Stats, Zakat, Onboarding, Auth, Landing)
   still use the previous composition, although they now render inside the new material. Their
   hierarchy was not rebuilt in this phase.
4. **No haptic feedback on the compass.** Vibration exists in the notification layer only.
5. **The service tiers are a judgement, not a measurement.** There is no usage data, so the
   quick-access four are chosen, not measured. The code says so.

---

## Definition of done

| Item | State |
| --- | --- |
| Old UI gone from these four areas | Yes |
| Developer premium and consistent | Yes |
| Social links correct | Yes, Telegram and Instagram; TikTok honest |
| TikTok uses no invented URL | Yes, enforced by test |
| No usernames visible | Yes, enforced by test |
| No source-code platform | Yes, enforced by test |
| Support works | Yes |
| Qibla UX complete | Yes, with honest states |
| Permission states work | Yes |
| Services hub organised | Yes |
| Settings condensed | Yes, index plus groups |
| Bottom navigation is four destinations | Yes |
| Water-droplet active state | Yes, with reduced-motion fallback |
| Depth system clear | Yes, four levels, tested |
| RTL correct | Yes, logical properties throughout the new code |
| Responsive | Structurally, via `sm:` reflow; **not** verified in a browser |
| Accessibility | Reviewed; browser verification outstanding |
| No fake data | Yes, enforced by test |
| Existing logic unbroken | Yes, 611 tests pass |
| Automation gates pass | Yes |
| Browser QA | **No — not possible in this environment** |
