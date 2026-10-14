# P02 acceptance — unified workflow and condition ownership

10 October 2026. **Accepted within the P02 workflow/integration scope.** Local changes only; no deployment.

## Delivered

- Ordered Loading navigation and next actions, with Onboard condition as the initial Loading section; legacy Tanks links retained.
- Fuel plus service liquids/crew/stores/fixed references in one onboard workplan. Fuel and service presets affect only their own groups, including correct handling of reference liquids.
- Review totals uses the shared inputs and protects placed cargo from independent table edits. Unplaced reference contributions remain editable for legacy conditions.
- Empty Cargo layout starts with a clear first-cargo action rather than an expanded empty selection editor. Adding onboard stores opens its editing group.
- Manual-mode banner explains condition ownership and provides a switch to weight-based calculation.
- Whole-condition undo guarded by full input revision; restore/replacement clears transient handoff and resets tank/onboard editors and layout history.
- Frozen historical-format compatibility fixture; stale B03 test expectation replaced with historical evidence and parser/mismatch tests.
- Identity, proposal, transaction, cache and persistence ownership documented in `docs/loading-condition-ownership.md`.

## Automated evidence

Full current suite: **413 tests, 413 pass, zero failures**. Production build, lint and root-hosting resource check pass. Existing large-chunk warnings remain assigned to packaging/performance stages. Logs included here.

New tests cover: old-format parser restoration, new-format roundtrip, incompatible ship rejection, fuel/service isolation, real Vectis combined departure equivalence including winch oil, immutable transaction snapshots, stale-undo rejection, canonical revisions, old-route aliasing, ordered navigation, onboard/review UI partition and English/Romanian section rendering. Existing suites cover asynchronous stale results, imported/synthetic vessels, history, recovery and capacity handoff validation.

## Browser evidence

Isolated production preview at 127.0.0.1:4175; original development-origin plans untouched.

- Pontoon: Overview → Prepare onboard condition; add 10 t stores → displacement 4,010 t; Next Cargo capacity → remaining mass 2,140 t. Browser Back retained the 10 t editor value and open group. Test weight removed, displacement returned to 4,000 t.
- Empty planner: first-unit action visible; Properties collapsed; controls and 3D planner still available.
- Vectis: old `section=tanks` link opens Onboard condition; Fuel and Service liquids groups separately visible, crew/stores and fixed references in same workplan.
- Portrait 390×844: document width equals viewport width (390 px); Romanian headings and next action verified. Temporary viewport/language override restored.
- Apply Ballast departure: displacement 8,240.311 t and Undo condition replacement enabled. Undo restores 3,929.6 t and disables itself. Numerical reference qualifications remain unchanged.

Browser smoke covers workflow controls, not physical multitouch or a new crash-recovery certification. Touch/trackpad placement, exhaustive device testing and larger-layout measurements remain P05/P06/P15/P16, as planned.

## Findings closed and retained

B03 (saved-plan test-contract discrepancy) and B06 (empty selection inspector) addressed. B01 capacity rounding belongs to P03; B04 synchronous dunnage performance to P05/P08; B02 elevated gap support to P08/P12; B05 historical placement reproduction to P06. No unrelated numerical algorithms changed.

Next stage: **P03 — Complete vessel-data and numerical foundations**, beginning with the independently reproduced exact-boundary capacity count and source/coverage register.
