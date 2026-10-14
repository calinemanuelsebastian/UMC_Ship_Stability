# Actual downloaded-backup verification

14 October 2026. Passed for the two user-downloaded files:

- `/Users/ces/Downloads/cargo-plan (4).json`, saved 14:53:29 local time.
- `/Users/ces/Downloads/voyage-inputs.json`, saved 14:53:43 local time.

Original files were read only and were not replaced. SHA-256 and byte sizes are in results.json. The plan has 74 weights and preserves every original representative-condition input. The application also includes assessment and restored cargo-area state; these were validated by its production parser. The voyage export contains three conditions: departure, arrival, and the unrelated legacy scenario saved during rollback. ID remapping preserves the arrival-to-departure parent link. Exact input and recalculated hydrostatic comparisons passed against the reference fixture for both voyage stages.

Imported these ACTUAL downloaded files through the production application's file chooser at the new origin `http://127.0.0.1:4202/UMC_Ship_Stability/`. The saved-plan and scenario lists were initially empty. The restored departure displayed 74 weights, displacement 4,061.160 t, KG 8.426 m, and transverse FSM 57.226 t·m. Voyage import previewed three conditions and appended them. Arrival retained its parent, consumed fuel and unloaded upper package. Loading it displayed 4,058.047 t, KG 8.429 m and FSM 55.907 t·m, matching the reference at UI precision. Full-precision results are retained in results.json. See browser-restoration.txt/png.

This closes actual-file retrieval and fresh-origin restoration for this representative built-in Vectis case. It does not establish a genuinely separate browser profile/engine, custom ship/material-library transfer, or abrupt browser-process crash recovery. No crash was performed. The new test server and tab were closed; original handoff page on port 4201 was left alone. No user browser storage was cleared, and no deployment or overall release approval was made. Script verification and lint passed.
