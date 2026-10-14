# Product completion roadmap

Version 1 · 10 October 2026 · controlling implementation plan

## Purpose and scope

Deliver a polished, local-first ship loading and stability planning application covering a complete operator workflow, rather than reproducing spreadsheet tabs. Preserve open ship/condition formats, free static hosting, English/Romanian interfaces and the shared numerical calculation architecture. Reuse the supplied ship documents and corrected numerical reference; do not make reproducing the CAD drawing a prerequisite for usable software.

This roadmap supersedes the implementation order in `workflow-and-reference-case.md`; that document remains a reference specification. Old numbered “steps” in other documents are historical and do not identify this plan. Use the stable identifiers P01–P17 below in future requests.

P01 is **accepted as the baseline/discovery stage**; see [P01 evidence](audits/p01-baseline/acceptance-contract.md). P02 is **accepted for workflow/integration**; see [P02 evidence](audits/p02-workflow/acceptance.md). P03 is **accepted for numerical foundations**; see [P03 evidence](audits/p03-foundations/acceptance.md). P04 is **accepted for the onboard condition workplan**; see [P04 evidence](audits/p04-onboard/acceptance.md). P05 has performance improvements implemented but remains **open for acceptance**; see [P05 measurements and remaining gates](audits/p05-performance/assessment.md). P06 placement/editing implementation and desktop checks are complete, with acceptance conditional on P05 and physical-device checks; see [P06 evidence](audits/p06-placement/assessment.md). P07 reusable cargo/material templates and assemblies are implemented with regression and desktop workflow checks; acceptance remains conditional on P05/P06 dependencies; see [P07 evidence](audits/p07-templates/assessment.md). P08 geometric support planning and desktop checks are implemented; acceptance remains conditional on the existing dependency gates; see [P08 evidence](audits/p08-supports/assessment.md). P09 numerical attitude/inspection is implemented with shared-result and browser checks; acceptance remains conditional on the existing dependency gates; see [P09 evidence](audits/p09-inspection/assessment.md). P10 directional numerical assessment and curve inspection are implemented with regression/browser evidence; source-data and existing dependency qualifications remain explicit; see [P10 evidence](audits/p10-intact/assessment.md). P11 directional wind/rolling assessment, profile validation and cargo silhouette support are implemented with regression/browser evidence; vessel-source and dependency qualifications remain explicit; see [P11 evidence](audits/p11-weather/assessment.md). P12 support/securing screening is implemented with numerical and browser evidence; ship-specific approval, unsupported structural models and existing dependency gates remain qualified; see [P12 evidence](audits/p12-securing/assessment.md). P13 bounded auto-ballast proposals are implemented with regression/browser evidence; transfer sequencing remains unavailable without documented pump data and existing source/dependency qualifications remain explicit; see [P13 evidence](audits/p13-auto-ballast/assessment.md). P14 named voyage snapshots, branch operations, reconciliation and per-stage final review are implemented with regression/browser evidence; existing source/dependency qualifications remain; see [P14 evidence](audits/p14-voyage/assessment.md). P15 handover and persistence improvements are implemented, with browser-process and full transfer acceptance still open; see [P15 evidence](audits/p15-handover/assessment.md). P15–P17 remain **not yet accepted**. Existing implementations are candidates for reuse, not evidence that a stage is complete. This plan was informed by the current source/module inventory and workflow documentation, not a fresh full-system certification audit.

The first release scope is documented intact loading/stability, general-cargo arrangement, supports, securing calculations where a substantiated method is available, ballast planning, visualisation and reproducible reporting. A completed educational/planning workflow must not be advertised as an approved loading instrument. Operational approval is a separate process. Missing vessel data must remain explicit; absence of data must not be silently replaced by geometry or a favourable assumption.

## The operator's final workflow

1. **Create/open a voyage and select the ship.** Choose package revision, condition name, relevant voyage/load-line basis, surrounding-water density and deck configuration.
2. **Prepare the onboard condition in one workplan.** Review protected lightship; enter fuel; complete service liquids, crew, provisions, stores, spares and movable equipment. Review current ballast without having to finalise it yet.
3. **Plan and arrange cargo.** Define reusable cargo, estimate capacity with existing ballast/reserves, place cargo, supports and dunnage, and check access/ventilation and local loading. Iterate as needed.
4. **Balance using ballast.** Edit manually or request a constrained proposal using the now-known cargo and support mass. Review and apply it.
5. **Assess and inspect.** Review draughts, trim/list, stability curves, wind, local loading and securing; make corrections. Every page uses the same condition revision.
6. **Check the voyage.** Compare departure, arrival and relevant intermediate/port/ballast-transfer conditions. A safe endpoint does not establish safety throughout a transfer.
7. **Save, export and hand over.** Save the editable plan, download a backup, and produce a readable report with outstanding checks and source references.

These are task steps, not seven independent copies of data. Users can return to any step without losing work. Ballast affects initial capacity too, so it remains visible in totals before final balancing.

## Product design rules

- Main navigation: Overview, Loading, 3D inspection, Assessment, Saved plans/reporting; put ship-data editing, validation and theory under supporting tools. Validate this architecture in P02 before renaming routes.
- Loading: **Onboard condition → Cargo capacity → Cargo layout → Ballast → Review totals**. The onboard workplan groups Fuel and Other onboard loads; the latter includes service tanks/liquids, crew, stores, provisions and movable equipment. Lightship is a protected reference subsection. These are sections within one task, not scattered pages. Totals remain a summary of shared data.
- One obvious primary action per task. Use contextual inspectors, sensible documented defaults and progressive disclosure. Keep advanced equations/source detail available without making them mandatory routine inputs.
- No layout jump when hints, previews or warnings appear. Focus/scroll moves to newly opened controls when needed. Preserve the working camera, selection and scroll state where practical.
- Mouse, trackpad, touch and keyboard must each support the essential workflow. Right-click and keyboard shortcuts supplement visible controls.
- Units remain visible. Colour is supplementary to text/symbols. Separate invalid input, known exceedance, missing evidence and pending computation. Never let “not checked” look like “passed”.
- Destructive/group operations are atomic and undoable. Preview is not a committed load. Named user changes must not be overwritten by defaults or a late solver response.
- Calculate on committed input changes; cache by condition and vessel revision; keep heavy calculations outside pointer/render loops. Render numerical results in 3D without requiring a full physics engine.
- Source-labelled templates are starting points, not certificates. Density is not a proxy for structural strength; extra dunnage is not proof of adequate restraint.

## Common completion gate — required for every stage

Before implementation: record scope, dependencies, input/output contract, supported envelope, data gaps and acceptance cases. Capture an existing regression/failing case where relevant.

Before closing: complete the full UI-to-model-to-calculation-to-save/report path affected by the change; run meaningful unit, integration, boundary and browser checks; cover both built-in vessels and at least one independent imported vessel where applicable; check English/Romanian, narrow portrait and desktop, and relevant input devices. Run build/lint and the relevant regression suites. Record tested versions, actual evidence and any unresolved limitations.

A stage is **Accepted** only when its stated gate passes and no blocking defect remains in its declared scope. A missing indispensable document produces **Blocked — data required**, not “finished”. A provisional implementation remains **In progress**. Do not move to the next dependent stage merely because code compiles.

No finite suite proves correctness in every possible condition or promises no future intervention. The commitment is to a defined supported envelope, systematic adverse-case testing and no knowingly unfinished required behaviour. New defects reopen the relevant stage with a regression case. Scope changes are recorded with their reason and dependency impact instead of silently diverting the work.

Statuses: Not started / In progress / Blocked / Ready for acceptance / Accepted. For each stage retain an evidence record under `docs/audits/`, linking tests, measurements and screenshots rather than asserting completion from memory.

## Implementation sequence

### P01 — Establish the baseline and acceptance contract

**Depends on:** none.

- Inventory current features, source documents, packages, known bugs and older audit claims. Reconcile stale documentation (for example, earlier “no cross curves” descriptions versus later constant-LCB implementation).
- Preserve existing uncommitted work and record the revision/diff used for the baseline. Keep corrected apples fixtures, analytic pontoon cases and independent synthetic/imported-vessel fixtures separate.
- Build a requirement-to-feature-to-test matrix. Record source page/hash, units, datum, applicability and confidence for every calculation dataset.
- Define demo/release scope and target devices, browsers and maximum supported scene size. Turn reported Cargo layout defects into reproducible cases.

**Gate/tests:** reproducible baseline build; catalogued failures rather than hidden failures; each roadmap deliverable has an owner stage and acceptance test. No assertion that an old test result represents the current build.

### P02 — Unify the workflow and condition ownership

**Depends on:** P01.

- Implement the workplan/navigation above with a persistent condition summary and a clear next action. Group all non-fuel/non-ballast/non-cargo operational loads together; keep supporting material physically attached to its cargo-layout workflow while accounting for it once.
- Define stable identities for voyage, condition, tank, cargo template, cargo instance, assembly and material. Separate authoritative inputs, proposals, derived results and view preferences.
- Finish capacity-to-layout handoff, optional fields, meaningful empty/error states and context-preserving navigation.
- Define command/transaction boundaries shared by undo, autosave and async proposals; prevent stale calculations updating a newer condition.

**Gate/tests:** complete a small condition without duplicated entry or unexplained navigation; browser back/forward, restore, vessel switching, pending calculations and errors leave the correct condition visible. Existing saved plans migrate without losing data.

### P03 — Complete vessel-data and numerical foundations

**Depends on:** P01–P02.

- Audit upright/trimmed hydrostatics, cross curves, permissible KG, tank tables, draft marks/datums, cargo/deck geometry, movable panel states, source limits and wind/flooding data.
- Validate units, signs, interpolation and coverage; investigate likely table errors without automatically replacing unusual valid data. Preserve original and corrected values and review traceability.
- Establish capability flags from available data rather than ship name. Keep reconstructed external geometry independent from numerical source tables.
- Verify mass/moments, density treatment, free-surface corrections, draft/trim/heel conventions and source-result consistency. Never extrapolate silently.

**Gate/tests:** analytic pontoon, corrected apples case, documented booklet conditions and an unrelated ship; exact knots, interpolation, range limits, missing/duplicate/nonfinite rows, source changes and cache invalidation. Distinguish regression tolerance from physical accuracy.

### P04 — Complete the onboard condition workplan

**Depends on:** P02–P03.

- One place for fuel, service liquids, crew/provisions/stores/spares, fixed references and movable equipment. Avoid counting machinery already included in lightship twice.
- Tank editing by fill percentage, volume or mass with consistent conversion and capacity enforcement; distinct sea, ballast and other-liquid densities.
- Obtain CG and free-surface data from appropriate filling tables. State when only approximate geometry or fixed centres are available; do not invent volume-dependent centres. Handle empty/full/partial tanks and source-specific FSM conventions.
- Preserve departure defaults as starters, never silent resets. Installed/stored tween-decks keep onboard mass but update centres, storage footprint and occupied space.

**Gate/tests:** all supported input modes yield equal mass/moments; fill limits, density changes, consumption, empty/full transitions, unavailable tables, panel modes and undo/restore. A single total reconciles all categories and every view.

### P05 — Make Cargo layout responsive at useful scale

**Depends on:** P02; use P03 surface contracts.

- Profile actual drag, selection, camera movement, placement preview, list updates, support proposals and persistence before changing algorithms.
- Apply spatial indexing, incremental updates, render batching/instancing, virtualised lists and workers only where measurement justifies them. Cancel obsolete work and cap cache/history memory.
- Keep geometric preview and commit validation consistent while avoiding full-scene scans on every pointer move.

**Gate/tests:** repeatable 100-, 1,000- and 3,376-unit layouts, including generated support members, on recorded reference hardware. Proposed acceptance budgets: ordinary action feedback under 100 ms; p95 drag frame time under 33 ms on the reference desktop; heavy tasks show progress/cancel promptly and do not lock the UI. Measure and ratify actual support limits in P01, especially mobile. Stress above the supported limit must fail gracefully, not crash or lose a plan. Check memory after repeated edits/navigation.

### P06 — Finish placement and editing mechanics

**Depends on:** P03, P05.

- Consistent selection, window/crossing selection, group movement, pan, zoom, rotate, copy/paste, delete and undo/redo in supported 2D/3D modes.
- Centre paste previews on the pointer; use the same snapping, collision, boundary and support checks for preview and commit. Support grid, cargo contact and explicit ventilation gaps.
- Complete stacking in all views, independent racks for non-stackable goods, whole-group transforms, hull/tween-deck/hatch placement and full-height side/end views.
- Distinguish projected overlap from actual 3D intersection. Do not let a failed group edit partially move cargo.

**Gate/tests:** corners, stepped holds, touching faces, near-coincident coordinates, rotation near walls, group boundary failures, multiple support planes, different heights, bridging panels, blocked headroom, touch/trackpad gestures and interrupted drags. Save/restore/undo reproduces geometry and totals exactly.

### P07 — Supply reusable cargo and material templates

**Depends on:** P04, P06.

- Initial cargo families: palletised/boxed goods (including ventilated perishables), crates/cases, drums/barrels, bags/bales, rolls/reels, coils, pipes/bundles and custom/project cargo. Add ISO containers as a distinct family with their own geometry/identification and securing requirements, not a universal example for breakbulk.
- Template fields: geometry/orientation, gross unit mass and tare convention, quantity, CG where known, stackability, allowable top load if documented, contact footprint, destination and identification/appearance layers. Separate shared type edits from individual overrides and stable instance IDs.
- Dunnage/material catalogue: timber bearers/boards/chocks/frames; plywood sheets/platforms; rubber/anti-slip mats; purpose-rated bags; steel/aluminium frames and custom materials. Expose only operations supported by an implemented material model; mark other entries manual-only.
- Editable density and dimensions calculate material mass. Add capacity/friction/contact properties with units, source and validity ranges; do not supply invented rated capacities. Templates and assemblies can be saved locally and exported.

**Gate/tests:** mixed orientations with shared-property edits; overrides preserved; unique identities; invalid dimensions; gross/tare double-count prevention; template import/versioning; geometry versus bounding-envelope distinction for cylinders/coils. Specialist restrictions remain visible.

### P08 — Complete dunnage and support planning

**Depends on:** P05–P07.

- Keep three simple tasks: automatic gap arrangements, individual members and support/rack assemblies. No selection means all eligible areas; a selection scopes the proposal visibly. Explain excluded cargo and rejected gaps individually.
- Handle cargo-to-cargo, cargo-to-hold boundaries and relevant elevated layers; derive contact from supported geometry rather than filling a top-view projection. Do not brace against an unverified hull lining or unsupported upper void.
- Preserve ventilation/access channels, frame openings and deck exclusions. Connect intended members at junctions and distinguish deliberate openings from accidental discontinuity.
- Optimise material arrangement within declared constraints, not blanket solid fill. Show member count, added mass/CG, affected units, warnings and incremental totals before applying an atomic batch.
- Repeat generation without duplicates; recompute stale previews; remove by scope without leaving dependent cargo unsupported. Independent racks carry load around non-stackable cargo.
- Separate geometric assistance from structural adequacy. Where force/capacity evidence is absent, identify the missing check; finish engineering assessment in P12.

**Gate/tests:** the user's staggered-array gap case; 1,000+ units; unequal heights, multi-tier stacks, narrow/wide/boundary gaps, seams, existing structures, ventilated cargo, mixed materials, unsupported candidates, no viable arrangement, cancellation, repeat/add/remove/undo. Reconcile actual member mass and CG, not solid envelope volume.

### P09 — Complete numerical attitude and 3D inspection

**Depends on:** P03–P04, P06–P08.

- Drive draft/trim/heel and graphical attitude from the same revisioned numerical results used by the assessment; no recalculation per rendered frame.
- Inspect cargo, dunnage, fixed/movable equipment and tanks by category/specifications. Tanks show volumes/fills where geometry supports them; schematic tank shapes/CG markers are labelled as such, not drawn as cargo blocks.
- Show physical and corrected CG/GM distinctions; relevant G/B/M references where defined, waterline, AP/FP and available draft-mark readings, mean draught, trim difference/angle and signed heel/list. Preserve legibility of axes, labels and transparency.
- Separate calculated condition, imposed teaching attitude and visual exaggeration. Animate transitions for readability without presenting them as physical dynamics.
- Resolve current datum/coverage issues where documentation permits. If heeled draft/trim paths or adequate hull data are absent, do not invent coupled large-angle drafts or volume preservation from a reconstructed mesh.

**Gate/tests:** numeric labels, report and view match; port/starboard and bow/stern sign tests; zero and limit cases; stale/pending/error results; hidden categories; stored decks; picking; clipping, transparency and camera movement. Every available measurement has an explicit datum and every unsupported measurement is withheld with a reason.

### P10 — Complete curves and intact-stability assessment

**Depends on:** P03–P04, P09.

- Consolidate existing KN/GZ, equilibrium, hydrostatic and allowable-KG/GM work into one comprehensible assessment with curve inspection, units, thresholds and source details.
- Validate applicable GM, GZ, peak-angle and area criteria, free surfaces and downflooding truncation. Handle source coverage, asymmetric loading and qualified port derivations explicitly.
- Avoid accepting a sampled maximum or approximate root without adequate numerical resolution and a declared method. Track each criterion independently and aggregate incompleteness honestly.

**Gate/tests:** independent reference calculations; integration/root/interpolation convergence; multiple/no equilibria; negative GM; opposite TCG signs; flooding before threshold; missing port/angle/displacement coverage; equality at thresholds; incorrect units and double FSM correction. Charts, numerical margins and exports agree.

### P11 — Complete wind and severe wind/rolling criterion

**Depends on:** P09–P10.

- Audit and finish existing weather routines rather than adding a second solver. Derive documented quantities where possible and request only genuinely missing condition-specific inputs.
- Account for above-deck cargo in exposed profile where a justified numerical profile method exists; handle shielding/overlap and unknown profiles explicitly. Do not use arbitrary mesh appearance as verified windage.
- Verify pressure, lever arm, condition-dependent factors, roll, steady heel, energy areas, deck-edge/downflooding limits and relevant directional coverage. Persist source assumptions and invalidate dependent results after edits.

**Gate/tests:** independently worked complete cases and deliberate failing cases; missing profile/factor/flooding data; both wind directions when supported; changed draft/cargo/density; coefficient endpoints; invalid empirical range; energy intersections; saved/reopened settings. Report a partial numerical result without calling the complete criterion passed.

### P12 — Complete support, local loading and lashing assessment

**Depends on:** P03, P07–P08, P10–P11.

- Establish ship-specific applicability of securing/strength references first. The existing documentation identifies a supplied securing manual as Vectis Isle; do not assume it applies to Vectis Castle. Superseded strength tables cannot become live limits.
- Build securing groups connected to actual cargo, contact surfaces, dunnage and rated securing points. Define masses/CG, relevant accelerations, friction, lashing directions/angles, MSL/design conversion, pretension assumptions and load-sharing method.
- Implement the selected justified sliding/tipping/restraint checks and supported support/contact/bearing/member/joint checks. Distinguish interlayer pads, lateral bracing and load-bearing racks. Apply method-specific margins, not an arbitrary blanket multiplier.
- Extend existing uniform-load screening to relevant documented local rules where inputs permit. Distinguish uniform deck limits, contact pressure, hatch-panel loads and whole-ship longitudinal strength.
- Longitudinal strength needs validated distribution, buoyancy and permissible limits; implement only with adequate data. Otherwise retain a distinct unassessed release limitation, not a pass.

**Gate/tests:** hand-worked longitudinal/transverse sliding and tipping cases, near-zero friction, ineffective lashing angles, missing/weak anchors, mixed lashings, eccentric loads, shared support ambiguity, rack overload, crushing/bending limits where supported and cargo spanning hatches. No credit for a stronger lashing than its attachment or for density as strength.

### P13 — Add constrained auto ballast

**Depends on:** P04, P08, P10–P12.

- Keep manual ballast available. Offer a simple goal: target trim/list/draught or minimise ballast/change while respecting selected constraints. Show editable tanks, locked tanks, density and available capacities.
- Use a bounded numerical optimiser and the same tank interpolation and assessment engines. Account for changing tank CG/FSM, displacement/draft limits, table coverage, tank restrictions and applicable stability limits; evaluate final candidates through the complete available assessment.
- Distinguish “feasible under checked constraints” from “globally optimal” or universally safe. Unavailable safety constraints remain unresolved. Do not silently move cargo, change fuel or assume symmetric tanks.
- Present proposed fills, before/after results, missing checks and infeasibility explanations; apply once as an undoable transaction. Cancel/discard stale runs.
- Provide a separate staged-transfer check using documented pumping/connectivity/rate restrictions when available. Without them, the result is a final-condition proposal, not an executable pumping plan. Ballast management/discharge restrictions are not inferred.

**Gate/tests:** symmetric/asymmetric ships, empty/full/slack tanks, independent densities, locked tanks, limited capacity, impossible targets, out-of-table proposals, threshold tolerances, multiple feasible solutions, non-convergence, cancellation and stale edits. Compare small cases against independent enumeration; verify intermediate stages where sequence support is declared. No silent partial application.

### P14 — Integrate voyage conditions and final review

**Depends on:** P09–P13.

- Named departure, arrival, intermediate, port loading/unloading and ballast-change conditions; a shared voyage view with explicit snapshots and consumption/cargo changes.
- Reconcile planned/placed/remaining cargo and supports; group totals by hold/area/type with expandable instances. Keep category and assembly mass traceable.
- Show changes in draft, trim, heel, GM/GZ, weather, local loads and securing. Invalidate/review assumptions affected by consumption, loading, deck changes or reballasting without discarding unaffected user inputs.

**Gate/tests:** complete load–sail–consume–unload workflow; branch/edit/revert conditions; a bad intermediate state despite acceptable endpoints; template edits and assembly changes; matching results across pages. Missing data and unsupported checks remain visible in the final review.

### P15 — Finish persistence, recovery and readable handover

**Depends on:** P14; persistence regression checks also run at every earlier stage.

- Versioned editable ship, material/template, voyage and condition exports; document browser-local storage and backup portability across origins/devices.
- Complete coherent autosave, undo/redo, recovery and migration for all new fields. Verify real process interruption in isolated test profiles without disturbing the user's real plans.
- Produce a readable printable/PDF-ready report plus open machine-readable data: condition and source revisions, weights/tanks/layout, capacity, drafts/attitude, curves/criteria, wind, securing/support results, assumptions and unresolved checks.
- Snapshot inputs atomically for reports; never mix a new layout with old calculations. Retain exports without forcing cloud accounts.

**Gate/tests:** refresh/close/process crash during pending saves; storage denied/full/corrupt; multi-tab conflict; old/new schemas; malformed imports; missing model; interrupted migration; export/import on a clean profile; report generation during edits; offline return where supported. Latest confirmed save must be recoverable; potential unsaved work must be reported honestly.

### P16 — Conduct full usability and release acceptance

**Depends on:** P01–P15 accepted within declared scope.

- End-to-end scenarios on Vectis Castle, pontoon and an imported vessel; start with a clean browser and finish with a reopened plan and readable report.
- Test desktop mouse/keyboard, trackpad and portrait touchscreen; both languages; focus, validation, accessible names, contrast and chart alternatives. Give a new user the task without coaching and record confusion/time/errors.
- Repeat performance tests on the complete system; test slow resource loading, failed fetch, unavailable WebGL, oversized scenes and interrupted heavy jobs.
- Review reference evidence with the coordinator/domain reviewer; collect and resolve blocking usability/numerical defects. Publish supported capabilities and explicit gaps.

**Gate/tests:** no open critical/high-severity defects in core workflow; no data-loss, duplicated-weight, stale-result or false-pass defects; agreed performance targets met; all mandatory acceptance cases reproducible. A scripted success alone is not usability acceptance.

### P17 — Package, deploy and maintain the release

**Depends on:** P16.

- Verify production base paths, code splitting/assets, licences and redistribution rights for ship documents/images/datasets, offline/error behaviour and security of imported files/assets.
- Build a tagged release with changelog, reproducible test evidence, user quick-start, demo plan, known limits, backup/recovery instructions and rollback procedure.
- Deploy through the existing hosting workflow only when authorised. Smoke-test the deployed build, including a fresh session and saved-plan compatibility. Keep previous release recovery possible without destructive storage migration.
- Collect consent-appropriate bug reports with reproducible steps, not private cargo data. Route defects to their owning stage; maintain regression tests and versioned references.

**Gate/tests:** production load → onboard condition → cargo/supports → ballast → assessment/3D → save/export → fresh reopen; assets and source links work at the deployed path; rollback rehearsal preserves plans. Release acceptance is distinct from instrument approval.

## Cross-cutting test matrix

| Dimension | Required families |
|---|---|
| Vessel/data | analytic pontoon, documented Vectis, unrelated imported ship; missing/invalid/out-of-range resources; revision and sign/datum changes |
| Cargo/layout | empty, one unit, dense/staggered/mixed stacks, rotated groups, hatch spans, deck stored/installed, unsupported/overlapping items, 100/1,000/3,376 units plus supports |
| Loads/tanks | zero/full/slack, independent densities, locked/invalid tanks, variable CG/FSM, fixed/movable items, no duplicate lightship/tare/allowance |
| Numerical | independent references, dimensional checks, mass/moment conservation, mirrored-sign cases, threshold neighbours, interpolation knots/edges, convergence and unavailable equilibria |
| Interaction | mouse, trackpad, touch, keyboard; selection/placement/pan conflicts; cancel/undo/redo; focus and viewport continuity; EN/RO |
| Async/persistence | stale jobs, rapid edits/vessel switches, cancellation, storage denial/quota/corruption, migration, crash, multiple tabs, fresh import and snapshot exports |
| Assessment | meet/fail/incomplete for each supported criterion; invalid source applicability; no unsupported green conclusion |

Use deterministic reference fixtures, generated/property-based geometry and conservation tests where useful, integration tests of real state transitions, and browser end-to-end tests. Expected results must come from independent reasoning/reference values where feasible, not a duplicate of the implementation. Run the affected suite per change and the complete release suite at milestones; repeated unchanged tests do not substitute for missing test classes.

## Standards and evidence basis

- [IMO Ship Design and Stability](https://www.imo.org/en/ourwork/safety/pages/shipdesignandstability-default.aspx): intact-stability framework, including GM/GZ, free surfaces, weather and watertight integrity.
- [2008 IS Code adoption, MSC.267(85)](https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.267%2885%29.pdf): clause-level starting reference; verify amendments and ship applicability at P03/P10/P11 rather than assuming this original text alone is the complete applicable edition.
- [IMO CSS Code](https://www.imo.org/en/ourwork/safety/pages/css-code.aspx): ship suitability, cargo securing arrangements, Cargo Securing Manual and voyage conditions.
- [IMO cargo securing and packing](https://www.imo.org/en/ourwork/safety/pages/cargosecuring-default.aspx): distinguish shipboard securing from cargo transport unit packing. CTU guidance is not a universal breakbulk-hold design rule.
- Supplied stability, general arrangement, tank and strength documents, corrected reference fixture and ship-specific securing evidence remain essential. A preliminary booklet can be the agreed educational reference without becoming a final approved document.

Maintain an applicability register for load lines, special cargo/dangerous goods, longitudinal/damage stability, lifting, ballast management and other operational requirements. Each entry must say applicable/unsupported/not applicable with a reason. Representation of a cargo family is not implementation of all its regulatory requirements. These extensions enter this roadmap only through an explicit scope revision.

## Execution and change log

Next action: **Close the P05 acceptance gates** in [the performance assessment](audits/p05-performance/assessment.md). P06, P07 and P08 were subsequently implemented at the user’s explicit request; its remaining device checks and P05 dependencies stay open. P04 completed tank consumption and entry conversions, movable-equipment controls and guarded undo within the supported model scope. Follow the numbered dependency order. No feature implementation or deployment was performed when creating this roadmap.

| Date | Change | Status |
|---|---|---|
| 2026-10-10 | Roadmap v1 established from current implementation, user priorities and existing reference documents | All P01–P17 awaiting acceptance |
| 2026-10-10 | P01 baseline accepted: 404/405 tests; build/lint/hosting pass; open findings assigned, no feature fixes | P02 next; release not accepted |
| 2026-10-10 | P02 workflow accepted: unified onboard preparation, guarded condition undo, historical plan compatibility, 413 tests passing | P03 next; release not accepted |
| 2026-10-10 | P03 foundations accepted: source coverage/audit, boundary and import fixes, data-based capability review, 423 tests passing | P04 next; release not accepted |
| 2026-10-10 | P04 onboard workplan accepted: tank entry/consumption, movable deck preview and cargo guard, onboard undo, 428 tests passing | P05 next; release not accepted |
| 2026-10-11 | P05 spatial checks, worker cancellation, batched rendering, bounded lists/history and large-plan parsing implemented; 435 tests pass | P05 acceptance still open: drag budget, full-App large-plan persistence and physical mobile limits |
| 2026-10-11 | P06 implemented at user request: shared drag cancellation, local support capture, group keyboard movement, camera-matched 3D planes and nine regression cases; 444 tests pass | Desktop functional checks pass; overall acceptance remains conditional on P05 and physical-device gestures |
| 2026-10-12 | P07 implemented at user request: cargo-family templates, local/versioned libraries, support patterns and selected assemblies, gross/tare accounting, declared material properties and specialist restrictions; 457 tests pass | Desktop checks pass; P05/P06 dependency gates remain open; physical contact and securing capacity remain outside this template stage |
| 2026-10-12 | P08 implemented: protected clearances, declared boundary bearing, vertical-contact checks, partial-frame repair and proposal mass/CG/individual diagnostics; 466 tests pass | Geometry/workflow verified; P05/P06 acceptance gates remain open; structural securing assessment stays in P12 |
| 2026-10-12 | P09 implemented: shared attitude cache, category inspection, declared tank fills/CG markers, physical/corrected references and explicit measurement limits; 472 tests pass | Existing P05/P06 gates remain open; unsupported heeled drafts and tank geometry are withheld |
| 2026-10-12 | P10 implemented: directional criteria, sourced condition-specific flooding limits, numerical resolution gates, curve cursor and export/3D consistency; 483 tests pass | Vessel peak/flooding evidence and existing P05/P06 gates remain qualified; weather audit remains P11 |
| 2026-10-13 | P12 implemented: actual-cargo securing groups, weakest-attachment restraint, directional sliding/tipping, selected support/member/contact checks and persisted review evidence; 500 tests pass | Conservative screening, not complete CSS approval; hatch reactions and longitudinal strength remain unassessed where data is absent |
| 2026-10-13 | P13 implemented: bounded ballast proposals using actual tank interpolation and shared numerical engines, locks/bounds, final assessment, cancellation/staleness and transactional apply/undo; 510 tests pass | Final-condition planning only; no documented pumping sequence, global optimality or complete safety approval; existing source/dependency gates remain |
| 2026-10-14 | P14 implemented: named immutable voyage stages, branches and consumption/unloading operations, cargo/support reconciliation, per-stage numerical review and parent deltas; 519 tests pass | Explicit snapshots only; existing source/model and performance/device qualifications remain; portable voyage import and readable handover continue in P15 |
| 2026-10-14 | P15: portable voyage input import/export, printable snapshot reports, capacity persistence and checkpoint race fix | Browser/IndexedDB process-crash and complete clean-profile transfer acceptance remain open; see P15 evidence |
| 2026-10-14 | P16 engineering pass: three-vessel integration, production save/reopen/report and EN/RO portrait checks, resource/context-loss recovery fixes, report-formatting profile | Acceptance remains open for P05/P15, fresh-user/device and coordinator review; [evidence](audits/p16-acceptance/assessment.md) |
| 2026-10-14 | P17 release preparation: explicit tag/revision acceptance gate, artifact checksums and runtime notices, release/rollback runbook, quick-start and private-data-aware defect template | Publication remains blocked by P16 acceptance, redistribution review and rollback rehearsal; no release tag or deployment created |
| 2026-10-14 | P16 deployment preparation: production three-vessel file imports, documented ballast trim, dense-plan save/reopen, corrected missing surface on plan restore; 532 tests pass | HOLD: dense-plan responsiveness, export/crash/rollback and human/device reviews remain open; see deployment-preparation evidence |
