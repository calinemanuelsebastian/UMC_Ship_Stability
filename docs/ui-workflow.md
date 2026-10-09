# Workspace navigation

The primary workflow is Overview → Loading → 3D inspection → Assessment.

- Overview opens cargo planning, tank and ballast editing, and the 3D workspace, then directs users to assessment.
- Assessment groups stability/weather and trim/draft views. Existing `stability` and `trim` bookmarks remain valid.
- Hydrostatic Sandbox, Roll Simulation, Validation and Theory remain available through Supporting tools. Ship library remains in the application header.
- A shared summary shows the vessel, condition source, displacement, KG, water density and transverse FSM on every calculation page. Incomplete inputs display a dash and retain the existing condition-status message.
- Condition settings and Save and export are separate disclosure panels. Tank Save condition requests open the save panel and focus the scenario name as before.
- The 3D viewer links to Assessment rather than duplicating its full assessment panels. Its attitude controls, display settings and condition diagnostics remain in the viewer.

Navigation does not change solver inputs or saved-file formats. Existing URL page IDs are preserved. No overall compliance status is inferred by the new navigation or overview.
