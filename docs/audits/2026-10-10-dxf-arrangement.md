# Apples cargo and support drawing review

Source: user-supplied EUR2 apples pallet arrangement DXF, read on 10 October 2026. Original file unchanged. Extracted entity handles, dimensions and main-plan footprints are retained in `validation-references/apples-dxf-arrangement.json` with the source hash.

## Scale and extraction

The DXF declares `$INSUNITS=1` (inches), but the user explicitly confirmed that one drawing unit represents one millimetre. All extracted measurements use that confirmation. A future importer must expose this override rather than silently trusting the header. Autodesk's [DXF specification](https://help.autodesk.com/cloudhelp/2018/ENU/AutoCAD-DXF/files/GUID-748FC305-F3F2-4F74-825A-61F04D757A50.htm) defines the polyline vertex codes used for extraction; the [units documentation](https://www.autodesk.com/support/technical/article/caas/sfdcarticles/How-to-convert-measurements-used-for-blocks-from-metric-to-imperial-values.html) distinguishes millimetre insertion units.

Model space contains 10,158 LINE, 2,959 LWPOLYLINE, 2,968 HATCH, 112 SOLID, 106 DIMENSION and 11 MTEXT entities. There are no model-space INSERT entities to expand. Layers are `cargo`, `dunngage`, `holds` and `dims`. Layer names do not fully identify physical objects: the cargo layer also contains 100 × 100 mm details and the interlayer support rectangle. Hatches, outlines and crossed diagonal lines are graphical representations, not additional physical items.

Previews reconstruct direct LINE/LWPOLYLINE geometry. They omit dimension-block graphics and hatch fills, and are not full CAD plots. The extraction is specific to this drawing, not a production DXF-import feature.

## Cargo reconciliation

Two main plan views on the left each contain 844 rectangular 1,000 × 1,200 mm footprints (including rotated instances): 637 in Hold 2 and 207 in Hold 1. Nearby annotations say `1688 pallets (844 x 2)` and `Total: 3376 pallets (844 x 4)`.

This supports two vertical tiers for each of the two main plans, giving 2 × 844 × 2 = 3,376 pallets. It agrees with the workbook cargo total and its 1 t-per-package assumption. The drawing establishes dimensions/counts, not cargo mass independently. Additional example/repeated views to the right and ten footprints in the deck-cargo detail must not be added again to this total.

Whole-hold totals reconcile: Hold 1 has 828 pallets across both levels/two tiers, Hold 2 has 2,548. The workbook's finer Hold 1 fore/aft split (68/139 per tier) is not independently verified by this whole-hold count. Ship AP origins and individual-row centres require explicit drawing-to-vessel mapping.

## Vertical detail evidence

Near x=41,868 mm, the lower stack detail contains these cargo-layer closed outlines:

| Handle | Size (mm) | Drawing Y range (mm) | Interpretation |
|---|---|---|---|
| 1371E | 1200 × 144 | -52541.917 to -52397.917 | Lower pallet |
| 13690 | 1200 × 2000 | -52397.917 to -50397.917 | Lower cargo body |
| 15122 | 1200 × 100 | -50397.917 to -50297.917 | Interlayer member/deck projection |
| 15138 | 1200 × 144 | -50297.833 to -50153.833 | Upper pallet |
| 15134 | 1200 × 2000 | -50153.833 to -48153.833 | Upper cargo body |

Dimensions *D157, *D158 and *D159 separately report 2000, 144 and 100 mm. Small approximately 0.083 mm drawing offsets are retained as drafting tolerances, not physical ventilation clearances. A two-tier envelope is therefore approximately 2 × (2.000 + 0.144) + 0.100 = **4.388 m**, agreeing with the workbook's stack-height input.

The interlayer member centroid is approximately **2.194 m above the local floor**, not necessarily 2.194 m above ship baseline. Using the workbook floor assumptions (1.2 m lower / 7.2 m upper), that would imply 3.394 m lower or 9.394 m upper. This strengthens the concern about Calc_G_Cargo!M13=2.194 and M28=8.394 and dependent copied inputs. It does not yet establish that every aggregate support row represents this same member arrangement. Those workbook values were not changed in this pass.

Brown linework also includes 100 × 100 mm and 300 × 25 mm projected details. A projected rectangle alone does not establish a timber member's third dimension or whether another view depicts that same member. Do not multiply every outline by the number of pallets to obtain timber volume.

## Next reference-case work

1. Map the two main plans to upper/lower ship surfaces and confirm local floor datums and the finer Hold 1 fore/aft partition.
2. Define one repeated support assembly using the front, side and plan detail together: physical member IDs, section, length, quantity and contacts. Separate independent supports from pallet timber already included in cargo mass.
3. Resolve the 2.388 m post-length assumption against this assembly and the interlayer height. Recalculate timber volume, mass and each support's baseline VCG only after that reconciliation.
4. Replace aggregate estimates with the physical assembly where justified; retain any additional allowance separately. Record dependent reference-result changes.
5. Build the spatial app reference from those mapped cargo/support objects. Strength, joints and securing capacity still require separate evidence.

The DXF closes the earlier inability to inspect the drawing. It verifies the main cargo count and stack envelope, but does not yet complete the timber bill of materials, ship-coordinate mapping or structural verification.
