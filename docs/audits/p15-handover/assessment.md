# P15 — persistence, recovery and readable handover

Date: 2026-10-14. Implementation delivered; acceptance remains conditional on the browser/device gates below. No deployment was performed.

## Changes

- Named cargo-plan saves and exports now retain capacity settings; automatic recovery already stored the full condition.
- Voyage-input JSON v1 exports all readable saved conditions. Import validates the entire payload, model compatibility, parent graph, IDs and limits before writing. A preview precedes an append under the existing scenario-library Web Lock. The append uses one atomic localStorage write. Imported IDs and parent links are remapped together; existing and unreadable records are retained. Import does not alter the active condition. Results are recomputed when loaded.
- Existing v1 ship packages, cargo/template/assembly libraries, support-template/material properties and individual condition exports remain supported. These are separate portable files; this is not an all-in-one browser-profile backup. Draft recovery is not an exported named voyage until saved.
- Plan-application undo now refuses to overwrite subsequent condition edits, matching the scenario-load guard.
- Recovery queue cleanup compares the exact committed checkpoint, not just its timestamp. An older commit cannot delete a different pending checkpoint with the same timestamp. Failed-write fallback likewise preserves an equal-time checkpoint.
- Report UI captures condition inputs before any await and derives numerical inputs from that snapshot. The JSON and printable HTML share one prepared report. Subsequent edits produce a stale-snapshot notice. A vessel change hides the previous vessel's report.
- Reports include capacity results, weights, tank inputs, cargo/support coordinates, draughts and attitude, GZ ordinates, criteria, wind/securing/load checks, assumptions and unresolved sections. Condition, manifest and embedded-data SHA-256 identifiers aid matching. These identifiers are not signatures or approval certificates; the dataset identifier covers only the embedded datasets.
- Printable HTML is self-contained and script-free, escapes source text, uses print styles and tables for ordinates, and can be printed/saved to PDF by the browser. Numeric display rounds to six decimals; JSON retains numeric precision. Report language is currently English.

## Evidence

- Full automated suite: 524 tests passed, zero failures. Production TypeScript/Vite build, lint, hosting verification and git diff whitespace checks passed. The existing large-chunk advisory remains.
- Targeted persistence/handover tests cover branch round trips, incompatible/future schemas, duplicate IDs, cycles, missing parents/models, malformed JSON, corrupt existing libraries, quota failure, atomic append, clean-store import and printable-output escaping. Existing recovery/report tests exercise denied storage, partial corruption, queued writes and edits during report construction.
- Isolated browser fixture `scripts/p15-browser.html`: prepared report successfully; changing density exposed the old-snapshot notice; a named condition survived reload and restored density 1.000 rather than the fixture default 1.025. User vessel records were not changed; the fixture uses its own vessel ID. Screenshot: `browser-proof.png`.
- `node scripts/p15-process-recovery.mjs`: spawned a separate Node process, used the production recovery queue with a flushed file-backed storage adapter, confirmed revision 1, stalled later persistence, checkpointed revision 3, killed only that child with SIGKILL, then recovered revision 3 while preserving confirmed revision 1. This is an actual process interruption, but NOT a browser/IndexedDB process-crash test or power-loss test.
- The printable sample was opened and visually inspected in the browser. The browser automation download-event wait timed out, so a retrieved UI download file and PDF pagination have not been certified by that test. The generated HTML serializer is tested directly.

## Remaining acceptance gates

- Fresh isolated browser-profile process termination with actual IndexedDB/localStorage during pending saves; repeat on the supported browsers. Do not terminate the user's active browser or Codex process. The available in-app browser shares the user's application, so it was not killed.
- Full clean-profile UI import/export with vessel and material libraries, multi-tab conflict and close/reopen checks on final production packaging. Existing unit/prior browser evidence is not a new complete cross-browser pass.
- Actual storage eviction/private-mode/device loss and PDF pagination for large manifests/layouts remain unverified. No service worker/offline app-shell guarantee has been added; downloaded HTML/JSON can be read offline, but app reopening and calculation resources can still require network/cache.
- Global cross-page undo/redo has not been redesigned: cargo-edit history and guarded load undo retain their existing scope. Temporary editor selections, proposals and camera controls are not condition snapshots.
- No destructive schema migration is introduced. v1 editable inputs remain accepted; future schema versions fail without writing. An interrupted new voyage import leaves the old library or the complete appended library, not a partial per-condition sequence.

P15 must not be labelled fully accepted until its remaining gates are completed. P16 usability and numerical/source qualifications remain unchanged.
