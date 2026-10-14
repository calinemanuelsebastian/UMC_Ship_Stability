import {StabilityAssessmentBasis} from '../components/stability-assessment-basis';
import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
import { useEffect, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import type { StabilityResult } from '../core/domain/stability-result';
import { computeStabilityCurves } from '../core/stability/compute-stability-curves';
import { HeelEquilibriumResults } from '../components/heel-equilibrium-results';
import { NumberInput } from '../components/number-input';
import { StabilityChart } from '../components/stability-chart';
type Props = { onLcgChange?:(value:number|undefined)=>void; lcg?:number; longitudinalFsm?:number; pending: boolean; readOnly: boolean; waterDensity: number | undefined;
    ship: ShipModelPackage;
    displacementTonnes: number | undefined;
    onDisplacementChange: (value: number | undefined) => void;
    vcg: number | undefined;
    onVcgChange: (value: number | undefined) => void;
    tcg: number | undefined;
    onTcgChange: (value: number | undefined) => void;
    freeSurfaceMomentTransverse: number | undefined;
    onFreeSurfaceMomentChange: (value: number | undefined) => void;
};
export function StabilityCurves({ onLcgChange, lcg, longitudinalFsm, pending, readOnly, waterDensity, ship, displacementTonnes, onDisplacementChange, vcg, onVcgChange, tcg, onTcgChange, freeSurfaceMomentTransverse, onFreeSurfaceMomentChange }: Props) {
    const { t } = useLanguage();
    const reference = useReference();
    const key = JSON.stringify([lcg,longitudinalFsm,waterDensity,displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse]);
    const [calculation, setCalculation] = useState<{
        ship: ShipModelPackage; key: string;
        result?: StabilityResult;
        error?: string;
    }>();
    const valid = !pending && [waterDensity,displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse,...(ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves')?[lcg,longitudinalFsm]:[])].every(value => value !== undefined);
    useEffect(() => {
        let active = true;
        if (!valid)
            return;
        computeStabilityCurves(ship, { ...ship.manifest.defaultCondition, lcg:lcg!, waterDensity: waterDensity!, draft: undefined, displacementTonnes, vcg: vcg!, tcg: tcg!, freeSurfaceMomentTransverse, trimDeg: 0 },{longitudinalFsm}).then(result => {
            if (active)
                setCalculation({ ship, key, result });
        }).catch(error => { if (active)
            setCalculation({ ship, key, error: error instanceof Error ? error.message : 'Could not calculate stability curves.' }); });
        return () => { active = false; };
    }, [lcg, longitudinalFsm, waterDensity, ship, key, valid, displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse]);
    const current = valid && calculation?.ship === ship && calculation.key === key ? calculation : undefined;
    const sourceResult = current?.result;
    const result = sourceResult && { ...sourceResult, points: sourceResult.points.map(point => ({ ...point, heelDeg: point.heelDeg * reference.heelSign, kn: point.kn * reference.heelSign, gz: point.gz * reference.heelSign, gzCorrected: point.gzCorrected * reference.heelSign })).sort((a,b) => a.heelDeg - b.heelDeg) };
    return <><div className="page-heading"><p className="eyebrow">{t("UMC \u00B7 Intact stability")}</p><h1>{t("Assessment")}</h1><p>{t('Review stability, weather and trim results, including any missing data, before exporting a report.')}</p></div>

    <StabilityAssessmentBasis ship={ship} inputs={{pending,displacementTonnes,lcg,vcg,tcg,freeSurfaceMomentTransverse,waterDensity,longitudinalFsm}}/>
    <details className="calculation-inputs" key={String(readOnly)} open={!readOnly}><summary>{t('Calculation inputs')}</summary>    <p className="muted">{t("All calculation tabs follow the selected condition source. Edit weights in Loading Condition, or select Manual scenario to edit these inputs. Input coordinates follow the selected reference system.")}</p><div className="curve-inputs">{ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves')&&<NumberInput coordinate="x" label={t('LCG (m)')} value={lcg} disabled={readOnly} onChange={value=>onLcgChange?.(value)}/>}<NumberInput label={t("Displacement (t)")} value={displacementTonnes} min={0} disabled={readOnly} onChange={onDisplacementChange}/><NumberInput coordinate="z" label={t("Physical VCG / KG (m)")} value={vcg} disabled={readOnly} onChange={onVcgChange}/><NumberInput coordinate="y" label={t("TCG (m)")} value={tcg} disabled={readOnly} onChange={onTcgChange}/><NumberInput label={t("Transverse FSM (t\u00B7m)")} value={freeSurfaceMomentTransverse} min={0} disabled={readOnly} onChange={onFreeSurfaceMomentChange}/></div></details>
    <section className="panel">{t(!valid ? <p role="status">{t("Complete the shared inputs to calculate.")}</p> : !current ? <p role="status">{t("Calculating GZ curves\u2026")}</p> : current.error ? <p className="error" role="alert">{t(current.error)}</p> : result && <><HeelEquilibriumResults result={sourceResult!} longitudinalFsm={longitudinalFsm}/><h2>{t("Righting-lever curve")}</h2><StabilityChart points={result.points}/><p className="muted">{t("The following equation uses source coordinates: starboard-positive TCG and heel, with KG positive above baseline. Displayed inputs are converted before solving.")}</p><p>{t("GZ = KN \u2212 KG sin \u03B8 \u2212 TCG cos \u03B8. Corrected GZ subtracts (FSM / displacement) sin \u03B8.")}</p><p className="muted">{t("Signed GZ is the restoring-lever convention for positive heel; negative-side values must be interpreted with their heel direction. No automatic stability pass/fail is assigned.")}</p><ul className="warnings">{t(result.warnings.map(warning => <li key={warning}>{t(warning)}</li>))}</ul><h2>{t("Calculation source")}</h2><p>{t(result.source.resourceLabel)}</p><p className="muted">{t(ship.manifest.resources.find(resource => resource.id === result.source.resourceId)?.description)}</p><code>{t(result.source.resourcePath)}</code><p className="muted">{t("Displaced volume: ")}{t(result.volume.toFixed(3))}{t(" m\u00B3 \u00B7 Transverse free-surface correction: ")}{t(result.freeSurfaceCorrectionTransverse.toFixed(6))}{t(" m")}</p><details><summary>{t("Show KN and GZ values")}</summary><table><caption className="visually-hidden">{t("Stability curve sample values")}</caption><thead><tr><th scope="col">{t("Heel (\u00B0)")}</th><th scope="col">{t("KN (m)")}</th><th scope="col">{t("GZ (m)")}</th><th scope="col">{t("Corrected GZ (m)")}</th></tr></thead><tbody>{t(result.points.map(point => <tr key={point.heelDeg}><th scope="row">{t(point.heelDeg)}</th><td>{t(point.kn.toFixed(6))}</td><td>{t(point.gz.toFixed(6))}</td><td>{t(point.gzCorrected.toFixed(6))}</td></tr>))}</tbody></table></details></>)}</section>
  </>;
}
