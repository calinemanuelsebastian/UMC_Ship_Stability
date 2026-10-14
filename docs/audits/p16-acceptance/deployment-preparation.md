# P16 deployment preparation follow-up

2026-10-14. Production subpath origin: http://127.0.0.1:4197/UMC_Ship_Stability/. Disposable test data only; existing user tabs and browser processes were not terminated. Acceptance is still open.

## Reproduction kit

Run `npm run acceptance:fixtures` to generate three ship/condition pairs plus a 3,376-unit pontoon plan in `/tmp/umc-p16-fixtures`. These are synthetic transfer cases, not approved operating conditions. The independent 20 × 10 m barge has analytical hydrostatics and deliberately lacks cross curves/tanks/hull geometry. The dense pontoon uses 0.01 t packages and is a persistence fixture, not a cargo strength reference.

Build with `npm run build -- --base /UMC_Ship_Stability/`; preview with `npm run preview:pages -- --host 127.0.0.1 --port 4197 --strictPort`. A root-configured preview of a subpath build can show a blank page; match both paths. The new preview script makes that repeatable.

## Browser results

- Pontoon plan imported through the actual file chooser: six loading entries, 4,001 t. Applied, saved under P16 production transfer, reloaded, selected/previewed/applied the named plan; restored 4,001 t.
- Independent vessel imported through Ship library, reviewed, saved locally and selected. Its plan imported at 301 t. Saved locally; 3D explicitly reports absent supported hull geometry instead of implying a calculated mesh. The ship review reports absent tanks and cross curves.
- Vectis plan imported at 3,930.6 t / 71 rows and saved. Assessment kept unavailable trim/GZ results explicit for this light condition. This is an intentional missing-data case, not a successful stability demonstration.
- Applied the documented Ballast departure starter. Displacement 8,240.311 t; VCG 6.205 m; transverse FSM 65.544 t·m. Estimated trim in 3D displayed AP 5.686 m, FP 4.366 m, FP−AP −1.321 m and the nonzero-TCG longitudinal-reference qualification. Screenshot: deployment-trim.png.
- Download backup was clicked after registering a download listener; the browser tool timed out without a returned file. Download retrieval/clean-profile export transfer remains UNVERIFIED. This does not establish whether the app or browser integration caused the missing event.

## Defect found and corrected

A valid portable plan may omit cargoArea. Applying it cleared the editor's surface, so the selector displayed a vessel surface while the canvas said “Define a planning area first.” Restoration now chooses the first documented surface when the saved selection is absent; resolves saved IDs against current documented geometry; and retains explicit custom areas. Regression coverage includes omitted/unknown IDs, current geometry, custom geometry, stored deck mode and vessels without surfaces.

## Remaining release blockers

The additional import checks do not close the complete three-vessel export/library/voyage workflow. The 29,916-item supported scene, production drag p95, long-session memory, physical touch/trackpad and accessibility review remain open. Real isolated-browser process/IndexedDB crash recovery has not been repeated. The available controlled browser is part of the user's application and was not killed. Uncoached operator and coordinator reviews require actual participants; no approval is inferred. P17 redistribution/rollback gates remain pending.

## Retest and release decision

After the fix, the saved 3,376-cargo plan reloaded and applied with 4,033.76 t and the documented Pontoon deck. The 3D cargo canvas and camera controls rendered instead of the missing-area message (deployment-dense-plan.png). One Apply cargo plan browser command timed out; a subsequent observation showed application completed correctly. This is a responsiveness finding, not a measured p95 or a performance pass. The fixture has no support members; it does not replace the 29,916-item benchmark.

Final checks: 530 application tests + 2 release-tool tests pass; lint, production build, deployment-subpath resource verification, artifact manifest verification and git diff whitespace checks pass. Existing large-chunk advisory remains. Runtime remains local Node 26.7.0, whereas CI uses Node 24; clean CI reproduction remains necessary.

Deployment decision: **HOLD**. Next engineering priority is full-App dense-plan apply/render responsiveness and verified download-to-clean-profile transfer, followed by isolated browser crash and rollback tests. Then conduct physical-device/uncoached operator and coordinator review. Redistribution evidence remains a separate P17 prerequisite. No publication, tag or acceptance waiver was performed.
