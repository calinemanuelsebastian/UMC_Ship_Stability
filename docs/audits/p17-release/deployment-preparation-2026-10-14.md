# Deployment preparation follow-up — 14 October 2026

Status: candidate packaging verified locally; release acceptance remains open. No commit, version tag or deployment was made.

## Changes

- Release approval now requires nonempty regular evidence files under `docs/` in the approval checkout. Missing files, empty files, traversal and symlinks are rejected. The workflow checks out the documentation from the default branch alongside the approval record.
- Artifact verification checks the expected commit and tag in addition to hashes, sizes and the complete file inventory. The deployment workflow supplies both expected values.
- Malformed approval fields fail closed. CLI regression coverage exercises a separate approval checkout and a pending rollback gate.

These checks validate evidence presence and artifact integrity, not the truth of reviewer conclusions or independent artifact authenticity.

## Verification

- 531 application tests and 6 release-tool tests passed (537 total).
- Lint and `git diff --check` passed.
- Production build for `/UMC_Ship_Stability/` passed; entry assets and all built-in vessel resources passed the hosting check.
- Runtime licence notices generated; complete artifact inventory verified against `working-tree` / `candidate` identity.
- Local runtime: Node 26.7.0. The configured Node 24 clean CI build is still required.
- Existing chunk-size advisory above 500 kB remains.

Local review archive: `/tmp/umc-deployment-candidate-2026-10-14.zip`.
SHA-256: `2aaa47e64282fd0066f5fc0f8bc5531cb544529cb26dc76f4c8bb490bf209542`.
This archive contains the current working-tree build, not an accepted immutable source revision, and must not be labelled a release.

## Remaining acceptance

See the P16 assessment and blocker-followup assessment for the detailed evidence. Still open: full-App large-scene sustained performance and memory; actual downloaded-file and clean-profile transfer; isolated browser process-crash and same-origin rollback rehearsal; physical touch/trackpad/accessibility and uncoached workflow review; coordinator/domain review; redistribution rights for derived Vectis material; Node 24 clean CI build. The acceptance record remains pending.
