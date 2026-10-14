# Back up and hand over a loading study

Local saving belongs to a browser profile and website origin (scheme, hostname and port). Local preview and the published website therefore have separate records. Clearing site data, browser eviction or losing the device can remove local copies. Keep downloaded backups outside the browser.

1. Save the working condition, including its voyage/stage metadata if applicable. Unsaved current inputs can also be exported individually.
2. In **Save and export → Saved scenarios → Voyage backup and transfer**, export saved conditions and voyages. This contains editable inputs, not trusted numerical verdicts.
3. Export the vessel's `.ship.json` from the ship library. Export custom cargo/assembly and support libraries from their respective template controls. Support presets and placed support members include their declared material properties. Keep these files together.
4. On another device/origin, import the ship package first. Import cargo/support libraries as needed, then choose the voyage backup. Review the condition count and add it. Existing saved conditions are retained; imported branches get fresh identifiers.
5. Load a saved condition and review the recalculated results. Missing resources, changed ship revisions and incomplete assumptions remain visible. File parsing is not operational approval.
6. Export a complete assessment report. Download its printable HTML and matching JSON. Open the HTML in a browser and use **Print → Save as PDF**. Both downloads reflect the same prepared snapshot. If you edit inputs, export again to prepare updated results.

Recovery drafts are a fallback, not a substitute for files. Wait for the saved indication before relying on local recovery. The initial 250 ms autosave interval, unavailable/quota-limited storage, browser eviction and device failure can still lose work. Page-hide fallback is best-effort. Recovery and saved-plan restores offer guarded undo; ordinary cargo undo/redo is scoped to cargo editing, not an unlimited cross-page journal.

Reports are readable offline once downloaded. The application itself does not guarantee offline startup; retain the vessel package for resource portability.
