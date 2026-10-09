import { useEffect, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { computeTrimEquilibrium, type TrimResult } from '../core/trim/compute-trim-equilibrium';
import { useLanguage } from '../app/language-context';
import { useReference } from '../app/reference-context';
import { NumberInput } from '../components/number-input';
import { TableTrim } from './table-trim';
type Props = { pending: boolean; readOnly: boolean;
  ship: ShipModelPackage;
  displacementTonnes: number | undefined; onDisplacementChange: (value: number | undefined) => void;
  vcg: number | undefined; onVcgChange: (value: number | undefined) => void;
  lcg: number | undefined; onLcgChange: (value: number | undefined) => void;
  tcg: number | undefined; onTcgChange: (value: number | undefined) => void;
  freeSurfaceMomentTransverse: number | undefined;
  density: number | undefined; setDensity: (value: number | undefined) => void;
  fsm: number | undefined; setFsm: (value: number | undefined) => void;
};
export function TrimEquilibrium({ pending, readOnly, ship, displacementTonnes, onDisplacementChange, vcg, onVcgChange, lcg, onLcgChange, tcg, onTcgChange, freeSurfaceMomentTransverse, density, setDensity, fsm, setFsm }: Props) {
  const { t, language } = useLanguage();
  const reference = useReference();
  const [method, setMethod] = useState(() => ship.manifest.resources.some(r => r.kind === 'hydrostatics.trimmed-table') ? 'tables' : 'linear');
  const key = JSON.stringify([displacementTonnes, vcg, lcg, tcg, freeSurfaceMomentTransverse, density, fsm]);
  const valid = !pending && [displacementTonnes, vcg, lcg, tcg, freeSurfaceMomentTransverse, density, fsm].every(value => value !== undefined);
  const [calculation, setCalculation] = useState<{ ship:ShipModelPackage; key: string; result?: TrimResult; error?: string }>();
  useEffect(() => {
    let active = true;
    if (!valid || method !== 'linear') return;
    computeTrimEquilibrium(ship, { displacementTonnes, vcg: vcg!, lcg: lcg!, tcg: tcg!, waterDensity: density!, freeSurfaceMomentTransverse, heelDeg: 0, trimDeg: 0 }, { freeSurfaceMomentLongitudinal: fsm! })
      .then(result => { if (active) setCalculation({ ship, key, result }); })
      .catch(error => { if (active) setCalculation({ ship, key, error: error instanceof Error ? error.message : 'Trim calculation failed.' }); });
    return () => { active = false; };
  }, [ship, key, valid, method, displacementTonnes, vcg, lcg, tcg, density, fsm, freeSurfaceMomentTransverse]);
  const current = valid && calculation?.ship === ship && calculation.key === key ? calculation : undefined;
  const result = current?.result;
  const fmt = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 6 }).format(value);
  return <><div className="page-heading"><p className="eyebrow">{t('UMC · Longitudinal stability')}</p><h1>{t('Trim & Drafts')}</h1><p>{t('Estimate forward and aft drafts from displacement and longitudinal loading.')}</p></div>

    <label>{t('Trim method')} <select value={method} onChange={e => setMethod(e.target.value)}><option value="linear">{t('Small-angle estimate')}</option><option value="tables">{t('Trimmed-table interpolation')}</option></select></label>
    <details className="calculation-inputs" key={String(readOnly)} open={!readOnly}><summary>{t('Calculation inputs')}</summary>    <p>{t('All calculation tabs follow the selected condition source. Edit weights in Loading Condition, or select Manual scenario to edit these inputs. Input coordinates follow the selected reference system.')}</p><div className="curve-inputs">
      <NumberInput label={t('Displacement (t)')} value={displacementTonnes} disabled={readOnly} onChange={onDisplacementChange} min={0}/>
      <NumberInput label={t('LCG (m)')} coordinate="x" value={lcg} disabled={readOnly} onChange={onLcgChange}/>
      <NumberInput label={t('VCG / KG (m)')} coordinate="z" value={vcg} disabled={readOnly} onChange={onVcgChange}/>
      <NumberInput label={t('TCG (m)')} coordinate="y" value={tcg} disabled={readOnly} onChange={onTcgChange}/>
      <NumberInput label={t('Water density (t/m³)')} value={density} onChange={setDensity} min={0}/>
      <NumberInput label={t('Longitudinal FSM (t·m)')} value={fsm} onChange={setFsm} min={0}/>
    </div></details>
    <div hidden={method !== 'tables'}><TableTrim ship={ship} pending={pending} displacementTonnes={displacementTonnes} lcg={lcg} tcg={tcg} density={density} fsm={fsm}/></div>
    {method === 'linear' && <>
    <p className="muted">{t('Longitudinal FSM must include liquid density. Zero explicitly assumes no longitudinal free-surface correction. Transverse FSM is not substituted for it. TCG must be zero.')}</p>
    <section className="panel">{!valid ? <p role="status">{t('Complete all inputs to calculate trim.')}</p> : !current ? <p role="status">{t('Calculating trim…')}</p> : current.error ? <p role="alert" className="error">{t(current.error)}</p> : result && <>
      <h2>{t('Estimated equilibrium drafts')}</h2>
      <p>{t(Math.abs(result.trimMetres) < 1e-9 ? 'Even keel' : result.trimMetres > 0 ? 'Trim by the bow' : 'Trim by the stern')} · {t('Positive trim')}: {t(reference.settings.trimPositive)}</p>
      <dl className="summary-grid">{([
        ['Draft at FP', result.draftForward, 'm'], ['Draft at AP', result.draftAft, 'm'],
        ['Signed trim', result.trimMetres * reference.trimSign, 'm'], ['Trim angle', result.trimDeg * reference.trimSign, '°'],
        ['Even-keel reference draft', result.draft, 'm'], ['Mean end draft', result.meanEndDraft, 'm'],
        ['LCB', reference.toDisplay('x', result.lcb)!, 'm'], ['LCF', reference.toDisplay('x', result.lcf)!, 'm'],
        ['Corrected longitudinal GM', result.gmLongitudinalCorrected, 'm'], ['Longitudinal free-surface correction', result.freeSurfaceCorrectionLongitudinal, 'm'],
        ['MCT 1 cm', result.mct1cm, 't·m/cm'], ['Trimming moment', result.trimmingMoment * reference.trimSign, 't·m'],
      ] as const).map(([label, value, unit]) => <div key={label}><dt>{reference.symbol(t(label))}</dt><dd>{fmt(value)} {unit}</dd></div>)}</dl>
      <p className="muted">{t('Model trim limit')}: ±{result.maxTrimDeg}°. {t('Drafts are measured at the perpendiculars. The even-keel reference draft is retained at LCF to first order; it can differ from the average of the end drafts.')}</p>
      <ul className="warnings">{result.warnings.map((warning, index) => <li key={index}>{t(warning)}</li>)}</ul>
    </>}</section></>}
    <p className="muted">{t('These estimated drafts do not modify the upright hydrostatic, GZ or roll solvers. Those screens retain their own zero-trim assumptions.')}</p>
  </>;
}
