# P16 usability and release acceptance

Date: 2026-10-14. Status: **engineering checks implemented; acceptance open**. No release or deployment is authorised by this document. P05 and P15 have unresolved acceptance gates; P16 does not override them.

## Defects corrected

1. Failed weight/tank resource loading previously set `ready=true` in `finally`. This enabled saving with an incomplete vessel weight foundation. Readiness now requires successful loading; failure gives an alert and retry on every page. Pending/error messages are distinct.
2. Failed vessel-manifest loading previously stranded the workspace. A retry reloads that model without a full browser refresh.
3. Cargo 3D handled renderer construction failure but not subsequent WebGL context loss. Loss now cancels interaction, disposes the renderer/listeners and offers retry plus the existing Top/Side/End alternatives. Retry recreates the canvas; cargo data belongs to the parent and is retained. The canvas has a translated accessible name.
4. The object inspector displayed floating-point noise and converted blank mass to zero. It now displays up to six decimals using the selected locale, and missing values as a dash. Stored precision is unchanged.
5. Printable reports created an Intl.NumberFormat per number. A shared formatter reduces repeated allocation while retaining output precision and HTML escaping.

## Repeatable automated evidence

`npm run test:acceptance` runs workflow, handover, recovery and voyage tests. `npm run profile:acceptance` records the production-module pipeline profile. Final full `npm test`: 529 passed, zero failures. Production TypeScript/Vite build, lint, hosting-resource verification and `git diff --check` passed. The existing large-chunk build advisory remains.

The new integration cases import/mount real vessel packages for Vectis Castle and the pontoon, plus an independently defined 20 × 10 m barge with analytically generated hydrostatics. They load the actual onboard workplan, place one cargo and one support, verify mass increments of exactly 1.025 t, round-trip a complete plan with fixed-weight checks, regenerate reports, and unload cargo while retaining the support. The independent barge's draft is checked against displacement / (1.025 × 20 × 10). Its absent cross curves remain explicitly unavailable. Released model resources produce missing-data results rather than a successful stale report. Inspector tests verify missing mass and display rounding without input mutation.

This is production-module integration, not proof that every path was completed through a browser file chooser.

## Browser evidence

Temporary production origin: `http://127.0.0.1:4196/`, separate from the user's existing preview origins. Temporary full-App fault fixture: `http://127.0.0.1:5196/scripts/p16-browser.html`. Only acceptance data was created there.

- Pontoon: empty condition → Add first cargo → enter 1 t gross mass → Top view → Place cargo → finish. Total changed 4,000 → 4,001 t. Undo returned 4,000 t; redo restored 4,001 t. Saved named plan, reloaded, previewed its six entries, applied, and observed 4,001 t again. Prepared report and matching printable/JSON controls became available.
- Romanian: changed language in the actual production app and inspected the saved-plan/report workflow. At 390 × 844 the header, navigation selector, summary and report controls fit the portrait viewport. `portrait-ro.png` records this. This is layout emulation, not physical touchscreen or screen-reader acceptance.
- Vectis Castle: onboard section and lazy-loaded 3D inspection opened in production, showing the reconstructed-geometry qualification and numerical draft display. Its complete save/import/report chain is covered by the new integration case, not a new full browser journey.
- Fault fixture: HTTP 503 on weight/tank requests left plan saving/export disabled, with retry. Releasing the requests and using Retry restored 4,000 t without reloading the page. Real `WEBGL_lose_context` extension caused the fallback message; Retry recreated the cargo canvas. Top view remained usable. Added 1 t cargo in the fallback, switched back, induced loss again: 4,001 t and selected cargo specifications remained. No user browser process was terminated.

## Performance evidence and limits

Files: `pipeline-profile-before.json`, `pipeline-profile.json`. Hardware/runtime are recorded in each. One sample per size; not statistical acceptance. A concurrent intermediate run was discarded from the final profile because full tests/build were running.

| Cargo units | Serialize | Parse | Loading totals | Report calculation | Printable formatting |
|---|---:|---:|---:|---:|---:|
| 100 | 0.15 ms | 11.97 ms | 0.55 ms | 18.74 ms | 4.12 ms |
| 1,000 | 0.99 ms | 6.78 ms | 2.93 ms | 25.64 ms | 30.66 ms |
| 3,376 | 4.21 ms | 21.19 ms | 5.20 ms | 77.42 ms | 87.92 ms |

The initial 3,376-unit printable stage took 543.14 ms. Measurements suggest improvement but do not establish a universal speedup. These scenes contain plain cargo; the 29,916-total-item cargo/support benchmark, auto-dunnage generation, full-App scheduling, drag p95 and long-session memory require their own measurements. The existing P05 33.4 ms drag p95 misses the proposed <33 ms budget; this remains open. Printing is synchronous and very large reports can still pause the interface.

## Acceptance still required

- Fresh-user session and task completion observations, without coaching, using `operator-session.md`.
- Physical mouse/trackpad/touchscreen and keyboard-only/screen-reader coverage; contrast measurement and chart alternatives across all routes and both languages. The portrait screenshot is not a blanket accessibility pass.
- Complete browser file import/export journeys for all three vessels, including ship and material libraries, and full production slow-network/missing-WebGL-startup coverage. Context-loss testing covers only part of graphics failure handling.
- Supported maximum scene, cancellation and oversized-scene workflow, production p95/memory testing; rerun P05 and address its open limits.
- P15 actual isolated browser-process/IndexedDB crash recovery and clean-profile transfer.
- Coordinator review of numerical references, applicability, source qualifications and acceptable demo scope. No coordinator review has been performed or inferred.

The general test suite checks many failure paths, but it cannot prove all possible conditions. Do not mark P16 accepted or advance the release gate on scripted success alone.

## Deployment-preparation follow-up

See [deployment preparation](deployment-preparation.md): real production-subpath file imports for three vessels, pontoon named-plan reload, Vectis ballast-departure trim display, and a 3,376-unit full-App save/reopen check. Fixed omitted cargoArea restoration; 530 application tests plus 2 release-tool tests pass. Dense-plan application still stalls, and download retrieval remains unverified. P16 remains open.

### Dense-plan follow-up

[Blocker reduction](blocker-followup/assessment.md) identifies and removes eager rendering of thousands of hidden cargo forms, with production-browser paging/apply verification and regression coverage. Explicit backup links now remain available for the prepared snapshot; actual file retrieval is still blocked/unverified in the available browser tooling. Remaining acceptance gates are unchanged except for this resolved cause of dense-plan application delay.
