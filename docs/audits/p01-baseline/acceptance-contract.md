# P01 baseline and acceptance contract

10 October 2026. Status: **P01 accepted as a baseline/discovery stage; product acceptance remains open.** No application behaviour was changed. Findings are deliberately preserved for their owning implementation stages.

## Reproducible baseline

- HEAD: `5f68b82103535ec09f97a381658eaa35e5ecf7b2` plus the pre-existing working tree, not HEAD alone.
- `source-fingerprint.json`: SHA-256 of 370 source/document/data files, platform and tool versions. `working-tree.patch` captures tracked changes; `untracked-baseline.zip` captures pre-existing untracked files. `git-status.txt` records the initial worktree.
- Environment: macOS 26.7 arm64, Node 26.7.0, npm 11.19.0. Exact hardware model/RAM lookup was denied; no hardware-specific FPS claim is made.
- Reproduce with `npm ci`, `npm test`, `npm run build`, `npm run lint`, `node scripts/verify-hosting.mjs` and `node scripts/p01-baseline-probes.mjs` from repository root. Dependency installation was not rerun during this baseline; the existing installed environment was used.
- Full suite: **405 tests, 404 pass, 1 fail**, 91.218 seconds. See `tests.log`. This is a fresh result, not the older 381-test audit.
- Build and lint passed. Hosting assets and all built-in package resources passed at base `/`. A repository-subpath deployment was not exercised in P01.
- Production warning: entry chunk 828.81 kB and OrbitControls/Three chunk 632.67 kB minified; a warning, not a build failure.
- Resource inventory: 29 declared resources across the two built-in packages; all declared file paths exist. Inline resources are marked with no path. `data-register.json` retains manifest metadata and file hashes. Presence does not validate source accuracy.
- `test-inventory.json`: 86 test files. Numerical fixtures, component-render checks and browser interaction are distinct evidence classes.

## Current capability inventory

| Capability | Baseline evidence | Completion gap / owner |
|---|---|---|
| Shared loading, hydrostatic, trim and GZ results | Core solvers, shared-results tests, source-reference tests | Audit supported conventions/coverage; P03, P09–P11 |
| Cargo capacity and layout handoff | Capacity tests and previous handoff browser evidence | Boundary count bug B01; field/task integration P02–P03 |
| Tanks, defaults, operational weights, decks | Tank, preset, clean-loading, tween-deck and vessel-workflow tests | Unified workplan, source mapping and variable CG/FSM coverage; P04 |
| 2D/3D cargo editing | Placement, snapping, group, stacking, history and view tests | Device/reproduction matrix, performance and integration; P05–P06 |
| Cargo/material definitions and identification | Identification, batch-edit and material tests | Complete reusable family/assembly library; P07 |
| Auto dunnage, boundaries and frames | Auto/boundary/arrangement/support-frame tests and new probes | Multi-tier support B02; runtime B04; P08/P12 |
| Weather and intact assessments | Intact/weather/equilibrium/reference tests | Applicable complete inputs and end-to-end verdict/report; P10–P11 |
| Local surface loading | Cargo-load-checks tests | Screening is not general contact/structural approval; P12 |
| Lashing assessment | No integrated full workflow established | P12; ship-specific source applicability unresolved |
| Auto ballast | No integrated optimiser established | P13; manual tank operation already exists |
| Plans/recovery/report | Recovery, saved-plan, cargo-plan, report and settings tests | B03; complete voyage/report and fresh crash/device acceptance P14–P16 |
| Hosting | Fresh build and hosting verifier | Subpath, deployed workflow and rollback P17 |

## Defect and evidence-gap register

### B01 — Package limit is one unit low at an exact capacity boundary

Confirmed by `p01-baseline-probes.mjs`. Pontoon reference draught 3 m, sea density 1.025, 4,000 t lightship-only mass, 2 t packages. Mathematically 6,150 t displacement leaves 2,150 t and 1,075 packages. Solver returns `6149.999999999999`; flooring gives 1,074.

**Owner:** P03 (capacity numerical boundary), surfaced in P02. **Priority:** medium correctness. **Close with:** independently expected exact-boundary and just-over/under tests; numerical tolerance must not admit a genuinely overweight package. Preserve actual physical mass and avoid presentation rounding as the calculation algorithm.

### B02 — Elevated lateral gaps are not automatically supported

Confirmed geometry diagnostic: two 1 m-high cargo layers at x=2 and x=3.5, y=2, with a 0.5 m gap; auto dunnage max gap 0.6 m. Four pieces appear at bottomZ=0 only. Upper gap skipped with “The cargo footprint must be fully supported.”

This rejection is not proof the collision engine is wrong: the upper spacer actually lacks continuous support. It reproduces the user's workflow limitation. **Owner:** P08/P12. **Priority:** high workflow gap. **Close with:** deliberate supported multi-tier arrangement/assembly, upper-level diagnosis and independent load path; never merely disable support validation or fill unsupported voids. Test unequal heights, selected scope, removal and repeated generation.

### B03 — Saved-plan signature regression suite is not green

`src/app/cargo-surfaces.test.mjs:19` expects a resource list including `loading.capacity`; `modelSignature` excludes that metadata to preserve old plan compatibility. The independent capacity compatibility test passes. This is evidence of a stale test expectation, but not permission to simply delete the failure.

**Owner:** P02. **Priority:** high release gate. **Close with:** a real pre-capacity saved-plan fixture and a current plan, both imported/restored through production parsers; independently establish the intended signature contract, then update the obsolete expectation. Guard actual incompatible vessel changes. Baseline remains 404/405 until resolved.

### B04 — Synchronous auto dunnage does not meet large-layout responsiveness

The planner calls `autoDunnageBatch` synchronously. Single-call diagnostic after full test/build completion:

| Cargo units | Generated members | Compute time | Dunnage mass |
|---:|---:|---:|---:|
| 100 | 720 | 126 ms | 1.0998 t |
| 1,000 | 7,744 | 2,146 ms | 11.82896 t |
| 3,376 | 26,540 | 24,857 ms | 40.53985 t |

Synthetic flat hold, 1 m units on a 1.5 m grid, open timber frames, 0.6 m accepted gap, no walls. These are algorithm times, not rendered FPS, and one observation per size, not p95. The earlier concurrent run is retained separately and must not be used as a clean benchmark. Resource/cache/load differences explain why this cannot be compared directly with the old 300-unit 230 ms claim.

**Owner:** P05/P08. **Priority:** high usability. **Close with:** cancellable background/partitioned computation, progress and stale-job protection; repeated browser measurements plus identical geometry/mass results. Count cargo plus generated members, not cargo alone. Test removal/history/storage at resulting object counts.

### B05 — Historical placement complaints are not yet browser-reproduced

Old reports include group drag, near-contact jitter, paste positioning and pan/selection conflict. Current automated placement/group/snap tests pass; the historical browser audit is not current proof. **Owner:** P06, investigation cases frozen below. **Status:** unconfirmed in current build; do not invent a new defect or declare them fixed. **Close with:** current browser reproduction or explicit passing evidence for each case/device.

### B06 — Production inspection starts with an empty selection inspector

Fresh production Cargo layout opens with Select and Properties active, “Choose an item” on an empty plan. No cargo has been placed. Observed in isolated browser. **Owner:** P02. **Priority:** usability. **Close with:** useful empty state and primary Add cargo action; selection inspector only when meaningful, without breaking returning-user context.

### Evidence restrictions

- Existing tab 11 timed out twice on browser focus emulation. Fresh tab 12 at isolated production origin `127.0.0.1:4175` loaded successfully. Do not classify this as an app crash.
- Production smoke in P01: Overview → Cargo layout, current condition visible, planner controls loaded, no captured console errors. Screenshot retained. No existing user plans were modified. This is not a fresh complete workflow/device test.
- Real touch/trackpad, broad cross-browser operation, FPS, memory plateau and new crash tests remain P05/P06/P15/P16 work.

## Placement reproduction pack for P06

Use isolated disposable plans, stable item IDs and recorded coordinates. Capture preview and final state, not just a screenshot.

1. Two 1×1×1 m units plus a support assembly; select by window/crossing, drag 2 m, compare identical translation of every member and one undo restoring all.
2. Drag one unit towards a fixed neighbour from both directions with snapping off/on and a 0.1 m requested gap; no jitter between valid/invalid positions, commit equals preview.
3. Paste a rotated multi-unit assembly; projected group centre follows pointer in top/side/end; click commits once; Escape commits nothing.
4. Start selection, then explicit pan; mouse/trackpad/touch must pan without changing cargo. Returning to selection preserves camera and permits deselect.
5. Stack on known support, then remove support; reject unsafe removal atomically. Non-stackable cargo requires independent load path.
6. Place beside a stepped boundary and over hatch seams/gaps; test both rotations, full-height views and no partial group acceptance.

## Requirements-to-acceptance matrix

All rows below are mandatory release requirements within declared scope. Test names identify evidence seeds, not automatic acceptance of the owning stage.

| ID / owner | Existing test seeds or missing implementation | Required acceptance evidence |
|---|---|---|
| R01/P01 baseline | Full suite, new probes/inventory | Recorded revision, known failures, sources and supported envelope |
| R02/P02 coherent workflow | navigation, saved-scenarios, cargo-plans, capacity | Onboard→cargo→ballast→review without duplicate entry; real legacy import |
| R03/P03 numerical data | loading, hydrostatics, trim, reference-replay, constant-lcb, capacity-limit | Analytic/documented/independent ship; signs, boundaries, B01, source changes |
| R04/P04 onboard loads | tank-operations, departure-presets, tween-deck, vessel-workflow | Fill modes reconcile; CG/FSM, densities, fixed/movable mass and UI integration |
| R05/P05 scale | cargo-performance, neighbours, new benchmark | Repeatable browser response/FPS/memory and cancellable heavy jobs |
| R06/P06 placement | cargo-placement, group-move, snapping, copy-group, window-selection, history | Six reproduction-pack cases across input devices and views |
| R07/P07 templates | identification, batch-edit, dunnage-materials | Type/instance overrides, gross/tare, material provenance, template roundtrip |
| R08/P08 support workflow | auto/boundary-dunnage, arrangement, remove-dunnage, support-frame | Multi-tier/contact/junction/ventilation; no duplicate members; mass and atomic undo |
| R09/P09 3D | scene-data, heel-view, trim-view, material-opacity, shared-results | View numbers equal current condition; datums, signs, stale states and selection |
| R10/P10 intact curves | stability-curves, intact-assessment, kg-limit, downflooding | Independent criteria/areas/equilibria and missing-data outcomes |
| R11/P11 weather | weather-criterion, weather-assessment, wind-profile/equilibrium | Complete documented cases, both supported directions, failure/incomplete cases |
| R12/P12 securing/support | cargo-load-checks only covers screening | Independent securing/support force cases; capacities/applicability; no false pass |
| R13/P13 auto ballast | New optimiser required | Small independent enumeration, infeasible/locked/full/slack tanks, final checks and atomic apply |
| R14/P14 voyage | loading-presets, assessment-settings | Departure/arrival/intermediate transitions, same cargo, invalidated assumptions |
| R15/P15 recovery/report | recovery, assessment-report, cargo-plans | Fresh process interruption, storage/conflict/migration, readable snapshot report |
| R16/P16 acceptance | All above + new browser/device pack | Uncoached full workflow on 3 vessels; no critical/high blockers |
| R17/P17 release | production-packaging, hosting verifier | Subpath/deployed smoke, rights review, backup and rollback |

## Supported-envelope acceptance targets

These are release targets to verify, not claims about the current beta.

- Devices: reference desktop macOS arm64; desktop Chromium and Safari stable; Windows Chromium smoke; portrait iOS Safari and Android Chromium. Record actual browser/OS/hardware versions at execution. If unavailable, mark not tested and narrow release claims; automation is not evidence of physical multitouch.
- Layouts: empty/1/100/1,000/3,376 cargo instances with real generated members, one/two decks, holds and hatch surfaces. The 3,376-unit case is a required desktop stress target. Mobile must at least review/reopen that case and edit small cases; set its editing cap from measurements, with a clear limit rather than a freeze.
- Desktop ordinary feedback p95 <100 ms and drag frame time p95 <33 ms after warmup. Heavy-task progress/cancel acknowledgement <100 ms. Record five repetitions per acceptance workload and median/p95; 60-second task ceiling with graceful cancellation/failure. P05 should improve heavy completion time as well, without sacrificing correct geometry.
- Numerical comparisons use per-fixture units/tolerances from reference sources; machine rounding is not measurement precision. Property tests cover conservation, sign symmetry where justified and serialization invariance.
- Missing or outside-range data never produce NaN, an invented value or a green pass. Report failure and incompleteness separately.
- EN/RO; desktop and 390×844 portrait; keyboard focus and accessible alternatives; no horizontal page overflow or overlapping controls in supported viewports.
- Data safety: existing plans untouched by tests; confirmed saves recoverable; whole-group edits/proposals one transaction; failed imports/migrations do not replace valid state.

## Source and scope decisions

The supplied preliminary booklet is the agreed educational reference. The corrected apples numerical fixture is a regression case, not a fully spatial plan or final approval. Analytic pontoon and synthetic unrelated-vessel tests remain independent checks.

`data-register.json` indexes all packaged resources, not every original supplied PDF. P03 must attach or verify missing source-page/hash/datum/applicability fields and inspect original evidence before numerical corrections. Known issues: securing manual identified as Vectis Isle; strength document contains superseded limits; reconstructed mesh lacks a coupled heeled draft path. These block particular assessment claims, not honest partial educational use.

No damage-stability, approved-instrument, universal dangerous-goods, structural-rack, ballast-discharge or complete operational-compliance claim is in the release contract without separately validated scope. Template representation is not regulatory coverage.

## Documentation reconciliation

Old ship-package text claiming Vectis lacks cross curves conflicts with its later constant-LCB section and present manifest. Old weather workflow text says settings do not persist, superseded by `assessment-persistence-and-report.md` and parser tests. Historical notes are now explicitly labelled; use the current manifest and latest evidence rather than assembling capabilities from incompatible dates.

## P01 gate decision

Baseline build is reproducible; failures are catalogued; all P02–P17 deliverables have test ownership and acceptance evidence defined. Therefore **P01 is accepted as discovery/baseline**, not as a green release. The one failed test is preserved openly and blocks release until P02 resolves its contract. Large-plan performance and multi-tier support remain open high-priority work.

Next: **P02**, including B03 legacy-plan contract and B06 empty-state/task order. Do not silently start P03–P17; B01, B02 and B04 have explicit owners. Subsequent findings extend this register with reproducible evidence.
