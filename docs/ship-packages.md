# Local ship packages (version 1)

> Historical implementation notes below describe several successive versions. Claims that Vectis lacks cross curves are superseded by the final constant-LCB section and current manifest. See docs/audits/p01-baseline/acceptance-contract.md for current baseline and open qualifications.

Open **Ship library** in the header. Import a `.ship.json` file, review the dimensions, draft coverage, tanks and warnings, choose a library name, then **Save locally**. Saving does not switch the active vessel. Save the current loading condition before choosing **Use ship**.

Ships are stored in IndexedDB on the current browser and website origin. Clearing site data removes them; a different hostname or port has a separate library. Download packages as backups. No account or upload server is required. Library names can differ from canonical model names/IDs; those remain unchanged for calculation references and cargo-plan compatibility.

Use **Download training template** for a complete editable example or **Export current ship** for a built-in ship. All packages use open JSON, CSV and optional glTF 2.0 formats. A package contains:

```json
{
  "format": "umc-ship-package",
  "version": 1,
  "manifest": { "schemaVersion": "1.0.0", "...": "see training template" },
  "files": {
    "hydrostatics/upright-hydrostatics.csv": {"encoding": "utf8", "data": "CSV contents"},
    "loading/weights.json": {"encoding": "utf8", "data": "JSON contents"}
  }
}
```

The manifest declares each resource by ID, kind, path and optional configuration. Every declared path must exist in `files`. Binary assets use `encoding: "base64"`. The maximum file is 50 MB, with 200 embedded files and 100 resource declarations. Paths must be relative, without `..`. No remote model assets are accepted.

## Preparation

- Convert coordinates to AP / centreline / baseline, x forward, y starboard, z up. Use metres, tonnes, t/m³ and degrees. These restrictions apply to imported data; the display reference selector still works independently.
- Include an upright hydrostatic CSV and loading weights. Declare fixed lightship/equipment IDs explicitly. Operational weights may be a separate resource, as shown in the template.
- Tank filling tables and arrangement polygons belong in `loading.tank-catalog`; use the template for the tank and departure-preset schema. Arrange ballast polygons separately from tank capacity/CG tables. Pictures and PDFs are not automatically digitized.
- Define cargo surfaces in `loading.cargo-surfaces`. Deck-dependent surfaces use `config.byMode`; deck weights and panel placements use `config.deck` (see below). Vectis Castle now declares these values in its package.
- Optional glTF must be version 2, with no required compression extensions. Put binary and texture files next to or below the glTF file, using local relative references or embedded data URIs. Declare `visualization.schematic-cargo-hull` to enable the schematic display path. Coordinate/scale alignment must match the viewer's existing glTF contract; import does not infer geometry from photographs.
- Keep canonical model IDs and resource paths stable between revisions if saved conditions should remain compatible. Update the manifest version when the dataset changes.

Import checks data structure, resource references, table parsers, tank data, fixed-weight references and the default upright hydrostatic calculation. It does not certify accuracy, run every reference case or compute hydrostatics from the glTF mesh. Review source data and use the Validation page after importing. Browser storage can be unavailable or full; retain the source package.

Vectis Castle is now included in static production output as well as development. Only the simulator's selected model resources are copied, not the original project spreadsheets or document collection.

## Guided creation

Choose **Ship library → Create ship**. The three steps collect:

1. Name, stable model ID, dimensions, reference draft and the water density used by the source hydrostatic table. The operating density remains adjustable later.
2. Documented lightship mass and centres (including permanent equipment), plus optional rectangular cargo spaces with explicit limits, deck elevation and clear height.
3. Required upright hydrostatic CSV; optional tank-catalog JSON, cross-curve CSV, trimmed-table JSON and glTF with companion buffers/textures.

**Validate and review** builds the open package and uses the same checks as imported packages. Errors retain editor inputs for correction. Save the reviewed package locally, then download a backup. Unfinished editor input is held in memory only; closing the library or reloading discards it.

No table values are generated from hull dimensions. Use the training package for file schemas. Tank arrangements still need prepared polygons and filling tables; this editor does not yet trace drawings or edit individual tank rows. Cargo spaces in this editor are rectangular; prepared packages support richer boundaries. Without a glTF, display geometry is a generic schematic, never a calculated hull surface. glTF uses the viewer body frame (X forward, Y up, Z starboard, longitudinally centred at LBP/2), while numerical tables use AP coordinates. The file picker accepts companion assets at the same relative folder level; embedded glTF assets are also supported.


## Deck configurations and model groups

The `loading.cargo-surfaces` resource supports:

- `config.surfaces`: default cargo spaces, each using the existing CargoArea format (including optional regions, support regions and panel subdivisions).
- `config.byMode`: `installed`, `stored`, and legacy `ashore` arrays of CargoArea objects. Declare the full list for each mode, including hatch-top areas and storage exclusions.
- `config.deck.weights`: objects with a fixed weight `id` and `installed`, `stored`, `ashore` values, each containing `massTonnes`, `lcg`, `vcg`, `tcg`. IDs must be declared fixed in the loading model. Stored mass must equal installed mass; ashore mass must be zero.
- `config.deck.storedPanels`: `{id, x, y, z}` entries, where `id` names the glTF mesh node and coordinates locate its stored geometric centre in AP/starboard/baseline metres. Stored panel rendering is an approximation from the supplied positions, not a structural fit check.
- Optional `source`, `notes` and `storedLabel` within `deck` provide vessel-specific descriptions.

The glTF resource declares `exteriorGroup`, `panelGroup`, `waterlineMeshes`, and optional explicit `hatchSurfaces`. Named exterior/panel groups must exist; stored panel node IDs are checked. Without an exterior group the model root is treated as the exterior. Give panels a separate named group when deck placement is supported. Mesh vertices and transforms must follow the documented viewer frame; the renderer preserves original node positions when reinstalling panels.

The core contains no Vectis ID switch for deck weights, cargo-space grouping, hatch seams or storage positions. Review messages travel in optional manifest `reviewNotes` (`messages` and `resourceIds`). Existing Vectis cargo-plan signatures remain unchanged by this migration; fixed-weight checks use the selected ship's deck definition.

## Acceptance checks

The automated workflow exports and reimports the full Vectis package, compares all 68 tanks and their arrangements, changes liquid content/density, adds a cargo contribution, checks installed/stored totals and saved-plan validation, and compares default hydrostatic results. A renamed Vectis package and a separate synthetic two-level vessel verify that deck behaviour does not depend on a built-in name or weight ID. Browser checks cover local saving, fresh-page loading, ballast editing, hold-mode switching and the imported 3D model.

These checks establish portability of the implemented data workflow. They do not turn reconstructed geometry into surveyed hull offsets, validate every possible imported mesh, or remove the current restrictions on Vectis's 3D heel/trim simulation. The guided editor still creates simple rectangular cargo spaces; advanced deck arrangements must currently be prepared in the package.

## 3D trim display

**3D View → Displayed condition → Estimated trim** now uses a declared trimmed hydrostatic table, or the existing linear trim solver when no trim table is declared. It keeps each solver's range and free-surface restrictions. A nonzero TCG is explicitly identified as a longitudinal reference rather than a coupled attitude solution.

For a table with a confirmed draft datum, AP and FP measurements are shown. For Vectis's current table, the datum remains unconfirmed: the calculated trim angle is displayed, the model is positioned about its upright reference draft for illustration, and end-draft dimensions are hidden. This vertical placement is not a calculated draft distribution. The highlighted glTF waterline intersects the same sloping body-frame water plane used by the displayed attitude, including visual exaggeration.

The 3D calculation uses the table packaged with the ship. A temporary replacement imported only on the Trim & Drafts page is local to that page; package a revised table to use it throughout the simulator. Reconstructed geometry still does not supply hydrostatic calculations or enable heel/large-angle teaching.


## Reconstructed-model heel display

Choose **Imposed heel (visual only)** in the 3D displayed-condition selector. The view switches to Bow view. Use the signed −90°…90° slider, presets, or reset. The whole model (including cargo and panels) rotates about the longitudinal centreline at the upright reference water level. This is a rigid visual demonstration: no displaced-volume conservation, liquid redistribution, cargo shift or flooding calculation. End-draft dimensions are withheld. The reconstructed mesh waterline is intersected with the world water plane through the full signed angle range.

**Static heel (zero trim)** is enabled only when the package provides cross curves and supported display geometry. Its angle comes from the existing corrected-GZ equilibrium solver. For reconstructed hulls its vertical placement is still illustrative. Vectis currently lacks cross curves, so only imposed heel is available. The rectangular pontoon retains its existing volume-preserving section calculation. Reconstructed-model imposed trim remains unavailable.

## Calculated constant-LCB heel

Vectis's documented source is now registered as `stability.constant-lcb-cross-curves`, using the original JSON ordinates. Stability Curves uses the shared LCG to derive initial trim, interpolates displacement and initial trim, then computes GZ with physical KG, TCG and the virtual-KG transverse free-surface correction. Manual LCG is editable on that page. A solver-level explicit initial trim is reserved for reproducible reference validation.

Choose **Calculated heel (constant LCB)** in 3D for a supported, isolated starboard equilibrium. The view defaults to Bow view. Its pitch and vertical placement remain illustrative: the source supplies ordinates, not the heeled draft/trim path. Unbracketed trim, unsupported density and nonzero longitudinal FSM are rejected. Port equilibria and two-sided classification of a zero-degree boundary root are not inferred from starboard-only data. The worked-example validation report is in `validation-references/reviewed-apples-vessel/cross-curves-worked-example.json`; it records source inconsistencies and rounding differences.

### P11 optional numerical wind silhouette

A `stability.wind-profiles` JSON profile may include `baselineSilhouette` with a nonempty `source` and `rectangles: [{xMin,xMax,zMin,zMax}, ...]`. Coordinates are metres in **the same longitudinal/baseline convention as the cargo layout**. This is a documented complete lateral ship profile without cargo, not hull mesh bounds. Each rectangle must have finite increasing bounds. Supply an explicitly justified rectangle approximation and identify its source; do not convert the reconstructed visualization into purported verified geometry.

For linked loading conditions, the app projects cargo/support dimensions into the same plane, clips at moulded draught, and computes the union with the supplied ship profile. Overlap is counted once, including cargo hidden behind the baseline profile. Projected boxes are geometric envelopes, not aerodynamic drag models. The operator must confirm applicability (including enclosure/trim assumptions). Unplaced cargo without dimensions blocks this path. The existing draft-table coverage remains required. The sweep uses O(n log n) operations and allows up to 50,000 combined rectangles.

Without this optional profile, documented complete-condition wind tables remain usable, with explicit confirmation that the chosen profile includes the current exposed cargo. Vectis Castle's supplied area/moment tables do not contain a spatial baseline outline: the app therefore does not subtract guessed shielding or silently add cargo to those tables. Confirmation is tied to source profile and cargo geometry as well as the loading condition. A geometry change invalidates it even if mass and CG are unchanged.
