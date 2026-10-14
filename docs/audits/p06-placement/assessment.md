# P06 — Placement and editing mechanics

2026-10-11. Implementation and desktop functional verification completed for the supported rectangular-cargo planner. **Overall acceptance is conditional:** P05 remains open and physical touch/trackpad interruption tests have not been performed. The user explicitly requested P06 after the P05 status report; this does not retroactively accept P05. Nothing was deployed.

## Implemented

- Shared cancellation lifecycle for top/elevation/3D cargo drags, window selection and plan navigation. Escape, editing commands, blur, hiding the page, changing view/tool or replacing the condition discard provisional work. A stale pointer-up cannot commit against a replacement condition. Additional pointers cancel cargo editing instead of replacing the active drag. 3D handles lost pointer capture and restores the authoritative geometry.
- Selection mode starts with horizontal 3D cargo dragging. Camera presets choose the corresponding movement plane: Top/Perspective → length/width, Side → length/height, End → width/height. Pan mode navigates without editing cargo and preserves the chosen movement plane on return.
- Keyboard nudges in the top view move the complete selection using the same preview/commit, grid and cargo-contact checks as dragging. Step is the selected grid spacing (0.1 m without grid); Shift multiplies it by ten. Enter/Space selects a focused unit. Modifiers reserved for commands do not nudge cargo.
- Stacking elevation capture considers only support heights underneath the proposed footprint. An unrelated remote pile no longer attracts or blocks a local drop. Nearest local level, full support, collision and headroom checks still apply; a rejected candidate does not jump to a distant level to evade a collision.
- Whole-group ghost previews draw above existing cargo. Side/end window selection uses the actual initiating SVG projection, including when both projections are mounted.
- Fixed duplicate React keys between dimensions and stackability controls, and cleared the stale “Release to place” message after a successful 3D drop.

## Existing mechanics retained and verified

Directional window/crossing selection; additive selection; atomic group translation/rotation; centred pointer paste; explicit spacing and magnetic/grid snapping; supported stacking and independent rack assemblies; loading-area/tween-deck/hatch boundaries; full-height elevations; delete protection for loaded supports; bounded Undo/Redo; footprint serialization. Copy/paste creation deliberately hands off to Top view; dragging existing cargo works in all planner projections. Rotations remain quarter turns in plan, not arbitrary 3D tipping. Rectangular bounds are the supported geometry model; specialist cargo geometry/templates belong to P07.

Racks and multiple bearers remain geometric support models. Capacity, connections, buckling and lashing adequacy are not certified by successful placement; those checks belong to later stages.

## Evidence

`src/app/p06-placement.test.mjs` adds nine regression cases covering remote/local support heights, partial contact, headroom, touching-face tolerance, actual versus projected overlap, stepped boundaries, adjoining hatch panels and unsupported seams, centred preview/commit equivalence, four rotations, delete/Undo/Redo and mass preservation, non-stackable goods, command cancellation and cancellation-listener disposal. Existing cargo-group, copying, snapping, support-frame, hatch, navigation, identification and persistence tests remain in the full suite.

Final full suite: **444 passed, 0 failed**, using four test processes; see `tests-final.log`. The earlier default-concurrency run (`tests.log`) had a Vite module transport timeout and a test import registered after the test lifecycle had ended. All module imports now occur before test registration; the two affected suites passed independently, and the bounded-concurrency full run passed. No failed assertions were suppressed. Production build, lint and hosting/resource verification pass; the existing bundle-size warning remains.

Browser checks used the production CargoPlanner through the isolated development fixture `/scripts/p06-browser.html` on a separate localhost origin. User plans were not touched. Observed:

1. Enclosure selection selected Units 1 and 2 together; a keyboard nudge moved both by 0.1 m, preserving their 3 m separation. Undo restored original records.
2. Copy/paste placed both units centred at x=10 m; count/mass changed from 3/6 t to 5/10 t. Rotation across the hold boundary was rejected with unchanged geometry. Undo and Redo restored the paste.
3. Deleting one 2 t unit reduced count/mass to 4/8 t; Undo restored it.
4. Build next layer added a supported unit at z=1 m with VCG=1.4 m. Side drag moved it to x=15 m and z=0 while preserving TCG and mass. End drag moved it to y=6 m and z=0 while preserving LCG and mass. Undo restored the stack after each. Full 6 m hold height remained visible.
5. Direct 3D dragging moved cargo without opening a separate movement menu. Side and End camera presets selected the matching vertical movement planes.
6. Pan-mode dragging changed the viewBox without altering any cargo geometry. Fit restored the view.
7. Final clean browser run showed no console errors; screenshot: `stacked-side-view.png`.

The browser tool's virtual clipboard intercepted Ctrl+V, so copy/paste was verified with the app's buttons rather than claimed as an end-to-end OS clipboard test. Gesture cancellation has automated event/lifecycle coverage, but no physical simultaneous touchscreen gesture or mid-drag application-switch claim is made.

## Remaining acceptance work

- Close the P05 performance/full-App large-plan recovery gates before declaring the combined planner release-ready.
- Exercise real touchscreen two-finger pan/pinch, trackpad gestures, pointer cancellation and focus interruption on recorded devices. Desktop pointer checks and numerical pan/pinch tests cannot replace physical-device verification.
- Preserve these regression cases as P07/P08 add cargo families and support rules; do not broaden rectangular placement results into structural or securing approval.
