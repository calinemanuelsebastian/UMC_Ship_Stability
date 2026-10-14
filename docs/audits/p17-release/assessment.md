# P17 release preparation — 2026-10-14

Status: tooling implemented; release acceptance OPEN. No commit, tag, GitHub release or deployment was performed. Historical version 0.1.0-beta.1 is unchanged.

## Implemented

- Default-branch pushes and PRs build/check only. Publication requires manual dispatch on a version tag and an acceptance record from the default branch naming that exact source commit/tag. Acceptance, redistribution and rollback each require a named reviewer and evidence. The shipped record is pending and fails closed.
- Artifact manifest inventories every file with size and SHA-256; verification detects additions, deletion and tampering. Source/PDF/workbook/CAD/source-map files and symlinks are rejected. Locked runtime notices and GPL licence are packaged. This does not establish third-party redistribution permission.
- Release/rollback runbook, full-workflow quick-start, redistribution inventory and sanitized bug-report template link release maintenance to the roadmap stages. No data migration, storage wipe or telemetry introduced.

## Evidence

`npm run test:release`: 2 tests pass, exercising exact revision/tag, pending/missing-reviewer gates, artifact modification/addition/deletion, source-document exclusion and symlinks. Production checks validate entry assets and all declared built-in vessel resources at root and GitHub Pages subpath. Existing import/packaging tests cover path traversal, external identification imagery, package resources and limits. This is not an independent security audit.

Local environment: Node v26.7.0 / npm 11.19.0. CI remains pinned by .nvmrc to Node 24; its clean `npm ci` execution and hosted workflow dispatch are not verified in this local session. Existing chunk-size warning remains a performance qualification. A working-tree candidate is not a reproducible tagged release and must not be represented as one.

Local verification completed: **529 application tests + 2 release-tool tests pass**, lint passes, both production builds and hosting checks pass. The pending gate rejects publication as expected. No browser or deployed workflow smoke test was performed in P17.

## Release blockers

- P16 open physical-device/new-user/domain-review checks, P05 performance gate and P15 actual-browser recovery/clean-profile transfer.
- Permission/evidence for redistribution of derived Vectis data and authorship review of distributed assets.
- Actual same-origin previous/candidate artifact rollback and saved-plan compatibility rehearsal, not just serializer tests.
- Accepted clean source commit/version, corresponding source archive, immutable release artifact, authorised tag/publication, then hosted fresh-session and complete-workflow smoke test.

No blockers were silently waived. Gate acceptance requires observed evidence; do not change pending to accepted merely to make Actions green.

Deployment preparation follow-up: [14 October 2026](deployment-preparation-2026-10-14.md), including evidence-file and artifact-identity enforcement and current candidate checks.

Supported-runtime follow-up: [Node 24 clean build and dependency correction](node24-clean-build/assessment.md). 537 tests passed; both hosting bases verified; local Node 24 validation closed, final Linux CI still pending.

Follow-up: core same-origin browser rehearsal passed; see [rehearsal](rollback-rehearsal/assessment.md). Broader matrix and crash acceptance remain pending.

[Extended recovery and backup checks](extended-recovery/assessment.md): real browser storage handling, representative file round trip and Vectis/voyage same-origin rollback passed within documented scope; manual download and isolated-process gates remain open.

[Actual downloaded backups](downloaded-backups/assessment.md) now pass file validation and fresh-origin production-UI restoration for the representative Vectis plan and voyage. Separate-profile and browser-process crash acceptance remain open.

[Actual isolated Brave crash recovery](actual-browser-crash/assessment.md): completed-save recovery draft and named plan survived Force Quit and restart in the same disposable profile. In-flight write crash and broader recovery matrix remain unverified; release acceptance is still open.

Pending-write follow-up: the [actual browser crash assessment](actual-browser-crash/assessment.md) now records a PASS for recovery after Force Quit while a production database write was blocked and the newer journal was present. Full synthetic record equality, recovery commit and journal cleanup passed. Pre-journal debounce and power-loss cases remain outside this evidence.
