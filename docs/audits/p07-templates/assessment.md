# P07 — Reusable cargo and material templates

Implemented 2026-10-12. Desktop functional checks and regression tests pass. Overall acceptance remains conditional on the open P05 performance and P06 physical-device gates; this does not close those stages or certify cargo securing.

## User workflow

1. **Loading → Cargo layout → Add cargo:** choose a cargo family, enter actual packed dimensions and gross unit mass, then place individual units. The family supplies a dunnage profile and conservative stackability starting point, not a certified package specification. Dimensions and mass remain user-defined.
2. **Quantity, mass and contact details:** enter a placement target, calculate gross mass from net contents plus packaging/pallet tare if needed, enter known vertical CG above the base and contact/source notes. Quantity never multiplies a placed unit's mass. Horizontal CG remains the envelope centre in this model.
3. **Reusable templates and assemblies:** save current cargo as an independent template, or save selected cargo/support members as a complete assembly. Reuse an assembly through the existing centred preview and click-to-place flow. Existing collision, support, boundaries, stacking and undo checks still apply.
4. **Add support → Place individual pieces → Reusable support patterns:** save member dimensions, density, calculated/manual mass, repetition and documentary material properties before placement. Use the same library to export/import these specifications. Complete racks use the selected-assembly library, preserving their individual members and relative positions.
5. Export the versioned JSON libraries for backup or another device. Imports append independent copies. Unique external cargo identifiers are removed on reuse; placement creates new instance IDs.

## Scope and safeguards

- Families: palletised/boxed cargo, ventilated perishables, crates/cases, drums/barrels, bags/bales, rolls/reels, coils, pipes/bundles, project cargo and separate ISO-container envelopes. Specialist families stay excluded from automatic dunnage, even with a generic profile. Existing legacy general-cargo behavior is retained.
- Cylindrical, irregular and container geometry remains an explicitly qualified rectangular envelope. Contact notes do not silently replace geometric support with a physical contact model. Container corner supports/twistlocks and specialist securing are not inferred.
- Existing timber, plywood and product-specific rubber reference densities remain editable. Steel/aluminium solid members require an entered density. Purpose-rated bags and shaped chocks are visible manual-review entries with placement disabled. Hollow sections require a separately defined assembly/mass.
- Declared restraint capacity (kN), friction coefficient (dimensionless), contact notes, source and validity conditions are preserved in support members, libraries and saved cargo plans. Capacity/friction values require source and applicability. These values are documentary; they do not create a securing pass or a computed rack rating.
- Gross/tare conventions reject double inclusion. The net-plus-tare helper converts to gross mass once; current cargo templates then save that gross convention. Known vertical CG is preserved through template placement and shared height edits; edits enclosing a height smaller than that CG are rejected.
- Shared cargo-property edits match name, base dimensions and family, independently of 0°/90° orientation. Explicitly edited fields change; other per-instance values and IDs remain unchanged. Saved templates do not mutate previously placed cargo.
- Library versions, dimensions, sizes, IDs, coordinates, material mass, quantity, top-load source and markings are validated. Failed storage writes do not report success. Cross-view changes and concurrent import changes are detected. Invalid stored libraries are retained for raw export; a valid recovery import keeps the original under the library's recovery key before replacement.

## Verification

- **457 tests pass, zero failures** (`tests.log`); 13 new P07 regression cases.
- Tests include gross/tare/quantity accounting, location-independent template reuse, external identity removal, invalid imports and versions, storage failure, mixed orientation and per-unit overrides, group placement with new IDs, specialist exclusions, material property provenance, support-pattern mass calculations, declared CG preservation, and complete cargo-plan export/import with support metadata.
- Production build, lint and hosting-resource verification pass. The existing Vite chunk-size warning remains; it is not a new P07 acceptance claim.
- Browser testing used the isolated `scripts/p06-browser.html` harness on port 5186, leaving the user's main application loading conditions untouched. Verified: perishable family/profile/no-stack defaults; 0.95 t net + 0.05 t tare → 1.00 t gross; local template save/reload/use; placement changing 3 items/6 t to 4 items/7 t with VCG 0.4 m; selected two-unit assembly save from Add support; 4.70 kg pine bearer save/reload/use; disabled bag placement; no browser console errors.
- JSON import/export and complete-plan round trips are covered by automated tests. Native file-picker interactions and physical touch/trackpad devices were not separately exercised in this stage.

## Boundaries carried forward

P08 owns fuller support arrangements, contact/load paths and dunnage planning. P07 does not supply unsupported structural capacities, physical cylinders, off-centre horizontal package CG geometry, or an IMO compliance determination. Existing P05/P06 performance/device gates remain open. No deployment was performed.
