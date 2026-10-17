# Usability consolidation baseline — 17 October 2026

Scope: stages 1–3. Baseline is beta.10 plus the uncommitted preset/navigation fixes. This is an engineering inventory and acceptance record, not evidence of uncoached student/professional usability testing.

## Function map and destination

| Existing surface | Functions preserved | Destination |
|---|---|---|
| Home | Workflow cards, current-condition overview | Overview |
| Condition settings | Ship selection, documented starting presets, empty/reference starting points, replacement undo | Start / open condition: choose ship, then Use a preset or Create a condition |
| Save/open | Named full input snapshots, imports, exports, voyage backups | Open saved condition entry; persistent Save & open utility |
| Loading plans | Layout-oriented saved plans, recovery, import/export | Save & open → Loading plans and recovery; existing deep links retained |
| Onboard | Fuel, service liquids, operational equipment and weights | Loading → Onboard condition (later consolidation stage) |
| Capacity | Package definition, allowance/limit controls, capacity handoff | Loading → Cargo capacity (later Cargo workspace integration) |
| Planner | Surfaces, placement, selection, pan, copy/paste, rotation, undo/redo, snap, templates, properties, identification | Loading → Cargo layout; viewport navigation stays beside drawing |
| Supports | Manual supports, layers/frames/gaps, automatic dunnage, materials | Planner → Add support (later usability stage) |
| Ballast and totals | Tank filling, ballast operations, all mass contributions | Loading → Ballast → Review totals |
| 3D | Calculated/teaching models, camera, appearance, item inspection, position results and qualifications | Inspect |
| Documented playback | Case selector, source trajectory/GZ, weight distribution, source arrangements | Learn → Explore documented simulations; read-only banner and return action |
| Assessment | Conclusions, GZ, wind/rolling, securing, report, detailed inputs | Assess |
| Trim | Longitudinal equilibrium and drafts | Assess → Trim & Drafts |
| Sandbox and roll | Standalone educational calculations | Advanced tools |
| Validation | Reference cases and comparison checks | Learn → Reference checks; Advanced tools shortcut retained |
| Theory | Hydrostatics, stability, cargo types and source explanations | Learn |
| Help/legal | Contextual instructions, examples, limitations, privacy, terms, licenses | Header/footer Help; legal footer |
| Ship library/reference/language | Model import/library, coordinate convention, EN/RO | Existing header tools retained |

## Findings and changes in this tranche

- Six competing navigation choices become five primary destinations: Overview, Loading, Inspect, Assess, Learn; specialist routes are in Advanced tools.
- Starting and studying were adjacent actions with different consequences. Starting has its own three-way entry; studying lives in Learn and never replaces the active plan.
- Presets formerly exposed inputs immediately. The entry now asks Use a preset / Create a condition / Open saved condition first.
- Selecting a preset only previews. Apply replaces active weights/tanks and recalculates; Undo preserves the prior condition transaction.
- Create explicitly means no cargo and empty tanks, retaining fixed ship weights. It requires an explicit creation action and is not described as a seagoing condition.
- Existing storage formats, keys, URL route IDs, formulas and source datasets remain unchanged.

## Repeatable acceptance script

Run for both Vectis Castle and Rectangular Pontoon, desktop and portrait:
1. Open Overview and each primary destination; use Advanced tools and browser navigation. Existing deep links must still resolve.
2. Start / open condition: choose ship; choose Use a preset. Selecting must not change current totals. Vectis lists documented starters; pontoon offers its available empty/reference starting points without fabricated source cases.
3. Apply one available starting condition; verify current mass/centres update; open calculated inspection; Undo returns the original totals.
4. Create a condition: read empty-tank explanation; no mutation before explicit Create; fixed weights remain after creation; Undo restores original.
5. Open saved condition must reveal and focus the existing saved-condition selector. Save/import/recovery formats and libraries remain accessible.
6. Vectis Learn → documented simulations: selector is scrolled into view and focused; source mode is explicit; current loading is unchanged. Return to calculations without reloading the ship.
7. Verify EN/RO labels and narrow-screen controls without horizontal overflow.

## Remaining stages (not claimed complete)

Persistent condition identity/save state; unified Loading tasks; Inspect/Assess simplification; comprehensive text/warning reduction; full workflow/performance/recovery acceptance; uncoached student and professional tests; release. The present change does not establish regulatory approval or numerical completeness.

## Verification performed for stages 1–3

- Production build, lint and diff whitespace checks passed.
- 26 navigation, language, preset and saved-scenario tests passed.
- Vectis: preview leaves active totals unchanged; Ballast departure apply and undo checked; saved-condition entry focuses the saved selector; Learn opens documented simulation with heading focus and scroll to the controls; return preserves current condition.
- Pontoon: create-empty and undo checked; preset list contains only the supplied original reference; no fabricated documented condition. At 390 × 844, document width remained 390 px.
- Browser acceptance used localhost:4242. Public beta.10 has not been changed by this tranche. No backups or storage schema migration performed.

## Stages 4–6: active context, Loading tasks, Inspect and Assess

- Active context identifies ship, working/preset/restored condition, and active calculation / manual override / teaching / documented playback. Playback hides the active-condition numerical strip and offers Return to active condition.
- Named save indicator tracks the current session only and compares the complete input revision after a successful named save. Subsequent edits show Changes since named save. Restores and preset replacement clear this session marker rather than claiming a saved match after normalization. Recovery drafts are not labelled named saves.
- Four primary Loading tasks: Onboard supplies, Cargo, Ballast, Review totals. Cargo contains Arrange cargo and Estimate capacity. Capacity remains optional; progression from Onboard supplies goes directly to layout. Existing section URLs continue to resolve.
- Onboard fuel, equipment/tween-deck and service liquids/crew/stores are grouped in task disclosures. Viewport Select/Pan/Undo controls are unchanged.
- Inspect opens with its properties inspector closed; selecting an item or entering Teaching opens the relevant inspector. Model selection remains available under Calculation options. Essential unavailable-result and geometry warnings remain visible.
- Assessment sorts failed, unresolved then passed checks, exposes required-action reasons for non-passing checks, and folds graphs into separate disclosures. GZ/wind/securing navigation opens the corresponding graph. Printable report remains the primary export; machine-readable export remains available under More export options.
- No formula, source dataset, limit or assessment verdict logic changed.

Validation: build and lint pass; 27 targeted loading-workflow, language, saved-scenario and assessment-conclusion tests pass. Browser checks confirm Cargo sub-navigation, Inspect initially closed properties, teaching-context changes and direct GZ link opening its disclosure. Uncoached usability acceptance remains outstanding.

Additional browser verification: a temporary named condition save showed Named copy saved; switching to manual inputs showed Manual calculation override and Changes since named save; returning to weight-based loading and deleting the temporary test save cleared the named-save indicator. The original loading inputs were restored. Pontoon Cargo layout at 390 × 844 had no document-width overflow. Test save was removed; no public deployment performed.
