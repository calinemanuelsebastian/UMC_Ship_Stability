# Blocker reduction — 2026-10-14

Status: two engineering changes delivered; P16/P17 acceptance remains open. No deployment.

## Dense-plan application

Root cause found: both LoadingCondition instances are mounted by App even when their sections are hidden. The review instance built all cargo form rows inside collapsed details, including repeated linear index/ID lookups. The 3,376-unit fixture created 3,785,341 characters of server-rendered review markup. CargoPlanner itself was much cheaper in the same probe.

Cargo groups now render their rows only while expanded, with 50 rows per page. Row number and weight lookups use memoized maps. Group summaries and loading totals still use the entire authoritative condition. Collapsing a group releases its row controls; paging does not modify weights. Other onboard controls retain their existing behaviour and undo scope.

One local production-module SSR sample (Node 26.7.0, not browser paint): review rendering 916.7 → 41.9 ms; markup 3,785,341 → 3,527 characters. Raw output is preserved beside this document. Reproduce with `npm run acceptance:fixtures` then `node scripts/p16-render-profile.mjs`. Single samples do not establish a universal speedup or a p95 guarantee.

Production browser, isolated origin 4197: reopened the previously saved 3,376-unit plan. Apply command completed in 459 ms (browser automation round-trip, not instrumented frame latency); earlier application timed out. Total remained 4,033.76 t. Expanding totals rendered 50 rows, Next displayed Synthetic package 51 with original weight-row number 56, and collapsing removed all cargo table rows. Snapshot ../paged-totals.png. Full-App supported-scene drag p95 and long-session memory remain separate open gates.

## Explicit backup download

Download backup still attempts the normal download, now with an attached anchor. It also retains a visible Download prepared backup link for that exact snapshot. Changes to condition/name/notes hide the stale link; replacement or component disposal revokes the previous object URL. Romanian text is provided. Browser verification changed notes and observed zero stale links.

Both the download-event listener and explicit-link downloadMedia API timed out in this in-app browser. Direct navigation to the blob URL was rejected by browser security policy; no workaround was attempted. Therefore actual retrieved-file/clean-profile transfer remains UNVERIFIED. A user-controlled browser download and reimport, or a supported download-capable automation surface, is still needed. A visible link is not proof that a file was saved.

## Remaining work in order

1. Instrument longer full-App drag/group operations and the 29,916-item supported scene; verify the <33 ms p95 target and memory limits. The identified hidden-form bottleneck is fixed, but this is not blanket performance acceptance.
2. Verify real downloaded JSON/report files and full clean-profile vessel/material/voyage transfers.
3. Actual isolated browser-process interruption with IndexedDB; same-origin previous/candidate rollback and plan compatibility. Do not kill the user's Codex/browser session.
4. Physical devices/accessibility, uncoached operator and coordinator reviews; source redistribution evidence and Node 24 clean CI build.

Keep release-gate.json pending until observed evidence satisfies these requirements.

Final verification: 531 application tests + 2 release-tool tests passed. Lint, production build, hosting resources, artifact integrity and whitespace checks passed. Existing chunk-size warning remains. Temporary verification tab/server were closed; test data remains confined to the isolated test origin.
