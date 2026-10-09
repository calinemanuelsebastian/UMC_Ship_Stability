# Excel corrections and verification

Corrected file: `apples-calculations-reviewed.xlsx`. The source workbook in Downloads was preserved. Its existing `Calc_G_Cargo!J78 = SUM(J67,J77)` correction was retained. Excel recalculated and saved the delivered copy; every formula has a cached result, no Excel error cells were found, both charts remain present, and the embedded image is byte-for-byte unchanged.

The workbook includes `Review_Notes`; `excel-change-log.csv` records all 96 changed cells with their previous contents, new contents and reasons. The changes are formula corrections and explicitly labelled modelling assumptions, not a new coordinator or classification approval.

## Applied corrections

- **Dunnage:** scaled all three moments by final dunnage mass divided by listed component mass. This retains the original distribution while adding the existing allowance. Corrected the TCG divisor from volume to mass. The unchanged-distribution assumption is explicit.
- **Initial draft lookup:** linked target displacement to the live loading result instead of a stale copied number.
- **−2 m trim block:** changed its residual-trim formula to reference that block's LCB/MCT.
- **Selected trim:** linearly interpolated between the −1 and −1.5 m hydrostatic tables at fixed displacement until LCB equals LCG. The revised condition lies within those bounds and its residual moment is zero to floating-point precision. This is a table-interpolation approximation, not a new exact hull equilibrium calculation.
- **KN:** replaced midpoint averaging with weighted displacement and trim interpolation. Used unrounded displacement and the same selected trim for KN, KM and allowable VCG.
- **Free surfaces:** used the existing virtual-KG approximation, KG + FSM/displacement, in the centreline-reference GZ curve. Physical KG remains separate. The curve is explicitly labelled as assuming TCG=0, and existing pass/fail cells that cannot establish the off-centre condition return `REVIEW TCG`.
- **Lashing:** corrected transverse sliding to add friction and securing-force terms; corrected the gravity reference in longitudinal sliding; used entered mass × vertical acceleration for vertical inertial force; used half the entered cargo breadth for the transverse tipping restoring lever.
- **Labels:** corrected displacement and MCT units, distinguished residual from total trim, and replaced flotation claims with displacement-limit checks.

Moment aggregation follows Σ(moment)/Σ(mass); weighted interpolation follows y=y0+(x−x0)(y1−y0)/(x1−x0). The MCA stability-booklet guidance describes weight/moment aggregation, trim assessment and distribution about LCF. The source hydrostatic draft datum is needed to apply endpoint-draft formulas. [MCA stability booklet](https://assets.publishing.service.gov.uk/media/5d359db840f0b604d21a8934/MSF2231-_SIB_motor_Feb_17.pdf)

The 2008 IS Code guidance calls for free-surface treatment in initial GM and the righting-lever curve. Here the existing constant-FSM virtual-KG approximation is made consistent; it does not replace angle-dependent tank data. [IMO MSC.267(85), Part B 3.1](https://wwwcdn.imo.org/localresources/en/KnowledgeCentre/IndexofIMOResolutions/MSCResolutions/MSC.267%2885%29.pdf)

The additive transverse sliding balance is directly supported by the IMO CSS supplement. [IMO CSS supplement, Annex 13 §7.2.1](https://wwwcdn.imo.org/localresources/en/publications/Documents/Supplements/English/IB292E%28rev1%29.pdf)

For longitudinal sliding, the delivered formula retains full vertical-force subtraction, a conservative choice relative to the reduced simultaneous vertical-force treatment described in the revision. No unverified reduction factor was inserted. Existing lashing counts, their 0.5 effective-count factors, factor 0.96, and zero tipping securing lever were retained, so numerical “GOOD” results remain conditional on those arrangement inputs. [Hermann Kaps, Annex 13 revision guidance](https://iumi.com/wp-content/uploads/2025/01/Amendments_to_the_CSS_Code_Guidance_papers.pdf)

## Recalculated results

| Quantity | Revised saved result |
|---|---:|
| Displacement | 9644.270000 t |
| LCG from AP | 59.077524 m |
| Physical VCG | 6.632273 m |
| TCG | −0.147695 m |
| Selected interpolated trim | −1.261024 m |
| Free-surface-corrected initial GM | 1.071772 m |
| Centreline-reference GZ at 30° | 0.816508 m |
| Centreline-reference area 0–30° | 0.177447 m·rad |
| Vertical inertial cargo force | 50.100000 kN |

The GZ and area figures above are reference calculations, not verified results for the off-centre loaded ship. A transverse CG offset changes the lever by a cosine term, and the two heel directions need appropriate treatment. [US Naval Academy, transverse stability](https://usna.edu/NAOE/_files/documents/Courses/EN400/02.04%20Chapter%204.pdf)

## Deliberately unresolved

1. **Aft/fore drafts:** their old formulas used residual rather than total trim and an unconfirmed draft reference. D119/D120 now say `REVIEW DATUM`; the former formulas remain in the change log. Confirm whether tabulated draft is at midships, LCF or another reference before calculating absolute endpoint drafts.
2. **Actual off-centre stability:** nonzero TCG requires a signed/both-direction GZ treatment and applicable criteria handling. Existing centreline-reference calculations remain visible, while actual-condition pass claims are flagged.
3. **Source data:** LCF F105/F107, KN E46, geometric VCG M13/M28, actual tank fill levels/FSM and lashing arrangement factors were not guessed or overwritten.
4. **Weather criterion:** no complete area-a/area-b comparison was added; wind/rolling outputs remain labelled centreline reference. They do not establish a complete weather-criterion pass.
5. **Interpolation range:** the reviewed saved condition is bracketed by the source tables. If loads are changed enough to leave those ranges, select new bracketing data before using the interpolation results.

These are the remaining documentation-dependent steps. The delivered copy preserves the original ship inputs while distinguishing calculable corrections from unresolved modelling assumptions.
