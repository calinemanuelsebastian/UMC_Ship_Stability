# Vectis Castle: coupled heel, trim and immersion source search

Date: 2026-10-15. Original source documents unchanged. No runtime solver or ship manifest was changed by this search.

## Conclusion and correction to the previous assessment

There **is** documented heeled draft and trim data. The previous description was too broad when it implied that no heeled trim/immersion trajectories were supplied. The general cross-curve grid omits those trajectories, but individual worked loading cases include them.

Located and extracted 78 condition-specific constant-LCB tables (1,014 rows, 13 angles per table): 35 tables in the Stability Loading Manual and 43 in the Ballast Management Plan. Of these, 37 are explicitly port-side (PS) tables. These are table occurrences, not 78 independent, approved operating cases. Some repeat examples; docking, grain and ballast-exchange conditions must remain distinct.

Every retained numeric token was independently compared between pypdfium2 and pypdf, with zero disagreements. The JSON preserves printed tokens, page, heel direction, condition label, source hash and the preceding total-weight/CG/FSM line where present. The worked example on PDF page 13 has its input condition on page 12 instead. This is an audit extraction, not a ready-to-interpolate runtime dataset.

A complete validated underwater hull geometry or general coupled hydrostatic surface for arbitrary loading **was not located**. The source-based reference paths are useful for regression tests and documented-condition playback after validating their input fingerprints, units, datums and approval qualifications. They do not justify enabling a general coupled equilibrium solver for every user-created Vectis loading condition.

## What each vessel document contributes

| Source | Relevant evidence | Consequence |
|---|---|---|
| 001 General Arrangement, 1 page | Profile, deck plans, dimensions and selected sections | Useful dimensional constraints, not a complete body/lines plan or hull-offset table. |
| 002 Tank Arrangement, 1 page | Tank boundaries, selected longitudinal and transverse sections, capacities and reference centres | Useful for reconstruction and validation. Insufficient by itself to establish every tank's closed 3D boundary or liquid centres at arbitrary heel/trim. |
| 003 Cargo Securing Manual, 111 pages | Securing arrangements, fixtures, diagrams and certificates | No coupled hydrostatics found. Cover identifies Vectis Isle; applicability to Castle must not be silently assumed. |
| 004 Stability Loading Manual, 504 pages | Six initial-trim hydrostatic sets (PDF 35–58); six initial-trim cross-curve sets (60–77); 35 explicit heeled draft/trim paths (page list in JSON) | Most useful source. Existing broad KN grid contains levers only; individual cases add heeled draft and trim. |
| 005 Tanks Capacity Table, 179 pages | Sounding/volume, mass, LCG, TCG, VCG, Ix, fill ratio and ullage; coordinate definitions on PDF 2 | Supports fill-dependent centres and free-surface calculation. No general heel/trim-indexed liquid redistribution grid found. Coordinates are from amidships, unlike AP-based stability tables. |
| 006 Strength Loading Manual, 225 pages | Lightship distribution, longitudinal forces and loading examples | Helpful weights and reference-condition evidence, not underwater hull offsets. |
| 007 Ballast Management Plan, 628 pages | 43 additional heeled paths, including PS cases, ballast exchange calculations and diagrams | Valuable numerical examples, but Annex 3 examples are explicitly marked NOT ACCEPTED; preserve this status. |

## Concrete examples (PDF page numbers)

- Stability manual p13, printed 4.2: steel-coils worked example, 13,201.307 t from p12. At 0° SB: moulded draft 7.577 m, trim −0.774 m. At 30°: 7.528 m, −0.475 m. At 60°: 8.188 m, −0.073 m. This directly supplies a varying heeled attitude path for that condition.
- Stability manual p224, printed 15.8: docking condition with a PS trajectory. It is labelled non-seagoing and the summary says it does not comply with the stated criteria. Its existence does not establish general port-side grid coverage.
- Ballast manual p52, Annex 3-25: step 2 PS path and static inclination 1.767°. At 0°: moulded draft 4.861 m, trim −0.523 m; at 30°: 4.663 m, +0.247 m. The page visibly bears a NOT ACCEPTED stamp.
- Ballast manual annotations on PDF p4 and p28 identify printed Annex 3 pages 3–510 as NOT ACCEPTED. The p28 comment gives both prior non-acceptance for a sister-ship submission and the fact that exchange sequences are not required with the installed treatment system. This is not evidence that every number is wrong; it is evidence against treating these cases as approved operational conditions.
- Stability manual p60 explicitly says trim is modified to maintain constant LCB, but its general grid prints only KN-sin-phi values. Those ordinates alone do not uniquely identify heeled draft and trim.

## Scope and limitations of the search

- Text-screened all 40 PDFs (3,166 pages) in the supplied TTTM1 tree, including the 35 documentation/course PDFs plus surrounding guidance and duplicate example files.
- Seven primary vessel PDFs total 1,649 pages. Compared their Downloads copies by SHA-256: all seven are byte-identical.
- Visually screened all 100 low-text pages in those seven PDFs; inspected the General Arrangement, Tank Arrangement and selected trajectory pages at readable resolution. The scanned appendices contain arrangement/piping/securing/equipment drawings, not a complete hull body plan discovered in this pass.
- Checked PDF embedded-file lists: none in the seven vessel PDFs. Searched annotation contents as well as main text.
- Reviewed the existing workbook sheet/formula inventory and DXF entity/geometry audit; these concern cargo, support and reference calculations and do not establish a separate underwater hull model. The supplied cargo DXF is the available open-format counterpart used for the earlier drawing review. Proprietary DWG binaries were not re-decoded in this search.
- Text-screened the supplied example DOCX. Other course image pages were not exhaustively OCRed; therefore the finding is “not located in the inspected sources”, not proof that no relevant mark can exist anywhere.

## Recommended use

1. Preserve these 78 paths as source evidence and numerical regression fixtures, with NOT ACCEPTED / non-seagoing / grain qualifications retained.
2. For supported documented cases, implement an explicitly named **documented-condition playback** after matching complete condition inputs and verifying the printed draft datum/rotation convention. A prescribed heel sweep is not necessarily a freely balanced attitude at each angle.
3. Keep arbitrary-loading calculations within the established table solver's coverage and identify approximations. Do not interpolate these irregular case paths into a universal “accurate” model without independent validation and a coverage study.
4. Keep reconstructed exterior geometry labelled visual. Numerical attitude playback does not make its submerged mesh volume physically correct.

Reproduce the trajectory extraction with `scripts/audit-vectis-coupled-data.py SOURCE_DOCUMENT_DIRECTORY OUTPUT_DIRECTORY`. `document-inventory.json` records hashes, page counts and search hits; `condition-trajectories.json` retains all 1,014 rows; `pdf-attachments-and-annotations.json` records attachment checks and relevant review comments.
