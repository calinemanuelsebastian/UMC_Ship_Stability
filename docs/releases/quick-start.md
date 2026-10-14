# Full-workflow demo and quick-start

Use a desktop browser for editing; begin with the Rectangular Pontoon and a small plan. The app is an educational planner, not an approved loading instrument. Numerical results marked incomplete are not passes.

1. Choose a vessel and inspect its data coverage and reference system. Set the surrounding water density for the condition.
2. In Loading, prepare onboard equipment, fuel, other liquids, crew and provisions. Check liquid densities separately from surrounding water. Avoid counting lightship equipment twice.
3. Review cargo capacity, then open Cargo layout. Select a hold/loading surface, choose a cargo template, set dimensions and gross mass, and place cargo. Select/copy/rotate and undo an edit. Add support structures for cargo that cannot carry a stack; review dunnage proposals and mass before applying them.
4. Set ballast after the other loads. If using automatic ballast, inspect its proposed final condition and warnings before applying. This is not a pumping sequence.
5. Inspect weight totals and the 3D view. Inspect cargo/tanks and distinguish calculated attitude from imposed teaching angles. Compare drafts and angles with the same condition's numerical results.
6. Review curves, intact stability, weather and securing assessments. Read missing-data and applicability messages. A geometric support is not automatically an adequate restraint.
7. Save a named condition and export a cargo plan. For multiple voyage stages, save the stages and export a voyage backup. Prepare the readable assessment and matching JSON from one snapshot.
8. Reload and reopen the plan. Import the exported files in an isolated clean profile with the required vessel package, and compare mass, centres, cargo and assessment inputs. Keep external backups: local browser storage is tied to the origin/profile and can be lost.

Allow a new operator to follow these steps without coaching during acceptance; record confusion and failed tasks. See ../backup-and-handover.md and ../supported-capabilities.md for recovery details and limitations.
