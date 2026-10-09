# Step 4: numerical weather assessment

In Stability Curves or 3D View, open Wind and rolling assessment and choose a documented silhouette. Enter the condition-specific LWL, CB, bilge-keel area, deck-edge angle and downflooding limit. The form lists missing/invalid quantities by name and has a source/assumption note. It does not substitute design particulars for missing condition-specific data.

A single memoized `assessWeather` result supplies the summary, criterion rows, roll coefficients, energy shading and export. It reuses the existing numerical routines and shared GZ curve. No physics simulation, model loading, new table fetch or per-frame calculation is added.

The steady-heel row checks absolute equilibrium angle against min(16°, 0.8 × deck-edge angle). The energy row compares restoring area b against overturning area a. Each reports Meets numerical limit, Outside numerical limit, or Insufficient data, with its numerical margin and reason. An available failure takes priority in the summary even if the other row is incomplete. Missing deck-angle data does not suppress a separately calculable energy result. Missing port coverage, ambiguous intersections, reached flooding samples and empirical-roll limits retain existing guards.

Reference checked: MSC.267(85), Part A §2.3.1.2 and §§2.3.2–2.3.5, https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf . These are numerical comparisons under the chosen inputs, not confirmation of profile applicability, closure state or overall compliance. The source-profile pressure convention remains explicit. The symmetry-derived port curve is labelled and opt-in; no port flooding limit is inferred.

Download weather assessment writes JSON containing the condition, curve source, selected profile/resource and pressure, operator input/source text, derived-port flag, all available calculations, missing-data list and numerical verdicts. Inputs remain local and reset with condition/profile changes; scenario persistence is a separate remaining task. The export records missing values, rather than filling them with assumptions.

Verification covers complete results, each independent missing-input path, adverse steady heel, insufficient restoring energy, missing curve coverage, empirical limits, flooding blocks, invalid numbers and explicit derived provenance. Server-rendered English/Romanian UI tests check that missing inputs and the export action remain visible without NaN/Infinity output. Browser interaction verification is still outstanding.
