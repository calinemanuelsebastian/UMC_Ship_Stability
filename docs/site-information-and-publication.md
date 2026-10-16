# Site information and public publication

Implemented 16 October 2026. These disclosures are an engineering implementation, not a legal certification.

## Pages and navigation

The footer links to capabilities, privacy/storage, terms and licences using the `info` query parameter. The home page links to the complete capabilities page. Internal navigation keeps the simulator mounted so opening information does not discard unsaved inputs. URLs preserve deployment subpaths and the current vessel/workspace. Browser Back, keyboard links and EN/RO are supported. Critical data corrections and unavailable-model notices stay beside results; engineering check logs stay in the repository.

Operator supplied by the user: Emanuel-Sebastian Călin, calin.emanuelsebastian@gmail.com. Academic coordinator: Noel-Mircea Zus, mircea.zus@cmu-edu.eu, verified against https://cmu-edu.eu/navigatie/departamentul-de-navigatie/. The coordinator is not designated as operator or privacy contact. No institutional endorsement is asserted.

## Privacy implementation and references

Local plans, drafts, templates, imported ships and preferences use browser storage. No app account, analytics, advertising or automatic plan upload is implemented. GitHub Pages still logs IP addresses; the notice links to its privacy statement rather than claiming there is no processing. Contact correspondence is described separately, including Gmail processing, purpose, legitimate-interest basis for ordinary enquiries, legal-obligation basis for statutory rights requests, retention criteria and supervisory authority contact. The publisher must follow these practices; publishing text alone does not ensure compliance.

- GDPR: https://eur-lex.europa.eu/eli/reg/2016/679/oj (particularly Articles 5, 6, 12–22 and Chapter V).
- EU storage guidance: https://europa.eu/youreurope/business/growing/digitalising/online-privacy/index_en.htm
- Hosting: https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages
- GitHub privacy: https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement
- Google privacy: https://policies.google.com/privacy
- Romania: https://www.dataprotection.ro/

There is no optional tracking consent banner because there is no optional tracking integration. Adding such processing requires a fresh assessment and appropriate consent before it runs. Storage exemptions must be reassessed if its purposes change. The terms preserve mandatory EU/national rights and GPL permissions rather than imposing a blanket liability waiver.

## Release actions outside the code

- Establish redistribution permission for embedded ship-document images or omit them from public distribution. Attribution and GPL licensing of application code do not resolve third-party rights.
- Confirm the actual operator/hosting arrangement and applicable Romanian publication obligations before public launch; no university operation or endorsement has been inferred.
- Maintain a process for privacy requests, correspondence deletion, provider/security changes and accurate updates to this notice. Determine whether additional processor arrangements or transfer safeguards are needed for the actual deployment and email arrangement.
- Keep runtime MIT notices and GPL text updated with dependencies. Served copies are in `public/legal/` and are checked against installed dependencies by tests.

## Verification

Regression tests cover information URL round trips/subpaths, bilingual disclosures, operator/coordinator contacts, all footer labels and served licence texts. Browser verification covered the home-summary link, privacy/operator information, coordinator attribution, Romanian switching, browser Back, return to the existing loading condition, and 390 px portrait with no horizontal overflow.

The two reviewed visualization issues are covered by tests: GZ=0 uses the same scale as signed ordinates; source AP/starboard/up coordinates convert into model datums before scene transforms. The physical location is unchanged for amidships origins and all axis-sign combinations. The empty-ship source chart was visually checked with its negative GZ region below zero.
