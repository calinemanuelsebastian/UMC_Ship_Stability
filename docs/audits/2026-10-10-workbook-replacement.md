# Workbook replacement verification

## Decision

**Not accepted as a complete workbook replacement.** The beta reproduces the principal weight/moment and final trim calculations for the reviewed apples condition. It does not yet replace every worksheet workflow. This is a completed coverage audit with open findings, not a completed implementation of the missing features.

Reviewed 10 October 2026 against application commit `5f68b82103535ec09f97a381658eaa35e5ecf7b2`. No production calculation or workbook value was changed. The audit scripts and this report are subsequent working-tree additions. The prepared release assets remain unchanged.

## Evidence and method

- Read the original user workbook and the reviewed copy at `../2026-09-09/files-pasted-by-the-user-here/outputs/apples-calculations-reviewed.xlsx` from the repository root.
- Reviewed-copy SHA-256: `56ffd96aa635d761d41a56836e66bb42d0cb49b027918b1efa40a9f6d9cc510a`.
- Inventoried all seven calculation worksheets and Review_Notes: 748 formula cells, including expanded shared formulas. No cached Excel error cells or missing formula caches were found. This does not prove live Excel recalculation or validate every formula.
- Original/reviewed content differences are recorded in `2026-10-10-workbook-inventory.json`. The current files differ at 182 cells on their common sheets; this is a present-day comparison, not a replacement for the historical 96-cell change log. No source file was saved or rewritten. The reader's unsupported-WMF warning affects its in-memory representation only.
- Re-extracted 47 constituent weights, applying the reviewed workbook's proportional dunnage allowance. Ran the actual production loading, trimmed-table, cross-curve, GZ integration and weather-roll modules against the installed Vectis resources.
- Legacy comparison: 15/15 within tolerance, but two use workbook KM and three use a workbook-derived upright table. These are scoped formula checks, not independent source validation.
- Expanded comparison: **60 numerical comparisons: 48 matches, 12 differences**. The JSON records every value, delta, tolerance and basis. A matching result is not necessarily independent evidence when its inputs came from the workbook.
- Six behavior checks pass: an additional 10 t changes displacement/moments, unsupported displacement/LCG/density are rejected, TCG affects GZ with its signed cosine term, and absent weather inputs remain explicitly unavailable in the report.
- Full existing suite rerun: 392 tests passed, zero failed. Lint and `git diff --check` passed. No application runtime code was changed, so the release build was not regenerated.
- Built a fresh assessment report for the extracted numerical condition. This audit does not replay placement of 3,376 individual cargo units through the browser or recalculate Excel after input edits. Prior UI evidence is in `2026-10-09-workflow-verification.json`; it covers a smaller demonstration layout.

## Worksheet coverage

| Worksheet | Formula cells | Inputs and outputs inspected | App mapping and result |
|---|---:|---|---|
| Calc_ideal_SF | 11 | C3:C19, I5:L18, I19:I20: displacement, lightship, consumables, net cargo DWT, hold volume, SF and load-full/load-down decision | **Missing dedicated workflow.** The app manages weights and cargo dimensions but has no equivalent linked ideal-SF/net-cargo-capacity worksheet. Register-tonnage conversions are descriptive and must not substitute for physical hold capacity. |
| Calc_G_Cargo | 302 | C4:M33: coordinates, package volume/mass, stack/support centres; C40:K78: cargo, dunnage, other weights and moments; C85:C87: displacement check | **Partial.** Production mass/moment sums match. Geometry, support mass and editable weights exist. Cargo mass from package volume/SF, the blanket 10% dunnage allowance, and this exact aggregate hold distribution are not automatically recreated. Density-based physical supports are a different workflow. Geometric support assumptions M13/M28 still need source review. |
| Calc_List | 28 | B5:H5, C13:K19 and B23:B25: initial condition plus three ballast tanks | **Arithmetic verified.** Before-ballast and list-ballast mass/moments match within stated precision. Ballast editor exists, but the aggregate comparison does not verify tank-by-tank mapping, fill percentages or identical sounding-table CG/FSM. The worksheet's name does not imply it calculates an actual equilibrium heel angle. |
| Calc_Trim | 150 | C30:K46: final ballast; B13:H27 and B54:L107: displacement/TPC/MCT estimates; B113:N120: selected trim/draft and endpoint drafts | **Main result verified; intermediate workflow partial.** Final trim, draft and LCF match. The app uses installed tables and does not reproduce the workbook's MCT/TPC working blocks as an editable worksheet. Endpoint drafts now exist in the app using its documented datum, whereas reviewed D119:D120 intentionally contain REVIEW DATUM. |
| Calc_Stability | 193 | C4:C26: FSM/KG/KM/GM; B12:L14: allowable KG; C40:O50 and B53:N58: ordinates/GZ; I62:L73: areas/criteria/maximum; chart | **Partial, with material source and method differences.** Corrected KG matches. Installed KM differs from workbook KM. Three ordinates differ. Actual signed-TCG results deliberately differ from the workbook's centreline reference. Annotated limiting-KG data use another convention and cannot be declared equivalent. Numerical criteria exist, but some remain unresolved by data. |
| Calc_Wind | 50 | B3:U4: mirrored reference curve; C9:C16: wind lever/equilibrium; C19:C34: empirical roll; B61:F64: chart coordinates; chart | **Partial.** Roll-period and selected factor formulas match when supplied the workbook assumptions. Interpolated X1 differs from its hardcoded 0.9. The app needs condition-specific weather inputs and an explicit port-estimation basis. No complete apples weather assessment is established by this comparison. The workbook itself has no full energy-area comparison. |
| Calc_Lashing | 14 | C3:C18: cargo, friction, arrangement, acceleration; C22:C28: forces/strength; C30:C38: sliding/tipping checks | **Missing.** No production equivalent for Fx/Fy/Fz, MSL-to-CS or the three securing checks. Automatic dunnage and top-load screening do not implement these calculations. |
| Review_Notes | 0 | Existing correction history and assumptions | Source traceability retained. The app has source references/assessment JSON, but no consolidated assignment report containing all seven worksheet outputs. |

## Numerical results

Values below use all constituent precision; workbook rounded subtotal moments explain tiny centre differences.

| Result | Reviewed workbook | Production calculation | Interpretation |
|---|---:|---:|---|
| Final displacement, t | 9644.270000 | 9644.270000 | Match |
| LCG from AP, m | 59.077523960 | 59.077524209 | Match within 0.000001 m |
| Physical KG, m | 6.632273280 | 6.632273425 | Match within 0.000001 m |
| TCG, m | -0.147695440 | -0.147695948 | Match within 0.000001 m |
| Final trim FP−AP, m | -1.261023925 | -1.261023772 | Match |
| Tabulated underside-keel draft, m | 5.767547746 | 5.767547752 | Match |
| KM at trim, m | 7.736148407 | 7.677947264 | Source discrepancy |
| Corrected GM, m | 1.071772127 | 1.013570839 | Difference follows KM |
| Centreline GZ at 30°, m | 0.816508426 | approximately 0.816508348 | Match |
| Actual signed-TCG GZ at 30°, m | Not calculated | 0.944416791 | Different condition basis, not a parity failure |
| Centreline area 0–30°, m·rad | 0.177447168 | 0.177151712 | Difference follows 5° ordinate |
| Centreline area 0–40°, m·rad | 0.357819990 | 0.357524519 | Difference follows 5° ordinate |
| Wind roll X1 | 0.900000000 | 0.896623981 | Workbook rounds/chooses a factor; code interpolates |
| Wind roll angle, degrees | 21.454171965 | 21.373694523 | X1 effect with workbook GM and other assumptions held fixed |

The app also gives longitudinal-reference aft/forward underside-keel drafts of 6.398059638 m and 5.137035865 m. They are not actual heeled end drafts. The reviewed workbook has no numeric endpoints to compare. The moulded mean draft is 5.756547752 m, reflecting the package's 0.011 m offset.

## Source discrepancies requiring review

The known KM/LCF discrepancies were documented in the 23 September audit. This run reproduces their downstream effects; it does not silently correct the source workbook.

| Workbook source cell | Workbook | Installed/source-audit value | Consequence |
|---|---:|---:|---|
| Calc_Trim!F105 | 7.754 | 56.084 | LCF column contains KM-sized value; unused by final −1.5/−1 interpolation |
| Calc_Trim!F107 | 7.746 | 55.974 | Same |
| Calc_Stability!B17 | 7.720 | 7.659 | Changes KM and GM |
| Calc_Stability!B19 | 7.708 | 7.652 | Same |
| Calc_Stability!D17 | 7.759 | 7.700 | Same |
| Calc_Stability!D19 | 7.747 | 7.693 | Same |
| Calc_Stability!E46 | 0.688 | 0.668 | 5° cross-curve ordinate, −1 m trim, 9700 t |
| Calc_Stability!N44 | 6.403 | 6.417 | 50° cross-curve ordinate, −1 m trim, 9600 t |
| Calc_Stability!O44 | 7.005 | 7.014 | 60° cross-curve ordinate, −1 m trim, 9600 t |

The last three comparisons use installed `cross-curves-constant-lcb.json`, with source tokens and PDF page 67 / printed page 11.9. Its complete extraction was independently audited previously. This run compared the stored source tokens; it did not re-render the PDF. Double-check these source cells and dependent GZ, areas, GM, rolling and lashing GM-selection calculations before accepting corrections. The reviewed workbook remains unchanged.

## Assessment and operator gaps

- At the apples condition the report calculates four numerical intact minima and marks the two downflooding-dependent area criteria insufficient. This is not an overall intact-stability pass.
- The app's annotated KG limit is 6.736385404 m at this moulded draft, versus workbook L13 = 6.857175307 m from a different trim/displacement table. The report correctly says **Convention unresolved**. These cannot be reconciled by rounding or treating one as a substitute for the other.
- The fresh manual-condition report preserves **Weather inputs are missing or belong to a different condition**. Workbook LBP-as-LWL and k=1 assumptions were reused only in the isolated roll-formula comparison, not accepted as vessel weather inputs.
- Aggregate weights can reproduce the numerical condition. They do not recreate individual cargo units, support geometry or local deck loading. A manual-condition report therefore correctly marks cargo load checks unavailable. A valid editable spatial reconstruction is still required for a complete cargo-planning demonstration.
- The old README and legacy comparison described an unavailable Vectis model/trim solver. Those statements were stale. This audit supersedes them for coverage. The legacy comparison text has been corrected and now accepts an explicit workbook path.

## Acceptance work, in order

1. Resolve the nine source-cell discrepancies above and the limiting-KG basis, preserving original values, provenance and downstream comparisons. Select explicit weather inputs rather than copying workbook assumptions silently.
2. Add linked ideal-SF/net-cargo-DWT/package-mass planning, with a defined treatment of consumables, ballast, support mass and usable hold volume. Match Calc_ideal_SF and the relevant Calc_G_Cargo inputs.
3. Add the cargo-securing workflow: arrangement inputs, accelerations, forces, friction, calculated securing strength and sliding/tipping checks. Use an independently reviewed formula basis; do not copy the workbook's arrangement factors blindly.
4. Reconstruct a spatial apples condition, including supports and individual tank mapping. Reconcile summed geometry weights/CG with the selected reference basis and verify updates through all pages, save/export/import and report generation.
5. Provide a consolidated human-readable report covering every required assignment output and its unresolved assumptions. Retain JSON as the machine-readable record.
6. Rerun the comparisons and a complete operator workflow after the missing features are implemented. Keep the full-replacement gate open until all required outputs are verified or explicitly agreed out of scope.

## Reproduction

From the repository root, with project dependencies installed and Python available:

```sh
npm run compare:excel -- /absolute/path/apples-calculations-reviewed.xlsx
node scripts/verify-workbook-replacement.mjs /absolute/path/apples-calculations-reviewed.xlsx
python3 scripts/inventory-workbook.py /absolute/path/apples-calculations-reviewed.xlsx docs/audits/2026-10-10-workbook-inventory.json /absolute/path/original.xlsx
```

The inventory needs `openpyxl`. `PYTHON` can select the interpreter for the two Node commands. The expanded script exits nonzero for failed behavioral checks or calculation errors. Numerical differences remain explicitly recorded as DIFFERENCE; a zero exit does **not** mean replacement is accepted. The output always records `replacementAccepted: false` while the listed coverage gaps remain.
