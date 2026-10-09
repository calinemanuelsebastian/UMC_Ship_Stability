import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';
import { useEffect, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { computeRollSimulation, type RollResult } from '../core/roll/compute-roll-simulation';
import { NumberInput } from '../components/number-input';
import { RollChart } from '../components/roll-chart';
type Props = { pending: boolean; waterDensity: number | undefined;
    ship: ShipModelPackage;
    displacementTonnes: number | undefined;
    vcg: number | undefined;
    tcg: number | undefined;
    freeSurfaceMomentTransverse: number | undefined;
};
export function RollSimulation({ pending, waterDensity, ship, displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse }: Props) {
    const { t } = useLanguage();
    const reference = useReference();
    const resource = ship.manifest.resources.find(item => item.kind === 'roll.linear-parameters');
    const [radius, setRadius] = useState<number | undefined>(typeof resource?.config?.effectiveRadiusOfGyration === 'number' ? resource.config.effectiveRadiusOfGyration : undefined);
    const [damping, setDamping] = useState<number | undefined>(typeof resource?.config?.dampingRatio === 'number' ? resource.config.dampingRatio : undefined);
    const [initial, setInitial] = useState<number | undefined>(3);
    const [duration, setDuration] = useState<number | undefined>(60);
    const key = JSON.stringify([waterDensity,displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse, radius, damping, initial, duration]);
    const valid = !pending && [waterDensity,displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse, radius, damping, initial, duration].every(value => value !== undefined);
    const [calculation, setCalculation] = useState<{
        key: string;
        result?: RollResult;
        error?: string;
    }>();
    useEffect(() => {
        let active = true;
        if (!valid)
            return;
        computeRollSimulation(ship, { ...ship.manifest.defaultCondition, waterDensity: waterDensity!, draft: undefined, displacementTonnes, vcg: vcg!, tcg: tcg!, freeSurfaceMomentTransverse, heelDeg: 0, trimDeg: 0 }, { effectiveRadiusOfGyration: radius!, dampingRatio: damping!, initialHeelDeg: initial!, durationSeconds: duration! }).then(result => { if (active)
            setCalculation({ key, result }); }).catch(error => { if (active)
            setCalculation({ key, error: error instanceof Error ? error.message : 'Roll calculation failed.' }); });
        return () => { active = false; };
    }, [waterDensity, ship, valid, key, displacementTonnes, vcg, tcg, freeSurfaceMomentTransverse, radius, damping, initial, duration]);
    const current = calculation?.key === key ? calculation : undefined;
    const sourceResult = current?.result;
    const result = sourceResult && { ...sourceResult, points: sourceResult.points.map(point => ({ ...point, heelDeg: point.heelDeg * reference.heelSign, angularVelocityDegPerSecond: point.angularVelocityDegPerSecond * reference.heelSign })) };
    return <><div className="page-heading"><p className="eyebrow">{t("UMC \u00B7 Roll dynamics")}</p><h1>{t("Roll Simulation")}</h1><p>{t("Small-angle free roll, released from rest in still water.")}</p></div>
    <p>{t("Uses shared displacement ")}{t(displacementTonnes?.toFixed(2) ?? '—')}{t(" t, physical KG ")}{t(reference.toDisplay('z', vcg)?.toFixed(3) ?? '—')}{t(" m, TCG ")}{t(reference.toDisplay('y', tcg)?.toFixed(3) ?? '—')}{t(" m and FSM ")}{t(freeSurfaceMomentTransverse?.toFixed(2) ?? '—')}{t(" t\u00B7m. All calculation tabs follow the selected condition source.")}</p>
    {!resource && <p className="transfer-banner" role="status">{t('This vessel has no documented roll inertia or damping parameters. Free roll also requires available corrected GM and zero TCG. Use the Rectangular Pontoon for the built-in teaching example.')}</p>}
    <div className="curve-inputs"><NumberInput label={t("Effective roll radius of gyration (m)")} value={radius} min={0} onChange={setRadius}/><NumberInput label={t("Damping ratio \u03B6 (0 \u2264 \u03B6 < 1)")} value={damping} min={0} onChange={setDamping}/><NumberInput coordinate="heel" label={t("Initial heel (\u00B0; within \u00B15)")} value={initial} onChange={setInitial}/><NumberInput label={t("Duration (s; maximum 600)")} value={duration} min={0} onChange={setDuration}/></div>
    <p className="muted">{t("Effective radius includes added roll inertia: k\u00B2 = (Ixx + A44) / mass. Damping is an assumed constant ratio. ")}{t(resource?.description ?? 'Enter inertia and damping appropriate to this loading condition; the app does not infer them from hull dimensions.')}</p>
    <section className="panel">{t(!valid ? <p role="status">{t("Complete all inputs to simulate free roll.")}</p> : !current ? <p role="status">{t("Calculating roll response\u2026")}</p> : current.error ? <p className="error" role="alert">{t(current.error)}</p> : result && <><h2>{t("Free-roll response")}</h2><dl><dt>{t("Corrected transverse GM")}</dt><dd>{t(result.gmTransverseCorrected.toFixed(6))}{t(" m")}</dd><dt>{t("Undamped natural period")}</dt><dd>{t(result.naturalPeriodSeconds.toFixed(3))}{t(" s")}</dd><dt>{t("Damped period")}</dt><dd>{t(result.dampedPeriodSeconds.toFixed(3))}{t(" s")}</dd></dl><RollChart points={result.points}/><details><summary>{t("Show response samples (every approximately ")}{t((duration! / 60).toFixed(2))}{t(" s)")}</summary><table><thead><tr><th>{t("Time (s)")}</th><th>{t("Heel (\u00B0)")}</th><th>{t("Angular velocity (\u00B0/s)")}</th></tr></thead><tbody>{t(result.points.filter((_, index) => index % Math.ceil((result.points.length - 1) / 60) === 0 || index === result.points.length - 1).map(point => <tr key={point.timeSeconds}><td>{t(point.timeSeconds.toFixed(3))}</td><td>{t(point.heelDeg.toFixed(6))}</td><td>{t(point.angularVelocityDegPerSecond.toFixed(6))}</td></tr>))}</tbody></table></details><p className="muted">{t("Hydrostatic source: ")}{t(result.hydrostatics.calculationSource.resourcePath)}</p>{t(result.hydrostatics.warnings.length > 0 && <ul className="warnings">{t(result.hydrostatics.warnings.map(warning => <li key={warning.code}>{t(warning.message)}</li>))}</ul>)}</>)}</section>
    <p className="muted">{t("\u03C6\u2033 + 2\u03B6\u03C9\u2099\u03C6\u2032 + \u03C9\u2099\u00B2\u03C6 = 0; \u03C9\u2099 = \u221A(g GMcorrected) / k. This linear model requires positive GM and TCG = 0. It uses upright, zero-trim hydrostatics and constant free-surface correction. It does not use the large-angle GZ curve, simulate waves, solve trim/list equilibrium or predict capsize.")}</p>
  </>;
}
