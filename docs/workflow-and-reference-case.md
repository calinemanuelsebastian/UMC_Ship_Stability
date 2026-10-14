# Complete planning workflow and reference case

> Implementation order and stage acceptance are now controlled by [Product completion roadmap](product-completion-roadmap.md), P01-P17. This document retains the numerical reference and workflow background.

Defined 10 October 2026. The objective is functional completion of the planning task, not imitation of spreadsheet tabs. A stage is complete only when its inputs, calculations, results, warnings and persistence work together. Existing implementation is assessed against the beta at commit 5f68b82.

## Operator workflow and acceptance criteria

| Stage | Operator actions and required inputs | Required output / completion check | Current state |
|---|---|---|---|
| 1. Select vessel and calculation basis | Choose vessel/package revision, units/reference system, installed/stored tween-decks, surrounding-water density and voyage/condition name. Review source-table coverage. | One shared condition feeds every page. Package revision, source/datum and calculation limits are recorded. Deck movement changes CG without deleting its mass. | Implemented; review package applicability and data completeness. |
| 2. Establish non-cargo condition | Select a documented starter or enter ballast, fuel, water, other liquids, crew, stores and fixed items. Choose liquid densities independently of sea density. | Capacity-limited tanks produce mass, CG and FSM; fixed weights are protected. No duplicate lightship/machinery or tank contributions. | Implemented; exact apples tank mapping remains to verify. |
| 3. Plan cargo capacity | Enter cargo volume/stowage factor, package dimensions/mass or density, available hold volumes and intended cargo quantity. Select a documented displacement/draft limit and allowance policy. | Net cargo capacity after all non-cargo weights, estimated support mass and reserves; volume-limited versus weight-limited result; remaining mass/space. Missing applicable limit is explicit. | Capacity tab implemented: shared weight breakdown, sourced user-entered displacement limit tied to water density, explicit extra support/reserve allowances, planning-volume estimates and package/SF proposals. Inputs persist with plans. Certified volume and physical-fit checks remain separate. |
| 4. Define cargo and restrictions | Define type, quantity, mass, dimensions, identification, destination, orientation, stackability and declared top-load limit. Identify ventilation/segregation requirements where applicable. | Reusable cargo definitions; quantity × unit mass reconciles with loaded total. Unsupported cargo-specific checks are named. | Mostly implemented; SF-linked mass and complete cargo-specific rule coverage incomplete. |
| 5. Arrange cargo and supports | Place/group/rotate/stack cargo on chosen surfaces. Add floor, interlayer, lateral and hull-side dunnage or independent racks. Review contacts, overlap, headroom and declared capacities. | Every placed item contributes once to displacement and moments. Distinguish estimated allowance from physical support items; do not add both automatically. Geometry checks do not imply structural capacity. | Implemented geometry/mass; structural support verification incomplete. |
| 6. Balance loading | Review grouped hold totals, tank distribution, LCG/TCG/KG and free surfaces. Adjust loads or ballast and evaluate departure/arrival/intermediate conditions independently. | Tables determine trim/drafts and stability where covered. Explain missing brackets and stale inputs. Never extrapolate silently to produce an answer. | Implemented; reference sensitivity and spatial plan acceptance outstanding. |
| 7. Assess stability | Review source/datum, GM, signed GZ, criteria, permissible trim, allowable KG and flooding limitations. Supply documented condition-specific weather inputs. | Numerical results plus applicability and unresolved checks. Centreline diagnostics separated from actual TCG results. Missing inputs do not become zero or a pass. | Implemented with source/convention gaps. |
| 8. Check securing and support capacity | For each cargo/group, define contact/friction, accelerations and exposure, lashing type/strength/count/directions/angles, securing points and support capacities. | Traceable force/strength calculation and longitudinal/transverse sliding/tipping checks. Separate material, contact, connection and securing-point limitations. | Missing integrated lashing workflow; support geometry is not structural assessment. |
| 9. Review 3D condition | Inspect layout, tank/category contributions and calculated attitude; use teaching exaggeration only when clearly indicated. | View is driven by shared numerical results, with mode/data limits. No full physical simulation is required for acceptance. | Implemented; reconstructed geometry remains qualified. |
| 10. Save, compare and report | Save named conditions, compare voyage stages, export editable backup and a readable calculation report. | Inputs, units, vessel revision, results, source references, assumptions and unresolved checks survive the workflow. Report covers capacity, loading, stability and securing. | Save/recovery/JSON implemented; complete readable report and integrated comparison incomplete. |
| 11. Verify and release | Reopen/export/import a completed plan; test input changes, invalid data and larger layouts. Review evidence with coordinator. | Same inputs produce the same results within declared tolerances; missing capability blocks the relevant completion claim. | Core demo tested; complete-workflow acceptance remains open. |

## Calculation and design rules

- Maintain one authoritative loading condition. Derived results are cached by vessel revision and input values, invalidated on numerical change, and reused by tables, reports and 3D.
- Use explicit statuses: calculated; outside model/table coverage; missing input; unresolved source/convention; not implemented. Do not collapse them into a general green completion mark.
- Preserve units and origin/sign conventions in storage; presentation language/reference selection must not change the physical condition.
- Keep cargo, tanks, fixed weights, movable vessel equipment and support materials identifiable, while summing all relevant contributions exactly once.
- Do not copy spreadsheet assumptions blindly. The reference supports regression checks, but the product may use a better documented method or clearer workflow.
- Require structural/securing capacities for capacity conclusions. Extra timber, a geometric fit or a chosen safety margin alone is not evidence of adequacy.
- Produce a capability-complete educational planning workflow. Operational certification, damage stability and longitudinal-strength approval are separate scope decisions, not consequences of matching the workbook. The supplied strength and securing manuals must inform any later extension into those checks.

## Corrected numerical reference: apples case v2

Source: the prior reviewed apples workbook, preserved unchanged. New file: `outputs/reference-case/apples-reference-corrected.xlsx` in the original task folder. The nine corrections concern two LCF entries, four KM entries and three cross-curve ordinates. Source evidence is the supplied stability loading manual, PDF pages 36, 40, 44 and 67. Corrected cells are amber; Review_Notes rows 114 onward retain previous/new values, reasons and dependent-calculation review instructions.

The numerical fixture consists of 47 constituent weights: six aggregate cargo rows, eighteen proportionally scaled dunnage rows, nine other-weight rows and fourteen ballast rows. Cargo quantity is 3,376 packages, total cargo mass 3,376 t. The workbook's support allowance is 188.1 t, calculated from rounded 342 m³ at 0.55 t/m³. This is a reference assumption, not an instruction to add the same percentage on top of physically modelled supports.

Reference loading targets (constituent precision):

| Quantity | Value |
|---|---:|
| Displacement | 9644.27 t |
| LCG from AP | 59.077524209 m |
| Physical KG | 6.632273425 m |
| TCG, starboard positive | -0.147695948 m |
| Transverse FSM | 309.61 t·m |
| Surrounding water density | 1.025 t/m³ |
| Table trim, FP minus AP | -1.261023772 m |
| Tabulated underside-keel draft | 5.767547752 m |
| Corrected initial GM | 1.013570839 m |

Workbook results retain its intermediate rounding; centre/trim/draft/GM comparisons use a 0.000001 m tolerance, moments 0.01 t·m, final mass 0.00000001 t. These are reference regression tolerances, not claimed measurement accuracy. The exported JSON records the exact values and comparison basis. Actual signed GZ and centreline GZ are different tests.

After correction and recalculation, **58 of 60 numerical comparisons match**. The remaining two differences are the workbook's fixed X1=0.9 versus interpolated X1, and its dependent roll angle. All six behavior checks pass. Corrected workbook GM is 1.013570997 m; the application's constituent-precision result is 1.013570839 m. The difference is within the stated tolerance.

Recalculation used Artifact Tool with all 748 shared/ordinary formulas explicitly registered to prevent stale imported follower caches. The final file has no cached formula errors or missing caches. Exactly nine original input cells differ; original formulas are unchanged, two charts remain, and the embedded image bytes are preserved. Independent Excel-engine recalculation remains unverified. Open reference data are in `validation-references/apples-reference-case-v2.json`; this regression fixture is deliberately not labelled an importable spatial cargo plan.

## Supplied cargo/support drawing

The user supplied `Emanuel-Sebastian CĂLIN - TTTM1 Project - EUR2 apples pallet arrangement with wood structure - AutoCAD.dwg` from the project directory. Its file header identifies AutoCAD 2018/2019/2020 DWG. It is the nominated arrangement reference, replacing guesses about the user's intended supports.

The user subsequently supplied a DXF and confirmed millimetres despite its inches header. The [DXF review](audits/2026-10-10-dxf-arrangement.md) verifies the two main plans' 844 footprints each, the annotated 3,376-pallet total and the 4.388 m two-tier envelope. Extracted geometry is retained in `validation-references/apples-dxf-arrangement.json`. The [repeated assembly definition](apples-support-assembly.md) now fixes the two-tier envelope, member ownership and mass-accounting rules. Its open JSON definition is `validation-references/apples-support-assembly-v1.json`. Complete physical member dimensions, quantities and ship-baseline mapping remain to reconcile before revising timber volume/CG. The drawing does not establish structural capacity.

The [cargo/support accounting audit](audits/2026-10-10-cargo-support-accounting.md) now reconciles the raw support schedule, separate allowance and all legacy moments, assigns 3,376 unique package IDs, and isolates a candidate support-datum correction. Pallet tare is included by the user’s explicit reference assumption; physical member repetition and package mass CG remain unresolved. The v2 numerical fixture is preserved.

## Remaining reference decisions

| Item | What is established | What remains / how to close |
|---|---|---|
| Nine source entries | Verified against the supplied manual and corrected in the new copy | Reviewer double-check of highlighted cells and recalculated outputs |
| Tank aggregation | Mass/CG/FSM reproduce the workbook reference | Map aggregate consumable groups and ballast to individual app tanks; reconcile sounding-table values without inventing fill levels |
| Supports | Numerical allowance preserved | Resolve the defined assembly’s member schedule and datums, verify M13/M28 heights and physical structure; establish capacity separately |
| Limiting KG | Workbook table and app annotation basis differ | Locate their conventions/applicability in the manual; retain both as qualified references until resolved |
| Weather | Workbook roll calculation is a reference approximation | Confirm LWL, block coefficient, bilge effects, profile, port-estimation basis and flooding limit; then complete the required numerical assessment |
| Endpoint drafts | App package supplies a datum; workbook withholds numeric endpoints | Keep this explicit; separately validate datum/sign/keel convention before extending the workbook |
| Securing | Workbook input arrangement and formulas are traceable | Verify with supplied cargo-securing manual and selected method before implementing the production workflow; do not treat cached GOOD as approval |

## Acceptance cases

1. **Numerical apples reference:** load the 47-row fixture, verify loading/trim/GM/ordinates, record rounding differences and remaining weather assumptions.
2. **Spatial apples reference:** reconstruct the supplied drawing as cargo/support objects and individual tank fills; reconcile totals against the agreed physical arrangement, not forced aggregate centres.
3. **Voyage conditions:** departure, arrival and an intermediate consumption/ballast condition; preserve cargo layout while changing consumables, densities and resulting free surfaces.
4. **Boundary conditions:** volume/capacity limit, overloaded support, unstackable cargo, table-range exit, missing weather data, missing securing capacity and stale report inputs must expose the specific issue.
5. **Persistence/report:** save/reload/export/import each complete condition and compare input fingerprints, totals and results; verify the complete printable report.

Full-workflow acceptance remains open until missing capacity and securing functions are implemented and the spatial, source-applicability and report checks pass. A numerical reference match alone is insufficient.
