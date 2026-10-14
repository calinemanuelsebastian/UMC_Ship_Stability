# Cargo and support accounting reconciliation

10 October 2026. This audit separates the workbook's numerical accounting from the physical reconstruction. It preserves the source workbook and accepted v2 fixture. Reproduce with `scripts/reconcile-cargo-support.py` and the corrected reference workbook; the resulting `validation-references/apples-cargo-support-accounting.json` records source hashes, formulas, ledger rows, package IDs and a separate datum-correction scenario.

## Reconciled accounts

| Contribution | Volume | Mass |
|---|---:|---:|
| Cargo: 3,376 package estimates | 2.4 m³ body volume per package | 3,376.000000 t |
| Posts, workbook formula equivalent | 161.237760 m³ | 88.680768 t |
| Intermediate members, workbook formula equivalent | 126.600000 m³ | 69.630000 t |
| Fore blocking estimates | 23.000000 m³ | 12.650000 t |
| Raw timber subtotal | 310.837760 m³ | 170.960768 t |
| Additional allowance and rounding | 31.162240 m³ equivalent | 17.139232 t |
| All supports | 342.000000 m³ equivalent | 188.100000 t |
| Cargo plus supports | — | 3,564.100000 t |

The allowance is exactly the difference between `ROUND(raw volume × 1.1, 0) × 0.55` and raw timber mass. It includes 17.0960768 t from 10% and 0.0431552 t from volume rounding. It is now a separate accounting entry instead of appearing as extra material in every member. Assigning it the raw timber weighted CG reproduces the workbook's proportional moment scaling; this is an accounting assumption, not a physical location established by the drawing.

Reconciled cargo-plus-support moments are 217,694.449903795 t·m longitudinal, 22,616.407315971 t·m vertical and zero transverse. Corresponding centres are LCG 61.079781685 m from AP and VCG 6.345615251 m above baseline. These reproduce the legacy reference; they do not independently validate spatial centres.

## Package identity and mass basis

The audit assigns two unique package IDs to each of the 1,688 DXF bay footprints, for 3,376 packages. Every record retains the source handle, plan, hold and local tier elevation. Ship CG stays null until coordinate mapping and mass distribution are established. No arbitrary fore/aft partition is assigned to force a match with the workbook.

The earlier assembly description called 1 t a gross-package assumption. Formula tracing now shows `Calc_G_Cargo!C27 = 2 × 1.2 × 1`, and `C28 = C27 / Calc_ideal_SF!I19`, giving 1 t from 2.4 m³/t. That calculation does not itself establish whether pallet/packaging tare is included. The assembly definition has been corrected to state this uncertainty.

If tare is excluded, an additional p kg per package adds **3.376 × p tonnes** to this case. Its own CG must enter the moments. If tare is included, it must not be added again. Cargo CG also requires the pallet/content mass split or a declared package CG; the workbook uses the midpoint of the entire two-tier envelope.

## What the timber formulas actually imply

`C31 = 2 × 2.388 × 0.1 × 0.1` is multiplied by every package, implying 6,752 post equivalents. `C32 = (1.3 + 1.3 + 1.15) × 0.1 × 0.1` similarly implies 6,752 members of 1.3 m and 3,376 of 1.15 m. These counts are an algebraic expansion, not a physical count from the drawing.

Per two-tier bay, this is four post equivalents and six intermediate-member equivalents. It could represent an intentional frame or duplicated per-tier allowances. The drawing's single intermediate level alone does not prove either interpretation. Do not halve the timber total or declare it correct without mapping physical members and shared supports. Fore blocking remains six aggregate estimates (four at 5.5 m³ and two at 0.5 m³), without an established member schedule.

## Isolated intermediate-deck datum correction

Given the defined interlayer position and the workbook's uniform interlayer assumption:

| Weight row | Existing VCG | Candidate VCG | Cause |
|---|---:|---:|---|
| CH1LF intermediate deck, row 49 | 2.194 m | 3.394 m | Local height used without 1.2 m floor offset |
| CH1LA intermediate deck, row 52 | 2.194 m | 3.394 m | Inherits M13 through M16 |
| CH2L intermediate deck, row 61 | 2.194 m | 3.394 m | Inherits M13 through M25 |
| CH2U intermediate deck, row 64 | 8.394 m | 9.394 m | M28 references pillar centre M21 |

Candidate source formulas are `M13 = I10 + 2.144 + L13` and `M28 = I9 + 2.144 + L28`; M16 and M25 follow M13. Upper Hold 1 intermediate-deck rows already include the appropriate floor offset.

Keeping all existing masses, proportional allowance distribution and other centres unchanged gives a whole-ship KG increase of **0.007763870 m**, from 6.632273425 to **6.640037295 m**. At unchanged displacement, KM and free-surface moment, corrected GM decreases by the same amount. This scenario is saved separately with all 47 constituent weights. It is not applied to the workbook, runtime or accepted fixture, and has not been run through the complete stability assessment. The physical support arrangement could require further changes beyond these datum corrections.

## Completion status

Verified: unique package IDs and counts; algebraic material volumes; raw timber plus allowance; legacy cargo/support mass and all three moments; datum-scenario preservation of mass and longitudinal moment; source workbook unchanged.

Still required for complete physical accounting: tare inclusion and package CG; member repetition and shared ownership; post/beam endpoints and contacts; drawing-to-ship coordinates; fore-blocking geometry and any actual extra material. These are missing physical inputs, not arithmetic failures. Structural and securing adequacy remain separate from mass accounting.

## Agreed reference assumption — 10 October 2026

The user subsequently instructed that the 1 t package mass is to include pallet tare, while noting the original coursework did not explicitly establish that inclusion. This supersedes the unresolved tare-inclusion question above. Retain 3,376 t gross cargo and add no separate pallet mass. Package mass CG remains a modelling input; inclusion of tare does not establish its distribution. The timber is intended to support the upper apples independently, not to permit direct pallet-on-pallet loading. This intent does not yet resolve physical member quantities or capacity.
