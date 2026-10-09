# Vectis Castle: trim balance, source tables and formula audit

Reviewed 23 September 2026. Read-only audit of the application and supplied workbooks; no source workbook, PDF, table or solver was changed. Browser-local loading values were unavailable. The cases below reproduce source/default conditions, not an assertion about an unseen saved plan.

## Why no trim balance is found

The application starts a new plan through `cleanLoadingPlan`: lightship, tween-deck panels and empty tanks. Crew/provisions and departure tank presets exist but are not automatically applied by this initializer. An empty cargo plan is therefore not the documented ballast departure condition.

Installed-panel empty plan:

- Lightship: 3,660 t; LCG 51.150 m; KG 8.700 m; TCG +0.400 m.
- Panels: 269.600 t; LCG 63.240 m; KG 6.970 m; TCG 0 m.
- Total: 3,929.600 t; LCG 51.979464577 m; KG 8.581309039 m; TCG +0.372557003 m.
- The lightship mass and centres are documented in stability manual PDF p21, including TCG +0.400 m. PDF p5 calls mass/LCG/KG approximate. They are not confirmed final inclining-test particulars.

At this displacement, interpolation within each imported trim table gives:

| Trim, FP minus AP (m) | Mean underside-keel draft (m) | LCB from AP (m) |
|---:|---:|---:|
| -2.000 | 2.601900 | 56.994002 |
| -1.500 | 2.600834 | 58.363034 |
| -1.000 | 2.598182 | 59.729510 |
| -0.500 | 2.594325 | 61.090957 |
| 0.000 | 2.589439 | 62.447478 |
| +0.620 | 2.582249 | 64.125491 |

The required LCG, 51.979465 m, is 5.014537 m aft of the lowest available LCB. The code seeks a sign change in LCB minus LCG between adjacent trim tables. There is none. Displacement IS covered; the missing coverage is a trim/LCB balance for that longitudinal weight distribution. This does not prove that the physical vessel has no equilibrium. It means this table-based method cannot determine it without extrapolation.

The reference plan with all cargo-role rows removed is a second failed example: 6,080.170 t, LCG 57.903832 m; lowest available LCB 58.068623 m at -2 m trim. The intact apples reference DOES bracket a balance.

The numerical tables cover -2 to +0.620 m, with 120 draft rows per trim (2.50–8.40 m, plus 8.011 m). PDF p11 additionally has red operational annotations: -1.860 to +0.620 m at moulded drafts 6.560 and 8.000 m, and -2.620 to -1.380 m at 4.400 m. An operational limit of -2.620 m is not a supplied hydrostatic table at -2.620 m. No such general table was found in the manual's complete hydrostatic chapter. The empty plan is also below that 4.4 m light-service reference.

Calculated heel fails at the same prerequisite because its constant-LCB cross curves are selected using initial trim. A fabricated trim must not be substituted to make heel work.

## Source-table checks

- Hydrostatics: freshly checked every one of 720 trim rows against PDF pp35–58, including displacement, LCB, LCF and KMt. Every numeric source row independently agreed between pypdf and pdfplumber. No installed-data differences.
- Upright table: all 120 rows checked for displacement, LCB, LCF, KMt and TPC. No installed-data differences. The existing in-file corrections at 5.80/5.85 m remain relevant to old workbook-based comparisons.
- Constant-LCB cross curves: re-extracted all 684 rows / 8,892 ordinates, PDF pp60–77, using two extraction engines. Installed sets match exactly. These cover six initial trims, 3,500–14,800 t, and 13 starboard angles from 0 to 60 degrees. They do not supply a general heeled-draft/trim path or a general port-side grid.
- Tanks: all 68 capacities and full centres match the capacity summary, with the documented +60.85 m conversion from midships to AP. All 5,782 interior filling rows match their own sounding pages; 136 empty/full endpoint rows are application conventions and were not counted as original sounding rows. Interpolation uses volume moments for CG and density times volume/inertia for mass/FSM.
- Annotated limiting KG: all 71 rows match a fresh extraction of PDF annotation contents/rich text. Downflooding: all 156 samples and 142 opening records match fresh extraction; only seven samples are numeric and the remaining 149 are unknown dashes. Wind: all 375 source-token rows agree with two independent extraction engines. Unknown entries remain unknown.
- All 37 extracted historical port-side cases bracket initial trim using the installed hydrostatics. Largest absolute difference from printed initial trim: 0.003514 m (upper rounded bound). This is a regression comparison with rounded historical inputs, not operational approval.
- Ballast departure example, PDF pp229–230: source 8,245.847 t, LCG 59.321 m, printed trim -1.301 m and moulded draft 5.019 m. Application: -1.299834 m and 5.018417 m. This supports a documented ballast starting condition, not automatic arbitrary tank filling.

## Workbook comparison and discrepancies

Both the original Downloads workbook and `validation-references/apples-calculations-reviewed.xlsx` contain the following six discrepant hardcoded values. The source row and column were visually checked in the manual.

| Workbook cell | Stored value (m) | Source value (m) | Evidence |
|---|---:|---:|---|
| Calc_Trim!F105, LCF | 7.754 | 56.084 | PDF p36, trim -2, draft 5.70; stored number is KMt |
| Calc_Trim!F107, LCF | 7.746 | 55.974 | PDF p36, trim -2, draft 5.75; stored number is KMt |
| Calc_Stability!B17, KMt | 7.720 | 7.659 | PDF p44, trim -1, draft 5.75 |
| Calc_Stability!B19, KMt | 7.708 | 7.652 | PDF p44, trim -1, draft 5.80 |
| Calc_Stability!D17, KMt | 7.759 | 7.700 | PDF p40, trim -1.5, draft 5.75 |
| Calc_Stability!D19, KMt | 7.747 | 7.693 | PDF p40, trim -1.5, draft 5.80 |

The LCF discrepancy affects the -2 m auxiliary branch; the final reference trim interpolates between -1 and -1.5 m, so these two LCF inputs do not explain the current failed balance. The KM inputs directly affect GM and subsequent roll calculations and must be reviewed before relying on workbook results.

Fresh calculation from the reviewed workbook's constituent weights:

| Result | Workbook cached value | Application/source-table result |
|---|---:|---:|
| Displacement (t) | 9644.270000 | 9644.270000 |
| LCG (m) | 59.077523960 | 59.077524209 |
| Trim (m) | -1.261023925 | -1.261023772 |
| Mean underside-keel draft (m) | 5.767547746 | 5.767547752 |
| KMt (m) | 7.736148407 | 7.677947264 |
| Corrected GM (m) | 1.071772127 | 1.013570839 |

Tiny LCG/trim differences arise from rounded workbook subtotal moments versus constituent precision. The 0.058201 m GM difference is a source-input discrepancy, not mere rounding. Cached workbook values were inspected; Excel itself was not recalculated in this audit.

The workbook final trim uses LCB/LCG interpolation at fixed displacement. The app implements that same final method. Workbook auxiliary estimates use `deltaTrim = displacement*(LCG-LCB)/(100*MCT_1cm)`. MCT is available in the PDF but not imported into the general trim dataset. Its omission does NOT cause this failure: the final bracketed LCB method does not require MCT. A linear MCT estimate beyond available trim coverage would need a separately qualified method, not silent replacement of the present result.

The earlier comparison report's GM rows explicitly reused Excel KM, so their PASS did not validate those source KM inputs. Its statement that the simulator lacks a matching table-trim solver is now outdated. Use the fresh figures above.

## Formula and IMO gap assessment

The application implements mass/moment sums, fixed-displacement table interpolation, GM = KM - KG - FSM/displacement, and source-ordinate GZ = ordinate - (KG + FSM/displacement)*sin(heel) - TCG*cos(heel). The printed cross-curve ordinate is already a lever; it must not be multiplied by sine a second time. Manual PDF pp12–13 supports these conventions. GZ areas use radians.

The basic intact numerical limits in `intact-assessment.ts` are 0.055/0.090/0.030 m-rad, 0.200 m GZ, peak angle at least 25 degrees, and corrected GM at least 0.150 m. Weather code implements the factor tables, 1.5 gust multiplier, roll-period/angle expressions and signed energy integrals. These implemented formulas alone do not establish complete compliance.

Against MSC.267(85), Part A §§2.2–2.3 and Part B §§3.1, 3.5, 4.1, remaining issues include: condition-specific flooding limits and both-side curve coverage; free-trim hydrostatic outputs; consumable-tank worst-case free surfaces; missing full assessment inputs and ship-specific approval. The code's virtual-KG correction and upright tank CGs remain approximations requiring an accepted basis. The source booklet is preliminary, and final approval/applicability is unresolved. Part A is mandatory; cited Part B provisions are recommendations/additional guidance, not all independently mandated formulas. This is not a completed flag/class compliance audit.

The workbook wind sheet uses LBP 121.7 m where the weather-period expression specifies waterline length, derives CB with that length, and sets some correction factors to 1. These are assumptions to review, not authoritative defaults. The app's weather workspace requires condition-specific LWL/CB rather than adopting those values. Its wind tables preserve source pressure 51.4 kg/m², so equivalence with the IMO pressure convention is explicitly not an automatic approval claim.

Sources checked online on 23 September 2026:
- IMO resolution text, official USCG-hosted copy: https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf
- IMO publication overview (2020 consolidated edition): https://imo-epublications.org/content/books/9789280117202
- MSC.1/Circ.1229 official Netherlands registry: https://puc.overheid.nl/nsi/doc/PUC_1962_14/

## Recommended work

1. Add a separate documented ballast-departure starter; retain a truly empty editor as a distinct choice. Do not silently add ballast to a user's plan.
2. Show displacement, target LCG, available LCB range and trim range alongside a failed balance.
3. Correct the six workbook inputs in a reviewed copy, retain before/after values in its existing Review_Notes, and recheck GM, roll and dependent results. No workbook was changed by this audit.
4. Resolve remaining source/assessment gaps before claiming an IMO-complete stability instrument. Broader hydrostatics or validated geometry are needed to cover arbitrary extreme loading outside the current table envelope.

Verification: all 299 existing automated tests passed. Tests complement the source comparison; they do not certify the source data, the live browser condition, or compliance.
