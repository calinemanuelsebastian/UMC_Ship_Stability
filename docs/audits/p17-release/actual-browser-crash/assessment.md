# Actual browser crash recovery — 14 October 2026

Result: PASS for a completed-save recovery after an actual browser-process force quit. Release acceptance remains OPEN.

## Procedure and observed evidence

- Production candidate served at http://127.0.0.1:4201/UMC_Ship_Stability/.
- Brave 1.97.56 / Chromium 155.0.8059.40 on macOS 26.7. Confirmed before and after restart that Profile Path was `/private/tmp/umc-crash-test-profile/Default`. The regular user profile was not terminated.
- Imported the previously verified `cargo-plan (4).json` through the app file picker. Applied its 74-item synthetic Vectis condition and saved it as `Brave crash baseline`. UI confirmed both named save and recovery draft saved locally at 18:59:56.
- Activity Monitor identified PID 209 with open files under the disposable profile. Selected Force Quit (not ordinary Quit). Activity Monitor subsequently displayed `Brave Browser (209) (Terminated)`.
- User relaunched Brave with the same explicit profile argument. The app was opened at the same origin and Vectis Saved cargo plans page.
- Recovery draft `Brave crash baseline` was offered without reimport. Its preview retained 74 loading items and 4061.160 t. Applied the recovery draft successfully.
- Restored displayed results matched the pre-crash baseline: displacement 4061.16 t, KG 8.426 m, water density 1.025 t/m³, transverse FSM 57.226 t·m. Name and synthetic-condition notes also survived.
- Independently selected and previewed the retained named plan: same name, original save time, 74 loading items and 4061.160 t.

Evidence: before.txt / before.png; terminated.txt / terminated.png; recovered.txt / recovered.png.

## Scope and remaining checks

This is an actual abrupt browser-process termination, not a page reload or injected storage exception. It verifies the named plan and completed recovery draft in a disposable browser profile. Comparisons are UI-visible item count and displayed values, not a post-crash deep comparison of every stored field.

The process was terminated after saving completed. This does not verify loss bounds during the debounce interval or an in-flight IndexedDB transaction, power failure, disk corruption, eviction, Safari recovery, voyage storage after a crash, or all multi-tab conflicts. These remain separate qualifications. No deployment gate was accepted and no runtime code was changed.

## Follow-up: pending production database write — PASS

A separate test-only Vite page at `http://127.0.0.1:5202/scripts/recovery-crash-browser.html` imported the real `queueRecoveryWrite`, `planStorage`, journal reader and recovery parser/merge. No production runtime code was changed. This fixture is not the packaged app UI.

1. Committed synthetic revision 1 through production IndexedDB storage.
2. Held a real read/write transaction open using repeated reads, blocking the production storage transaction. Queued revision 2 through the production recovery queue and verified its complete journal synchronously. The page displayed PENDING; the database write had not completed.
3. Confirmed PID 1277 used the disposable profile via Activity Monitor open files. Selected Force Quit; Activity Monitor confirmed Terminated. Evidence: pending-write.txt/png and pending-terminated.txt/png.
4. User relaunched the same profile and test URL. Clicked Verify after crash without reseeding or reimporting data.
5. All five assertions passed: database still held revision 1; revision 2 journal survived; the production parser/merge returned the exact full synthetic revision 2 record; production storage committed the recovered revision; journal was removed only after commit. Values included density 1.011 and longitudinal FSM 123. Comparison canonicalizes property ordering and ignores undefined JSON fields, without rounding numeric values.

Evidence: pending-recovered.txt/png. Fixture: scripts/recovery-crash-browser.html and scripts/recovery-crash-browser.tsx.

This closes the blocked, pending database-write crash case after journaling. It does not demonstrate termination between a specific put request and its transaction commit, pre-journal debounce recovery, operating-system/power failure, or all possible persistence failures. The earlier paragraph listing in-flight writes as unverified is narrowed by this follow-up. Release acceptance remains open.
