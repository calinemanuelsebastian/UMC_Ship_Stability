# P08 — Dunnage and support planning

Implemented 2026-10-12. P08 geometry/workflow checks pass. Overall acceptance remains conditional on the open P05/P06 performance and physical-device gates. Structural securing assessment belongs to P12; this stage does not certify restraint capacity.

## Delivered workflow

The existing three tasks remain: automatic gap arrangements, individual pieces, and support/rack assemblies. Nothing selected scopes automatic work to all eligible loading areas; a selection limits its scope while retaining adjacent cargo as possible contact boundaries.

- Automatic proposals now carry per-unit/per-gap diagnostics, affected cargo IDs, actual added mass, added LCG/TCG/VCG and projected condition mass. Diagnostics show names, short stable IDs, surface and rejected-gap coordinates, with 50 entries per page. The review component is memoized; names and existing condition mass are computed only when the weights change.
- Selected cargo Properties provides **Preserve gaps during auto dunnage (ventilation / access)**. This flag survives plan/assembly serialization and appears in cargo markings/specifications. It protects subsequent automatic generation; it does not silently remove existing dunnage. Explicit ventilation and specialist profiles remain protected, including adjoining junction candidates.
- Boundary filling defaults off. Enabling it requires an operator-supplied bearing-surface source/applicability. The reference is retained with generated members. A hold outline is not treated as evidence of lining/shell strength. This records the operator's declaration; the application does not independently approve it. Hatch edges and elevated wall boundaries remain excluded.
- Facing cargo can have unequal base elevations when their heights overlap. Candidate search distinguishes contact levels; spacers must fit inside their shared vertical contact interval and have actual geometric support at the proposed elevation. Unsupported upper gaps are rejected rather than floating or dropping to the floor.
- Floor exclusions/seams remain excluded. A separately represented elevated support can span a floor exclusion; its geometry must support the proposed spacer. This does not establish the supporting platform's strength.
- Partial open frames can reuse existing matching members, including other materials, and add only missing members. Repeated generation adds no duplicates and retains intended frame openings. Closed junctions are connected; unclosed junctions are reported with coordinates for manual review.
- Actual new-member mass and moments determine the proposal totals, rather than solid-envelope volume. Existing geometry, collision, stacking, support and atomic save checks remain in the application path. Loaded supports cannot be removed; scoped removal and toolbar undo remain available.
- Worker cancellation, stale-revision rejection and automatic preview invalidation are retained from P05. English/Romanian UI text was added for the new controls, review and diagnostics.

## Verification

Final full regression: **466 tests, zero failures** (`tests.log`), including nine new P08 cases. Build, lint and hosting-resource checks pass. The existing Vite chunk-size warning remains.

New cases cover boundary evidence and provenance; protected channels/junctions; unequal heights and unsupported upper gaps; two-tier arrangements; floor seams and explicit elevated support; partial-frame repair with mixed existing materials; actual mass/CG reconciliation; scoped removal/undo and dependent-load rejection; a staggered 1,024-unit array and duplicate-free repeat; protected metadata and labels. Existing tests additionally cover the original staggered half-gap case, closed/open junctions, narrow/wide frames, independent racks around non-stackable cargo, rack overload/headroom, cancellation, late worker replies and large plan/recovery serialization.

The 1,024-unit fixture generates 2,945 support members. Generation plus repeat completes in under one second in the recorded runs; see the timing line in `tests.log`. This is a numerical test measurement, not a browser-frame-rate or physical-device acceptance claim.

Desktop browser checks used the isolated planner harness on port 5186, leaving the user's main loading conditions untouched:

1. Boundary filling with a legacy saved enabled setting and no source was visibly blocked with an actionable explanation.
2. A no-selection, 2 m maximum-gap frame proposal produced four members, 0.008460 t, added CG 3.500 / 3.000 / 0.025 m and projected total 6.008460 t.
3. Applying changed the fixture from three cargo units/6 t to seven items/6.008460 t. Repeat proposed zero additional members and explicitly retained the frame opening.
4. Remove dunnage removed the four members; Undo restored them.
5. Marking Unit 1's gaps protected and previewing that selection proposed no dunnage and provided an individual exclusion reason.
6. Final compact review was visually checked; browser console reported no errors. Screenshot: `proposal-review.png`.

## Limits and next stage

This implementation uses rectangular contact envelopes and geometric support. It does not infer hull lining strength, elevated wall bearings, connections, buckling, friction capacity, inertial securing forces or an engineered safety factor. Open-junction diagnostics are requests for review, not permission to fill every void. Automatic material arrangement is the existing deterministic solid-spacer/open-frame rule, not a global structural optimization solver. P12 must assess forces and declared capacities. Physical touch/trackpad and the outstanding P05 acceptance work remain open. No deployment was performed.
