import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
import { useEffect, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import type { HydrostaticResult } from '../core/domain/hydrostatic-result';
import { computeUprightHydrostatics } from '../core/hydrostatics/compute-upright-hydrostatics';
import { NumberInput } from '../components/number-input';
import { SelectInput } from '../components/select-input';
import { ResultsTable } from '../components/results-table';
const errorMessage = (error: unknown) => error instanceof Error ? error.message : 'Calculation failed.';
type SandboxProps = {
    pending: boolean; readOnly: boolean; waterDensity: number | undefined; draft: number | undefined; onDraftChange: (value: number | undefined) => void;
    freeSurfaceMomentTransverse: number | undefined;
    onFreeSurfaceMomentChange: (value: number | undefined) => void;
    ship: ShipModelPackage;
    vcg: number | undefined;
    onVcgChange: (value: number | undefined) => void;
    mode: 'draft' | 'displacement';
    onModeChange: (mode: 'draft' | 'displacement') => void;
    displacementTonnes: number | undefined;
    onDisplacementChange: (value: number | undefined) => void;
    centres: {
        lcg: number | undefined;
        tcg: number | undefined;
    };
};
export function HydrostaticSandbox({ pending, readOnly, waterDensity, draft, onDraftChange, freeSurfaceMomentTransverse, onFreeSurfaceMomentChange, ship, vcg, onVcgChange, mode, onModeChange, displacementTonnes, onDisplacementChange, centres }: SandboxProps) {
    const { t } = useLanguage();
    const reference = useReference();
    const defaults = ship.manifest.defaultCondition;
    const input = mode === 'draft' ? draft : displacementTonnes;
    const requestKey = JSON.stringify([waterDensity, mode, input, vcg, centres.lcg, centres.tcg, freeSurfaceMomentTransverse]);
    const [calculation, setCalculation] = useState<{
        requestKey: string;
        result?: HydrostaticResult;
        error?: string;
    }>();
    useEffect(() => {
        let active = true;
        if (pending || waterDensity === undefined || input === undefined || vcg === undefined || freeSurfaceMomentTransverse === undefined || centres.tcg === undefined || centres.lcg === undefined)
            return;
        computeUprightHydrostatics(ship, {
            ...defaults, ...centres, waterDensity, lcg: centres.lcg!, tcg: centres.tcg!, vcg, freeSurfaceMomentTransverse,
            draft: mode === 'draft' ? input : undefined,
            displacementTonnes: mode === 'displacement' ? input : undefined,
        }).then(result => {
            if (active)
                setCalculation({ requestKey, result });
        }).catch(error => { if (active)
            setCalculation({ requestKey, error: errorMessage(error) }); });
        return () => { active = false; };
    }, [pending, waterDensity, ship, defaults, input, mode, vcg, centres, requestKey, freeSurfaceMomentTransverse]);
    const current = calculation?.requestKey === requestKey ? calculation : undefined;
    const invalid = pending || input === undefined || vcg === undefined || freeSurfaceMomentTransverse === undefined || centres.tcg === undefined || centres.lcg === undefined;
    return <><div className="page-heading"><p className="eyebrow">{t("UMC \u00B7 Hydrostatics laboratory")}</p><h1>{t("Hydrostatic Sandbox")}</h1><p>{t("Explore how draft and centre of gravity affect upright hydrostatics.")}</p></div><div className="sandbox-grid"><aside className="panel"><h2>{t("Simulation condition")}</h2><SelectInput disabled={readOnly} label={t("Calculate from")} value={mode} options={[{ value: 'draft', label: 'Manual draft' }, { value: 'displacement', label: 'Displacement / total weight' }]} onChange={value => onModeChange(value as 'draft' | 'displacement')}/>
      {t(mode === 'draft' ? <NumberInput disabled={readOnly} label={t("Draft (m)")} value={draft} min={0} onChange={onDraftChange}/> : <NumberInput disabled={readOnly} label={t("Displacement (t)")} value={displacementTonnes} min={0} onChange={onDisplacementChange}/>)}<NumberInput disabled={readOnly} coordinate="z" label={t("VCG / KG (m)")} value={vcg} onChange={onVcgChange}/><NumberInput disabled={readOnly} label={t("Total transverse FSM (t\u00B7m)")} value={freeSurfaceMomentTransverse} min={0} onChange={onFreeSurfaceMomentChange}/><p className="muted">{t("FSM already includes tank-liquid density. Zero means no correction is applied. Physical VCG remains unchanged.")}</p><hr /><h2>{t("Model information")}</h2><p>{t(ship.manifest.description)}</p><dl><dt>{t("LBP \u00D7 beam")}</dt><dd>{t(ship.manifest.principalDimensions.lbp)}{t(" \u00D7 ")}{t(ship.manifest.principalDimensions.beam)}{t(" m")}</dd><dt>{t("Water density")}</dt><dd>{t(waterDensity)}{t(" t/m\u00B3")}</dd><dt>{t("LCG / TCG")}</dt><dd>{t(reference.toDisplay('x', centres.lcg)?.toFixed(3))}{t(" / ")}{t(reference.toDisplay('y', centres.tcg)?.toFixed(3) ?? 'Unavailable')}{t(" m")}</dd><dt>{t("Coordinate origin")}</dt><dd>{t(ship.manifest.coordinateSystem.origin)}</dd></dl><p className="muted">{t("Upright, zero-trim table calculation. Matching total weight does not establish list or trim equilibrium. GM is initial stability; free-surface correction applies to initial transverse GM only. Longitudinal free-surface correction is not calculated. Tank filling uses upright tables where available. Open Stability Curves for KN-based GZ calculations.")}</p></aside>
    <section className="panel results" aria-label={t("Calculation results")}>
      {t(invalid ? <p role="status">{t("Enter the selected draft or displacement and physical VCG, TCG and FSM to calculate.")}</p> : !current ? <p role="status">{t("Calculating\u2026")}</p> : current.error ? <p role="alert" className="error">{t(current.error)}</p> : current.result && <><p className="resolved-draft"><strong>{t(mode === 'displacement' ? 'Calculated upright draft' : 'Selected draft')}{t(": ")}{t(current.result.draft?.toFixed(6))}{t(" m")}</strong></p><ResultsTable result={current.result}/><div className="source"><h2>{t("Calculation source")}</h2><p>{t(current.result.calculationSource.solverLabel)}</p><code>{t(current.result.calculationSource.resourcePath)}</code></div><h2>{t("Warnings")}</h2>{t(current.result.warnings.length ? <ul className="warnings">{t(current.result.warnings.map(warning => <li key={warning.code}>{t(warning.message)}</li>))}</ul> : <p className="muted">{t("No calculation warnings.")}</p>)}</>)}
    </section></div></>;
}
