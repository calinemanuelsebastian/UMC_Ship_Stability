# Optional-input review — 16 October 2026

Reviewed UI guards and validation paths across capacity, cargo placement/templates/identification, supports, onboard weights/tanks, ballast proposals, saved plans/scenarios/voyages, ship creation/library, reference settings, hydrostatics, trim, stability/weather/securing, 3D inspection, and report export. This is a source review with focused regression/UI checks, not a claim that every browser interaction has been exercised.

## Changes

- Capacity requested quantity is explicitly optional. SF-only capacity needs neither package mass nor dimensions; those are required only for package counting/placement. Show continuous Full/Down comparison independently of rounded package counts.
- Cargo placement target quantity can be absent; blank no longer becomes zero and blocks placement. Saved templates preserve an absent target. Invalid supplied targets still fail validation.
- Names no longer gate saving scenarios, cargo plans, assemblies, support patterns or ship-library entries; existing or generated default names are used. Custom cargo templates use the same default cargo name as placement.
- Voyage condition names default to the stage and ordinal. Voyage name remains necessary to identify the group/parent relationships.
- 3D inspection remains accessible when the selected numerical model cannot solve the condition; the reference geometry is explicitly labelled and unsolved measurements remain unavailable.

## Requirements intentionally retained

Mass/CG for weight calculations; dimensions for physical placement; tank amounts/densities and capacity limits; explicit net mass and tare when choosing net-plus-tare accounting; source/applicability for claimed top-load, wind, flooding, securing and manual capacity limits; required data for the specific assessment being attempted. Missing assessment data must not become a passing result or a fabricated zero. These do not prevent unrelated planning or viewing.

Optional metadata already accepted includes cargo location/unit-count annotations for aggregate weight calculations, logos/colours, contact notes, known cargo CG overrides, voyage operation notes, optional ship resources and cargo spaces, and optional ballast targets. Ship identity/datum and geometry fields remain necessary for valid packages. Import size/schema checks, recovery conflict guards, pending-data locks, selection-dependent actions, and ballast-proposal review are retained.

No production deployment is included in this review.
