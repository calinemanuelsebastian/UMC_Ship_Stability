# P05 — Cargo workspace performance

Date: 2026-10-11. Status: implementation delivered; **acceptance remains open**.
No deployment. P06 has not started. Earlier-stage working changes were preserved.

## Changes

- Spatial neighbourhood queries replace pairwise collision, gap/junction, contact-load and selected-dunnage searches. Local preview checks follow connected support stacks and retain the existing geometric validation rules.
- Auto dunnage runs in a disposable Web Worker. Pending refreshes and obsolete jobs are cancelled; cancelled/settings-invalidated proposals cannot be applied. Busy feedback and cancellation are visible in the assistant.
- Large 3D cargo scenes use shared instanced geometry/materials, direct box picking and partial GPU buffer updates. Selection changes retain geometry. Renderers, textures and workers are disposed on exit.
- Static orthographic drawing layers are memoized. Dense support geometry is batched while remaining selectable; window selection includes batched members. Names remain in the selected-object inspector and searchable object list. Dense drawings suppress unselected labels until zoomed in.
- Object lists use 50-item pages; selection menus show at most 100 matches while retaining the selected item. Search remains available.
- Undo is bounded to 20 snapshots and a 32 MiB estimated serialized payload budget. Older history can expire; the current layout is retained. Immutable-array encoding and spatial caches use weak references.
- Import/recovery accepts up to 40,000 weight records (including supports), retaining the existing 25 MiB payload ceiling. Generation rejects an over-limit result before changing the plan. This is a defensive data limit, **not a claim that every 40,000-item scene is interactive**.

## Repeatable evidence

Apple M2, 16 GiB RAM, macOS arm64, Node 26.7.0. Browser: Codex in-app Chromium, desktop viewport 1280 × 720, retina canvas. Portrait checks used a 390 × 844 viewport on this same desktop, not a physical phone.

Run `node scripts/p05-profile.mjs` (see script arguments for output). The synthetic hold is 100 × 100 m, with 1 m cargo on a 1.5 m grid. It is a performance fixture, not a Vectis Castle loading condition. Both implementations produced identical counts and support masses:

| Cargo | Support members | Full layout check before p95 | After p95 | Support generation before / after |
|---:|---:|---:|---:|---:|
| 100 | 720 | 105.9 ms | 9.8 ms | 50.5 / 57.9 ms |
| 1,000 | 7,744 | 11,552.8 ms | 86.8 ms | 1,199.4 / 444.0 ms |
| 3,376 | 26,540 | 155,044.1 ms | 298.7 ms | 12,091.6 / 1,454.0 ms |

Five samples per check; one generation sample. Runs were not an isolated laboratory benchmark: profiling, development/browser work and some checks overlapped. Raw data: `before.json`, `after-final.json`. Do not equate CPU function timings with UI response times.

Browser reproduction: start Vite, visit `/scripts/p05-browser.html`, load the chosen fixture, select Move cargo → Length / width, reset measurements, bring the canvas into view, and drag cargo in the dense occupied region. Verify object specifications and rejected collision feedback as well as timing. The harness uses the production CargoPlanner but does not use the full App persistence/calculation pipeline. It is not a production build entry.

Final recorded 3,376-cargo / 29,916-total-item run (`browser-final-3376.json`): 54 action samples, 12.9 ms p95 action-to-next-frame feedback; 102 drag-frame samples, **33.4 ms p95**, 66.7 ms maximum frame interval. This still misses the proposed strict <33 ms drag target. Native short drags and development-mode scheduling also limit this measurement; it must not be presented as a certified frame-rate guarantee. Earlier `browser-1000.json` / `browser-3376.json` are exploratory pre-final samples, including work before a harness hot-reload fix, not acceptance evidence.

Verified in the browser:

- 100/1,000/3,376 fixtures render with their generated supports; large-scene picking shows the correct object specifications and blocked drops report collisions.
- Auto dunnage displays busy/cancel; changing settings, starting Preview and immediately cancelling leaves the 3,376 cargo unchanged, no pending cancel control and no Apply spacers action. A pending debounce previously restarted cancelled work; this was fixed.
- Side/End views render the smaller support fixture; portrait controls wrap and the maximum fixture loads. This is a layout check, not physical touch/performance acceptance.
- Unmount removes the canvas; remount restores a single canvas. Three repeated cycles were exercised. Sampled heap fell from approximately 163 MB to 140 MB after the first cycle, then about 145 MB after the next; GC was not forced. This is not a long-duration memory-leak proof.

Automated coverage includes spatial results versus brute-force overlap checks; incremental versus full stacking decisions; worker abort/failure/stale replies; bounded history; instanced picking/selection/disposal; 29,916-record cargo/recovery round-trip; payload and 40,000-record boundaries; and existing cargo, dunnage and persistence regressions. Full suite: 435 tests. Build, lint and hosting-resource verification pass. Existing large-bundle build warning remains.

## Required before accepting P05

1. Ratify desktop drag performance with longer reproducible gestures in the production/full-App workflow, and resolve the strict <33 ms miss rather than silently changing its budget. Include successful commits, large group movement, list selection, top/side/end previews and supported stacking, not just blocked single-item drops.
2. Run full-App save/reopen/export/import and interrupted-operation tests with the large fixture. Parser/recovery round-trip tests are not a substitute for this browser workflow.
3. Establish physical mobile review/edit limits; desktop portrait emulation does not establish them. Test actual touch/pinch and a smaller edit workflow on reference hardware.
4. Complete longer repeated navigation/edit memory measurements and large group/window-selection and surface-load-table profiling. Large surface-load tables and full-condition commit calculations remain possible bottlenecks.

Keep P05 active. Do not advance to P06 or describe this stage as fully accepted based on the CPU speedup alone.
