# Dunnage planning assistant

In Loading → Cargo layout, define cargo with Add cargo. Identification and appearance can now be applied to the definition before placement. Repeated placements preserve appearance and clear external SSCC/container identifiers after the first unit to avoid duplicate identities. General cargo works without setting a profile, including older saved cargo. Names do not determine handling requirements.

Select cargo and open Add support. For two units, Place between two units fits their facing horizontal gap. For multiple units, Preview spacers for selection generates nearest-neighbour spacers. Review the preview and choose Apply spacers. The boundary section includes gaps between selected floor-level cargo and the documented hold outline. Hatch edges, elevated cargo and support-region surfaces are excluded. Internal seams of a multi-region hold are not boundaries.

Auto dunnage has a primary Add auto dunnage button. Nothing selected means all loading areas; a selection limits proposals to gaps adjoining those units (including their unselected eligible neighbours). Selecting only supports does not fall back to all cargo. A scope label states the current target. Add calculates a fresh batch and commits it as one undoable action; it never relies on a stale preview. A quiet inline status confirms how many spacers were added or explains why none could be added, including missing cargo profiles. Existing spacers block duplicate additions.

Preview is optional and opens the Top view on the first affected loading area. Apply spacers remains available there. Automatic preview refresh is enabled by default while Add support is open; it can be switched off under Dunnage settings, alongside the material, maximum gap, thickness and hold-boundary setting. Refresh is debounced by 350 ms. It does not commit weights automatically.

Cargo with no profile, the general profile (stored as unspecified), or the boxed/palletised profile is eligible for generic geometric spacers. Explicit ventilated/perishable, drum, roll/coil and dangerous cargo profiles or dangerous-goods metadata remain excluded and require manual arrangements. This is conservative eligibility, not a catalogue of approved securing designs. Defaults (0.20 m maximum gap, 0.05 m height and pine material) are editable modelling choices, not prescribed industry values. Profiles and appearance survive condition/plan export and import.

The assistant proposes rectangular, supported horizontal gap spacers and calculates their mass from fitted volume and the chosen density. It does not fill all empty volume, infer actual hull curvature, certify contact strength, calculate compression/bending reactions, design cylindrical chocks, size inflatable bags or establish ventilation requirements. Deck load and stacking checks remain applicable. Modelled boundaries are not evidence of structural bracing points.

The IMO cargo-securing framework and ship-specific Cargo Securing Manual govern the real arrangement. The CTU Code offers relevant packing guidance, but is not a universal ship-hold securing prescription. The supplied securing manual has previously been identified as Vectis Isle, so its applicability to Vectis Castle must not be assumed.

Sources:
- https://www.imo.org/en/ourwork/safety/pages/cargosecuring-default.aspx
- https://www.imo.org/en/ourwork/safety/pages/ctu-code.aspx
- https://wiki.unece.org/spaces/TransportSustainableCTUCode/pages/23102044/2+Packing+and+securing+materials
- https://wiki.unece.org/spaces/TransportSustainableCTUCode/pages/23102048/4+Securing+of+cargo+in+CTUs

Verification covers exposed boundaries, stepped hold seams, excluded hatch/elevated surfaces, cargo-profile eligibility and serialized profile validation. Browser/device visual verification remains outstanding in this environment.

## Material-saving arrangements

The automatic assistant now defaults to **Small spacers + open frames**. The Maximum gap still determines which gaps are considered. The separate Solid spacer threshold controls whether an accepted gap uses a solid piece or an open perimeter frame with cross-bearers. Member width, vertical thickness and maximum cross-bearer centre spacing are editable modelling inputs, not certified design values. Narrow envelopes that cannot accommodate an opening fall back to solid pieces.

Every frame consists of non-overlapping rectangular members, so 2D/3D views, mass, centre of gravity, saving and undo use the actual material geometry. The preview reports actual added kg and the difference from solid filling of the same successfully accepted envelopes. This is not an optimisation or strength certificate. All members of each proposed frame must pass placement checks before any are accepted. Existing solid dunnage is not replaced; undo/remove it before testing a different arrangement. Repeating Add preserves intentional frame openings.

The Add button waits for a current mass preview. Automatic preview remains enabled by default; when disabled, press Preview after changing inputs. No-selection and selected-cargo scope rules remain unchanged. Explicit specialist and ventilation exclusions remain active. Open frames do not establish protected ventilation routes and no diagonal braces, joint design, buckling calculation, or restraint-force verification are implemented.


## Performance and removal

Auto-dunnage placement now uses a conservative 2 m XY broad-phase index and retains the original exact placement/collision/support checks. Floor-level pieces no longer enumerate every cargo support plane. Junction verification considers scoped candidate junctions rather than all pairs of generated frame members, preserving the original pair-envelope rule. The current proposal is cached for Preview/Add and invalidated by changes to the condition, scope, surfaces or settings. Layout serialization and history-button availability are memoized across pointer-only renders.

The assistant has **Remove dunnage** in place of its local Undo button. With no selection it removes all editable dunnage. With a selection it removes selected dunnage and pieces touching selected cargo on the same surface and level. Fixed weights remain protected. Removal is atomic and rejected if the remaining cargo relies on a removed support. General toolbar Undo/Redo remains available.

Local computation benchmark: 300 cargo units in a 20 × 15 grid, 0.5 m gaps, open frames. Before: 2663 ms. After: 230 ms. Both produced 2260 pieces and 3.45215 t of dunnage. This is a local algorithm benchmark, not a browser frame-rate measurement.


## Task-oriented support controls

Add support offers Fill gaps automatically, Place individual pieces, and Support stacked cargo. Only the active workflow is shown. Selecting cargo in the drawing retains the support workflow. Automatic filling keeps material, maximum gap, scope and the mass estimate visible; member dimensions and detailed guidance are expandable. Manual fitting to selected edges is an advanced section of Fill gaps. Stacking separates interlayer pieces from an independent rack; rack fields identify post width and platform thickness, and no misleading unfitted rack mass is displayed.

Automatic open frames are offered only for timber presets. Other material density presets remain available for solid geometry and manual pieces; these presets do not constitute material-specific securing models. No arbitrary safety factor is applied: a margin must belong to a defined load/capacity calculation and applicable design method, which remains future work.

## Shape-aware support workflow (local implementation, October 2026)

Add support → Automatic supports now separates three purposes:

- **Spacers between flat faces:** the existing facing-gap and documented-boundary workflow. Curved side surfaces are excluded with an explicit explanation; enclosing boxes are not treated as physical bearing faces.
- **Fitted separators above cargo:** one separator per eligible cargo top in scope. Boxes receive rectangular separators; upright cylinders receive elliptical/circular caps. Volume and mass use the actual cap area (πLW/4), rather than its rectangular envelope. Unknown stackability, missing top-load limits, overload, occupied contact, curved crowns and protected cargo produce diagnostics. Separators do not bypass cargo load limits.
- **Independent racks around cargo:** one five-member floor-supported rack per unit, including horizontal rolls and ellipsoids. Clearance, post width, platform thickness and timber preset are editable. Existing geometry, headroom and placement constraints are checked atomically for each rack. A failed rack contributes no posts or mass. These racks do not restrain the cargo inside, and their structural capacity remains unknown; they do not automatically copy another cargo layer.

No selection scopes proposals to all cargo; a selection scopes proposals to those cargo units. Proposals run in the cancellable worker, use a spatial index for nearby obstructions, and are applied only against the unchanged condition. Repeating the operation does not duplicate existing pieces. Every committed member contributes mass and CG. Undo/Redo applies to the whole change.

For a single separator, use Support stacked cargo → Separate cargo layers → Fit separator to the actual top face. Independent racks around a whole selection remain available in the manual stacking workflow. Removal scoped to a cargo unit now also finds touching separators above/below it; loaded supports cannot be removed. Racks stand clear of cargo: select their members or clear selection to remove dunnage across the plan.

These are geometric support proposals, not structural designs. Fitted curved cradles, wedges and concave contact surfaces remain unimplemented. Material density is not a strength rating. Contact polygons are approximated as described in cargo-shapes.md.

Verification: fitted cap mass/contact and parsing; rotation/elevated layers; selection scope; duplicate prevention; rejected curved crowns; unknown, non-stackable and overloaded cargo; independent rack geometry; atomic obstruction failure; protected cargo; cap removal and loaded-support protection. Browser rehearsal verified rack preview/apply and condition mass, followed by Undo/Redo.
