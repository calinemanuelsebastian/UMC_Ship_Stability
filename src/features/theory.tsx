import {CargoTheory} from './cargo-theory';
import { useLanguage } from '../app/language-context';
import type { TabId } from '../app/tabs';
import type { ShipModelPackage } from '../core/domain/ship-model';
const stabilityReference = 'https://www.usna.edu/NAOE/_files/documents/Courses/EN400/EN400_Course_Notes_Fall_AY2021_July2020.pdf';
const topics = [
    ['cargo', 'Cargo types and packaging'], ['coordinates', 'Coordinates & units'], ['hydrostatics', 'Hydrostatics'],
    ['loading', 'Loading & free surface'], ['trim', 'Trim & Drafts'], ['stability', 'GZ curves'],
    ['roll', 'Free roll'], ['validation', 'Validation'],
] as const;
export function Theory({ ship, onTabChange }: {
    ship: ShipModelPackage;
    onTabChange: (tab: TabId) => void;
}) {
    const { t } = useLanguage();
    const { manifest } = ship;
    const open = (tab: TabId, label: string) => <button className="action-button" onClick={() => onTabChange(tab)}>{t(label)}</button>;
    return <article className="theory">
    <div className="page-heading"><p className="eyebrow">{t("UMC \u00B7 Learning guide")}</p><h1>{t("Theory")}</h1><p>{t("Read the equations alongside the assumptions used by each simulator screen.")}</p></div>
    <nav className="theory-topics" aria-label={t("Theory topics")}>{t(topics.map(([id, label]) => <a key={id} href={`#theory-${id}`}>{t(label)}</a>))}</nav>
    <section className="panel theory-section" aria-labelledby="theory-workflow"><h2 id="theory-workflow">{t("From weights to motion")}</h2>
      <ol className="theory-flow"><li><strong>{t("Loading")}</strong><span>{t("Total mass, centres and FSM")}</span></li><li><strong>{t("Hydrostatics")}</strong><span>{t("Upright draft and corrected GM")}</span></li><li><strong>{t("Stability / roll")}</strong><span>{t("KN-based GZ or linear free roll")}</span></li></ol>
      <p>{t("Valid loading edits automatically share displacement, physical centres and free-surface moment across calculation tabs. Stability Curves uses KN data; Roll Simulation uses corrected initial GM and entered inertia and damping. The roll model does not integrate the GZ curve.")}</p>
      <p className="muted">{t("Manual draft edits affect the sandbox only; they do not update the shared displacement used by Stability Curves and Roll Simulation. Display rounding does not change the values used in calculations.")}</p>
    </section>
    <CargoTheory/>
    <section id="theory-coordinates" className="panel theory-section"><h2>{t("Coordinates and units")}</h2>
      <p><strong>{t("Selected model: ")}{t(manifest.name)}{t(".")}</strong>{t(" Origin: ")}{t(manifest.coordinateSystem.origin)}{t(". Positive axes: x ")}{t(manifest.coordinateSystem.xPositive)}{t(", y ")}{t(manifest.coordinateSystem.yPositive)}{t(", z ")}{t(manifest.coordinateSystem.zPositive)}{t(". Declared units: ")}{t(manifest.units.length)}{t(", ")}{t(manifest.units.mass)}{t(", ")}{t(manifest.units.density)}{t(", ")}{t(manifest.units.angle)}{t(".")}</p>
      <p>{t("The current solvers require metres, tonnes, t/m\u00B3 and degrees, with positive-up vertical coordinates. Stability Curves and Roll Simulation require starboard-positive transverse coordinates. KG and KN must use the same baseline datum. A package with another convention needs conversion before use.")}</p>
      <dl className="theory-glossary"><dt>{t("\u0394 \u2014 displacement mass (t)")}</dt><dd>{t("Total mass supported by buoyancy; distinct from displaced volume \u2207 (m\u00B3).")}</dd><dt>{t("KG / VCG, LCG, TCG (m)")}</dt><dd>{t("Vertical, longitudinal and transverse coordinates of the centre of gravity.")}</dd><dt>{t("KB, BM, KM, GM (m)")}</dt><dd>{t("Height of buoyancy centre; metacentric radius; metacentre height; separation between G and M. Subscripts t and l distinguish transverse and longitudinal values.")}</dd><dt>{t("KN, GZ (m)")}</dt><dd>{t("Baseline-referenced cross-curve lever and the resulting righting lever for the chosen centre of gravity.")}</dd><dt>{t("FSM (t\u00B7m), FSC (m)")}</dt><dd>{t("Density-weighted free-surface moment and its equivalent virtual rise of G.")}</dd></dl>
    </section>
    <section id="theory-hydrostatics" className="panel theory-section"><h2>{t("Upright hydrostatics")}</h2>
      <p className="theory-equation">{t("\u0394 = \u03C1water \u2207 \u00B7 KM = KB + BM \u00B7 GM = KM \u2212 KG")}</p>
      <p>{t("At fixed draft and water density, raising KG reduces GM while leaving displacement unchanged. GM describes initial stability near upright. A positive GM alone does not establish acceptable large-angle stability. See ")}<a href={stabilityReference}>{t("USNA EN400 stability notes")}</a>{t(".")}</p>
      <p>{t("In this app, available quantities come from linear interpolation between table rows. Displacement mode inverts the same volume-versus-draft relationship. The table must be complete and strictly increasing in volume for that lookup; extrapolation is rejected. KM is read from the table, so missing KM is not automatically reconstructed from KB and BM.")}</p>
      <p>{t("Matching total weight determines an upright draft in this model. It does not establish longitudinal or transverse equilibrium. Heel and trim are both held at zero.")}</p>
      <details><summary>{t("Try it: move G vertically")}</summary><p>{t("Keep the manual draft unchanged and raise VCG by 0.5 m. Both available uncorrected GM values should decrease by 0.5 m. Displacement should stay the same. Restore VCG afterwards if you want to retain the original condition.")}</p></details>
      {t(open('hydrostatics', 'Open Hydrostatic Sandbox'))}
    </section>
    <section id="theory-loading" className="panel theory-section"><h2>{t("Loading and free surface")}</h2>
      <p className="theory-equation">{t("\u0394 = \u03A3m\u1D62 \u00B7 KG = \u03A3(m\u1D62 z\u1D62) / \u0394")}</p>
      <p>{t("LCG and TCG use the same mass-weighted calculation with x and y. Include lightship once. Signed coordinates allow opposite-side moments to cancel; masses remain non-negative. Empty or zero-total conditions cannot define a centre of gravity.")}</p>
      <p className="theory-equation">{t("FSC = \u03A3FSM\u1D62 / \u0394 \u00B7 GMcorrected = GM \u2212 FSC")}</p>
      <p>{t("FSM already includes tank-liquid density. Divide it by total displacement without applying sea-water density again. Physical KG stays unchanged; the virtual KG is KG + FSC. Reference: ")}<a href="https://www.dco.uscg.mil/Portals/9/DCO%20Documents/5p/5ps/NVIC/1960s/n3-69.pdf">{t("US Coast Guard NVIC 3-69")}</a>{t(".")}</p>
      <p>{t("The editor takes FSM as an input; it does not derive it from tank geometry or filling level. An omitted package FSM means assumed zero. Keep physical KG in the VCG field: entering virtual KG there as well would count the correction twice.")}</p>
      <details><summary>{t("Try it: isolate the free-surface effect")}</summary><p>{t("With fixed weights, increase one FSM entry and compare corrected GM after the automatic update. Physical centres and displacement remain unchanged. Check that the GM reduction equals the increase in total FSM divided by displacement.")}</p></details>
      {t(open('loading', 'Open Loading Condition'))}
    </section>
    <section id="theory-stability" className="panel theory-section"><h2>{t("From KN cross curves to GZ")}</h2>
      <p className="theory-equation">{t("GZ = KN \u2212 KG sin \u03B8 \u2212 TCG cos \u03B8")}<br />{t("GZcorrected = GZ \u2212 FSC sin \u03B8")}</p>
      <p>{t("With starboard-positive heel and TCG, a positive transverse offset reduces GZ at zero heel. Port and starboard responses need not mirror each other. Interpret signed GZ together with heel direction. The correction follows the ")}<a href={stabilityReference}>{t("USNA EN400 righting-lever equations")}</a>{t(".")}</p>
      <p>{t("The solver interpolates KN by displaced volume at each supplied signed angle. Straight chart segments connect those samples; the app does not locate exact maxima, integrate curve areas or calculate downflooding angles. The constant-FSM correction approximates liquid effects using virtual KG.")}</p>
      <p>{t("Check each model's source description. A closed, watertight training hull can retain mathematical buoyancy at angles where a vessel with openings could downflood. Synthetic cross curves are teaching data.")}</p>
      <details><summary>{t("Try it: compare port and starboard")}</summary><p>{t("Hold displacement, KG and FSM constant, then enter a small positive TCG. At zero heel GZ should be \u2212TCG for a symmetric hull with zero KN there. Compare both sides of the curve. Restore TCG to zero before using the current upright Roll Simulation.")}</p></details>
      {t(open('stability', 'Open Stability Curves'))}
    </section>
    <section id="theory-trim" className="panel theory-section"><h2>{t('Trim & Drafts')}</h2>
      <p className="theory-equation">GM_L = KM_L − KG − FSM_L / Δ<br/>MCT 1 cm = Δ GM_L / (100 LBP)<br/>s = (LCG − LCB) / GM_L · trim = s LBP<br/>T_AP = T₀ − s LCF_AP · T_FP = T₀ + s (LBP − LCF_AP)</p>
      <p>{t('These equations use positions forward of AP and bow-positive trim (T_FP − T_AP). The app converts source coordinates before evaluating the longitudinal lever. Display reference changes affect labels and signed trim, not the physical end drafts.')}</p>
      <p>{t('At the displacement-derived even-keel draft T₀, the model supplies LCB, LCF and KMl. The first-order waterline rotates about LCF. MCT 1 cm is the moment required to change the difference between perpendicular drafts by one centimetre. Physical KG and longitudinal FSM are used separately.')}</p>
      <p>{t('This is an initial longitudinal equilibrium approximation. The package must opt in with a trim limit no greater than 1 degree; this is an app limit, not a universal accuracy guarantee. Both end drafts must remain within the table range and hull depth. TCG must be zero and corrected transverse and longitudinal GM positive. List, hull-form trim corrections, deflection and draft-mark offsets are excluded.')}</p>
      <p><a href="https://home.hvl.no/ansatte/gste/ftp/MAS124_Intro_Marinteknikk/Litteratur/Kompendier_Books/ShipStabMastersMates.pdf#page=161">Barrass &amp; Derrett (2006), chapter 16, pp. 146–149</a></p>
      {open('trim', 'Open Trim & Drafts')}
    </section>
    <section id="theory-roll" className="panel theory-section"><h2>{t("Small-angle free roll")}</h2>
      <p className="theory-equation">{t("\u03C6\u2033 + 2\u03B6\u03C9\u2099\u03C6\u2032 + \u03C9\u2099\u00B2\u03C6 = 0")}<br />{t("\u03C9\u2099 = \u221A(g GMcorrected) / k \u00B7 T\u2099 = 2\u03C0 / \u03C9\u2099")}<br />{t("T\u1D48 = T\u2099 / \u221A(1 \u2212 \u03B6\u00B2)")}</p>
      <p>{t("The screen models release from rest in still water. Effective radius k includes added roll inertia: k\u00B2 = (Ixx + A44) / mass. Damping ratio \u03B6 controls decay. For fixed inertia, larger positive GM gives a shorter natural period. References: ")}<a href="https://www.usna.edu/NAOE/_files/documents/Courses/EN400/Slides_and_Labs_Update_Su2025/EN400_Lab_9.pdf">{t("USNA roll-period laboratory")}</a>{t(" and ")}<a href="https://ocw.mit.edu/courses/18-03sc-differential-equations-fall-2011/resources/mit18_03scf11_s13_2text/">{t("MIT damped oscillators")}</a>{t(".")}</p>
      <p>{t("The implemented analytical solution requires positive corrected GM, TCG = 0 and 0 \u2264 \u03B6 < 1. Initial heel is limited to \u00B15\u00B0 as a teaching guardrail. It includes no wave forcing, nonlinear damping or capsize prediction. Inertia and damping are supplied assumptions, not calculated from the loading weights.")}</p>
      <details><summary>{t("Try it: compare decay and period")}</summary><p>{t("Set damping to zero and observe sustained oscillations. Then use a small positive damping ratio and observe decay. Double the effective radius while keeping GM fixed: both periods should double. Changing initial heel scales the response without changing the periods.")}</p></details>
      {t(open('roll', 'Open Roll Simulation'))}
    </section>
    <section id="theory-validation" className="panel theory-section"><h2>{t("What validation establishes")}</h2>
      <p>{t("The Validation tab runs the selected package's fixed reference cases, independently of current editor values. Each comparison passes when its absolute difference is at most the declared tolerance. Missing values and calculation errors fail the case.")}</p>
      <p>{t("The training package includes loading, upright hydrostatics, signed GZ and free-roll reference cases. GZ comparisons identify a heel angle; roll response comparisons identify a sample time. The local development tests additionally cover malformed data and failure handling.")}</p>
      <p>{t("Inspect the expected value, its source and tolerance together. Passing reference cases demonstrates agreement for those cases. It does not validate every possible loading condition, certify input data or establish regulatory compliance.")}</p>
      {t(open('validation', 'Open Validation'))}
    </section>
  </article>;
}
