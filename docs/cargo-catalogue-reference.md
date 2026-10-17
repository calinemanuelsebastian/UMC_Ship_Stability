# Cargo type catalogue and source basis

The planner now separates boxes, pallets, small sacks, flexible bulk bags, bales,
drums, casks, rigid IBCs, rolls, flanged reels, coils, individual pipes and bundles.
Existing serialized family identifiers remain valid; historical geometry is never
silently replaced. `boxed` means boxes/cartons for new entries, but old pallet
entries can still retain that identifier and their original geometry.

## Reference review

User-supplied Thomas’ Stowage (2018), eighth edition, printed pages 13–18
(PDF pages 24–29) were visually inspected for flexible bags, bales, cases, drums
and IBCs. Bales explicitly have multiple possible shapes; IBC sizes depend on
customer requirements. Printed pages 71 and 73 (PDF pages 82 and 84) illustrate
coils and bundled steel. Fourth edition printed page 13 (PDF page 24) corroborates
variable bale shapes. No universal mass, SF or dimensions are assigned from these
package categories. The books and their illustrations are not redistributed.

Theory contains original short summaries with printed-page references. App
geometry conventions and limitations are distinguished from handling guidance.
Roll/reel cylinder envelopes are modelling choices, not dimensions extracted from
the steel-coil chapter. Orthographic illustrations use the same primitive mapping
as the planner. Hollow bores, flanges, flexible deformation, barrel bulges and
hexagonal bundle sections are not explicitly modelled.

## Dimension presets

- EPAL official load-carrier overview and product sheets:
  https://www.epal-pallets.org/eu-en/load-carriers/overview/
  EUR/EPAL 1, 2, 3, 6, EPAL 7 and CP1–CP9. Base dimensions only; loaded height,
  gross mass, shipment SF and load-bearing approval are not inferred.
- Greif 217 S 08 CS drum: NET0706C manufacturer packaging certificate,
  https://admin.net17025.com/files/certificates/certificate_296_120827133352.pdf
  Outside diameter 585 mm, height 880 mm. Manufacturer-specific example,
  not a universal 200 L drum or a declaration of current DG approval.
- FESCO container fleet specifications:
  https://www.fesco.com/en/assets/containers/
  20 ft standard, 40 ft standard and 40 ft high-cube external envelopes.
- FIBCA Design Guide v1.2, p.3:
  https://www.global-pak.com/Files/Admin/FIBC-design-guide-by-FIBCA.pdf
  Distinguishes circular, U-panel, four-panel and baffled construction. The app
  offers rounded or shape-retaining envelopes, not construction simulation.

All presets remain editable. Gross mass includes tare once. Changing package
shape does not establish stacking, securing or dunnage suitability. The capacity
handoff preserves selected geometry and dimension-source information; source
presets do not imply edited dimensions are still standardized.

## Verification

Focused tests cover every type/variant through capacity serialization and handoff,
legacy geometry preservation, invalid geometry rejection, the pallet preset range,
and editable dimensions with source retention. Browser checks cover EUR 6 preset
population, bulk-bag variants and Theory deep links / projection switching.
