# Supported-runtime deployment checks

14 October 2026 — local engineering checks passed; release acceptance remains open.

## Dependency correction

A fresh install identified GHSA-68fv-2mgg-jv7q in transitive build dependency `source-map-js` 1.2.1 (indexed source-map offsets can cause event-loop denial of service). Updated only that lockfile entry to 1.2.2; direct dependency requirements are unchanged. See audit.json and audit-fixed.json. The subsequent registry audit reported zero known vulnerabilities; this is not an independent security audit.

CI now runs `npm audit --audit-level=high` after `npm ci`, so a high/critical advisory or inability to complete the audit prevents deployment checks from passing.

## Clean validation

Downloaded official Node 24.21.0 darwin-arm64 from nodejs.org and checked SHA-256 against its published SHASUMS256.txt. Used a temporary source copy excluding node_modules, dist and .git, and a separate npm cache. The initial attempt could not write the default cache; the recorded successful install used the isolated cache. Existing workspace dependencies and running previews were not changed.

- Clean `npm ci` passed with the corrected lockfile.
- Lint passed; 531 application tests and 6 release tests passed.
- Production builds and complete built-in asset checks passed for both `/UMC_Ship_Stability/` and `/`.
- Licence notices, manifest inventory and candidate identity checks passed for the subpath artifact.
- Process-recovery test passed: the deliberately killed child retained database-adapter revision 1 and recovered journal revision 3. This is a file adapter, not browser/IndexedDB crash evidence.
- Existing >500 kB chunk advisory remains. npm also reported an unapproved optional fsevents install script; no broad script approval was added and all recorded checks passed.

See results.json for archive and lockfile checksums. The artifact is a working-tree candidate, not an accepted release. The production subpath candidate is separate from the root-path test artifact. No user plans or browser storage were touched.

## Remaining gates

The supported Node runtime is now locally verified. GitHub Actions on Linux still needs to run on the final reviewed commit. Actual isolated-browser crash recovery, same-origin rollback, exported-file/clean-profile transfer, sustained full-App performance/memory, physical-device and uncoached-user review, coordinator review and derived-data redistribution approval remain open. No tag, commit or deployment was performed.
