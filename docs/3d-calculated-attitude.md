# Calculated 3D attitude

The calculated-heel view consumes the shared corrected GZ result and the existing stable-root selector. For constant-LCB cross curves it also consumes the initial longitudinal trim result, including AP/FP reference drafts. These are the unheeled reference drafts, not end drafts at the displayed heel. Zero-trim cross-curve models retain their even-keel reference.

The reconstructed mesh retains initial pitch while rotating in heel about the midship reference water level. Its vertical translation retains that reference pivot. This is a visual composition, not a coupled hydrostatic solution or a displaced-volume calculation. The inspector labels initial quantities explicitly; heeled draft measurements remain disabled. The rectangular pontoon keeps its existing volume-preserving heel geometry.

The view adapter requests independent results concurrently. Existing shared caches reuse parsed tables and solver results across assessment and visualization; there is no per-frame hydrostatic computation. The view retains its vessel/condition guard against stale asynchronous results. Unsupported, ambiguous, or downflooding-blocked equilibria remain unavailable.

Transverse cargo movement selects calculated heel for vessels with supported cross curves. Without those resources it selects the upright reference.

Verification: production Vectis fixture compares viewer drafts and heel with the trim and GZ solvers, checks no additional resource fetches after those results exist, and rejects an unsupported port equilibrium. Pose tests cover initial pitch and the reference pivot at signed heel angles. Documented historical heeled-draft paths and dynamic motion are not part of this change.

## Coupled equilibrium and teaching modes — 2026-10-15

The 3D page now has an explicit **Calculated equilibrium** / **Teaching / exploration** selector. Calculated mode is the default and never silently substitutes an imposed angle, upright reference, or extrapolated table result. Existing upright, initial-trim and cross-curve heel views remain available in exploration alongside imposed teaching angles. Changing mode does not change loading weights or assessment inputs.

The declared rectangular pontoon now solves heel, pitch and heave together. A horizontal plane clips its sealed convex hull; tetrahedral integration supplies displaced volume and its centroid. At each angular trial, bisection matches volume to mass / surrounding-water density. A damped two-variable Newton iteration aligns the world-horizontal positions of B and physical G. A local potential-energy Hessian rejects neutral or unstable roots. Search bounds are ±30° heel and ±10° pitch; convergence failure is explicit. This finds a local static root, not every possible equilibrium or a dynamic trajectory.

The scene consumes the cached pose and clipped waterline directly, in the same Rx(heel) Rz(pitch) convention. It does not repeat buoyancy calculations during rendering. Accurate mode cannot exaggerate its angles. Centreline AP/FP vertical depths and rulers use the solved world water plane; they are not verified draft-mark readings. Body-axis waterplane intersections remain separate from these vertical measurements. B is the solved physical buoyancy centre; upright M/GM are reference values only.

Coverage is deliberately restricted to explicit rectangular hulls with metre/tonne datums and fixed liquid centres (zero supplied transverse and longitudinal FSM). A constant virtual-KG correction is not passed off as exact liquid redistribution. Vectis Castle remains unsupported for this coupled mode: its reconstructed exterior is visual geometry, while the supplied reference tables/cross curves do not define the coupled heeled trim/immersion solution. Its existing reference calculations remain available in exploration. To extend coupled accuracy requires validated underwater geometry or equivalent coupled hydrostatic data and a validated tank-liquid model. No hull offsets are inferred from photographs.

The static balance basis is consistent with [Ansys Aqwa, Hydrostatic Equilibrium](https://ansyshelp.ansys.com/public/Views/Secured/corp/v242/en/aqwa_thy/aqwathy_hydro_eqlib.html): force balance and vertically aligned gravity/buoyancy. This implementation is a numerical model, not IMO or class approval. It excludes external forces, waves, flooding and liquid redistribution.

Regression coverage includes independent analytic box volume/centroids, simultaneous signed heel and trim, small-angle GM comparison, mirrored loading, waterline-to-sea alignment, capacity and stability rejection, caching, coordinate conventions, liquid/geometry coverage gates and the absence of automatic reference substitution. These source changes supersede the prior source freeze; the archived beta.2-rc.1 remains untouched and must not be represented as containing this feature.

### Subsequent full-document search correction — 2026-10-15

The general grid still lacks coupled heeled trim/immersion, but individual source loading cases do contain those paths: 78 tables / 1,014 rows across the stability and ballast manuals, including 37 port-side tables. The earlier limitation must not be read as saying no trajectories exist anywhere. These are condition-specific references, not arbitrary-loading coverage; the ballast Annex 3 examples carry explicit NOT ACCEPTED remarks. See [the source-search assessment](audits/vectis-coupled-data-search/assessment.md) and retained numeric extraction before planning documented-case playback. Runtime coverage has not been expanded by this audit.

## Model presentation review — 2026-10-16

The primary selector separates **Calculated condition** from **Teaching / exploration**. Calculated condition explicitly chooses coupled rectangular equilibrium, initial longitudinal trim/draughts, or heel from stability curves. Vectis defaults to its documented trim-table method; a declared rectangular pontoon defaults to coupled equilibrium. Unsupported coupled calculations remain unavailable rather than substituting a teaching pose.

Readouts beside the canvas identify calculated angles and AP/FP drafts. Heel-only models do not report initial unheeled drafts as actual heeled drafts; constant-LCB initial trim is labelled as a reference. Unknown values display an em dash, not zero. Calculated views prohibit trim exaggeration and use the same cached numerical outputs as before. Moving a weight retains the selected model.

No course/booklet computational formula was replaced in this presentation change. Mass-weighted physical G remains separate from virtual KG. The booklet's KN sin(phi) column already contains a lever: GZ = tabulated lever − KG′ sin(phi) − TCG cos(phi), under the source convention. Apply the selected supported free-surface treatment once. Do not infer a physical liquid-shift solution from this correction.

Source review: course mass-and-moment calculation; stability booklet §§3.3, 4 and 9–11 (see the reference cross-curve audit); [IMO resolution MSC.267(85), 2008 IS Code](https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.267%2885%29.pdf), Part B §§3.1.1 and 3.1.7–3.1.8. Initial-GM and GZ free-surface corrections are separately addressed. A rendered equilibrium is not a compliance verdict; the assessment and its missing inputs remain separate.

Verification: readout regressions cover missing results, initial versus heeled drafts, display-sign conventions, vertical versus body-plane draft coordinates, and teaching separation. The complete suite passes 541 tests; lint and production build pass (existing large-chunk advisory remains).

## Documented-case study and inspection — 2026-10-16

Open **Study documented cases** from the 3D toolbar or **Loading → Onboard → Start a loading condition**. This is a read-only source workspace, independent of the active loading plan. Return to current condition restores the live view without replacing its inputs. The ten adapted editable starters remain separate.

The lazy-loaded, package-contained `documented-studies.json` contains 77 unique cases: 34 stability-manual examples and 43 ballast-exchange stages, 5,847 weight rows, 1,001 trajectory samples and 34 rendered source arrangement pages. Stability PDF p13 repeats the steel-coils example on p269 and is not a second scenario. Corresponding strength-manual pages are indexed, not substituted for the stability inputs. No separate per-stage arrangement drawing was identified adjacent to the ballast-exchange tables; those stages expose all printed allocations and the CG distribution instead.

Study controls select discrete printed heel samples; Play advances through these samples, stops at the end, and pauses when the document is hidden. There is no interpolation, automatic animation on entry, arbitrary-case solver, or claim that every angle is an equilibrium. The reconstructed hull follows the source midship moulded draft, signed trim and signed heel through the existing illustrative pose mapping. This does not validate displaced mesh volume, heeled draft marks, tank redistribution or unverified cargo shapes. Samples outside the display-hull bounds remain available numerically while rendering is withheld. End-draft rulers and trim exaggeration are disabled in playback.

All source weight rows retain mass, physical LCG/TCG/VCG, fill, density, FSM/grain flag and page. Cargo, tanks and deck panels are selectable CG markers. The original source arrangement images and grouped weight tables provide the cargo/tank plan evidence; aggregate weights are never converted into invented individual packing blocks. Group bar charts plot weight at LCG, not continuous structural loading. `!` source FSM treatments and `#` grain moments remain distinguishable. Published assessment summaries are historical source records, never applied as live pass/fail results. NOT ACCEPTED and non-seagoing qualifications remain prominent.

Inspection adds name/ID/hold search, category filtering, optional zero-mass entries, clear selection, reference-coordinate readouts and displacement share. The camera can focus the selected item. List filtering does not alter weights or hide live-scene objects.

Reproduce extraction with `scripts/extract-documented-studies.py DOCUMENT_DIRECTORY`; verify all retained weight-row numeric tokens independently with `scripts/verify-study-weight-tokens.py DOCUMENT_DIRECTORY`. The verification report is `docs/audits/vectis-coupled-data-search/study-weight-verification.json`: 5,847 rows on 181 weight-table pages, zero numeric disagreements between pypdfium2 and pypdf. Each case reconciles within 0.08 t total mass and 0.003 m CG (source rounding). The prior trajectory audit independently compares all printed trajectory tokens. Source PDFs are unchanged. Built-in packaging and ship import validate the study resource, including rejection of malformed rows or externally hosted arrangement images. The added reference resource is excluded from saved-plan compatibility signatures.

Final verification for this addition: all 550 tests pass; 11 focused study/package checks pass after input-validation hardening; lint and production build pass. The existing bundle-size advisory remains. Browser verification covered Loading → study navigation, source sample selection (steel coils: 30°, 7.528 m, −0.475 m trim), playback controls, port-side qualifications, bunker/cargo inspection, camera focus, unchanged live totals on return, and successful source-image loading. The study resource is about 4.35 MB and fetched only when the study workspace opens. Public deployment was not performed.

### Usability/performance verification — 16 October 2026

Production preview on port 4214, Codex in-app browser; desktop and 390 × 844 portrait.

- Found and fixed a responsive regression: the legacy `display: contents` on the scene column allowed the canvas to retain desktop width. Before: document scroll width 889 px in a 390 px viewport. After: scroll width 390 px, canvas 364 px. Source distribution expanded also remains within 390 px; its tables scroll locally.
- Verified next-sample navigation, automatic playback advancing and pause, 30° steel-coil readouts (7.528 m moulded draft, −0.475 m source trim, 1.68 m GZ), camera selection, empty-search feedback and returning to the unchanged 3,929.6 t active loading condition.
- Source distribution now mounts on demand: zero table rows while closed, 72 source rows when opened for steel-coil departure. A memoized formatter replaces repeated Intl construction; maximum mass for distribution bars is computed once per case instead of once per row.
- Browser console reported no errors/warnings during this session. Screenshot: `audits/vectis-coupled-data-search/portrait-verification.png`.
- Repeatable data profile: `node scripts/profile-documented-studies.mjs`. Apple M2 / Node 24: 4,349,769-byte library, 25 parse/validation runs, median 29.22 ms, p95 33.71 ms. Grouping and 100,100 sample reads took 109.62 ms. Raw measurements: `audits/vectis-coupled-data-search/study-performance.json`.
- Validation: 550 tests passed, production build, lint and diff whitespace checks passed.

Scope: data profiling is not a browser FPS or network benchmark. The library is still a 4.35 MB first-use download; slow networks and physical mobile GPU/touch behaviour remain unmeasured. This check covers the new inspection/study workflow, not a new full cargo-planner stress test. No deployment was performed.
