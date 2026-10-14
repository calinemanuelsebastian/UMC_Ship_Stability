# P04 — Onboard condition workplan

Accepted within the supported model scope, 2026-10-10. Local implementation and verification only; no deployment.

## Completed

- Fuel, service liquids, crew/stores/additional equipment and fixed vessel references remain together in Onboard condition. Ballast stays separate. Machinery included in lightship is not duplicated.
- Added set/consume operations for tanks. Volume, mass and capacity percentage resolve to the same volume/density state and existing table-derived centres/FSM. Changing entry units converts the pending amount; applying preserves the selected unit. Consumption cannot exceed current contents or silently change density.
- Capacity, nonfinite/negative entries and invalid density are rejected. Exact empty/full endpoints survive unit conversion without treating genuinely slack tanks as full. Sea density and individual tank densities remain independent.
- Added movable-deck configuration with mass/CG preview, explicit Apply, affected-cargo checks and guarded whole-condition undo. Stored panels retain onboard mass and use documented storage coordinates, cargo surfaces and existing 3D geometry. Vectis storage position 4 raises KG; it is not modelled as removing weight.
- Added undo for onboard weight additions, edits, removals and departure presets. Departure presets remain explicit starter actions, never automatic resets. Undo becomes unavailable after incompatible subsequent edits.
- Missing tank tables are explicitly reported. Existing upright table, analytical pontoon and fixed reference-group qualifications remain visible. No filling geometry or missing centres were invented.

## Verification

- Full suite: 428 tests, 428 pass, zero failures (`tests.log`). New `onboard-operations.test.mjs` checks all 68 documented tanks across three densities, four filling states and three entry modes; consumption/empty/full/slack transitions; invalid limits; scoped presets; fixed-weight preservation; deck mass/moments and cargo blocking; saved-plan round trip and guarded undo.
- Production build, lint and hosting checks pass (`build.log`, `lint.log`, `hosting.log`). Existing large bundle warning remains assigned to performance work. Final lint correction only refactors effect dependencies; numerical operations unchanged from the full test run.
- Production browser: Vectis tank 040 at 50% gives 35.521695 t and shared displacement 3965.121695 t. Consuming 1 t reduces displacement by 1 t and updates centres. Undo restores 50%. A 101% fill disables Apply with an explicit capacity message. Entry unit persists after applying.
- Deck browser check: 3929.600 t remains unchanged; KG 8.581 to 8.984 m when stored. Undo restores installed configuration and original KG. Additional stores mass edit also rolls back correctly.
- EN desktop and RO portrait (390 px) controls inspected; tank inputs and messages fit the portrait layout. No browser console errors observed. Screenshots: `deck-preview.png`, `portrait-ro.png`.
- Preview-origin recovery draft was left intact; dev-origin user loading plans were not edited. Test edits were confined to the isolated production preview.

## Boundaries

This gate covers the declared inputs and boundary/regression cases, not every conceivable condition or certification. Tank centres/FSM use upright filling data; coupled liquid behaviour at arbitrary heel is not supplied. Legacy aggregate liquid groups retain fixed reference centres until explicitly replaced with editable tanks. Deck changes reject affected cargo rather than automatically relocating it. Undo is a guarded last operation, not a persistent global history. Auto ballast, cargo-scale performance, securing and expanded simulation remain later roadmap stages.

Next: P05 — Make Cargo layout responsive at useful scale.
