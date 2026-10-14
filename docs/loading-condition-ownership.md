# Loading workflow and condition ownership

P02 contract, 10 October 2026.

## User workflow

Overview opens Onboard condition. Loading follows Onboard condition → Cargo capacity → Cargo layout → Ballast → Review totals → Saved cargo plans. Every step remains directly accessible and has a next action; Review totals also links to Assessment. Old `section=tanks` links resolve to Onboard condition. Browser back/forward changes navigation only, not the condition.

Onboard condition contains Fuel and Other onboard loads. Other onboard loads contains Service liquids, crew/provisions/stores and protected fixed-weight references. Tank presets affect only their displayed fuel/service group. Ballast remains separate and contributes to the shared totals throughout. Source detail is collapsible. The documented full-condition starter is located in this preparation workplan.

An empty Cargo layout provides Add first cargo unit and a collapsed properties inspector. Capacity handoff opens Add cargo and transfers one-unit dimensions/mass and chosen surface; proposed quantities remain nonbinding targets, not hidden weight multipliers. Actual placement owns spatial cargo. Review totals shows the same data; placed cargo cannot have its geometry/mass independently edited through that table. Unplaced aggregate reference weights remain editable there until replaced by a spatial plan, so older documented starters are still usable.

## Authoritative state and identities

- Simulator owns `ScenarioState` inputs and immutable weight arrays. Children receive the same weights/setter; no page owns a second copy of committed loading data.
- Ship identity is the canonical package ID plus package definition/revision and resource metadata used by existing compatibility/calculation contracts. Display names are not keys. Significant unit/coordinate/dimension/resource changes must not silently import as an equivalent ship.
- Existing saved scenario/plan `id` is the persistent condition identity. Plan `voyage` is currently descriptive text, not an independently addressable voyage object; P14 introduces a voyage ID without reinterpreting old names as IDs.
- Weight/cargo instances use stable `id`; tanks use catalogue `tank.id`; loading surfaces use `area.id`. Rename, selection, view and language changes do not create new physical items. Copy operations generate new instance IDs.
- P07's template/material/assembly schema must use stable IDs and explicit instance references, independent of editable names. Current material strings are legacy descriptive fields, not newly claimed catalogue identity. Migrations must retain existing saved masses and footprints; unsupported template links cannot delete placed instances.
- Calculation cache keys include vessel identity/revision and numerical inputs. Calculated results are derived, not imported authoritative values. Existing pending guards prevent a late result from being displayed against a different condition.
- View state (camera, active tools, selection), proposal previews and unsaved tank-editor input are transient. Navigation alone preserves mounted planner state; restore/condition replacement increments a version and resets affected editors/history. A pending capacity handoff is cleared before restoring/replacing the condition.

## Transactions and recovery

A tank Apply/preset, layout batch, deck state transition or full-condition replacement is one state commit, never one asynchronous commit per affected object. Current bounded layout history and tank/onboard operation histories retain their own scopes; they are not advertised as a global undo stack. External changes invalidate incompatible history rather than overwriting them.

Full-condition replacement records a cloned before snapshot and canonical after revision. Undo is enabled only while the complete current input snapshot still matches that after revision; later edits to weights, density, assessment, capacity or area cannot be erased by an old undo action. Restore clears the replacement transaction, pending handoff and save request. The underlying setWeights path retains fixed weights, normalizes tanks and applies the current tween-deck mode.

Existing autosave/plan/export pipelines consume the shared ScenarioState, not editor previews. A manual scenario retains a separate manual input set; Loading now states explicitly that its edits do not drive the assessment until Use weight-based loading is selected. Save/report/recovery hardening beyond these integration checks remains P15.

## Compatibility evidence

`src/app/fixtures/pre-capacity-plan.json` is a generated historical-format export using the manifest, loading weights and signature exclusions at revision 5f68b82103535ec09f97a381658eaa35e5ecf7b2. It is not a fabricated claim of a user-saved file. The frozen signature is independent of the current implementation. Tests import it through the production parser, preserve its weight list, roundtrip a new capacity-bearing plan, and reject a changed principal dimension. This resolves the former test expectation that incorrectly included later capacity metadata.
