# Calculated 3D attitude

The calculated-heel view consumes the shared corrected GZ result and the existing stable-root selector. For constant-LCB cross curves it also consumes the initial longitudinal trim result, including AP/FP reference drafts. These are the unheeled reference drafts, not end drafts at the displayed heel. Zero-trim cross-curve models retain their even-keel reference.

The reconstructed mesh retains initial pitch while rotating in heel about the midship reference water level. Its vertical translation retains that reference pivot. This is a visual composition, not a coupled hydrostatic solution or a displaced-volume calculation. The inspector labels initial quantities explicitly; heeled draft measurements remain disabled. The rectangular pontoon keeps its existing volume-preserving heel geometry.

The view adapter requests independent results concurrently. Existing shared caches reuse parsed tables and solver results across assessment and visualization; there is no per-frame hydrostatic computation. The view retains its vessel/condition guard against stale asynchronous results. Unsupported, ambiguous, or downflooding-blocked equilibria remain unavailable.

Transverse cargo movement selects calculated heel for vessels with supported cross curves. Without those resources it selects the upright reference.

Verification: production Vectis fixture compares viewer drafts and heel with the trim and GZ solvers, checks no additional resource fetches after those results exist, and rejects an unsupported port equilibrium. Pose tests cover initial pitch and the reference pivot at signed heel angles. Documented historical heeled-draft paths and dynamic motion are not part of this change.
