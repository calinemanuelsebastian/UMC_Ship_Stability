# Cargo identification and appearance

Open Loading → Cargo layout → select cargo → Properties → Identification and appearance.

## Supported identification schemes

- Internal unit ID: the application's existing unique ID, explicitly not an external standard.
- GS1 SSCC: 18-digit logistics-unit identifier, preserving leading zeros and validating the modulo-10 check digit. The diagram shows the (00) application identifier. This does not generate a barcode or confirm a licensed company prefix.
- ISO 6346/BIC freight container: three owner letters, category U, six serial digits and a modulo-11 check digit (remainder 10 maps to zero). J/Z equipment is not treated as a freight container. Check-digit validation does not verify registration.

Both external identifiers can coexist. Choosing a displayed scheme does not convert identifiers or generate an assigned number. External values must be unique within the condition. Copy/paste and Build next layer clear both external IDs while retaining the appearance settings. Batch appearance edits preserve each target's own identifiers.

## Independent layers

Identity; discharge destination with custom colour and plain/stripe/dot pattern; company text and image; handling notes and non-stackable indication; dangerous-goods text annotation. The visible-layer switches preserve the hidden data.

Destination colours form a user-defined planning legend. IMDG class/division, compatibility-group text, UN number and proper shipping name must come from supplied shipment data. Format checks do not verify their correspondence, authorize the shipment, assess segregation, or generate prescribed hazard pictograms or transport labels.

PNG/JPEG/WebP/SVG images up to 1 MB are converted to embedded PNG thumbnails (128 px, reduced to 64 px if needed; maximum 24,000 data-URL characters). SVG input rejects scripts, foreign objects, styles and external references. Images are rendered as images, never inserted as HTML. File import limits are 25 MB to accommodate embedded thumbnails; browser local-storage quotas still apply. Save/export operations report storage failures.

2D uses SVG overlays; 3D shares cached surface textures for identical visible artwork. Compact 3D faces omit unique external IDs to avoid per-unit texture allocations; selected-unit labels show the complete selected identification. All artwork is informational and does not modify weights, positions or numerical stability inputs. Changes use the existing Undo/Redo history.

## Sources checked 2026-10-01

- [GS1 SSCC](https://www.gs1.org/standards/id-keys/sscc)
- [GS1 check-digit calculation](https://www.gs1.org/services/how-calculate-check-digit-manually)
- [GS1 application identifiers](https://ref.gs1.org/ai/?lang=en)
- [GS1 Digital Link syntax — SSCC example used in tests](https://ref.gs1.org/standards/digital-link/uri-syntax/1.7.0/)
- [BIC identification number](https://www.bic-code.org/identification-number/)
- [BIC check digit](https://www.bic-code.org/check-digit-calculator/)
- [IMO IMDG Code](https://www.imo.org/en/ourwork/safety/pages/dangerousgoods-default.aspx)

Automated validation covers format/check digits, duplicate IDs, copies, saved-condition round trips and layer visibility. Device/browser visual testing remains outstanding.
