# Unit Calculator Continuity

## [PLANS]
- 2026-06-06T21:22:00-07:00 [USER] User asked for result-display cleanup so long decimals and scientific notation do not overflow the answer card.
- 2026-06-06T21:28:00-07:00 [USER] User asked to hide specific parse/evaluation failure details and always show a generic `err` string.
- 2026-06-06T21:39:00-07:00 [USER] User asked to merge History and Settings into a three-dot overflow menu while keeping the Units and More buttons, and to add dedicated History, Settings, About, and Privacy pages matching the provided visual direction.
- 2026-06-06T21:46:00-07:00 [USER] User asked for tapping a history card to return to the calculator and insert that history result into the equation.
- 2026-06-06T21:49:00-07:00 [USER] User asked to limit history by a reasonable rule and delegated whether that should be entry-count-based or time-based.
- 2026-06-06T21:52:00-07:00 [USER] User asked for the README to be rewritten and updated to reflect the current app.
- 2026-06-08T04:28:00-07:00 [USER] User asked to display negative unit exponents inline, such as `m^-1`, instead of rendering reciprocal units as `1 / m`.
- 2026-06-08T04:36:00-07:00 [USER] User asked to reposition and shrink the three-dot overflow menu so it sits under the trigger, and to remove the persistent blue active state from the three-dot button in favor of press-only keypad-style feedback.
- 2026-06-08T09:53:00-07:00 [USER] User clarified that the overflow menu card must begin below the three-dot button box rather than overlapping it.
- 2026-06-08T09:56:00-07:00 [USER] User asked to re-center the `Units` and `More` labels inside their pill buttons after the three-dot button changed the top-bar balance.
- 2026-06-08T15:04:36-07:00 [USER] User asked Codex to handle the Android release configuration for Google Play readiness.
- 2026-06-09T23:35:38-07:00 [USER] User asked to replace the placeholder app icon with `C:\Users\hugoh\Downloads\UnitWise.png`.

## [DECISIONS]
- 2026-06-06T21:22:00-07:00 [CODE] Keep this fix display-only in `src/screens/HomeScreen.tsx`; do not change evaluator math for floating-point presentation issues.
- 2026-06-06T21:22:00-07:00 [CODE] Use rounded plain formatting for typical values and switch to trimmed scientific notation for very large, very small, or still-too-long results.
- 2026-06-06T21:28:00-07:00 [CODE] All user-facing calculation failures should collapse to a single `err` token in the main result display instead of exposing parser or evaluator messages.
- 2026-06-06T21:39:00-07:00 [CODE] Keep navigation local to `HomeScreen` with a small page-state switch instead of adding a navigation library; preserve calculator state while opening History, Settings, About, and Privacy screens.
- 2026-06-06T21:39:00-07:00 [CODE] Replace the old inline history panel with an overflow menu and a full-screen history page; Settings should expose only version, About, and Privacy for now.
- 2026-06-06T21:46:00-07:00 [CODE] History reuse should insert the stored parse-safe answer token, not the rendered card text, so unit-bearing results and formatted numbers remain valid when re-added to the equation.
- 2026-06-06T21:49:00-07:00 [CODE] Cap history by count, not age; a fixed last-20 list is more predictable for a calculator than a day-based expiry window.
- 2026-06-06T21:52:00-07:00 [CODE] README should describe the current single-screen page model, overflow menu/history behavior, result-formatting choices, and Windows `npm.cmd` caveat instead of generic Expo scaffold text.
- 2026-06-08T04:28:00-07:00 [CODE] Keep reciprocal-unit math unchanged but render signed exponents inline in the UI and answer-token text, so negative dimensions appear as `unit^-n` rather than `1 / unit^n`.
- 2026-06-08T04:36:00-07:00 [CODE] Keep the overflow menu open state visually neutral; the three-dot trigger should only show transient press feedback, and the menu card should be a smaller panel anchored tighter under the trigger.
- 2026-06-08T09:53:00-07:00 [CODE] Favor a clean visual gap over a tight overlap; the overflow card top edge should sit below the trigger row even if that means a larger fixed top offset.
- 2026-06-08T09:56:00-07:00 [CODE] Treat the top-bar pills as centered controls, not text-sized chips; give them explicit centering and a minimum width so the labels stay visually centered beside the icon-only trigger.
- 2026-06-08T15:04:36-07:00 [CODE] Use `com.hugohuanqingchen.unitcalculator` as the stable Android package ID, keep version `1.0.0` with Android `versionCode` 1, and default EAS submission to the Play internal track.
- 2026-06-09T23:35:38-07:00 [CODE] Reuse the provided `UnitWise.png` artwork for `icon.png`, `adaptive-icon.png`, and `splash-icon.png` so the published Android assets stay visually consistent without changing Expo config paths.

## [PROGRESS]
- 2026-06-06T21:22:00-07:00 [CODE] Updated `formatNumericValue` to cap decimals more aggressively, trim trailing zeros in both plain and exponential output, and fall back to scientific notation when the plain string exceeds the display budget.
- 2026-06-06T21:22:00-07:00 [CODE] Updated the result row styles to allow wrapping and text shrinking before the numeric value collides with the card edge.
- 2026-06-06T21:22:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the display-formatting change.
- 2026-06-06T21:28:00-07:00 [CODE] Replaced detailed caught-error rendering in `resolveExpression` with the constant `err`.
- 2026-06-06T21:28:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the error-display change.
- 2026-06-06T21:39:00-07:00 [CODE] Removed the top-bar History button, added a three-dot overflow menu with History and Settings actions, and converted the screen into a lightweight multi-page flow inside `HomeScreen`.
- 2026-06-06T21:39:00-07:00 [CODE] Added dedicated History and Settings layouts plus text-only About and Privacy pages; history entries now store a local ISO date stamp for display.
- 2026-06-06T21:39:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the menu and page refactor.
- 2026-06-06T21:46:00-07:00 [CODE] History entries now persist a nullable answer-token payload alongside the display string; tapping a successful history card returns to the calculator and pushes that payload into the input.
- 2026-06-06T21:46:00-07:00 [CODE] Error history rows are disabled visually and functionally because `err` is not a valid expression token to reinsert.
- 2026-06-06T21:46:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the history-card insertion change.
- 2026-06-06T21:49:00-07:00 [CODE] Replaced the hardcoded history slice with `MAX_HISTORY_ENTRIES = 20`.
- 2026-06-06T21:49:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the history-retention change.
- 2026-06-06T21:52:00-07:00 [CODE] Rewrote `README.md` around the actual app behavior, current feature set, architecture, history rules, and development commands.
- 2026-06-06T21:52:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the README update.
- 2026-06-08T04:28:00-07:00 [CODE] Added a signed-unit-term display helper and replaced the result rendering path so negative exponents stay inline instead of splitting into numerator and denominator visual groups.
- 2026-06-08T04:28:00-07:00 [CODE] Updated answer-token unit text and answer-unit selection labels to preserve negative exponents visibly.
- 2026-06-08T04:28:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the reciprocal-display formatting change.
- 2026-06-08T04:36:00-07:00 [CODE] Updated the three-dot trigger to use the same gray pressed-state feedback as keypad buttons instead of a persistent blue active state while the menu is open.
- 2026-06-08T04:36:00-07:00 [CODE] Reduced the overflow menu card width, icon/label sizing, divider offset, and vertical spacing, and moved the panel closer under the trigger.
- 2026-06-08T04:36:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the overflow-menu refinement.
- 2026-06-08T09:53:00-07:00 [CODE] Increased the overflow menu card `top` offset so the panel starts below the three-dot button instead of covering it.
- 2026-06-08T09:53:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the overflow-menu alignment fix.
- 2026-06-08T09:56:00-07:00 [CODE] Updated `topBarButton` with centered content alignment and a minimum width so `Units` and `More` render centered again.
- 2026-06-08T09:56:00-07:00 [TOOL] `npm.cmd run typecheck` completed successfully after the top-bar centering fix.
- 2026-06-08T15:04:36-07:00 [CODE] Added Android Expo release metadata, EAS build/submit profiles, Android build scripts, placeholder icon/splash assets, and README release instructions.
- 2026-06-08T15:04:36-07:00 [TOOL] `npm.cmd run typecheck` and `npx.cmd expo config --type public` completed successfully after the Android release config changes.
- 2026-06-09T23:35:38-07:00 [CODE] Replaced the generated placeholder image assets in `assets/` with the provided `UnitWise.png` artwork.
- 2026-06-09T23:35:38-07:00 [TOOL] `npx.cmd expo config --type public` confirmed Expo still resolves `icon.png`, `adaptive-icon.png`, and `splash-icon.png` after the asset swap.

## [DISCOVERIES]
- 2026-06-06T21:22:00-07:00 [CODE] The app already had a display formatter, but it allowed up to 12 significant digits in plain form and 6 fractional digits in exponential form, which preserved noisy float tails like `5.400000e+10`.
- 2026-06-06T21:39:00-07:00 [CODE] The app has no navigation stack and currently mounts only `HomeScreen` from `App.tsx`, so the simplest safe page model is conditional rendering inside the existing screen.

## [OUTCOMES]
- 2026-06-06T21:22:00-07:00 [TOOL] Result display now prefers shorter rounded values like `82640.4737` and trimmed exponential values like `5.4e+10`, with layout guards to reduce overflow risk in the answer card.
- 2026-06-06T21:28:00-07:00 [TOOL] Illegal or malformed expressions now show `err` instead of detailed exception text in the main calculator display.
- 2026-06-06T21:39:00-07:00 [TOOL] Calculator top bar now keeps Units and More while moving History and Settings into a three-dot menu; the new Settings screen links to written About and Privacy text pages, and History has its own full-screen list with clear action.
- 2026-06-06T21:46:00-07:00 [TOOL] Tapping a successful history card now returns to the calculator and inserts that stored result into the equation input.
- 2026-06-06T21:49:00-07:00 [TOOL] History now retains only the 20 most recent entries.
- 2026-06-06T21:52:00-07:00 [TOOL] README now reflects the real project structure and current calculator UI behavior instead of generic scaffold documentation.
- 2026-06-08T04:28:00-07:00 [TOOL] Reciprocal result units now display as inline negative exponents such as `km^-1` instead of `1 / km`.
- 2026-06-08T04:36:00-07:00 [TOOL] The three-dot menu now opens as a smaller panel positioned tighter under the trigger, and the trigger no longer stays blue while the menu is visible.
- 2026-06-08T09:53:00-07:00 [TOOL] The overflow menu card now starts below the three-dot button box instead of overlapping it.
- 2026-06-08T09:56:00-07:00 [TOOL] The `Units` and `More` labels are centered again within their pill buttons.
- 2026-06-08T15:04:36-07:00 [TOOL] Android release configuration is ready for EAS production `.aab` builds; Play Console account setup, signing/auth credentials, store listing, data safety, content rating, and public privacy policy remain external publishing steps.
- 2026-06-09T23:35:38-07:00 [TOOL] The app now uses the `UnitWise` artwork for the standard icon, Android adaptive icon, and splash icon assets referenced by Expo.
