# P03 — Vessel-data and numerical foundations

Date: 2026-10-10. Scope: the supported numerical models, import validation, coverage/provenance and regression gates. Local work only; no deployment. This is not acceptance of later UI, cargo-performance, securing, ballast-optimisation or regulatory-assessment stages.

## Changes and findings

| ID | Finding | Resolution and regression evidence |
|---|---|---|
| P01-B01 | 6,150 t less 4,000 t, divided into 2 t packages returned 1,074 because the computed limit was 6149.999999999999 | Correct machine-precision quotient noise only; result is 1,075. A real 1e-8 t shortfall still gives 1,074. Volume boundaries and unsafe integer counts also tested. No presentation rounding enters calculations. |
| P03-02 | Exact constant-LCB trim knots unnecessarily consulted the previous trim slice, rejecting a valid mass outside that unused slice | Exact knots use only their own slice. Actual interpolation still requires both populated brackets; no extrapolation. |
| P03-03 | Optional LCF at an exact mass/trim knot was lost when an unused neighbour lacked LCF | Preserve the exact knot value; intermediate missing data stays unavailable. |
| P03-04 | Duplicate CSV headers or extra/missing cells could conceal or shift numerical columns | Reject ambiguous CSV structure. Missing optional data must have an explicit empty cell. Reject impossible negative volume/displacement/inertia/BM/area/TPC; unusual finite source values are screened, not rewritten. |
| P03-05 | Constant-LCB density provenance pointed to PDF 7, the software-description page | Manifest now cites PDF 31/34/53 and the PDF 12–13 worked example. Original citation, corrected citation, reason and review instruction retained in `config.sourceCorrections`. Density and all table values unchanged. |
| P03-06 | Package review did not summarise numerical coverage | Add an EN/RO, collapsed coverage panel and structured report. Availability follows validated data/resources, not vessel names. Visual geometry does not enable numerical hydrostatics or coupled heeled draughts. |

Import validation also rejects incompatible fixed-trim cross-curve conventions and missing/nonpositive constant-LCB reference density before saving. Detailed coverage runs only on package review/import, not in the rendering or calculation loop. Existing shared-result caching remains bounded and tested.

## Data audit and conventions

Full coverage and resource hashes: `numerical-audit.json`. Every packaged resource file retains its P01 hash. Existing source corrections remain intact; no additional numerical table replacement was justified.

| Data | Audit / contract |
|---|---|
| Pontoon | 17 upright rows, 1–5 m; analytic rectangular hydrostatics, signed cross curves and linear trim tested. The 3 m design reference is not a certified maximum. |
| Vectis upright/trimmed | 120 upright rows, 2.5–8.4 m; six trim slices −2…+0.62 m, 720 rows. Fresh PDF comparisons using pypdf and pdfplumber agree exactly on displacement, LCB, LCF, KMt and upright TPC. See `source-hydrostatics-check.json`. |
| Cross curves | Fresh extraction matches packaged JSON exactly: six initial-trim sets, 684 mass rows, 8,892 ordinates, 3,500–14,800 t, starboard 0–60°. KN sin(phi) is already the tabulated lever; it is not multiplied by sine again. |
| KG and flooding | Fresh extraction matches packaged JSON exactly: 71 annotated KG rows; 156 flooding samples, only seven numeric thresholds. Null thresholds stay unknown. KG comparison does not assert approval or equivalence to intact/weather criteria. |
| Wind | All 375 rows, five silhouettes, freshly match two PDF extraction engines. Profile draught is moulded/baseline; moments use the source reference. These silhouettes do not describe arbitrary user deck cargo automatically. |
| Tanks | 68 Vectis tank tables validated from zero to capacity. New tests check mass, all three volumetric moments and FSM at every positive-volume knot and every interval midpoint. Density changes scale mass/FSM, not volume or centres; sea density is independent. These are numerical tests against packaged tank data, not a new transcription of all sounding-table PDF cells. |
| Drafts/signs | Source PDF 6, 12–13, 31–34 and 53 reviewed. AP-forward, starboard-positive, baseline-up; trim = FP−AP. Hydrostatic table draught is underside keel; the trim dataset applies its documented 0.011 m moulded offset once. Draft-mark stations differ from perpendiculars: do not label AP/FP drafts as observed mark readings. |
| Cargo/deck geometry | Existing surface/union/hatch/deck tests retain documented cargo boundaries and reject invalid geometry. Reconstructed exterior and simplified tank-plan polygons do not supply hydrostatics or tank filling geometry. |
| Movable panels | Documented aggregate 269.6 t stays aboard when stored; source Store Position 4 changes LCG 63.24→16.93 m and VCG 6.97→12.838 m. Ashore mass is zero. Storage must not be assumed to lower KG. Existing panel-mode/surface/weight tests pass. |
| Source limits | Summer reference 8.011 m underside keel and 13,976.39 t at 1.025 t/m³ confirmed on PDF 31/53. Fixed-draught density scaling is not automatic load-line freshwater allowance. Table endpoints are not loading permissions. MCT appendage factor is documented on PDF 34; the supported trim solver balances LCB/LCG directly and does not use MCT. |

The source manual SHA-256 matches the extraction provenance. `source-hashes.json` also records the supplied arrangement, tank, strength, securing and ballast documents. Existing distinctions remain: superseded strength limits are not enabled as authoritative limits; the securing manual's vessel applicability needs review. The external reconstruction is not promoted into a numerical hull.

## Verification

- Full automated suite: 423 tests, zero failures (see `tests.log`). Includes analytic pontoon references, an independently defined 60 × 12 m synthetic barge with no Vectis resources, invalid/missing/duplicate/nonfinite rows, exact knots and interval/range boundaries, tank moments, source replacement and cache invalidation.
- Corrected apples reference: 48 comparisons (mass, centres, FSM, trim, draft, LCF, KM and KN/GZ samples), within 1e-8 regression tolerance. Totals remain 9,644.27 t, LCG 59.077524209 m, KG 6.632273425 m, TCG −0.147695948 m, FSM 309.61 t·m.
- All 37 booklet conditions replay. Seven include independent constituent-weight summation. Maximum trim residual 0.003513011 m; maximum moulded-draft residual 0.000837038 m. Live starboard worked example: 27 comparisons; maximum residual 0.000919723 m. Port replay uses printed port KN, not independent port-grid interpolation.
- Tolerances describe regression/source reproduction only, not physical accuracy or regulatory allowances. The apples fixture is regression evidence, not independent source validation; the fresh PDF comparisons and printed worked example provide separate checks.
- TypeScript/production build, lint and production hosting-resource checks pass. The existing large-chunk warning remains for the performance workplan.
- Production browser preview: Vectis coverage panel expands correctly; EN/RO labels; 390 px portrait document width remains 390 px. Desktop panel is compact and folded by default. No browser console errors observed. Pontoon capacity visibly returns 1,075 additional 2 t packages at the exact boundary; no cargo is added by planning.
- Original dev-origin loading plans were not edited. Preview recovery prompts were left intact. Test inputs were used only at the isolated preview origin.

## Restrictions carried forward with owners

These remain explicit supported-model boundaries, not fabricated data or completed later features:

- P04: finish onboard editing/panel-state UX and tank-specific source conventions. Tank CG/FSM uses upright tables; large-angle liquid redistribution is not solved.
- P10/P11: coupled heeled draft/trim paths and general port-side KN are unavailable; symmetry is a qualified estimate. No reconstructed-mesh volume conservation is claimed.
- P10/P11: final opening locations, annotated KG applicability, profile applicability, seasonal/freshwater limits and clause/amendment applicability still need the assessment-stage review. The working booklet is accepted as the project reference, not evidence of complete IMO compliance.
- P12: securing/strength applicability and load paths need their own completed workflow.
- Corrected apples weather X1/roll differences remain qualified; this stage does not force the workbook's 0.9 value into the solver.

P03 is accepted for the numerical-foundation gate described above. No known reproducible in-scope defect is deferred. This does not promise exhaustive testing of every possible loading condition or source-document accuracy. Next: **P04 — Complete the onboard condition workplan**.

## Reproduce

```sh
npm test
npm run build
npm run lint
node scripts/verify-hosting.mjs
node scripts/verify-p03-foundations.mjs
python3 scripts/verify-p03-source.py /absolute/path/to/004_STABILITY_LOADING_MANUAL.pdf
```

For fresh cross-curve/KG/flooding extraction, run the existing `extract-vectis-cross-curves.py` and `extract-vectis-assessment-data.py` into separate temporary directories and compare their JSON with the packaged files. Never rerun a source-writing extractor onto the reference directory merely to verify it. Python requires pypdf and pdfplumber.
