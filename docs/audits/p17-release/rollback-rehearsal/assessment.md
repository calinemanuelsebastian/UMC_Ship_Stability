# Same-origin browser rollback rehearsal

14 October 2026. Core named-plan and recovery-draft rehearsal passed. Full rollback acceptance remains pending for the broader matrix below.

## Environment and method

Used the Codex in-app browser at a disposable origin `http://127.0.0.1:4199/UMC_Ship_Stability/`. This is origin isolation, not a separate browser profile. Real app UI performed every save/load/edit; real browser storage was retained throughout. No storage injection or clearing was used. An agent-owned static server changed its artifact-directory mapping without changing hostname, port or base path, with no-store headers to avoid stale build assets.

Sequence: prepared compatibility rollback -> current Node 24 candidate -> prepared compatibility rollback -> current candidate. The initial and fallback build was the guarded maintenance build based on 5f68b82, not the unmodified historical release known to drop fields. User preview origins 4175/5173 were untouched. This was a controlled graceful reload rehearsal, not a process crash or GitHub Pages/CDN deployment.

## Observed results

1. Rollback: saved `Rehearsal legacy 4000t` with five base weights, 4,000 t displacement, KG 4 m, density 1.025 t/m³ and FSM 0.
2. Candidate: the legacy plan appeared, previewed five weights/4,000 t and applied successfully.
3. Candidate: entered capacity proposal inputs 0.75 t/package, 1.2 x 0.8 x 1.6 m and quantity 137. Saved separately as `Rehearsal candidate 137 packages` with identifiable voyage notes. These are planning inputs, not 137 physically placed cargo units; displacement correctly remained 4,000 t.
4. Rollback: the candidate-only plan was excluded from the editable list and the UI explicitly warned that newer records remain unchanged in storage. Legacy plan remained selectable and applied. Saved a third plan, `Saved during rollback 4000t`, exercising real writes while unsupported records existed.
5. Candidate: all three named plans reappeared. The protected candidate plan retained its original saved time and notes; applied it and verified all five capacity field values exactly via visible DOM inputs. See returned-capacity.json and returned-capacity.png.
6. Reloaded candidate again, explicitly selected the original candidate recovery draft from before rollback, reviewed and applied it. The same five capacity values returned exactly; see recovery-capacity.json. Legacy, candidate and rollback-period drafts remained available.

Temporary tab and server were closed. Disposable origin data was retained for reproducibility; no user plans were removed. No production deployment or release-gate approval was made.

## Limits and remaining matrix

The tested named plan and recovery draft survive this transition. This is not proof of byte-for-byte preservation of every stored record, though the tested inputs, notes and saved time were retained. Voyage-stage lineage (distinct from plain voyage notes), Vectis tank fills and material/custom-vessel dependencies, large supported cargo/support layouts, rejected JSON imports, fresh-profile exported-file transfer and other browser engines still require UI rehearsal. Existing module tests cover some of these paths but are not substitutes for browser evidence.

Actual isolated browser-process crashes, pending/failed IndexedDB saves, quota/corruption and multi-tab conflicts were not induced here. No browser process was killed. The rollback acceptance gate stays pending until those required cases and reviewer sign-off are complete.
