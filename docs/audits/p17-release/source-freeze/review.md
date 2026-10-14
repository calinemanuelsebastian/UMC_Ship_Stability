# Release-candidate source review — 14 October 2026

Candidate version: 0.1.0-beta.2-rc.1. Local engineering candidate only; public deployment, tag, redistribution and operational acceptance are not approved here.

## Review scope

Risk-focused review of the complete working-tree change inventory since historical commit 5f68b82103535ec09f97a381658eaa35e5ecf7b2, with direct inspection of release workflow/gates, artifact inventory, shared condition restoration, recovery storage, voyage import, cancellation, auto-ballast proposal application, securing applicability/report escaping, and numerical boundary fixes. Regression tests cover the broader application. This is not an exhaustive independent line-by-line audit or a domain approval of all calculations.

## Findings and changes

- Artifact inventory previously rejected workbook/PDF/CAD/source directories but could admit a ZIP, Word/PowerPoint document or test fixture copied into dist. Expanded rejection to archives, additional document/source extensions, and docs/fixture directories; added release regression coverage. Production JS, JSON/CSV vessel resources and visual assets remain permitted.
- An untracked P01 baseline ZIP duplicates older source and evidence. Preserve it locally and ignore that exact archive; do not commit or publish it. Raw source workbooks/PDFs remain excluded. No user browser storage or downloaded user plans are collected into the candidate.
- Updated package and lockfile versions together so the candidate does not identify itself as historical beta.1. No version tag created.
- Corrected the rollback runbook's stale claim that browser rehearsal was still unperformed; approval remains pending.
- No credential-pattern matches were found in the source inventory for common GitHub/AWS tokens or private-key headers. This limited pattern scan is not a secret-scanner/security certification.
- Release workflow remains fail-closed: checks on pushes/PRs; deployment requires a manual accepted version tag and exact-commit reviewer evidence from the default branch. No acceptance field was changed.
- Recovery evidence now includes completed-save and journaled, blocked-write process crashes. The pre-journal debounce interval and power loss remain outside that evidence.

## Known qualifications retained

Physical-device/new-user/accessibility acceptance, sustained large-scene performance, domain applicability review, Vectis derived-data redistribution permission, and final Linux CI remain open. The build still reports a large-chunk advisory. A clean local build does not replace hosted deployment verification. Auto-ballast proposals remain bounded planning searches, and securing/stability results retain missing-data/applicability qualifications.

## Freeze mechanics

The source commit containing this record is the candidate snapshot. Final commit identity, source archive, site archive and SHA-256 inventory are stored outside the repository under /Users/ces/Documents/Codex/umc-release-candidates to avoid self-referential commit metadata. Built artifact manifest names that exact commit. Any later runtime changes require a new candidate and relevant revalidation. Release gate remains pending. No push or deployment is part of this freeze.

## Validation for this candidate

Clean temporary source copy, Node 24.21.0 / npm 11.19.0: npm ci passed; audit reported zero vulnerabilities; lint passed; 531 application tests and 7 release tests passed. TypeScript/Vite builds and declared-resource hosting checks passed for /UMC_Ship_Stability/ and /. Evidence is in the adjacent text logs. The clean install resolved the committed lockfile rather than reusing the working checkout's node_modules.
