# Tween-deck geometry and operating configuration

Verified against 004_STABILITY_LOADING_MANUAL.pdf, PDF page 28 (printed 8.3), and the hold drawing on PDF page 499. The existing model matches the panel table; no enlargement or rescaling was justified.

| Type | Quantity | Length m | Width m | Thickness m | Each mass t |
|---|---:|---:|---:|---:|---:|
| A | 6 | 6.115 | 13.740 | 0.670 | 21.00 |
| B | 6 | 5.050 | 13.740 | 0.670 | 17.90 |
| C | 2 | 5.565 | 8.220 | 0.670 | 11.60 |
| D | 1 | 3.730 | 13.740 | 0.670 | 13.00 |

Total: 15 panels, 269.60 t. Installed mass centre: LCG 63.240 m from AP, VCG 6.970 m, TCG zero. The deck surface is 7.230 m above baseline; this is distinct from the panel mass centre. Individual longitudinal endpoints match the source table to its printed precision. Gaps between panels remain in the geometry.

The former blended panel materials were sensitive to object sorting during camera movement. Panels now use Three.js alpha-hashed coverage with depth writes at all opacities. This provides depth-based occlusion and preserves the same rendering policy at 0% transparency. Partial transparency can have a fine stippled appearance.

Loading → Cargo layout now offers **Installed / Stored onboard — position 4**. Both conditions retain 269.60 t. Stored mode uses the manual's printed aggregate LCG 16.930 m, VCG 12.838 m, TCG 0.000 m (PDF page 30, printed 8.5). Reinstallation restores LCG 63.240 m / VCG 6.970 m. Calculations use the printed aggregates; individual rows agree within rounding precision.

Storage position 4 accounts for all 15 panels without grain-bulkhead use. Five A panels and two C panels are stacked at LCG 20.201 m, between frames 28–37. Six B panels, one A panel and the D panel are stacked at LCG 13.965 m in front of the accommodation. The runtime moves all existing panel meshes into those two stacks, retaining their dimensions. Individual VCG levels come from the manual; same-type panel IDs are assigned deterministically because the table identifies types, not installed panel IDs. Stored slabs are geometrically centred on their tabulated mass centres as a visual approximation; exact support/pad details are not reconstructed.

Stored mode offers exactly Hold 1 and Hold 2, without upper/lower labels. Hold 1 is a union of its wide and narrow floor regions, so its stepped shape and containment checks are preserved. The aft storage region is outside the planned lower-floor bounds and is not offered as cargo space. The hold defaults remain nominal 11.00 m open clearance, with local obstructions requiring separate checks. Installed lower/upper planning limits remain 5.35/5.27 m. Custom rectangular planning areas can specify another clear height explicitly.

Loading presents an editable top view plus side and end projections of the same footprints. Projections use cargo geometry and deck elevation rather than treating mass-centre KG as the cargo bottom. Cargo without footprints is counted but cannot be drawn. Existing cargo is not moved automatically when changing deck configuration; cargo on now-unavailable upper surfaces needs relocation.

Stored mode, panel CG and compound hold regions survive scenario/cargo-plan save and restore. Legacy files explicitly marked removed ashore remain loadable with their zero panel mass; this legacy option is not offered for new conditions, and is never silently reinterpreted as onboard storage.

Verification: 152 automated tests; build and lint; all 15 original Excel comparisons passed. Browser checks confirmed 9644.27 t in storage mode, total ship LCG 57.782955 m / KG 6.796310 m, two hold options, three projections and two visible panel stacks.
