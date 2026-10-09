import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
import type { HydrostaticResult } from '../core/domain/hydrostatic-result';
const fields = [
    ['displacementTonnes', 'Displacement', 't'], ['volume', 'Submerged volume', 'm³'],
    ['kb', 'KB', 'm'], ['lcb', 'LCB', 'm'], ['tcb', 'TCB', 'm'],
    ['kmTransverse', 'KMt', 'm'], ['kmLongitudinal', 'KMl', 'm'],
    ['gmTransverse', 'GMt (uncorrected)', 'm'], ['gmLongitudinal', 'GMl (uncorrected)', 'm'],
    ['freeSurfaceMomentTransverse', 'Total transverse FSM', 't·m'],
    ['freeSurfaceCorrectionTransverse', 'Transverse free-surface correction', 'm'],
    ['virtualVcgTransverse', 'Virtual VCG (transverse)', 'm'],
    ['gmTransverseCorrected', 'GMt (corrected)', 'm'],
    ['waterplaneArea', 'Waterplane area', 'm²'], ['tonnesPerCentimetre', 'TPC', 't/cm'],
] as const;
export function ResultsTable({ result }: {
    result: HydrostaticResult;
}) {
    const { t, language } = useLanguage();
    const reference = useReference();
    const values = { ...result, kb: reference.toDisplay('z', result.kb), lcb: reference.toDisplay('x', result.lcb), tcb: reference.toDisplay('y', result.tcb), kmTransverse: reference.toDisplay('z', result.kmTransverse), kmLongitudinal: reference.toDisplay('z', result.kmLongitudinal), virtualVcgTransverse: reference.toDisplay('z', result.virtualVcgTransverse) };
    const format = new Intl.NumberFormat(language, { maximumFractionDigits: 3 });

    return <table><caption>{t("Upright hydrostatic results")}</caption><thead><tr><th scope="col">{t("Quantity")}</th><th scope="col">{t("Value")}</th><th scope="col">{t("Unit")}</th></tr></thead><tbody>{t(fields.map(([key, label, unit]) => <tr key={key}><th scope="row">{reference.symbol(t(label))}</th><td>{t(values[key] === undefined ? 'Unavailable' : format.format(values[key]))}</td><td>{t(unit)}</td></tr>))}</tbody></table>;
}
