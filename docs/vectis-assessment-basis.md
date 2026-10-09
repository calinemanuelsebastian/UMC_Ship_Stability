# Vectis Castle: documented assessment basis

This is a source review, not a current-condition compliance assessment. The machine-readable source is `validation-references/reviewed-apples-vessel/assessment-basis.json`; both Stability Curves and 3D View display it. Other ships do not inherit these criteria. Imported packages may supply the same resource kind, `stability.assessment-basis`; the parser checks its structure. Adding the resource preserves existing loading-condition signatures.

## Source and approval status

Stability Loading Manual P10046-076-130, October 2012, IMO 9626168, supplied as `004_STABILITY_LOADING_MANUAL.pdf`. Its cover is marked Preliminary and has a GL Preliminary Approved stamp dated 2012-12-14, reference 12-136583. Neither final approval nor present-day flag/class applicability is established. The cover refers to a letter and red remarks; the referenced letter has not been verified. The source PDF is unchanged and its SHA-256 is included in the JSON.

## Findings from visual review

- PDF 1: class remarks require the approved Container Securing Manual for containers, cite A.715(17) for timber deck cargo, and direct use of limiting curves on printed pages 13.82–13.83 for all trims and arbitrary deck loading.
- PDF 11, printed 3.3: red annotations replace −2.000 with −1.860 m at moulded draughts 6.560 and 8.000 m. At 4.400 m the range is −2.620 to −1.380 m. Intermediate values are interpolated. These operational constraints differ from numerical table coverage. They are recorded but not yet enforced by a condition-assessment solver.
- PDF 15, printed 5.1: damage-stability reference is SOLAS 2009 II-1 Part B-1. Partial-draught GM is corrected in red to 0.340 m. The KG worked example has inconsistent draught references and is not adopted as validation evidence.
- PDF 16, printed 6.1: six intact-stability criteria, including the downflooding-dependent area limits, are transcribed into the basis.
- PDF 17, printed 6.2: MSC.267(85) is cited in the weather-criterion text. A.749 remains in its heading; the A.562 label is crossed out in red. Do not interpret these older labels as independent confirmation of current applicability.
- PDF 175–176, printed 13.82–13.83: red replacement DAM-GM tables overlay the original black tables. Plain text extraction misses these overlays. Future extraction must use the annotated tables, verify the draught datums and clarify their application alongside intact/weather checks. No values from the underlying tables have been promoted into the solver.
- PDF 31, printed 9.1: summer reference is 8.011 m underside keel, 13976.39 t at density 1.025 and zero trim; not a universal maximum displacement.
- PDF 2: companion documents are Tank Sounding Manual 076-180, Damage Control Manual 076-125, and Damage Control Plan 100-075.

## Implementation boundaries

The panel uses three evidence categories (Documented, Conditional, Unconfirmed). All requirements have current-condition status Not assessed. No numerical pass/fail, regulatory certification or operational permission is inferred from curve generation. The assessment resource does not change the hydrostatic or heel solvers. Teaching calculations remain possible within their own numerical ranges.

Next work: verify the final approval letter/revision and companion documents; extract the annotated limiting KG data; implement downflooding-aware condition checks. Current mandatory amendments must be checked with the flag/class before any operational approval claim.

## Follow-up: annotation extraction and preliminary downflooding screening

Approval search covered 35 supplied PDFs (2736 pages), searching text and annotation contents. All seven vessel-document covers were also rendered and reviewed. No final letter or separately identified final Damage Control Plan was located. This is not proof that no image-only approval material exists. Inventory: `validation-references/reviewed-apples-vessel/approval-document-search.json`.

The supplied Cargo Securing Manual cover identifies Vectis Isle / YZJ2011-999; Castle is YZJ2011-1000. No ship-specific applicability is inferred. The tanks capacity table covers hulls 997/998/999/1000 but is not identified as the exact companion sounding manual 076-180. Strength and ballast covers also carry preliminary approval stamps.

`annotated-kg-limits.json` and CSV retain 71 annotated DAM-GM rows, including special knots at 6.571 m and 8.012 m bottom-of-keel draught. All printed numeric columns match annotation Contents and rich-text RC. Page images were reviewed. No source values were changed. Differences from the underlying black table and hydrostatics remain explicit; a KG compliance checker is deliberately not inferred from this extraction.

`downflooding-samples.json` and CSV retain 156 cells, with seven numeric thresholds and 149 dashes. All tokens independently match pypdf and pdfplumber extraction. The opening catalogue retains 142 source records, including duplicate names, question marks and closure types. These are not 142 independent unprotected openings: only the two engine-room supply vents are classified open in the source. PDF 18 has a red instruction to update their locations to the final Damage Control Plan. That remains an unresolved qualification on the screening.

The shared constant-LCB solver screens current mass at current initial trim against numeric threshold samples. Initial-trim interpolation is allowed only when both bracketing values exist; exact knots retain their own data. Dashes stay unknown. No interpolation across missing cells, port mirroring, angle extrapolation or inferred safe range is used. A reached threshold is reported at its sampled angle, not as an exact onset. Numerical coverage and density restrictions are enforced. The original GZ curve remains an intact mathematical curve; downflooding evidence is shown separately. If a proposed 3D equilibrium is at or beyond the first reached sample it is rejected. Earlier unknown onset, dynamic response and actual closure state remain unassessed.

Reproduce with the bundled Python runtime running `scripts/extract-vectis-assessment-data.py SOURCE_PDF validation-references/reviewed-apples-vessel`. The script preserves source tokens, SHA-256, page references and empty correction logs. JSON/CSV resources are available under Assessment basis in both calculation views and are carried in ship-package exports.

## Numerical permissible-trim check

Assessment basis now includes a trim results panel in Stability Curves and 3D View. It computes initial trim from the shared displacement, LCG and density using the existing LCB-balance solver, and interpolates both annotated operating limits by moulded draught. Exact source knots are retained; no extrapolation. Positive margin means distance inside the nearest bound, negative margin means exceedance. This individual check is not overall compliance.

The operator must enter the verified moulded draught for that condition under Assessment draught. This is a local assessment input, not a replacement for the shared hydrostatic draught, and is not saved with scenarios or carried between pages. Changing the mass, LCG, density or longitudinal FSM (or pending updates) clears it. The existing table's underside-keel draught and unconfirmed longitudinal reference must not be silently converted into the moulded draught for this requirement. Unsupported density, missing inputs, nonzero longitudinal FSM, out-of-range draught or unbracketed trim keep the result Not assessed.

## Intact-stability criteria estimates

Both assessment views now include the six source §6.1 / MSC.267(85) Part A §2.2 minima: areas 0–30 (0.055 m·rad), 0–X (0.090), 30–X (0.030), GZ at/above 30 degrees (0.20 m), maximum-GZ angle (25 degrees), and corrected initial GM (0.15 m). Criteria are opt-in through `intactCriteria: msc267-general-source-v1` in the vessel assessment resource; they are not automatically applied to the pontoon or arbitrary ships.

The panel calculates numerical estimates and estimate-minus-minimum margins. All criterion verdicts remain Not assessed with per-row reasons. It does not infer a certified flooding boundary from sparse thresholds or a preliminary manual note. For X-dependent criteria the displayed integral uses 40 degrees only as an explicitly labelled illustration. Values above a potential flooding onset describe the mathematical intact curve, not an available stability reserve.

Areas integrate signed corrected GZ using linear interpolation at interval boundaries and trapezoids with angle converted to radians. No absolute areas, no extrapolation, and no second FSM correction. The maximum-GZ angle is reported only for a unique interior sampled maximum; boundary maxima and plateaus remain unresolved. The GM row is explicitly a 0-to-first-positive-angle secant estimate (only if the first point is no further than 2 degrees), not a validated trimmed hydrostatic GM. No even-keel KM is silently used for a trimmed condition.

Reference checked: https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.267%2885%29.pdf . Applicability and final approval remain separate questions. Weather criterion, damage-stability limits and global compliance have not been implemented by these six numerical comparisons.

## KMt and corrected GM at initial trim

The trimmed hydrostatic dataset now includes all 720 documented KMt values from PDF pages 35–58. `scripts/extract-vectis-trimmed-km.py` independently compares every numeric row token using pypdf and pdfplumber, verifies existing mass/LCB/LCF exactly, and adds KMt without changing those values. `trimmed-km-audit.json` preserves each printed KM token, source page and PDF SHA-256. Rendered pages 35/58 verify the KM transverse column; PDF 12 supplies the worked example and GM definition. Existing extraction tooling also retains KMt when regenerated.

KMt is interpolated in displacement within each necessary trim table, then in initial trim. Missing optional values remain unavailable; exact knots do not depend on neighbouring missing values. No even-keel substitution, density rescaling or extrapolation. Corrected GM = KMt − physical KG − FSM/displacement. The assessment shows the operands, initial trim and table path, and compares the result with the 0.15 m minimum. Labels are Meets numerical minimum / Below numerical minimum, not vessel approval. Models without KM data retain the explicitly labelled secant estimate and Not assessed status.

Manual PDF 12 steel-coils example: displacement 13201.307 t, initial trim −0.774 m, corrected KG 4.647 m. Interpolated KMt = 7.6516315677 m; corrected GM = 3.0046315677 m, rounding to the printed 3.005 m. When using corrected KG in this validation case, FSM is zero to avoid applying it twice. A physical-KG plus FSM test produces the same result.

This supersedes the earlier GM-slope limitation for the Vectis dataset. Draught-reference conversion and annotated limiting-KG assessment remain separate unresolved work; they were not inferred from KM extraction.

## Draught-reference resolution and annotated KG comparison

Visual re-review of PDF 5 and 32–33 establishes the manual's mean draught at half LPP (60.850 m from AP), LPP 121.700 m, positive trim toward the bow, and worked underside-keel to moulded conversion by subtraction of 0.011 m. Trimmed-table metadata now declares that reference and offset. This supersedes the earlier unconfirmed mean-draught reference. End draughts can be calculated, and the operating trim check uses calculated moulded draught automatically. Imported tables without an offset retain the explicit input fallback.

The manual example (rounded inputs on PDF 32–33) is reproduced: underside-keel mean 6.4785 m and trim −1.005 m give AP 6.981 m and FP 5.976 m; moulded mean is 6.4675 m. Source distinctions between draught marks and perpendiculars are retained.

The annotated limiting-KG panel interpolates the red table using its own moulded-draught column. It does not map by displacement, use the underlying black table, or replace annotated draught pairs with the 0.011 m convention. It displays maximum KG, physical KG, corrected KG (one FSM/displacement addition) and both margins. The corrected-KG example in the main manual is relevant evidence but does not conclusively establish the convention of the red replacement DAM-GM table. Consequently that comparison remains Not assessed pending the approval letter/convention confirmation. No full damage or intact compliance verdict follows from a positive margin. Table range beyond summer load line does not authorize loading there.

## Wind-profile comparison

The next weather-criterion stage extracts 375 rows across five documented silhouettes (no deck cargo and 1–4 container tiers), PDF 79–80, 82–83, 85–86, 88–89 and 91–92. `scripts/extract-vectis-wind.py` compares every numeric token with two extraction engines, retains source tokens/page numbers/SHA-256, and verifies moment/displacement against each rounded source lever. Tables date from March 2011. The source pressure is 51.40 kg/m²; moment reference is half draught; draught is from baseline.

The Wind and rolling assessment section requires explicit profile selection; it does not infer a silhouette from cargo layout. Wind moment and projected area are interpolated in moulded draught. Steady lever equals source moment (kg·m) divided by the actual condition displacement converted from tonnes to kg. This avoids importing the different displacement column as the actual loading condition. No source-pressure conversion, silhouette trim correction or extrapolation is silently applied.

This is a source-profile comparison, not a completed IMO weather-criterion solver. Profile applicability, windward roll parameters, two-sided GZ, deck-edge immersion and verified downflooding remain unresolved. No energy areas, gust/roll equilibrium or pass/fail are reported. Review reference: MSC.267(85) Part A §2.3, https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.267%2885%29.pdf .

## Steady-wind equilibrium estimate

The wind panel now solves corrected GZ minus the selected steady wind lever = 0 using the existing piecewise-linear equilibrium solver. It displays a unique interior stable root and 16° minus its absolute angle. Corrected GZ already contains the transverse FSM effect; no second correction is applied. Wind acts toward source starboard only; no missing port curve is mirrored. Boundary, neutral and multiple stable roots remain unresolved. A reached sampled downflooding threshold blocks the estimate, while an unknown onset is explicitly unresolved.

This is a local mathematical equilibrium, not proof of a continuous safe path, a roll simulation or weather compliance. MSC.267(85) Part A §2.3.1.2 additionally limits steady heel to 80% of deck-edge immersion. That verified angle is unavailable, so a positive 16° margin cannot produce a pass. This supersedes the earlier statement that no steady-wind equilibrium is reported; gust, rolling and energy-area checks remain outstanding. Curve inputs are keyed to the full shared condition to hide stale KG/TCG/FSM results during recalculation.

## Gust, roll and energy-workspace implementation

Reviewed manual PDF 17 (including the red struck-through A.562 label), 34 and 80; searched all 504 pages for rolling period, roll angle, deck edge, waterline length and bilge/roll terms. PDF 34 lists design particulars LWL 123.950 m and breadth 17.400 m. PDF 80 visually confirms bilge/bar-keel area 21.500 m². These do not establish a condition-dependent LWL or CB curve or a verified deck-edge immersion curve. Existing opening limitations remain unresolved. The design LWL is explained as a source reference, not auto-applied at arbitrary loading; summer CB is not reused automatically.

Implemented MSC.267(85) Part A §§2.3.2–2.3.5 using the IMO resolution hosted by USCG: https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf (PDF 14–17). Gust lever is 1.5 times the source-profile steady lever. Source pressure remains 51.4 kg/m² rather than silently replacing it with the exact 504 Pa convention. Roll tables X1, X2, k and s use linear interpolation and their documented endpoint plateaus. Physical KG enters r; corrected GM enters approximate T. B/d >= 3.5, KG/d−1 outside [−0.3,0.5], T >= 20 s, nonpositive GM and invalid inputs block the empirical estimate. Bilge-keel branch only, no active anti-roll credit. LWL and CB require explicit condition-specific operator inputs.

Immersion and flooding angles are local operator inputs, not certified metadata. They reset on condition/profile changes and are not persisted in saved scenarios. Entering them never produces a compliance verdict. The displayed steady-heel comparison is min(16°,0.8×deck-edge angle). Energy a integrates gust−correctedGZ from phi0−phi1 to the first stable gust intersection; b integrates correctedGZ−gust to min(operator flooding angle,50°,second descending gust intersection). Integrals use radians and exact linear boundary interpolation. No absolute-value repair, angle extrapolation, port mirroring, neutral/multiple-root guessing or default 50° flooding assumption. A supplied reached flooding threshold blocks an interval that reaches it. Missing GZ on either end blocks both totals. All outputs are provisional numerical estimates.

The plot shows the actual supplied GZ, steady/gust lines and windward starting angle. Missing portions remain blank; only complete valid integration intervals receive a/b shading. For Vectis, a windward start below 0° remains unavailable with the current starboard-only data. Next evidence needed: condition-dependent LWL/CB, both-side GZ coverage, final openings/deck-edge immersion limits and confirmed profile/approval applicability. Tests include every factor knot/midpoint, analytic roll and energy examples, limits, ambiguous roots, missing coverage and flooding blocks.

## 2026-09-21: port-side references and remaining priorities

A fresh text search of all seven vessel-document PDFs (1,649 pages) identified condition-specific `Angle(PS)` curves in BOTH the stability manual and ballast management plan. This corrects the earlier broad statement that port-side source data was absent. The implemented general cross-curve grid remains starboard-only: the newly located cases do not form a reusable displacement/trim grid. `docs/weather-evidence-search.json` preserves matching pages/excerpts from the seven-document search. A text-search miss does not exclude image-only material.

`scripts/extract-weather-evidence.py SOURCE_DIRECTORY assessment-basis.json` extracts 37 PS cases (481 rows), matching all curve columns, total weight columns and summary deck/flooding numeric tokens independently with PDFium and pdfplumber. Source file SHA-256 and exact page numbers/raw numeric tokens are retained within `weatherEvidence` in the assessment resource. Source PDFs are untouched. A collapsed read-only reference browser in both assessment views shows each original port-positive curve, condition inputs, source summary values and derived deck-immersion angle (printed 80% limit / 0.8). It has no action that changes the live loading condition or inserts limits into the weather solver.

Visual inspection of the ballast plan PDF 52 revealed a red **Not Accepted** stamp. This is shown in the UI; these are archival numerical references, NOT evidence of current approval. The stability manual is preliminary. PDF 229–230 (ballast departure) gives 8245.847 t, KG 6.202 m, LCG 59.321 m, TCG −0.001 m, FSM 325.561 t·m, 80% deck-immersion limit 30.325°, source steady-wind angle 3.064° and reported flooding angle 60°. Ballast plan PDF 51–53 (step 2) gives 7919.980 t, TCG −0.047 m, 80% deck limit 30.414° and wind angle 5.185°. These values must not be treated as limits for an arbitrary current condition; 60° may be the reporting coverage boundary, not a verified exact flooding onset.

Waterline priority: stability PDF 34 lists design LWL 123.950 m, B 17.400 m, design draught 8.000 m, and appendage coefficient 1.0028; PDF 5 lists CB 0.8026. No condition-dependent LWL/CB table was identified in the seven vessel PDFs. These remain documented design particulars, not safe defaults across loading and trim. No guessed coefficient curve is installed.

Immersion priority: condition-specific 80% deck-edge limits are now available as references. PDF 59's general no-openings-up-to-40° note and PDF 19's opening discussion do not supersede the red requirement on PDF 18 to update engine-room vents to the final Damage Control Plan. A final arrangement and validated continuous immersion limits remain outstanding. General two-sided KN/GZ, condition-dependent LWL/CB and final openings/approval evidence are still needed before the live weather assessment can be completed.

## Reference numerical diagnostics

Each selected port-side reference now includes expandable calculation checks and a downloadable JSON report carrying case ID, source filename, SHA-256 and curve page. The report reconstructs each printed GZ using KN minus the already-corrected KG sine and TCG cosine columns. A 0.002 m rounding bound accounts for four independently rounded 0.001 m quantities; larger residuals are flagged for review without changing the source. This checks arithmetic, not correctness of the ship model.

Areas 0–30°, 0–40° and 30–40° use signed trapezoids in radians and are compared with differences of printed cumulative areas at exact endpoints. Missing endpoints remain unavailable. Area differences are shown numerically, without declaring source errors or inventing an acceptance tolerance: the original program may integrate a more detailed curve than the printed samples. No extra free-surface correction is applied. No compliance verdict or validation of the live ship solver is implied.
