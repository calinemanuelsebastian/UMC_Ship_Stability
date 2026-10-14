# Apples cargo and support assembly

Defined 10 October 2026 from the supplied DXF using the user-confirmed millimetre scale. This is the reference assembly for reconstructing the cargo plan. Its measured envelope is established; the physical timber schedule and ship-coordinate placement remain incomplete. Machine-readable definition: `validation-references/apples-support-assembly-v1.json`. Source evidence: [DXF review](audits/2026-10-10-dxf-arrangement.md).

## Repeated unit

One **two-tier bay** contains two palletised cargo units, one above the other, and references the support members serving them. The cargo footprint is 1.200 × 1.000 m; rotated instances swap its direction in the plan. The footprint does **not** include extra room for posts, bracing or ventilation. The bay origin is the centre of the lower pallet footprint at the local floor, with local u along the 1.2 m edge, v along the 1.0 m edge and w upwards.

| Part, bottom to top | Bottom above floor | Top above floor | Accounting |
|---|---:|---:|---|
| Lower pallet | 0.000 m | 0.144 m | Included in lower gross package |
| Lower cargo body | 0.144 m | 2.144 m | Included in lower gross package |
| Intermediate support zone | 2.144 m | 2.244 m | Envelope only; count actual timber members separately |
| Upper pallet | 2.244 m | 2.388 m | Included in upper gross package |
| Upper cargo body | 2.388 m | 4.388 m | Included in upper gross package |

The two packages each carry the workbook’s **1.000 t package mass estimate**, giving 2.000 t reference cargo per bay. Further formula tracing shows this comes from 2.4 m³ of cargo body divided by 2.4 m³/t stowage factor. Pallet and packaging tare inclusion is unresolved; the earlier gross-package description was too strong. If tare is already included, do not add it again; if excluded, add its measured mass and CG separately. See the [complete accounting audit](audits/2026-10-10-cargo-support-accounting.md). Package CG is deliberately unresolved: geometric mid-height is only a modelling assumption until the pallet/content mass distribution is specified.

The support zone is **not** a solid 1.2 × 1.0 × 0.1 m slab. Drawing its outline does not establish its filled volume, mass or capacity. The approximately 0.083 mm offset in the source detail is treated as drafting tolerance when assembling the nominal layers.

## Support assembly and load path

For an independent rack, the intended vertical load path is upper package → intermediate members → posts → ship supporting surface. The lower package must not become an assumed load-bearing support merely because the drawing places the intermediate zone against its top. Actual contacts and sufficient clearance must be resolved before declaring this an independent support system.

Use these member families:

| Family | Evidence available | Fields still required |
|---|---|---|
| Posts | 100 × 100 mm projected details; workbook uses 2.388 m post length | Which projection represents each post; full section; endpoints; quantity; shared posts |
| Intermediate members | 100 mm vertical zone above lower cargo | Section and span of each beam/board; quantity; bearing positions and contacts |
| Lateral blocking/bracing | 300 × 25 mm projected details | Physical role, third dimension, positions, connections and repeated/shared members |

The workbook's 2.388 m post length equals the **top of the upper pallet** in the nominal stack. A floor-to-under-support post would instead end at 2.144 m; a floor-to-support-top member at 2.244 m. These are alternative endpoint interpretations, not corrections to apply automatically. A 2.388 m upright could have an extension or different contact arrangement. Preserve the unresolved length until that arrangement is established.

Each actual timber member needs one physical ID, section width/depth, two endpoint coordinates, density, source evidence and contact IDs. Adjacent bays may reference the same member. Sum each physical ID once, even when it appears in several views or serves multiple packages. Do not infer four posts per pallet footprint.

For uniform straight rectangular members, volume = section area × length, mass = volume × density and member CG = endpoint midpoint. Assembly CG is the mass-weighted sum of member centres. The reference timber density is **0.55 t/m³**, inherited from the workbook and editable; it does not specify material strength. Missing member dimensions or quantities yield an unresolved support total, not zero.

## Repetition and vessel placement

The two main plans supply 1,688 bay footprints, each representing two packages: **3,376 packages** in total. Hold 1 contains 414 bays / 828 packages; Hold 2 contains 1,274 bays / 2,548 packages. These counts do not imply 1,688 separate racks. Extra example views are excluded.

Use a stable bay ID `bay-{view}-{DXF handle}` from the extracted footprint fixture. Rotate all package and support coordinates together. Ship placement must use an explicit surface mapping and rigid coordinate transform, `p_ship = R × p_local + origin_ship`. Confirm plan orientation, AP offset, centreline and surface elevation; do not use drawing Y as ship height or assume drawing X already measures LCG from AP. Shared-member IDs persist through grouping and rotation; intentional duplication creates new physical IDs.

Under the workbook's provisional floor elevations of 1.2 m and 7.2 m, the intermediate zone's geometric centre is respectively **3.394 m and 9.394 m above baseline**. Its local centre is 2.194 m. These values become timber CG only for a verified symmetric mass distribution in that zone; they are not the CG of posts, the entire rack or the cargo packages. The earlier M13/M28 concerns remain open; the numerical reference has not been silently altered.

## Reference integration and completion gates

The existing 188.1 t support allowance and its aggregate moments remain the numerical comparison basis. This assembly definition does not add mass to that fixture. When the timber schedule is resolved, create a new spatial reference revision that **replaces** the matching aggregate support rows with physical members. If any extra allowance remains, give it its own documented scope, mass and position. Never apply the old allowance automatically on top of the same modelled timber.

Before promoting the assembly into an importable plan:

1. Resolve the physical member schedule and shared ownership from all views; confirm post endpoints and actual contacts.
2. Map every bay to the appropriate ship surface and verify full cargo/support envelopes, headroom and overlap.
3. Establish package mass CG, then calculate support mass and moments from the member schedule.
4. Reconcile counts and differences from the aggregate reference; log old/new mass, LCG, TCG and VCG and recalculate dependent stability results.
5. Assess support and securing capacity separately using the applicable vessel documentation. Geometry alone supplies no capacity result.

This completes the assembly's data definition and accounting rules. It does not claim a completed timber bill of materials, an app implementation or structural verification.

## Agreed reference assumption — 10 October 2026

The user subsequently instructed that the 1 t package mass is to include pallet tare, while noting the original coursework did not explicitly establish that inclusion. This supersedes the unresolved tare-inclusion question above. Retain 3,376 t gross cargo and add no separate pallet mass. Package mass CG remains a modelling input; inclusion of tare does not establish its distribution. The timber is intended to support the upper apples independently, not to permit direct pallet-on-pallet loading. This intent does not yet resolve physical member quantities or capacity.
