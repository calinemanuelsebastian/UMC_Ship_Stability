# Step 4: numerical weather assessment

> Historical stage note: the statement below that assessment inputs do not persist is superseded by assessment-persistence-and-report.md and the current shared assessment settings. Browser verification claims here remain historical, not current acceptance.

In Stability Curves or 3D View, open Wind and rolling assessment and choose a documented silhouette. Enter the condition-specific LWL, CB, bilge-keel area, deck-edge angle and downflooding limit. The form lists missing/invalid quantities by name and has a source/assumption note. It does not substitute design particulars for missing condition-specific data.

A single memoized `assessWeather` result supplies the summary, criterion rows, roll coefficients, energy shading and export. It reuses the existing numerical routines and shared GZ curve. No physics simulation, model loading, new table fetch or per-frame calculation is added.

The steady-heel row checks absolute equilibrium angle against min(16°, 0.8 × deck-edge angle). The energy row compares restoring area b against overturning area a. Each reports Meets numerical limit, Outside numerical limit, or Insufficient data, with its numerical margin and reason. An available failure takes priority in the summary even if the other row is incomplete. Missing deck-angle data does not suppress a separately calculable energy result. Missing port coverage, ambiguous intersections, reached flooding samples and empirical-roll limits retain existing guards.

Reference checked: MSC.267(85), Part A §2.3.1.2 and §§2.3.2–2.3.5, https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf . These are numerical comparisons under the chosen inputs, not confirmation of profile applicability, closure state or overall compliance. The source-profile pressure convention remains explicit. The symmetry-derived port curve is labelled and opt-in; no port flooding limit is inferred.

Download weather assessment writes JSON containing the condition, curve source, selected profile/resource and pressure, operator input/source text, derived-port flag, all available calculations, missing-data list and numerical verdicts. Inputs remain local and reset with condition/profile changes; scenario persistence is a separate remaining task. The export records missing values, rather than filling them with assumptions.

Verification covers complete results, each independent missing-input path, adverse steady heel, insufficient restoring energy, missing curve coverage, empirical limits, flooding blocks, invalid numbers and explicit derived provenance. Server-rendered English/Romanian UI tests check that missing inputs and the export action remain visible without NaN/Infinity output. Browser interaction verification is still outstanding.

## P11 directional workflow (12 October 2026)

1. Open **Wind and rolling assessment** under the loading/stability assessment. Choose the documented profile matching the complete current silhouette. Confirm applicability only after reviewing exposed cargo.
2. Enter condition-specific LWL and CB, choose the bilge configuration, then supply separate port/starboard deck-edge and downflooding limits with their source. Keel area is requested only for the keel-table configuration; the available documented area is prefilled.
3. Read both directional summaries and choose **Inspect wind direction** for its detailed checks and graph. The signed corrected GZ curve is reversed for port-directed wind; TCG is not discarded. An optional symmetry estimate remains explicitly educational.
4. Save the condition normally. These settings and assumptions travel with it. Changes to condition inputs invalidate old settings; changes to cargo geometry or profile data invalidate silhouette confirmation. The condition assessment report uses the same calculations as the panel and includes both directions.

The live assessment normalizes source wind moments to 504 Pa using 9.81 m/s². Original source-pressure values and tables remain unchanged for reference replay. The two numerical checks (steady heel and energy balance) remain separately visible. Missing inputs, unknown opposite-side flooding, estimated port data, or source intervals wider than the application's 2° gate keep the overall directional assessment incomplete. This spacing gate is an application quality constraint, not an IMO-prescribed tolerance.

The source basis is [MSC.267(85), Part A 2.3](https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf), reviewed for P11. Unsupported empirical roll ranges are not extrapolated. No approval of an alternative roll method, reduced wind pressure or ship-specific regulatory compliance is inferred.

## 17 October 2026 — accessible weather workflow and rectangular model

The consolidated assessment links directly to **Edit wind and rolling inputs**. The wind editor is no longer gated by the presence of an assessment-basis document. Missing wind-profile or calculation resources are visible, actionable errors. The shared `weatherContext` supplies the same draught, profiles and (for the declared rectangular model) corrected GM to both the editor and immutable report; the 3D display mesh is not used for calculations.

The synthetic Pontoon explicitly declares a sealed rectangular-prism weather capability. At zero longitudinal trim, its existing upright hydrostatics provide draught and corrected GM. Its broadside rectangle plus placed-cargo bounding projections are combined by the existing silhouette union calculation at 504 Pa. Selecting the profile prefills LWL = LBP, CB = 1, sharp bilges and the upright wall-sided deck-edge estimate, all visibly editable. No flooding angle is automatically invented. A noncentral LCG blocks this upright weather model. No capability is inferred for other ships merely because their visual mesh is a box.

The weather graph now retains the actual GZ and steady/gust lines when energy areas cannot be computed. Missing flooding information, curve coverage or empirical applicability remains explicitly unresolved, without shaded energy areas or a pass. In particular, the Pontoon's supported 1–5 m draught range gives B/d >= 4, outside IS Code A 2.3.5's B/d < 3.5 empirical method. An alternative substantiated roll determination would be needed; this change does not bypass that restriction.

References rechecked: supplied International Code of Intact Stability, resolution MSC.267(85), A 2.3.1–2.3.5 (PDF page 17 states empirical limits); Vectis `001_GENERAL_ARRANGEMENT.pdf` sheet 0000-001F dated 09-11-2010, inspected visually, shows main deck at 11.400 m and breadth 17.400 m; `004_STABILITY_LOADING_MANUAL.pdf` PDF 34 gives design LWL 123.950 m at 8.000 m draught, PDF 80 gives bilge-keel area 21.500 m², pressure 51.4 kg/m² and moments about half draught. The documented Vectis wind tables remain the calculation source. GA dimensions do not establish a continuous condition-specific LWL/deck-edge/downflooding curve. Existing source annotations and port-estimation qualifications remain applicable.

Verification includes analytical rectangular wind lever and GM, invalid longitudinal conditions, report/editor context parity, stale-condition rejection, graph retention without fabricated energy shading, and the existing documented Vectis report and weather formula tests.
