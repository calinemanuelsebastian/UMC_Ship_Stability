# Workflow and control placement verification — 17 October 2026

Local production preview, port 4240; isolated browser storage. These results concern the pending local build, not the public beta.7 site.

## Changes

- Moved layout Undo and Redo beside Select and Pan in the drawing's sticky Navigation toolbar. Existing keyboard shortcuts remain active.
- Portrait toolbar has 44 px minimum button heights and suppresses the secondary navigation hint to keep the drawing accessible.
- Guide navigation uses the current workspace URL at click time, rather than a previously rendered loading section.

## Browser observations

- Vectis departure fuel/service-liquid setup: 4470.431 t. Capacity handoff retained cargo name, dimensions, family and selected loading area.
- Two 1 t cargo placements: 4472.431 t. Top-view pan moved the camera without changing cargo mass or relative arrangement.
- Rotation enabled Undo; Undo and Redo worked from the drawing toolbar.
- At 390 × 844, Select/Pan/Undo/Redo remained visible above the drawing after scrolling; zoom incremented from 100% to 112%. Temporary viewport override was reset.
- Reload offered a recovery draft, rather than silently applying it. Preview contained 73 loading items and 4472.431 t. Applying restored the exact displayed mass, KG and FSM. Saving a named plan succeeded.
- Export produced the prepared-backup link and exported status. Browser download event timed out: actual downloaded-file/import round trip was not verified in this browser session.
- Ballast diagram selected DB PS (004) editor. Applying 10 m³ at 1.025 t/m³ added 10.25 t (4482.681 t) and updated KG/FSM; Undo restored the prior condition.
- 3D and assessment used the same condition. This lightly loaded case had no bracketed trim balance; results remained explicitly unavailable, without extrapolation, and inspection controls remained available.
- Header guide from Ballast opened with the Ballast route and returned to the simulator.
- Automatic rack preview for one selected cargo unit proposed five members, 65.8 kg; Apply supports raised displayed displacement to 4472.497 t and rendered four posts plus platform.

## Automated coverage

- Full suite: 582 passed, zero failed.
- Acceptance suite: 31 passed, including pontoon, Vectis and independent imported-vessel onboard/cargo/support/save-import/report workflows, recovery and voyage checks.
- Release tooling: 7 passed.
- Production TypeScript/build and lint passed. Existing large-chunk build warning remains.
- git diff --check passed.

## Scope

This is a combined browser smoke test and automated regression pass, not exhaustive verification of every input or a compliance certification. Physical touchscreen gestures, all browser engines, actual browser-process crashes and a newly downloaded-backup import were not repeated. Auto-ballast edge cases are covered by the automated suite; an entire solver proposal/application was not manually exercised in this session. Curved cargo cradles and structural securing capacity remain outside the implemented support geometry scope.
