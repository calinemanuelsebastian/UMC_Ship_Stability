# Extended recovery and backup verification

14 October 2026. Available automated checks completed; release acceptance remains open.

## Representative case and disk-file round trip

`scripts/verify-representative-backup.mjs` creates a synthetic Vectis condition, ship package and two-stage voyage in `/tmp/umc-representative-backup`. The condition contains 74 weights, two cargo packages with timber base/separator, tank-001 at 60% volume using density 1.005 t/m³, an MDO tank at 70%, surrounding water density 1.025, and capacity inputs. Arrival consumes 10% of MDO tank capacity and unloads the upper package. These are persistence fixtures, not an approved or physically certified loading/support arrangement.

The script rereads actual JSON files, mounts a separate vessel instance, imports the voyage into an initially empty storage adapter, verifies remapped parent links, compares complete condition inputs exactly, and compares recomputed hydrostatics exactly for both stages. Quota failure and future-schema rejection leave the existing data unchanged. Material name/density are embedded in placed supports; an independent material-template library was not exercised. File hashes and numerical results are in file-roundtrip.json. This is not evidence of files downloaded through the browser UI or of a clean browser profile.

## Real browser storage fixture

At disposable origin port 5201, `scripts/recovery-storage-browser.html` exercised production storage/recovery functions with actual IndexedDB and localStorage. All seven checks passed:

1. Database save/read.
2. Latest pending journal selected over older database revision.
3. Journal cleanup after commit.
4. Injected database-persistence rejection retains real localStorage journal.
5. Injected journal quota exception still permits database saving.
6. Malformed journal does not hide the database copy.
7. Stale expected revision rejects a database overwrite and retains the original named plan.

Database-failure and quota cases are controlled injection, not physical disk exhaustion. No process was killed. Stale-revision testing is not two simultaneously interacting tabs. See browser-storage.txt/png. Fixture excluded from normal production entry points. Disposable records retained under unique model IDs.

## Production Vectis same-origin rollback

At port 4201, actual production UI file choosers imported plan.json and voyage.json, followed by named-plan save and append of both voyage stages. Candidate -> guarded rollback -> candidate kept the identical origin and base path.

Rollback withheld incompatible named plans and scenarios with the explicit preservation warning. Saved an unrelated legacy scenario while rollback was active. On return, candidate restored the named plan with 74 items, displacement 4,061.160 t, KG 8.426 m and transverse FSM 57.226 t·m. Both voyage stages and the new legacy scenario remained. Arrival retained its departure parent, fuel consumption and removed upper cargo; loading arrival recomputed 4,058.047 t, KG 8.429 m and FSM 55.907 t·m. Source numerical outputs retain full precision; UI values are rounded. See before/rollback/returned DOM evidence.

## Handoff and limits

The production test server remains at http://127.0.0.1:4201/UMC_Ship_Stability/ and test tab 39 remains available. Departure is loaded, with Download backup and Export saved conditions and voyages available. This is disposable test data. All prior user previews were left unchanged. The storage-fixture server is stopped.

Actual browser download retrieval previously failed, and direct blob navigation was blocked by the browser security policy. That route was not retried or circumvented. User download handoff is required to verify the actual exported files independently. A genuinely clean browser profile and isolated browser-process termination are still unavailable through the current safe automation controls. No physical browser-crash, device-loss, actual storage-eviction or full multi-browser acceptance is claimed.

The 16 recovery/handover regression tests and lint passed. No application runtime code changed, no tag or deployment was made, and release gates remain pending.
