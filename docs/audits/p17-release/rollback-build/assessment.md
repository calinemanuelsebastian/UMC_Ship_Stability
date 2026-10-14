# Rollback compatibility build

Prepared 14 October 2026 from historical source `5f68b82103535ec09f97a381658eaa35e5ecf7b2`. This is a separate maintenance candidate, not a deployment or a fully backward-compatible implementation of current features.

## Behaviour

Legacy plans remain supported. Candidate capacity settings, voyage stages, newer nested assessment/cargo properties and plans above 10,000 weights are explicitly refused before applying their inputs. The guard detects fields the historical parser would omit; imported calculation result/result(s) fields remain deliberately discarded and recomputed. Conservative rejection can also refuse unknown optional input fields. Original files are never rewritten by validation.

Saved incompatible records remain in storage; production-module tests verify that an unrelated supported scenario save retains those records. Stored-record warnings explain that a newer simulator may be required. A bilingual banner identifies the fallback's older functionality. The source-map-js dependency is patched to 1.2.2.

## Checks

- Clean Node 24 install, lint and production subpath build passed.
- All 392 historical tests passed after retaining intentional imported-result sanitization.
- Dedicated compatibility checks passed for scenario, cargo-plan and recovery imports, nested omissions, oversized plans, retained rejected records and ordinary legacy loading.
- Hosting resource verification, dependency licence notices and manifest integrity/identity checks passed.
- Production browser startup showed the Rectangular Pontoon at 4,000 t and the bilingual rollback banner. Screenshot: preview.png. Temporary preview stopped and tab closed.

This does NOT establish same-origin previous/candidate/rollback/candidate browser storage behaviour or actual browser-process crash recovery. Those remain the next acceptance tests. No user storage or existing preview was changed. No release tag or deployment was made.

## Reproduce

From the current repository, run `node scripts/prepare-rollback.mjs /tmp/NEW-rollback-directory`. The destination must not exist. In that generated source directory on Node 24, run `npm ci`, `npm run lint`, `npm test`, and `npm run build -- --base /UMC_Ship_Stability/`. From the current repository run `node scripts/rollback/verify-rollback.mjs /tmp/NEW-rollback-directory`. Use current release-tools/notices to inventory the artifact and retain the base revision plus modifications. This is an archived historical source tree: its historical GitHub workflow must NOT be dispatched or pushed as a publication mechanism; use the reviewed current release process after acceptance.

See results.json for the prepared site's archive and checksum. Only the dist files are in the zip. Keep the immutable original candidate backups when rehearsing fallback; do not clear storage or overwrite the originals with downgraded exports. The acceptance and rollback gates remain pending.

Follow-up: core same-origin browser rehearsal passed; see [rehearsal](../rollback-rehearsal/assessment.md). Broader matrix and crash acceptance remain pending.
