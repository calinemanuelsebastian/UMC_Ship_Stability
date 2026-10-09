import {HydrostaticAudit} from '../components/hydrostatic-audit';
import { useLanguage } from '../app/language-context';
import { useEffect, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import type { ValidationCaseResult, ValidationSuite } from '../core/domain/validation-case';
import { loadValidationCases } from '../platform/ship-models/load-validation-cases';
import { runValidationCase } from '../core/hydrostatics/reference/run-validation-case';
const quantityLabels: Record<string, string> = { draftForward: 'Draft at FP', draftAft: 'Draft at AP', trimMetres: 'Signed trim', trimDeg: 'Trim angle', mct1cm: 'MCT 1 cm', gmLongitudinalCorrected: 'Corrected longitudinal GM', lcf: 'LCF', kn: 'KN', gz: 'GZ (uncorrected)', gzCorrected: 'GZ (corrected)', naturalPeriodSeconds: 'Natural period', dampedPeriodSeconds: 'Damped period', heelDeg: 'Heel', angularVelocityDegPerSecond: 'Angular velocity', draft: 'Draft', displacementTonnes: 'Displacement', volume: 'Volume', kb: 'KB', lcb: 'LCB', tcb: 'TCB', lcg: 'LCG', vcg: 'Physical VCG', tcg: 'TCG', kmTransverse: 'KMt', kmLongitudinal: 'KMl', gmTransverse: 'GMt (uncorrected)', gmLongitudinal: 'GMl (uncorrected)', gmTransverseCorrected: 'GMt (corrected)', waterplaneArea: 'Waterplane area', tonnesPerCentimetre: 'TPC', longitudinalMoment: 'Longitudinal moment', verticalMoment: 'Vertical moment', transverseMoment: 'Transverse moment', freeSurfaceMomentTransverse: 'Transverse FSM', freeSurfaceCorrectionTransverse: 'Free-surface correction', virtualVcgTransverse: 'Virtual VCG (transverse)' };
const kindLabels = { trim: 'Trim & Drafts', hydrostatics: 'Upright hydrostatics', loading: 'Loading', 'loading-hydrostatics': 'Loading to hydrostatics', stability: 'GZ curves', roll: 'Free roll' };
export function Validation({ ship }: {
    ship: ShipModelPackage;
}) {
    const { t, language } = useLanguage();
    const format = (value: number | undefined) => value === undefined ? 'Unavailable' : new Intl.NumberFormat(language, { maximumSignificantDigits: 10 }).format(value);

    const [run, setRun] = useState(0);
    const [state, setState] = useState<{
        run: number;
        suite?: ValidationSuite;
        results: ValidationCaseResult[];
        done: boolean;
        error?: string;
    }>({ run: 0, results: [], done: false });
    useEffect(() => {
        let active = true;
        async function validate() {
            try {
                const suite = await loadValidationCases(ship);
                const results: ValidationCaseResult[] = [];
                if (suite)
                    for (const testCase of suite.cases) {
                        if (!active)
                            return;
                        results.push(await runValidationCase(ship, testCase));
                        if (active)
                            setState({ run, suite, results: [...results], done: false });
                    }
                if (active)
                    setState({ run, suite, results, done: true });
            }
            catch (error) {
                if (active)
                    setState({ run, results: [], done: true, error: error instanceof Error ? error.message : 'Validation failed.' });
            }
        }
        void validate();
        return () => { active = false; };
    }, [ship, run]);
    const current = state.run === run ? state : { results: [], done: false, suite: undefined, error: undefined };
    const passed = current.results.filter(result => result.passed).length;
    return <><HydrostaticAudit ship={ship}/><div className="page-heading"><p className="eyebrow">{t("UMC \u00B7 Calculation checks")}</p><h1>{t("Validation")}</h1><p>{t("Compare the selected model\u2019s reference cases with the current calculation engine.")}</p></div>
    <section className="panel"><div className="section-actions"><h2>{t(ship.manifest.name)}</h2><button className="action-button" disabled={!current.done} onClick={() => setRun(value => value + 1)}>{t("Run checks again")}</button></div>
      <p role="status">{t(!current.done ? `Running reference checks… ${current.results.length} completed.` : current.error ? 'Validation could not run.' : !current.suite ? 'This model does not provide validation reference cases.' : `${passed} of ${current.results.length} cases passed${passed === current.results.length ? '.' : `; ${current.results.length - passed} failed.`}`)}</p>
      {t(current.error && <p role="alert" className="error">{t(current.error)}</p>)}
      <p className="muted">{t("These fixed reference conditions are independent of your current loading edits. A pass means the listed quantities match within their absolute tolerances; it is not vessel stability approval. Curve rows identify signed heel; roll response rows identify time. Missing samples are unavailable and fail the comparison.")}</p>
    </section>
    {t(current.suite?.cases.map(testCase => {
            const result = current.results.find(item => item.id === testCase.id);
            return <section className="panel validation-case" key={testCase.id}><div className="section-actions"><h2>{t(testCase.name)}</h2><strong className={result ? result.passed ? 'validation-pass' : 'validation-fail' : ''}>{t(result ? result.passed ? 'PASS' : 'FAIL' : 'Pending')}</strong></div><p className="muted">{t("Calculation: ")}{t(kindLabels[testCase.kind])}</p><p>{t(testCase.description)}</p><p className="muted">{t("Reference: ")}<span lang="en">{testCase.source}</span></p>
        <details><summary>{t("Reference inputs")}</summary><pre lang="en">{t(JSON.stringify(testCase.kind === 'roll' || testCase.kind === 'trim' ? { condition: testCase.condition, inputs: testCase.inputs } : testCase.kind === 'hydrostatics' || testCase.kind === 'stability' ? testCase.condition : { weights: testCase.weights, ...(testCase.kind === 'loading-hydrostatics' ? { waterDensity: testCase.waterDensity } : {}) }, null, 2))}</pre></details>
        {t(result?.error && <p role="alert" className="error">{t(result.error)}</p>)}
        {t(result && result.comparisons.length > 0 && <div className="weight-scroll"><table className="validation-table"><caption className="visually-hidden">{t(testCase.name)}{t(" comparisons")}</caption><thead><tr><th scope="col">{t("Quantity")}</th><th scope="col">{t("Expected")}</th><th scope="col">{t("Calculated")}</th><th scope="col">{t("Absolute difference")}</th><th scope="col">{t("Tolerance")}</th><th scope="col">{t("Unit")}</th><th scope="col">{t("Result")}</th></tr></thead><tbody>{t(result.comparisons.map(item => <tr key={JSON.stringify([item.quantity, item.heelDeg, item.timeSeconds])}><th scope="row">{t(quantityLabels[item.quantity])}{t(item.heelDeg !== undefined && ` at ${item.heelDeg}°`)}{t(item.timeSeconds !== undefined && ` at ${format(item.timeSeconds)} s`)}</th><td>{t(format(item.value))}</td><td>{t(format(item.actual))}</td><td>{t(format(item.difference))}</td><td>{t(format(item.tolerance))}</td><td>{t(item.unit)}</td><td>{t(item.passed ? 'PASS' : 'FAIL')}</td></tr>))}</tbody></table></div>)}
        {t(!!result?.warnings.length && <ul className="warnings">{t(result.warnings.map((warning, index) => <li key={index}>{t(warning)}</li>))}</ul>)}
      </section>;
        }))}</>;
}
