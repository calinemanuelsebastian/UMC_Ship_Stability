# Rectangular Pontoon — operational model 1.1

The synthetic 100 × 20 × 8 m hull retains its original hydrostatic, signed KN, trim and roll resources. Upright table range remains 1–5 m; a planning height is not a loading or stability approval.

Operational loading uses `loading/operational-weights.json`: 4,000 t lightship at (50, 0, 4) m, with empty ballast tanks and no cargo. The original `loading/weights.json` remains an independent numerical reference, including its historical non-spatial cargo row; it is not the operational start.

The weather-deck planning surface spans x=0–100 m, y=−10–10 m at z=8 m. Its 10 m clear height is a display/planning envelope only. This pontoon has no tween-deck. Cargo mass and centres come from placed cargo and support structures.

Four illustrative ballast compartments are declared in `loading/tanks.json`, each 40 × 8 × 2 m (640 m³), bottom z=0 m, at x=5–45 or 55–95 m and y=−9–−1 or 1–9 m. These are training assumptions, not an actual ship design. Tank lightweight is included in the synthetic lightship, not added again.

For volume V, liquid depth is V/(L·B); liquid KG is bottom + depth/2. Transverse free-surface inertia of a slack box is L·B³/12, multiplied by liquid density for FSM. Empty and pressed-full tanks have no free surface. Liquid density is independent of surrounding-water density; volume cannot exceed compartment capacity. These tank centres are upright values. Longitudinal FSM remains the explicit shared-condition input.

Display polygons have normalized schematic coordinates, with bow to the right and port above. The liquid colour represents applied volume fraction, not liquid height or an inclined liquid surface.

Existing saved-condition model signatures exclude the new optional planning and operational-start resources, preserving compatibility with the unchanged coordinate system and calculation resources. Existing user cargo is not silently removed.
