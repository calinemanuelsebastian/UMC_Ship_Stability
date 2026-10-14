# P11 — Wind and severe wind/rolling assessment

Implemented 12 October 2026. Numerical workflow is implemented; vessel-source qualifications and existing P05/P06 acceptance gates remain open. This is not a regulatory approval statement.

## Delivered

- Reuses the existing steady-equilibrium, roll-factor and energy-area solvers. Port-directed wind reverses the complete signed corrected GZ curve, preserving asymmetric TCG effects; it does not manufacture port data.
- Independent deck-edge/downflooding inputs for each direction, windward flooding checks, and rejection of a steady equilibrium reaching a declared flooding limit. The two numerical criteria and a separate qualified directional summary are visible together. Coarse source intervals and explicitly estimated port curves cannot yield a complete assessment summary.
- Live source-table moments normalized to 504 Pa. Original pressure, moment tables and source replay remain unchanged. Three bilge configurations supported; unnecessary keel-area input hidden for round/sharp bilges. Inclusive OG boundary rounding corrected.
- Optional documented baseline rectangles plus actual cargo/support footprints give an exact union of projected areas and vertical moments, clipped at the waterline. Overlap is counted once using an O(n log n) sweep; no mesh hydrostatics, per-frame solving or arbitrary mesh windage. Table-only profiles require explicit applicability confirmation because aggregate area/moment tables cannot establish shielding.
- Profile confirmation is bound to source data and cargo geometry, including rotations with unchanged mass/CG. Condition changes invalidate condition-specific settings. Settings survive condition serialization; reports and UI share the same routines. Original report assessment field is preserved and a directionalAssessment section is added.
- Removed the duplicate steady-heel panel, added direction inspection and Romanian labels. Vessel-specific manual advice appears only for the applicable source.

## Evidence

Full regression suite: **491 tests passed** (see final run recorded during implementation). Production build, lint and hosting verification passed. Existing large-bundle warning remains; no dependency was added.

New tests in `src/core/stability/p11-weather.test.mjs` cover independent linear-GZ energy calculations with passing/failing cases, asymmetric signed curves, missing profile/source/directional flooding, sampled windward flooding, coarse/derived curves, bilge choices, empirical endpoints, source-pressure conversion, source/geometry invalidation, settings round-trip, draft changes, unknown cargo dimensions, clipping and overlapping silhouettes. A separate unit-cell union oracle cross-checks 30 generated layouts. A 10,000-rectangle case verifies full projected area and centroid without duplication (about 15 ms in the focused local run; this is an observation, not a universal performance guarantee).

Browser verification used `/scripts/p11-browser.html`, isolated from user plans/storage:

- Actual Vectis data loaded, profile and numerical fields were editable.
- Save/clear/reopen restored direction, source, angle limits and explicit symmetry choice.
- Cargo rotation cleared applicability confirmation; KG change rejected old condition settings.
- Synthetic complete case displayed both directional results and shaded energy areas. Switching to port and changing bilge configuration worked; non-keel modes hid keel area.
- A 1° flooding limit changed the assessment to incomplete and withheld the invalid equilibrium/energy result. Restoring the limit restored numerical results.
- No browser console errors observed. Screenshot: `weather-workflow.png` (synthetic verification case, not Vectis approval evidence).

## Source audit and remaining limits

Reviewed [MSC.267(85), Part A 2.3.1–2.3.5](https://www.navcen.uscg.gov/sites/default/files/pdf/marcomms/imo/msc_resolutions/MSC267.pdf): pressure and lever reference; steady-heel ceiling; gust multiplier; roll factors/period and empirical range; energy endpoints. This stage implements that numerical method, not a determination of every ship-specific statutory requirement or an approved alternative method.

The built-in Vectis source supplies aggregate wind profiles, not a spatial baseline silhouette. Automatic union with arbitrary deck cargo therefore remains unavailable for that source until documented profile rectangles are supplied. The app supports the numerical method for compatible packages and explicitly requests confirmation for existing complete-condition profiles.

Exact condition-specific LWL and immersion boundaries remain source-dependent. Educational symmetric port curves and coarse GZ spacing are explicitly qualified. The application's 2° source-resolution gate is not an IMO tolerance. The tested Vectis condition at KG 4.647 m and moulded draught approximately 7.577 m lies outside the empirical OG/d range; the app correctly withholds its roll-energy result instead of forcing an answer.
