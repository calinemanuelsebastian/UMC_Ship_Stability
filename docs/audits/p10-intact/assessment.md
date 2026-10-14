# P10 — Curves and intact-stability assessment

Implemented 2026-10-12 for the supported numerical model. Existing P05/P06 acceptance dependencies remain open. Missing vessel evidence remains visible; implementation does not mean the supplied Vectis condition passes all criteria.

## Changes

- Port/starboard numerical criteria are independently inspectable. Port uses supplied negative-angle ordinates, reversed into positive directional restoring levers. No symmetry or port flooding is invented. Independent hydrostatic GM remains assessable even if directional curve coverage is missing.
- Sourced, operator-declared downflooding angles may be entered independently for each side. They are saved in the existing condition settings, validated on import, and keyed to displacement, CG, density and free-surface inputs. Blank provenance or a changed condition withholds the declaration. A declaration later than an existing reached threshold cannot complete flood-dependent area checks.
- Signed trapezoidal integration is exact for the declared piecewise-linear GZ representation, uses radians, and never applies FSM a second time. Area endpoints truncate at min(40°, declared flooding angle). Sampled thresholds without an exact declaration remain upper bounds, not inferred onset angles. Floating-point comparisons use a 1e-12 arithmetic tolerance; this is not a physical margin.
- A sampled isolated maximum receives a numerical verdict only when its enclosing source bracket is no wider than 2°. Boundary maxima and plateaus remain unresolved. Equilibrium roots retain their source-bracket width; a coarse candidate is listed but cannot drive the selected static attitude. The 2° gate is a conservative application resolution rule, **not an IMO tolerance or proof of source accuracy**. Artificially inserting intermediate linear points is not used to satisfy it.
- Declared directional flooding limits also withhold equilibrium selection in the assessment, 3D heel adapter and report. Numerical/cache identities include the limits for the 3D adapter. Wind estimates retain their existing explicitly interpolated method pending the separate P11 audit.
- The GZ chart has a keyboard/touch range cursor showing angle, KN, GZ and corrected GZ from the same piecewise-linear ordinates as integration and roots. Existing source details, upright/trimmed GM and annotated KG comparison remain in the assessment workspace. Annotated KG conventions remain qualified; no invented pass is added.
- Exports retain the existing starboard `intact` rows and add a directional overview, declared limits, method, independent summaries and equilibrium. UI/report parity and stale limits are tested. Numerical completeness is separate from overall approval.
- Fixed duplicate React sibling keys between wind and booklet-reference panels found while testing condition edits. New controls and fixed explanatory text are translated into Romanian; source/user text and dynamic diagnostic details retain their source text.

## Verification

- **483 tests passed, 0 failed** (`tests.log`). Eleven added tests cover independent triangle/radian areas, sine-integration convergence, root refinement, coarse versus dense extrema, opposite TCG/directional coverage, equality and negative GM, missing coverage, flooding truncation/conflicting thresholds, condition-key invalidation/import, report parity and signed declared-limit root rejection. Existing source parser, units, FSM, multiple/neutral/no-root, hydrostatic, KG, report and reference-case regressions also pass.
- Build, lint and hosting verification passed. Existing large bundle advisory remains. `git diff --check` passed.
- Isolated browser fixture (`scripts/p10-browser.html`) uses actual Vectis resources at displacement 13201.307 t, density 1.025, KG 4.647, LCG 58.731, TCG .004, FSM 0. No saved user condition was changed.
- Baseline: two numerical minima met/four incomplete, GM 3.004640 m, static interpolated heel .0763°. A clearly marked test-only 35° flooding declaration produced area 0–35° .5857 m·rad and 30–35° .1586 m·rad: five minima met/peak unresolved. Switching to missing port coverage left five rows incomplete. Changing KG to 4.8 removed the declaration from active use and restored two met/four incomplete. A deliberately early .05° test declaration withheld the equilibrium.
- Cursor at 30.1° showed KN 4.018588 m and corrected GZ 1.684789 m in the original reference condition. `curve-inspection.png` records the visual inspection.
- A development-fixture hot-reload root issue was fixed by reusing its React root. A fresh final browser instance, including loading edits and early-flooding rejection, had no console errors.

## Basis and remaining qualifications

The general numerical thresholds retain the vessel manual §6.1/PDF 16 basis and [MSC.267(85), Part A §2.2](https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.267%2885%29.pdf), checked against the official IMO text during implementation. Vessel/type applicability, current amendments and alternative criteria are not automatically inferred from passing these six comparisons.

Vectis still lacks a resolved peak over its available range and exact/complete directional downflooding evidence. Entering text in a source field does not authenticate it: an operator declaration is explicitly identified as such. Missing or contradictory evidence stays incomplete. A straight-segment calculation is not proof of the true continuous curve between source ordinates. Weather refinement belongs to P11; lashing/support strength to P12. This stage neither claims overall IMO compliance nor deploys the app.
