# Release redistribution inventory

Status: review required before the next release. This inventory does not grant rights.

| Content | Origin / licence evidence | Release action |
|---|---|---|
| Application source | Repository LICENSE declares GPL-3.0-only | Include LICENSE; provide the exact corresponding source and build instructions alongside each compiled release |
| Runtime packages | Locked npm dependencies; React/React DOM and Three carry licence files in node_modules | Retain applicable notices in release assets; review the exact locked dependency licences before approval |
| Rectangular Pontoon | Repository-generated analytical teaching package | Confirm authorship/redistribution in reviewer record |
| Vectis Castle JSON/CSV, reconstructed geometry and curves | Derived from supplied ship/stability/project documents; manifests retain provenance | Owner must confirm permission/applicable rights for the distributed derived material; supplied access alone is not recorded redistribution permission |
| Original workbook, PDF, CAD and external ship photographs | Supplied/reference material | Not included in the website artifact; artifact verifier rejects workbook/PDF/CAD files. No photograph is added by P17 |
| User plans, custom ships, images and cargo data | User-controlled local imports | Not collected by release tooling or bug report template; users decide what sanitized evidence to share |

The build allowlists Vectis package resources; that is a packaging control, not a rights determination. Record reviewer, evidence and accepted status in release-gate.json only after review. Existing public availability is not evidence of permission.
