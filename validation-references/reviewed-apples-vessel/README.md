Local Excel vessel package

LBP: Calc_G_Cargo C23. Beam: Calc_Wind C19. Loading: constituent rows extracted by scripts/extract-excel-case.py, including scaled dunnage allowance. Upright: Calc_Trim B54:D56, B60:B62, F60:F62. Trim: source ranges recorded in trimmed-table.json. Moulded depth and draft datum omitted because unconfirmed. No borrowed pontoon geometry, KM, KN or roll data.

Workbook SHA-256: a5d9c6bd7c30d3519929bcceadfe6507dc6abe31341f983193b7a13395ef3250

Served through an explicit development-only allowlist; excluded from production builds.

### Schematic 3D display
The local manifest declares `visualization.schematic-cargo-hull`. Depth 11.40 m, LBP 121.70 m and beam 17.40 m are documented in the general arrangement. The tapered plan outline is generic, not a tracing of vessel offsets; it is extruded vertically and is not a verified hull model. The display uses the upright table draft as a visual reference pending precise datum reconciliation. It does not enable box buoyancy, trim, heel or large-angle teaching. No calculation resources were changed.

## Integrated glTF display and cargo surfaces

The optional `visualization.gltf` resource now loads the reconstructed exterior and documented cargo geometry. Resource configuration names the exterior/panel groups, hull meshes used for visual waterline intersection and 18 nominal rectangular planning surfaces (three lower-floor regions and fifteen installed panels). Surface coordinates use AP/centreline/baseline metres. The current surface adapter only accepts this explicit coordinate convention.

The resource remains local to the Vite development middleware, alongside the reviewed workbook reference. It is not automatically published in production. To ship a public Castle package later, review and package the complete vessel data and assets together.

Cargo footprints retain optional surface IDs in JSON saves. Their volumes render from footprint elevation and height; physical KG remains independent. Attaching a footprint to an existing row retains KG and mass, while containing LCG/TCG within the selected surface. Hiding panels is display-only and does not unload their mass. The raised aft floor, clearances, stacking, deck strength and securing are not implemented.

No numerical solver reads glTF or surface data. The display resource is excluded from saved-model signatures, preserving compatibility with pre-integration plans for this unchanged calculation model.

Verification: production build and lint passed; 136 tests passed; all 15 reviewed Excel comparisons passed, including the retained workbook correction. Browser checks covered the loaded hull/waterline, exterior and panel toggles, surface selection, and temporary cargo placement in 2D/3D. The temporary item was undone.


## Tanks and fixed weights

`tanks.json` contains 68 tanks transcribed from `005_TANKS_CAPACITY_TABLE.pdf` (YZJ423-103-003, March 2012), with 5,918 upright filling-table rows. Capacities come from PDF pages 4–5. Longitudinal coordinates are converted from midships to AP by adding 60.85 m. Centres interpolate volumetric moments; mass is volume times the independently entered liquid density. Transverse free-surface moment is tabulated inertia times that density, with zero for empty and pressed-full tanks. These are upright approximations, without trim-dependent tank corrections.

The original Excel liquid totals remain unchanged for comparison. Some exceed listed capacities or aggregate several tanks, so users explicitly replace each reference group with empty individual tanks before entering their distribution. Tank imports are capacity-checked and their derived weights recalculated. Ambient water density does not change tank mass. Per-tank liquid density is stored in cargo plans/scenarios.

Lightship and installed tween-deck panels are fixed contributions (stability manual PDF pages 5, 21 and 28). Machinery and cranes remain included in lightship; separate masses are not invented or added a second time. Cargo alone is represented by movable cargo markers. Crew, provisions and other onboard weights have separate controls.
