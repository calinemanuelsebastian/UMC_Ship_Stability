# Website review — 11 September 2026

## Fixed

- A failed lazy 3D import blanked the entire app. Live module traversal reproduced HTTP 504 `Outdated Optimize Dep` responses for Three.js and its addons. The viewer now has an error boundary with retry; loading state and navigation remain available if it fails.
- SSR tests and the Excel comparison created Vite servers using the live application's dependency cache. A shared test-server helper now gives each run a temporary cache, disables file watching, HMR and WebSockets, and cleans up on close. Three.js addon dependencies are explicitly prepared by the development server.
- Loading had accumulated the plan library, cargo drawing, tanks and weight tables on one long page. Its four sections now separate Cargo layout, Tanks and liquids, Weights and totals, and Saved cargo plans. Components stay mounted so switching sections retains drafts and local recovery behavior.
- Loading instructions and English/Romanian navigation now match the new organization.
- Roll Simulation explains missing documented inertia/damping parameters and its corrected-GM/zero-TCG requirements instead of relying solely on a generic incomplete-input message.
- Invalid shared conditions show their actual status in 3D. A rejected saved-scenario restore no longer replaces the previous undo snapshot; undo errors are handled visibly.

## Verification

- 143 automated tests passed; production build and lint passed.
- All 15 reviewed Excel comparisons passed, retaining 47 original weights and displacement 9644.27 tonnes.
- Browser: pontoon and Vectis Castle 3D render; side camera, teaching angle preset and heel-to-trim axis switching exercised.
- Browser: hydrostatics, trim, stability, roll, theory and validation navigation checked; pontoon validation 16/16, Castle validation 1/1.
- Browser: the new loading sections show the appropriate content; original Castle weight totals retained. Local cargo plan save, preview, apply and removal of the QA copy exercised.
- Browser: Romanian loading navigation checked and English restored.
- Browser: after the final concurrent regression work and isolated test run, the 3D canvas remains present with no visible error.

## Remaining limits

- Castle's reconstructed exterior remains an upright visual reference. Its geometry is not a hydrostatic solver. Limited hydrostatic brackets can reject legitimate new loading conditions outside the supplied data range.
- Castle has no compatible cross-curves and no documented roll parameters in its current package. Its initial nonzero TCG also precludes the upright free-roll model. These data limitations remain explicit, not replaced by invented results.
- Tank filling calculations use upright tables, not trim-dependent tank geometry.
- The Three.js production chunk still triggers Vite's size advisory. It is lazy-loaded; further subdivision is a performance improvement, not a calculation fix.
- This is a regression review of the implemented workflows, not certification of the calculations or an exhaustive device/browser compatibility audit.
