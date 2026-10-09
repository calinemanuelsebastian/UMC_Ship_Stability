# Numerical assessment and booklet reproduction

The supplied preliminary booklet is the educational reference basis. This does not certify the instrument or replace unknown numerical inputs with assumptions.

Both Stability Curves and 3D View now begin the assessment section with six criterion rows and counts of numerical minima met, below minimum and insufficient data. Area 0–30, sampled GZ and unique interior sampled peak can be compared as properties of the supplied mathematical curve. Unknown flooding/port coverage remains explicit; these are not operational pass results. Reached sampled flooding blocks affected curve rows. Corrected GM uses trimmed KM and one FSM correction. The X-dependent areas remain insufficient data without a verified downflooding boundary; values at 40 degrees are illustrations only. No overall compliance verdict is generated.

The reference selector now runs numerical reproductions without changing the user's loading condition:

- All 37 extracted source conditions: original printed displacement, KG, LCG, TCG and FSM; live trimmed-table balance and moulded draft compared with zero-heel source rows.
- Seven matching conditions: independent mass, KG, LCG, TCG and FSM summation from preserved individual source rows. These use printed tank masses and original panel centres, never adapted starter allocations. Lightship particulars are from manual PDF 21. Grain heeling moments marked # are excluded from liquid FSM.
- Port GZ is reconstructed using original physical KG, FSM and the printed port KN. This checks signs and corrections, but does not independently validate port cross-curve interpolation. Full heeled trim/draft paths are not available.
- The manual PDF 12–13 starboard example independently compares live interpolated KN, corrected GZ and GM. Printed KG is already corrected; FSM is zero to avoid applying the correction twice. Initial trim is prescribed for that worked example.

Every comparison shows source, calculated value, signed residual and method. Missing independent values remain blank. Reports download the inputs, source identity, residuals and coverage. Test regression envelopes are engineering regression guards, not regulatory acceptance tolerances. Differences are not automatically declared rounding or source mistakes.

The 37-case check currently has maximum initial-trim residual 0.003514 m and initial moulded-draft residual 0.000838 m. All 27 starboard worked-example comparisons differ by less than 0.001 m. Source documents are unchanged. `scripts/build-reference-weight-checks.py` attaches existing weight transcripts; the source extractor preserves them only when source SHA-256 is unchanged.

Efficiency: existing shared curve results feed the current assessment and 3D. Reference computations run only for the selected case and use the bounded vessel-scoped cache, which deduplicates concurrent requests and resource parsing. They do not run per animation frame or create a physics simulation. Reference results remain separate from live loading and stale results are hidden on vessel/case changes.
