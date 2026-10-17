# Transported cargo shapes

Cargo family and transported shape are independent. A pallet of drums can have a box envelope; an individual drum can use an upright cylinder. The operator supplies the outside length, width and height, gross mass and applicable cargo properties. Shape never changes the entered mass or the declared centre of gravity.

Supported exterior shapes: box, cylinder along length, cylinder along width, upright cylinder, and ellipsoid. Cylinders may have elliptical cross-sections. Horizontal rotation swaps the longitudinal and transverse axes. Existing plans and saved definitions without a shape retain their box envelope.

The same shape definition drives placement previews, Top/Side/End projections, both 3D renderers, picking, collision checks, and planar support checks. It persists with footprints in plans, templates, assemblies and capacity handoff. Shape edits are checked for collisions before application.

## Geometry and performance

Axis-aligned envelopes and the existing spatial index reject distant pairs first. Boxes retain the inexpensive box test. Other convex pairs use analytic support mappings and GJK, with a bounded iteration count and conservative rejection of a placement if the algorithm cannot resolve a pair. Tangency is permitted within the existing numerical tolerance. Rendered curved meshes are tessellated approximations.

Planar contacts use rectangles and 64-sided inscribed elliptical cap polygons. Coverage is checked against the union of supporting patches. This is a geometric approximation, not a bearing or securing certification. Horizontal cylinders and ellipsoids have no finite flat extreme patch: their crown is not a flat stacking platform, and their bearing pressure remains unresolved. The rectangular automatic spacer assistant and automatic gap fitting do not claim support for curved shapes.

## Remaining scope

Loading-area containment and capacity package volume remain based on outside envelopes, conservatively. Stowage factor remains an independently editable cargo property. Hollow bores, reel flanges, compound shapes, arbitrary rotations, fitted cradles, material deformation and restraint strength are not implemented by these primitives. Custom support engineering must not be inferred from a collision-free drawing.

## Verification

Regression coverage includes tangency, overlap, empty envelope corners, symmetric collision queries, sphere-distance comparisons, rotation, all projection axes, shape persistence, batch-edit collision rejection, round-cap area, support coverage, unresolved curved bearing, and instanced picking. Browser checks cover drum placement and switching between Top, Side and 3D views.
