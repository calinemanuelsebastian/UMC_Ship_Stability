# UMCsShipStabilityApp

Local React + TypeScript hydrostatics teaching simulator. Load a model package to explore upright hydrostatics, loading conditions, KN-based stability curves, small-angle free roll and reference-case validation. Solvers are selected by resource kind. The Theory tab explains the implemented calculations and their limits.

## Run locally

```sh
npm install
npm run dev
```

Open the Vite local URL (normally http://localhost:5173/). `npm run build` checks TypeScript and builds the app; `npm run lint` runs the existing linter.

## Add a built-in ship

1. Create a package under `public/built-in-ship-models/<model-id>/`.
2. Add `manifest.json` following the training package: metadata, units, coordinates, principal dimensions, default condition, and resources.
3. Add its manifest path to `public/built-in-ship-models/registry.json`.
4. Declare a `hydrostatics.upright-table` resource with a relative CSV path.

React contains no vessel-specific dimensions or formulas. The UI calls `computeUprightHydrostatics`; the solver registry dispatches by resource kind. Existing compatibility exports under `src/features/` forward to the canonical platform helpers.

## Upright CSV contract

The only required column is `draft`. Optional numeric columns are `displacementTonnes`, `volume`, `kb`, `lcb`, `tcb`, `bmTransverse`, `bmLongitudinal`, `kmTransverse`, `kmLongitudinal`, `waterplaneArea`, `transverseWaterplaneInertia`, `longitudinalWaterplaneInertia`, and `tonnesPerCentimetre`.

Use metres, tonnes, cubic metres, square metres, fourth-power metres for inertias, and t/cm for TPC. The current solver supports a positive-up vertical coordinate axis, degrees, and density in t/m³. Table displacement and TPC correspond to `manifest.defaultCondition.waterDensity`. Volume is preferred when supplied; otherwise it is derived from table displacement at that reference density. Output mass and TPC are adjusted to the calculation density. Model authors must ensure supplied mass and volume columns agree.

Comma, semicolon, and tab delimiters are detected. Decimal commas work with semicolon/tab delimiters or quoted cells. Use a single header row and one physical line per record; multiline quoted cells are rejected. Empty optional cells stay unavailable. Duplicate drafts, malformed numbers, and requests outside the table range produce errors. Missing TCB is not assumed to be zero.

The solver interpolates each available quantity linearly between adjacent drafts and calculates GM as KM minus VCG. It accepts zero heel and zero trim only. It supports upright draft from displacement, but does not solve list/trim equilibrium, angle-dependent free surfaces, large-angle stability, or roll motion.

## Synthetic sample and verification

Rectangular Pontoon uses an ideal rectangular prism solely to generate a CSV teaching fixture. Its 1–5 m draft range is sampled every 0.25 m. All dimensions and sample values live in the model package. No prism formulas run in the production solver.

At draft 3 m, VCG 5 m, and density 1.025 t/m³, expect displacement 6150 t, volume 6000 m³, KB 1.5 m, LCB 50 m, TCB 0 m, KMt 12.611111 m, GMt 7.611111 m, waterplane area 2000 m², and TPC 20.5 t/cm. Raising VCG by 1 m reduces both GM values by 1 m without changing displacement. Intermediate drafts interpolate the CSV values; nonlinear quantities may differ from the exact prism formula between rows.

Manual checks: change draft to 3.125 m (6406.25 t), change VCG, enter a draft outside 1–5 m, clear either input, and switch sections. The sandbox displays errors or pending states without retaining results for an earlier condition.

Only synthetic or sanitized data belongs in `public/`; these files are browser-accessible. Keep confidential vessel documentation outside public assets.


## Loading Condition

Select a model, open Loading Condition, and edit or add weights with mass (t) and LCG/VCG/TCG (m). Include lightship exactly once. All coordinates use the selected model's origin and positive directions. Totals use mass-weighted moments without intermediate rounding; empty fields, negative mass, non-finite values and zero total mass cannot produce a valid result.

The optional `loading.weights` manifest resource points to a JSON array of `{ id, name, massTonnes, lcg, vcg, tcg }`. IDs must be unique. With no resource, the editor starts empty. The training package supplies synthetic lightship/cargo data; the reviewed vessel source data stays in `validation-references/` and its declared package resources are included in production builds.

All calculation tabs use the selected condition source. Weight-based loading updates mass, physical centres and transverse FSM automatically after valid edits. Manual scenarios retain separate inputs; changing draft resolves displacement for every calculation tab. Water density is shared throughout. Changes settle after 300 ms; incomplete or invalid shared inputs hide results. Validation retains its fixed reference cases. Weight edits survive tab changes but reset on reload or model changes.

Run `npm run test:loading` for ten checks, including signed moments, zero/invalid masses, overflow and an independent constituent-weight reconstruction of the reviewed workbook's final condition. The workbook comparison permits 0.000001 m centre differences because the spreadsheet rounds subtotal moments whereas the solver retains precision.


## Displacement-to-draft lookup

In Hydrostatic Sandbox, choose Manual draft or Displacement / total weight. The selected input drives the calculation; switching to manual mode restores the manually entered draft. The calculated draft is displayed above the results. Loading transfers also preserve LCG and TCG in the condition, without treating them as proof of equilibrium.

The generic compute API accepts exactly one of `condition.draft` and `condition.displacementTonnes`. In displacement mode, volume is obtained from the table's volume column or from table mass divided by the package reference density. The target mass uses the calculation water density. The table solver then inverts this same piecewise-linear relation and evaluates all hydrostatic quantities at the resolved draft. The result's `draft` is the solved value; `result.condition` retains the requested input.

Inverse lookup requires every draft row to have usable volume or displacement, with volume strictly increasing by draft. Ambiguous, incomplete, and out-of-range tables/requests are rejected; no extrapolation occurs. Machine-precision differences at tabulated values are tolerated.

Run `npm run test:hydrostatics` for the loading-to-draft chain, round trips, density changes, boundary/invalid inputs, and the reviewed workbook's zero-trim lookup. At 9644.27 t that source table gives draft 5.8056640625 m and LCB 61.11826171875 m; this is distinct from the workbook's final trimmed condition.


## Initial transverse free-surface correction

Each loading weight may include `freeSurfaceMomentTransverse` in t·m. Omission means **assumed zero**, not a verified tank state. The editor exposes a column for the value; enter an explicitly zero correction for solid weights and the applicable density-weighted tank-table FSM for liquids. Empty, negative and non-finite entries are rejected. This version does not derive FSM from tank geometry or filling level.

`computeFreeSurfaceCorrection` calculates `freeSurfaceCorrectionTransverse = total FSM / displacementTonnes` and `virtualVcgTransverse = physical vcg + correction`. These results are displayed alongside physical centres. The correction assumes positive-up vertical coordinates.

The generic hydrostatic entry point applies the correction after the selected solver returns its actual displacement. It exposes `gmTransverseCorrected = gmTransverse - correction`, preserving the existing uncorrected GM, physical centre of gravity, table values, and longitudinal GM. FSM already includes the **tank liquid** density: do not multiply it by sea-water density again. A corrected non-positive GM produces a warning. Missing positive displacement leaves the correction unavailable; missing KM leaves corrected GM unavailable.

All calculation tabs use the selected condition source. Weight-based loading updates mass, physical centres and transverse FSM automatically after valid edits. Manual scenarios retain separate inputs; changing draft resolves displacement for every calculation tab. Water density is shared throughout. Changes settle after 300 ms; incomplete or invalid shared inputs hide results. Validation retains its fixed reference cases. Weight edits survive tab changes but reset on reload or model changes.

This is an initial transverse-GM calculation, not a GZ, tank-fill, longitudinal free-surface or regulatory-compliance calculation. Formula reference: [US Coast Guard NVIC 3-69](https://www.dco.uscg.mil/Portals/9/DCO%20Documents/5p/5ps/NVIC/1960s/n3-69.pdf), which expresses the GM reduction as free-surface moment divided by total displacement.

Run `npm run test:free-surface` for correction arithmetic, validation, transfer-chain checks and preservation of physical results. The reviewed workbook has FSM 309.61 t·m and displacement 9644.27 t, giving correction 0.032103000019700824 m. Its revised corrected GM is 1.0717721270289724 m; the latter validates correction arithmetic using its trimmed-table KM, not equivalence to the app's upright model. The private constituent-weight fixture now includes the workbook FSM entries as well.


## In-app Validation

Open Validation to run the selected model's fixed reference cases. Each case lists its input condition or weights, reference rationale, expected and calculated values, absolute difference and tolerance. Results rerun on entering the screen or using Run checks again. They are independent of loading-editor changes. Failed calculations and unavailable quantities fail the case; warnings remain visible alongside numerical comparisons. A passing numerical comparison is not a stability approval.

A model can declare `validation.reference-cases` pointing to JSON with `schemaVersion: "1.0.0"` and a nonempty `cases` array. Cases have unique `id`, `name`, `description`, `source`, `kind` and nonempty `expected` entries (`quantity`, `value`, non-negative absolute `tolerance`, `unit`). Kinds are `hydrostatics` with a complete condition, `loading` with weights, and `loading-hydrostatics` with weights and waterDensity. The training package provides sixteen independent synthetic cases, including three signed-GZ, three free-roll and four small-trim cases. No confidential workbook values are bundled into the browser.

Run `npm run test:validation` to check the sixteen package cases and failure handling. Loading, displacement lookup and free-surface test commands continue to cover private reviewed-workbook comparisons locally.


## Stability Curves

All calculation tabs use the selected condition source. Weight-based loading updates mass, physical centres and transverse FSM automatically after valid edits. Manual scenarios retain separate inputs; changing draft resolves displacement for every calculation tab. Water density is shared throughout. Changes settle after 300 ms; incomplete or invalid shared inputs hide results. Validation retains its fixed reference cases. Weight edits survive tab changes but reset on reload or model changes.

Declare a `stability.cross-curves` CSV resource with `config: { "trimDeg": 0, "heelPositive": "starboard", "knReference": "baseline" }`. Its required long-format columns are `volume,heelDeg,kn`, in m³, degrees and metres. Supply the same complete angle grid for each positive volume, including zero heel and at least one other angle. Duplicate pairs, missing/invalid numbers, inconsistent grids and angles beyond ±180° are rejected. The current coordinate convention requires baseline-referenced KG, positive-up Z and starboard-positive TCG and heel. KN values must carry the sign for their supplied heel; the solver does not mirror data.

`computeStabilityCurves` requires positive displacement and density with no simultaneous draft input. It converts mass to volume using the calculation density and interpolates KN linearly between neighbouring volumes at each supplied angle. It rejects extrapolation and nonzero trim. Straight chart segments join samples; no extrema, areas, equilibrium angles or regulatory criteria are inferred.

The signed lever is `GZ = KN − KG sin(θ) − TCG cos(θ)`. The corrected curve subtracts `(FSM / displacement) sin(θ)` while preserving physical KG and raw GZ. This constant-FSM virtual-KG correction is an approximation; angle-dependent liquid shifting and downflooding are not calculated. Reference: [US Naval Academy EN400 equations and conversions](https://www.usna.edu/NAOE/_files/documents/Courses/EN400/EN400_Equations_and_Conversions_AY25.pdf). Positive TCG reduces GZ at zero heel; port and starboard curves need not be mirror images.

The training package has 697 KN samples at 17 volumes (2000–10000 m³) and 41 signed angles (−90° to +90°). They represent a **sealed, watertight rectangular prism**, including its closed deck, without openings or downflooding. The offline generator `src/core/stability/reference/generate-prism-cross-curves.py` clips the rotated section at constant immersed area and evaluates its buoyancy centroid. It reads dimensions from the manifest; hull formulas do not run in the production solver. Regenerate with:

```sh
python3 src/core/stability/reference/generate-prism-cross-curves.py public/built-in-ship-models/training-pontoon-100x20/manifest.json public/built-in-ship-models/training-pontoon-100x20/stability/cross-curves.csv
```

Run `npm run test:stability` for ten checks covering independent small-angle wall-sided and 90° references, KN interpolation, signed TCG, free-surface correction, density, table boundaries and invalid data/configuration. The real workbook's trimmed KN data is not used as an upright cross-curve reference or exposed in public assets.


## Roll Simulation

All calculation tabs use the selected condition source. Weight-based loading updates mass, physical centres and transverse FSM automatically after valid edits. Manual scenarios retain separate inputs; changing draft resolves displacement for every calculation tab. Water density is shared throughout. Changes settle after 300 ms; incomplete or invalid shared inputs hide results. Validation retains its fixed reference cases. Weight edits survive tab changes but reset on reload or model changes.

The generic `computeRollSimulation` entry point obtains corrected transverse GM through the existing resource-selected upright hydrostatic solver. Its pure `computeFreeRoll` calculation uses `φ″ + 2ζωₙφ′ + ωₙ²φ = 0`, with `ωₙ = sqrt(g × GMcorrected) / k`, standard gravity 9.80665 m/s² and `φ′(0) = 0`. Effective radius `k` satisfies `k² = (Ixx + A44) / mass` and includes added roll inertia. Natural period is `2π/ωₙ`; damped period is `2π / (ωₙ sqrt(1−ζ²))`. Displacement cancels from the normalized equation through the supplied effective radius; weight centres alone do not determine inertia.

The response uses the exact underdamped solution, including zero damping. The chart samples at least 80 points per natural period, with 601–12001 samples; requests exceeding that resolution limit are rejected. The table displays a smaller set of samples including the final point. Positive heel is starboard. References: [USNA roll-period laboratory](https://www.usna.edu/NAOE/_files/documents/Courses/EN400/Slides_and_Labs_Update_Su2025/EN400_Lab_9.pdf) and [MIT damped harmonic oscillators](https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/resources/mit18_03scf11_s13_2text/).

An optional embedded `roll.linear-parameters` resource supplies `config.effectiveRadiusOfGyration` (m) and `config.dampingRatio` (dimensionless). Without it the inputs start empty. The synthetic training package assumes 7 m and 0.05 for teaching; these are not measured values and do not automatically change with the loading condition. Its resource description is displayed next to the inputs. The user must supply appropriate inertia and damping for other conditions.

This first version requires positive corrected GM, TCG exactly zero, zero heel/trim in the hydrostatic reference, damping `0 ≤ ζ < 1`, duration up to 600 seconds and initial heel within ±5°. The angle limit is a teaching guardrail, not a vessel-specific validity certification. It does not solve listed equilibrium, waves, nonlinear damping, angle-dependent free surfaces, large-angle GZ dynamics or capsize. Free-surface correction is included once in GM; the physical VCG is preserved.

Run `npm run test:roll` for eight checks: exact undamped response, damping decay, energy conservation/dissipation, signed/zero initial conditions, period scaling, invalid inputs/resolution limits, the loading-to-GM-to-period chain and unsupported conditions.


## Theory guide

The Theory tab covers the selected model's coordinate conventions and units, the loading-to-results workflow, upright hydrostatics, mass moments, free-surface correction, signed GZ and linear free roll. Each calculation topic includes a short exercise and a button to open its simulator screen without changing inputs. Topic links navigate within the guide. Formula references link to USNA, US Coast Guard and MIT teaching material.

The guide distinguishes implemented calculations from assumptions and omitted effects, and explains the difference between in-app reference cases and local GZ/roll tests. It displays package metadata without introducing a separate calculation engine or ship-specific numerical examples.


### Curve and roll validation cases

The existing schema version 1.0.0 now also accepts `kind: "stability"` and `kind: "roll"`, each with a complete displacement-based `condition` (no draft). Roll cases additionally provide `inputs` with `effectiveRadiusOfGyration`, `dampingRatio`, `initialHeelDeg` and `durationSeconds`, matching the Roll Simulation API.

For `kn`, `gz` and `gzCorrected` expectations, supply `heelDeg` to select an exact signed cross-curve sample. For `heelDeg` and `angularVelocityDegPerSecond` expectations, supply `timeSeconds` to select a generated roll sample. Period expectations use `naturalPeriodSeconds` or `dampedPeriodSeconds` without a selector. Duplicate quantity/selector pairs and inappropriate or missing selectors are rejected. No interpolation is added by validation: absent samples fail as unavailable. Roll times match only within floating-point roundoff; use zero or the simulation duration for references independent of the sampling grid.

The added synthetic references use independent wall-sided formulas at ±1°, closed-prism geometry at ±90°, signed TCG and constant-FSM arithmetic, and analytical undamped/damped return after one cycle. They call the same generic computation APIs used by the feature screens. Expected values are fixed in the model package, not generated by the production solver at runtime. Reference inputs, rationale, absolute tolerances and calculation warnings remain visible per case. The six earlier loading/hydrostatic references remain unchanged.


## English / Romanian interface

Use the compact EN / RO dropdown in the header. The selected language is stored locally as `umc-language` and restored on reload; English is the default. If browser storage is blocked, the switch still works for the current session. The document language and title update, and the dropdown exposes its selected state to assistive technology.

React context translates labels, teaching text, chart descriptions, validation case names/descriptions and known solver messages at display time. Language changes preserve loading edits, the active tab and calculation results. The calculation core, CSV/JSON data, identifiers, user-entered weight names, mathematical symbols and units remain unchanged. Result tables use the selected number locale; numeric inputs and raw reference JSON retain their existing parsing and representation.

Original reference rationale and external source documents remain in their source language; the validation rationale is explicitly marked English. Package names and unknown third-party text retain their original spelling rather than being automatically translated. Add translations to `src/app/romanian.ts` when adding new interface text, and preserve variable data in message patterns in `language-context.ts`. Run `npm run test:language` for rendering, translation, saved selection and storage-failure checks.


## Reference-system display adapter

Expand Reference system in the header beside the EN / RO dropdown. Model source is the default. Custom supports a longitudinal origin offset (entered in source-model metres), independently chosen x/y/z directions, heel sign and trim sign. The baseline and centreline remain fixed; unit conversion is not included. Settings survive tab/language changes and reset when changing models or reloading. Invalid origin edits retain the last valid settings and show an error.

Loading-coordinate and KG/TCG inputs convert back into source coordinates before calculations. Displayed loading centres and moments, hydrostatic KB/LCB/TCB/KM and virtual VCG follow the chosen reference. Mass, GM and FSC remain physical quantities. Transformation is `x_display = sign × (x_source − originOffset)` with the inverse applied on input; moment translation is `M_display = sign × (M_source − mass × originOffset)`. Y and Z support direction reversal only.

GZ/KN and heel signs reverse together when heel is positive to port; points are reordered for plotting. Roll heel and angular velocity follow the same selected heel direction, with the initial input converted before solving. Trim sign is recorded and explained, but current solvers support only zero trim. Nautical/coordinate notation changes relevant input and result labels (LCG/xG, TCG/yG, KG/zG, KB/zB and KM/zM); theory equations, source metadata and fixed validation cases retain their declared conventions. This is a display adapter, not a conversion of package files or a new solver.

The UK preset uses forward-of-AP longitudinal coordinates and nautical symbols from Barrass & Derrett, sixth consolidated edition (2006), chapter 48, pp. 394–402. The Russian preset uses Sizov, *Theory of the Ship* (2003), §1.1, p. 8: amidships origin, x forward, y starboard, z up. These are specific textbook conventions, not national standards. Both retain app angle signs (heel starboard, trim bow); UK transverse direction is an app convention. Coordinate notation is the existing app notation, not a complete transcription of Sizov's symbols. Sources are linked in the settings.

Models must declare `coordinateSystem.longitudinalOriginFromAP` (metres forward of AP) for UK and `coordinateSystem.amidshipsX` (midship position in source x coordinates) for Russian. Missing or invalid metadata disables the respective preset rather than interpreting a free-text origin. The synthetic training model supplies 0 and 50 m respectively. Selecting Custom retains the current preset for adjustment. Existing table, GZ and roll methods remain independent of the reference selection.

Run `npm run test:reference` for axis/origin round trips, source-axis handling, moment/centre consistency, preservation of GM, coordinate notation, input/chart rendering and invalid numbers.

The reference dropdown includes an illustrative top/side-view SVG diagram. Its origin follows the selected longitudinal datum, and its x/y/z arrows follow the selected directions. Explicit AP metadata locates the origin; absent metadata is labelled schematic and origins outside AP–FP are marked off-scale. Labels follow EN/RO. Hull outlines are illustrative, not vessel geometry.

## Trim and longitudinal equilibrium

Open **Trim & Drafts**, or choose **Calculate trim from this loading** in Loading Condition. Shared mass and centres are editable; changes also reach the other tabs. Water density and longitudinal FSM are shared with the estimated-trim 3D view and persist across tab changes. Zero longitudinal FSM explicitly assumes no longitudinal correction; transverse FSM is never reused as longitudinal FSM. Trim results do not feed into the upright GZ or roll calculations.

`computeTrimEquilibrium` requires a `trim.linear-equilibrium` resource with `config.maxTrimDeg` in (0, 1], source-coordinate LCB/LCF, KMl, an explicit `coordinateSystem.longitudinalOriginFromAP`, positive LBP/depth and positive displacement without a draft input. The table parser now supports optional `lcf` and exposes its draft range. The synthetic pontoon supplies LCF = 50 m at every draft by waterplane symmetry. Missing LCF does not affect older upright calculations, but prevents trim estimation.

The calculation inverts displacement to even-keel draft T0, interpolates LCB, LCF and KMl, then uses corrected GM_L = KMl − physical KG − FSM_L/Δ and MCT1cm = Δ GM_L / (100 LBP). With coordinates positive forward, slope = (LCG − LCB)/GM_L; bow-positive trim = slope LBP; T_AP = T0 − slope LCF_AP; T_FP = T0 + slope (LBP − LCF_AP). Display trim and moment signs follow the chosen reference. The arithmetic mean of end drafts is reported separately from T0. Source: [Barrass & Derrett, sixth consolidated edition (2006), chapter 16, pp. 146–149](https://home.hvl.no/ansatte/gste/ftp/MAS124_Intro_Marinteknikk/Litteratur/Kompendier_Books/ShipStabMastersMates.pdf#page=161).

This is a first-order estimate around even keel, not a nonlinear hull equilibrium solution. TCG and initial heel/trim must be zero; corrected transverse and longitudinal GM must be positive. Calculated trim must stay within the declared limit and both end drafts within the table range and between baseline and moulded depth. The 1° ceiling is an app guardrail, not a general error bound. Hull-form corrections, list equilibrium, hull deflection, draft-mark offsets and angle-dependent liquid shifts are excluded.

`npm run test:trim` covers independent pontoon balance, a published weight-shift example, an off-centre LCF, coordinate/datum invariance, density, distinct free-surface corrections and invalid or unsupported conditions. Validation adds four fixed synthetic cases (`kind: "trim"`, displacement-based `condition`, `inputs.freeSurfaceMomentLongitudinal`): even keel, bow trim, stern trim and longitudinal FSM. Their expected values use the analytical rectangular-waterplane formula rather than the production solver.

## 3D visualization

**3D View** loads Three.js on demand. The first supported geometry resource is `visualization.box-hull`, explicitly declaring a rectangular hull spanning AP–FP (LBP), full beam about centreline and baseline–moulded-depth. No arbitrary vessel is silently replaced by a box. The pontoon mesh is generated from those dimensions with real proportions; it is a display asset, not an input to the hydrostatic solver. Future models can supply a GLB mesh with documented units/origin/orientation, or a mesh generated offline from hull sections. GLB/section loaders are not implemented in this milestone.

The view uses shared displacement and physical G. Upright mode uses the default model density and the displacement-derived even-keel draft. Estimated-trim mode uses the same density and longitudinal FSM as Trim & Drafts and the existing trim calculation. Neither mode consumes manual sandbox draft edits. Unsupported inputs show the calculation error without a stale hull. Camera orbit, pan, zoom, side/top/bow/reset views, water/axes/transparency toggles and selectable G are available; numerical G inspection and camera buttons are keyboard accessible. Reference profiles move the origin/arrows and change displayed G coordinates without moving the physical hull or G. Off-scene custom origins have their axes hidden with an explanation.

The display maps nautical source coordinates into a Three.js body frame (X forward, Y up, Z starboard). The hull pitches by minus atan((T_FP − T_AP)/LBP), with heave chosen so both reported end waterlines meet world water level Y=0. This depicts the small-trim solution; it does not calculate a trimmed buoyancy centre or additional hydrostatics. No B/F markers, weight dragging or roll animation are included yet. Geometry, material, texture, control and renderer resources are disposed when leaving the tab. Rendering occurs on interaction/data/resize, without a continuous animation loop; device pixel ratio is capped at 2. WebGL failure leaves numerical results available and offers retry.

`npm run test:3d` verifies source-frame conversion, reference invariance, pitch sign and waterline alignment, and rejects missing/invalid geometry. Library references: [Three.js OrbitControls](https://threejs.org/docs/pages/OrbitControls.html), [cleanup](https://threejs.org/manual/en/cleanup.html); planned mesh support: [GLTFLoader](https://threejs.org/docs/pages/GLTFLoader.html).

The 3D display includes AP/FP baseline-to-waterline dimension markers labelled with actual calculated drafts and a separate FP−AP difference. True scale is default; optional ×5/×10 multiplies the visual pitch angle about the mean end draft, recomputing only the displayed waterline. An amber notice distinguishes amplified geometry from numerical labels. Factors that would move the waterline outside the rectangular hull are disabled; changed conditions fall back to true scale when needed. Appearance sliders adjust axis length, shaft/head thickness, label size and waterline pixel width, with Reset appearance. These settings affect only the current viewer instance.

### Interactive longitudinal weight movement

In weight-based mode, 3D View shows labelled purple markers at the loading items’ physical centres. Select a marker or use the accessible weight selector, then edit LCG in the active reference system or move the AP-to-FP slider. This updates the existing loading rows and automatically selects Estimated trim; mass and transverse/vertical coordinates are preserved. Marker sizes are symbolic. Unsupported trim conditions hide the scene and leave movement controls available for correction.

Undo retains up to 100 movement actions across tabs and display modes during the model session. A pointer drag or focused numerical edit is grouped into one action. Reset selected position restores that coordinate before its first 3D edit. Reloading or changing models resets history. Stale undo entries do not overwrite values edited independently in Loading Condition. The camera and appearance survive recalculation within the view. Transverse and vertical movement handles and a static heel-equilibrium solver are not implemented yet.

### Static heel equilibrium

Stability Curves now classifies interior zero crossings of the piecewise-linear corrected GZ curve. Negative-to-positive crossings are locally stable, positive-to-negative crossings unstable, and tangent sampled zeros one-sided/indeterminate. Flat near-zero segments are reported as neutral intervals of the interpolated curve; their presence prevents automatic selection of a unique attitude. A single attitude is returned only when exactly one stable crossing is found. Curve boundaries are not classified and no extrapolation is performed. This is an interpolation estimate, not a new hydrostatic solver or regulatory assessment; sampling can miss additional roots between samples.

In 3D View, transverse weight movement selects **Static heel (zero trim)**. The physical TCG remains signed in source coordinates; display angles and numerical inputs follow the selected reference. Undo/reset supports either movement axis. The declared box hull rotates to the equilibrium heel and solves its submerged rectangular section area to preserve displacement; the waterline is its intersection with the horizontal sea plane. AP/FP draft rulers and trim exaggeration are disabled in this mode. Longitudinal movement still selects trim-only mode. Coupled heel/trim, external heeling moments, downflooding and dynamic trajectories are not calculated.

Background: [MCA Stability Examination Syllabus](https://www.gov.uk/government/publications/master-yacht-written-examination-syllabuses/stability-examination-syllabus) describes the alignment of buoyancy and gravity at list equilibrium and oscillation about that angle. Local stability here is classified from the signed restoring-lever curve. The existing constant-FSM virtual-KG approximation applies once, and may not represent real tank behaviour at large heel.

### Didactical large-angle mode

Choose **Didactical mode** in the 3D displayed-condition selector. Heel spans −90° to +90°; trim spans −45° to +45°, one axis at a time, with sliders, angle presets and reset. Display signs follow the active reference system. These are imposed geometric attitudes, explicitly labelled above the scene; they never overwrite weights or equilibrium results. The existing sealed rectangular hull conserves displaced volume using section clipping at each angle, including deck immersion. No small-angle equilibrium formula is extrapolated. The mode does not simulate flooding, openings, waves, dynamic motion or coupled heel/trim. Returning to a calculated mode restores its solver and restrictions.

### Consolidation — first pass

Longitudinal FSM is validated by the trim calculation rather than blocking unrelated GZ, upright, roll and heel calculations. Movement history is owned by the model session and covered by regression tests. Neutral intervals and one-sided equilibrium roots are distinguished. Run `npm test` for the full automated suite. Scenario persistence, the 3D workspace redesign, resource caching and translation-key cleanup remain separate consolidation work.

### Saved scenarios

Expand **Saved scenarios** above the condition controls. Save a named snapshot, select and load it later, delete a saved snapshot, or export/import JSON. Each save creates a new entry; existing entries are not silently overwritten. The library persists in this browser's local storage for this model (up to 100 entries). Current unsaved edits are not automatically saved. Import loads inputs without automatically adding them to the library; use Save new scenario to retain an import. Undo scenario load restores the inputs immediately preceding the latest load/import.

Snapshots contain both weight-based and manual inputs, selected source and calculation basis, water density and longitudinal FSM. Coordinates remain in model-source conventions. Presentation settings and cached calculation results are excluded. Loading resets movement history and the 3D session and recalculates results. Incomplete drafts can be saved and restored for later editing; saving is not validation of an equilibrium.

Versioned imports are bounded, schema-checked and matched against the model ID, units, coordinates, dimensions and declared resources. Changed resource file contents are not fingerprinted; calculations always use the current model data. Files over 1 MB are rejected. Storage access/quota failures are reported; exporting remains available. Clearing browser data removes local saves, so export files for durable backups.

### 3D workspace layout

The 3D viewport and camera controls lead the workspace. On wide screens, movement/teaching controls sit in a side inspector; on narrow screens the inspector follows the viewport, before the result summary. Shared condition settings are initially collapsed on the 3D tab. Display settings contain visibility toggles, the legend, exaggeration and appearance controls; movement, teaching and camera guidance are expandable. Unselected weights use numbered labels by default; the selected marker shows its full name. Enable All weight labels in Display settings to restore every name. Teaching-mode camera defaults and the imposed-attitude overlay are retained.

## Reviewed Excel scenario comparison

Run `npm run compare:excel` to extract the reviewed workbook’s current saved values and compare 47 constituent weights through the application’s loading and upright lookup functions. Requires Python 3 (override with `PYTHON=/path/to/python3`). The command writes `validation-references/excel-simulator-comparison.md` and a full-precision JSON report, and fails on numerical or fixture mismatches. The workbook is read only.

The report separates 13 simulator comparisons from two arithmetic checks using Excel’s trimmed KM. It records source cells, formulas, tolerances and the workbook hash. Final trim, endpoint drafts and actual off-centre GZ are not validated by this scenario; the report explains the data and solver gaps. All reviewed vessel data remains outside `public/`.

## Trimmed-table interpolation

In **Trim & Drafts**, select **Trimmed-table interpolation** and import a JSON table for the selected vessel. The imported data remains in memory across method/tab changes; it is not included in saved loading scenarios or retained after reload. The selected shared displacement, LCG and density drive the calculation. Results are separate from the existing linear trim and 3D solvers.

`src/core/trim/trimmed-table.ts` first interpolates each table at the requested displacement, then finds a unique adjacent pair bracketing LCB = LCG. No extrapolation or bridging over a table without displacement coverage is allowed. Multiple roots and flat balanced intervals are rejected. This is the reviewed workbook's longitudinal table-balance approximation, not a coupled finite-angle equilibrium solver. Nonzero TCG receives an explicit reference-only warning; longitudinal FSM must be zero. KG projection and liquid redistribution are not included. The [MCA stability booklet](https://assets.publishing.service.gov.uk/government/uploads/system/uploads/attachment_data/file/819597/MSF2231-_SIB_motor_Feb_17.pdf) provides background on hydrostatic interpolation and longitudinal loading; it does not certify this implementation.

JSON fields:

- `version`: 1; `modelId`: exact selected model ID; `source`: table provenance.
- `waterDensity`: source density in t/m³, matching the selected calculation density.
- `xPositive`: `forward` or `aft`; `longitudinalOriginFromAP`: metres forward of AP. Both must match the model's source coordinates. All lengths are metres and masses tonnes.
- `trimPositive`: `bow`, meaning signed trim = draft at FP minus draft at AP. Convert source trim signs before import.
- Optional `draftDatumFromAP`: the explicit longitudinal position of the tabulated draft, in metres forward of AP. Omit if unconfirmed; end drafts then remain unavailable. An LCF column alone does not declare the draft datum.
- `tables`: at least two tables in strictly increasing `trimMetres` order. Each has at least two `rows`, strictly increasing in displacement and draft. Every row has `displacementTonnes`, `draft`, `lcb`, and optional `lcf` (source x coordinates). Maximum import size: 1 MB.

The private regression fixture `validation-references/reviewed-trimmed-table.json` contains the reviewed Excel -1.5 m and -1 m source brackets. Its vessel ID intentionally differs from the training pontoon; a matching vessel package is still required to use it in the browser. The regression reproduces the reviewed -1.2610239253 m trim and 5.7675477464 m tabulated draft, with no assumed draft datum or claim about actual heeled attitude. These results extend the earlier comparison report's coverage; end drafts and coupled stability remain unresolved.

## Local reviewed Excel vessel

In the local development app, select **Vectis Castle - Apples**. Loading Condition starts with 47 reviewed constituent weights, and Trim & Drafts automatically loads the matching nonzero-trim tables. Validation includes a reviewed loading check. Model files are in `validation-references/reviewed-apples-vessel/`; Vite serves only five explicitly allowed data files at `/local-reviewed-vessel/`. The model is excluded from the production registry and build. The development server should remain bound to localhost for local-only access.

LBP is 121.7 m and beam 17.4 m, traced to the workbook in the package README. Moulded depth, draft datum, hull geometry, and compatible GZ/roll resources remain absent. Table trim retains its longitudinal-reference limitation for nonzero TCG. It follows displacement inputs independently of the narrower upright-table range. Imported override tables are session-only; packaged tables reload automatically.

## Cargo Plans

The Cargo Plans tab combines the loading editor with a local named-plan library in IndexedDB (`umc-cargo-plans`). Users can create a plan containing only the vessel's fixed weights, save a new named plan, explicitly update a selected plan, preview/apply it, undo application, delete a named plan, and import/export JSON backups. Imported plans replace the current loading rather than appending weights. They require a matching model definition and unaltered fixed weights. Import is limited to 1 MB and 1,000 rows. Fixed items are declared by `loading.weights.config.fixedWeightIds`; the app preserves their package values during editor, scenario and 3D updates.

Cargo rows have an optional category, hold/location and number of units. Mass remains the total row mass; quantity does not multiply it. Hold labels are descriptive and do not infer centres, check geometry or certify capacity. All coordinates stay in model-source conventions when saved. Existing scenario JSON retains these metadata fields too.

A recovery draft is saved after 700 ms without edits once storage is available. On revisiting a vessel or reloading, users review/apply or discard that draft before it can be overwritten. Blank numeric fields can be preserved; malformed values are reported. Named plans are changed only by the save/update controls. Storage failures leave editing and JSON export available. Applying a cargo plan selects weight-based loading and resets manual inputs; Undo restores the preceding state.

Storage is per browser and origin, without an account or server. Backups are needed for transfer to another device or website address and before clearing browser data. Multiple tabs do not merge simultaneous edits; the last completed draft write wins. Vessel packages themselves are not embedded in cargo-plan backups. The reviewed Vectis Castle package is included in production builds.

CSV/Excel mapping, spatial hold planning, tank fill-volume conversion and capacity/deck-load checks remain later features.

## 2D cargo planner

Cargo Plans now includes a single-area rectangular footprint planner. Define a rectangular boundary in model-source x/y coordinates and deck elevation, enter cargo dimensions and total row mass, then drag the rectangle button onto the plan (or click to add at its centre). The declared rectangular pontoon deck supplies an initial area; Vectis Castle requires a user-defined area until hold contours are verified. SVG axes are explicitly labelled in source conventions; selected numeric centre inputs follow the reference-system selector.

Move placed cargo by pointer drag, 0.1 m arrow-key steps, or numeric coordinates. Rotate by 90 degrees, duplicate, remove, zoom around a selection, and undo the most recent layout action while the weight list still matches that action. Assigning a footprint to an existing variable row preserves its mass and centres. New rows use KG = deck elevation + half height, a labelled uniform-load assumption. Changing a footprint preserves an existing row's KG; check or edit KG separately. Rows without footprints still contribute to loading and are counted visibly.

Bounds and positive-area footprint overlaps are flagged (touching edges are allowed); invalid placements are retained for correction. This first version does not infer stacking, clearances, deck strength or securing. Changing the area does not relocate existing cargo; deck mismatches are flagged. Cargo-area and footprint metadata persist through named cargo plans, recovery drafts, JSON backups and saved scenarios. Older plans remain readable without layout fields. No fabricated Vectis Castle hold outline is provided.


## Production ship packaging

The Vectis Castle development endpoint and production copy step use the files declared in its manifest, plus the explicit geometry JSON and hull-curves SVG supplements. External glTF buffers and images are included; embedded data URIs need no separate file. Unrelated source documents are not copied.

`npm run build` validates every built-in registry package after copying assets and fails if a declared resource or external glTF dependency is missing. Resource paths must stay inside their package. The packaging regression tests run with `npm test` or `node --test src/app/production-packaging.test.mjs`.

## Hosting on GitHub Pages

Use Node 24 (`.nvmrc`) and `npm ci`. The workflow in `.github/workflows/pages.yml` runs lint, tests and the production build. Pull requests and non-default branches are checked without publishing. Successful pushes to the repository's default branch deploy only `dist` to the `github-pages` environment. Manual runs on the default branch also deploy.

One-time setup: upload the project to the chosen GitHub repository, then choose **Settings → Pages → Build and deployment → Source: GitHub Actions**. If the first run precedes this setting, rerun it afterwards. No personal access token is required by the workflow. The destination URL is reported by the deployment job.

The workflow obtains the base path from GitHub Pages metadata, supporting repository URLs, account sites and configured custom domains. Local development remains at `/`. Navigation uses query parameters, so direct links and refreshes do not need a server-side route fallback. Do not add a blanket 404-to-index redirect for missing vessel resources.

To verify a repository-style path locally:

```sh
npm run build -- --base /hosting-check/
node scripts/verify-hosting.mjs dist /hosting-check/
npm run preview -- --base /hosting-check/
```

Open the preview at `/hosting-check/`. Restore the ordinary local preview with `npm run build`. Vite preview is for local testing; GitHub Pages serves the production files.

Cargo plans remain in browser storage. Export plans from localhost and import them at the published site; hosting does not migrate browser storage or add cloud accounts. The public build includes declared vessel datasets and models. The repository itself may contain additional reference material; choose its visibility and included source files deliberately before pushing.

## License

Original application code is licensed under GPL-3.0-only; see LICENSE. Third-party dependencies retain their own licenses. Referenced ship documents and third-party source material are not relicensed by this code license.
