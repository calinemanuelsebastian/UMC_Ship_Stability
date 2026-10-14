# Browser recovery and rollback assessment

14 October 2026. Decision: recovery has useful safeguards and passing targeted tests; browser-crash acceptance is incomplete. Rollback to historical release source 5f68b82103535ec09f97a381658eaa35e5ecf7b2 is not lossless and must not be approved as a safe return path for candidate data.

## Verified in this assessment

16 recovery/handover tests passed. Compared production parsers from the current working tree and actual archived historical release source, using synthetic data and shared installed runtime dependencies. No user browser, storage or running server was changed. This comparison is not a rebuilt historical artifact or browser rollback rehearsal.

- A legacy fixture from the historical parser is accepted by the current parser.
- A candidate fixture with capacity settings and voyageStage is accepted by the historical parser, but BOTH fields are silently omitted from its returned state. Loading and subsequently saving/exporting this state can lose those inputs. Merely deploying an older site is not proven to erase stored raw records; loss occurs through old-version processing and subsequent writes.
- A 10,001-weight fixture is accepted by the candidate and rejected by the historical parser (10,000-weight limit). Candidate parser limit is 40,000. This does not establish performance acceptance at either size.
- The IndexedDB database remains version 1; no destructive database migration was found. An unchanged database version does not imply semantic backward compatibility.

## Recovery strengths

The database and recovery journals are read independently, so failure of one does not hide the other. Records are validated before choosing the latest valid draft; corrupt entries remain retained. Each editor instance has its own draft key. The queue checkpoints before waiting for earlier database writes, and removes a journal only when its exact payload matches the committed record. Named updates use an expected timestamp to detect conflicting saves. Tests cover queued/stalled writes, corruption, quota denial, legacy drafts, fixed-weight validation and equal-timestamp cleanup.

Prior browser evidence establishes reload/reopen of saved plans. Prior actual SIGKILL evidence exercises a separate Node process with a flushed file adapter, NOT browser IndexedDB/localStorage.

## Unclosed risks

1. The CargoPlans effect schedules checkpointing after a 250 ms debounce. Changes reset that timer. Abrupt termination before it runs can lose the latest unsaved burst; 250 ms is not a guaranteed maximum loss interval under continuous editing or a busy main thread. Pagehide/visibility/unload handlers improve graceful exits but cannot be relied on for abrupt process termination.
2. Database transactions use default durability. A committed transaction plus journal cleanup is not evidence of operating-system power-loss durability. Actual browser-process termination must be tested separately; neither unit tests nor the Node adapter prove it.
3. Origin/profile changes, user clearing site data, browser eviction or device loss can remove access to browser-local records. Current exports are separate plan/voyage/vessel/material files, not a complete browser-profile backup. Actual retrieved exports and clean-profile transfer still require acceptance.
4. Historical parser silently omits candidate fields and rejects larger plans. A previous artifact may also lack current resources or import capabilities; only the small parser matrix above was exercised.

## Required closure sequence

1. Define the recovery promise: last confirmed checkpoint versus every completed editing action. If the latter is intended, checkpoint at committed user actions or use a bounded journal strategy, while measuring large-scene cost. Do not synchronously serialize a whole dense scene on every pointer move.
2. Establish a rollback-compatible target before deployment. Use a reviewed maintenance build that preserves newer fields or explicitly rejects unsupported inputs before loading/saving; preserve untouched candidate backups. Do not rely on the unmodified historical release for lossless round trips.
3. In an isolated supported-browser profile at a fixed test origin, exercise named save and recovery after: confirmed save; pending journal with stalled IndexedDB; rapid edit before debounce; quota denial; one corrupt store; competing tabs. Terminate only the isolated test browser, reopen, and compare full condition inputs and totals. Record intentionally unsaved losses separately from confirmed-save losses.
4. Serve previous build -> candidate -> rollback target -> candidate at that same origin. Check legacy plans, candidate plans with capacity/voyage metadata, large supported layouts, tanks, support materials and custom vessel dependencies. A rejection must be explicit and leave stored originals unchanged. Verify exported backups in a second clean profile.
5. Retain immutable artifact hashes, source revisions, browser versions, screenshots/results and reviewer decision. Keep the release rollback gate pending until this rehearsal passes.

No crash was induced in this assessment. No deployment, schema change or production-code correction was performed.
