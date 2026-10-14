# P09 — Numerical attitude and onboard inspection

Implemented 2026-10-12. Acceptance remains conditional on the open P05/P06 performance/device gates. This stage does not certify hull geometry, securing strength or regulatory compliance.

## Delivered

- Trim and heel view adapters now share revision-scoped, bounded result-cache entries. Upright references use the same immutable hydrostatic results as calculation pages. No stability calculation runs during rendering, camera movement or appearance changes.
- The view's result identity includes package contents/resource URLs and numerical inputs. Late requests are ignored; results from another condition are withheld. An invalid or pending reconstructed-vessel condition may use the existing explicitly labelled original reference preview; current weights are hidden and inspection disabled in that preview. A calculation error hides the preceding scene and disables inspection.
- Cargo, dunnage/supports, tanks/liquids, fixed weights and other onboard weights can be inspected and independently hidden. Hiding a category removes it from both rendering and the inspection list. Hidden markers/labels no longer intercept ray picking. Ordinary cargo does not show an extra CG sphere unless selected; names/specifications remain available through selection or the list.
- Declared rectangular tanks have an outline and volume-proportional liquid fill. Other tanks use spherical, category-coloured CG markers, expressly labelled as markers, never fabricated cargo blocks. Inspection reports volume, density, fill, mass and source coordinates. An empty tank's catalogue reference centre is identified as such. Tank liquid redistribution under heel is not simulated.
- Physical VCG, virtual VCG, physical/corrected GMt, KB and KMt are distinguished in the condition inspector. B/M labels appear only in the upright reference when the solver supplies complete points; G remains physical. Upright references are not presented as heeled/trimmed hydrostatics.
- Mean end draft, signed FP-minus-AP difference, AP/FP readings and existing signed angles use numerical results. The baseline/source-reference conventions are explained. Missing draft-mark stations, unconfirmed datum and unavailable coupled heeled end drafts are explicitly withheld with reasons.
- Calculated, teaching and visually exaggerated modes remain separate. A short opacity transition helps identify a new numerical view; reduced-motion settings bypass it. This is a presentation effect, not physical-motion dynamics. Existing camera, transparency, axes and stored-deck rendering are retained.
- New interface explanations have Romanian translations.

## Evidence

- `tests.log`: **472 tests passed, zero failures**. Six new tests cover classification, physical markers, declared tank empty/partial/full fills and capacity bounds, geometry/CG separation, draft signs/withholding, shared trim promise identity and upright/free-surface reconciliation. Existing tests cover reference sign conventions, waterplane intersections, heel/trim limits, dataset coverage, cache revisions/failures, stored decks, geometry and material opacity.
- `build.log`, `lint.log`, `hosting.log`: passed. Existing Vite large-chunk advisory remains; no bundle-size acceptance claim is added here.
- `git diff --check`: passed.
- Browser checks on the isolated development origin at port 5186: pontoon AP/FP both 1.9512 m at 4,000 t/1.025 t/m³; upright physical and virtual VCG both 4 m and physical/corrected GMt both 14.1069 m for zero FSM. Pontoon declared tanks display fill/specifications. Hiding tanks removes their inspector choices. Teaching heel switches to Bow, teaching trim to Side. Vectis tank selection works through both list and 3D marker ray picking; the selected item reports its tank category and source coordinates. Out-of-coverage Vectis trim hides the previous scene and disables the inspector instead of retaining stale values; returning to Upright restores the valid view. Browser console errors: none.
- `vectis-inspection.png`: browser evidence showing the reconstructed model and selected tank specifications.

## Explicit boundaries

No verified draft-mark station dataset is currently supplied to this view. Reconstructed Vectis geometry does not establish submerged volume or coupled heeled trim/drafts. Its available tank plans are not enough to infer 3D fill geometry, so those tanks remain CG markers. An equipment CG marker is not a dimensional model of the equipment. Under imposed/heeled attitudes, rectangular liquid fill is an upright inspection shape rotating with the vessel, not a free-surface solver. Empty tank markers are catalogue references, not mass contributions.

The existing P05 performance threshold and physical-device checks from P06 remain open. This turn did not rerun every physical-device, loaded-layout, camera or stored-deck UI combination; automated regressions remain the evidence for those retained paths. No deployment or commit was performed. P10 curves/assessment and P12 securing remain separate stages.
