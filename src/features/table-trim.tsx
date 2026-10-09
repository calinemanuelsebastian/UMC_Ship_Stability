import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import { useEffect, useRef, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { computeTableTrim, parseTrimmedTable, validateTrimmedTableShip, type TrimmedTable } from '../core/trim/trimmed-table';
import { useLanguage } from '../app/language-context';
import { useReference } from '../app/reference-context';

export function TableTrim({ ship, pending, displacementTonnes, lcg, tcg, density, fsm }: {
  ship: ShipModelPackage; pending: boolean; displacementTonnes?: number; lcg?: number; tcg?: number; density?: number; fsm?: number;
}) {
  const { t, language } = useLanguage();
  const reference = useReference();
  const [data, setData] = useState<TrimmedTable>();
  const [error, setError] = useState('');
  const request = useRef(0);
  useEffect(() => {
    let active = true;
    const id = ++request.current;
    const resource = ship.manifest.resources.find(r => r.kind === 'hydrostatics.trimmed-table');
    setData(undefined); setError('');
    if (resource?.path) {
      loadTrimmedTable(ship).then(parsed => {
        if (active && id === request.current) setData(parsed);
      }).catch(e => { if (active && id === request.current) setError(e instanceof Error ? e.message : 'Trim calculation failed.'); });
    }
    return () => { active = false; };
  }, [ship]);
  let result: ReturnType<typeof computeTableTrim> | undefined;
  let calculationError = '';
  const ready = !pending && [displacementTonnes, lcg, tcg, density, fsm].every(v => v !== undefined);
  if (data && ready) {
    try {
      validateTrimmedTableShip(data, ship);
      if (fsm !== 0) throw new Error('Table LCB balance requires zero longitudinal FSM; liquid redistribution is not modelled.');
      result = computeTableTrim(data, { displacementTonnes: displacementTonnes!, lcg: lcg!, waterDensity: density! }, ship.manifest.principalDimensions.lbp);
    } catch (e) { calculationError = e instanceof Error ? e.message : 'Trim calculation failed.'; }
  }
  const fmt = (value: number) => new Intl.NumberFormat(language, { maximumFractionDigits: 6 }).format(value);
  return <section className="panel">
    <h2>{t('Trimmed-table interpolation')}</h2>
    <p>{t(ship.manifest.resources.some(r => r.kind === 'hydrostatics.trimmed-table') ? 'The vessel’s trim tables load automatically. You can import a replacement for this session.' : 'Import hydrostatic tables for the selected vessel. Each table specifies a trim and displacement rows. Files stay in this browser session.')}</p>
    <label>{t('Import trimmed tables (JSON)')} <input type="file" accept=".json,application/json" onChange={async e => {
      const file = e.target.files?.[0]; e.target.value = '';
      if (!file) return;
      const id = ++request.current; setData(undefined); setError('');
      try {
        if (file.size > 1024 * 1024) throw new Error('Trimmed-table file must be smaller than 1 MB.');
        const parsed = parseTrimmedTable(JSON.parse(await file.text()));
        validateTrimmedTableShip(parsed, ship);
        if (id === request.current) setData(parsed);
      } catch (e) { if (id === request.current) setError(e instanceof Error ? e.message : 'Trim calculation failed.'); }
    }}/></label>
    {error && <p role="alert" className="error">{t(error)}</p>}
    {data && <><p><strong>{t('Source')}:</strong> {data.source}</p><p>{t('Table density')}: {fmt(data.waterDensity)} t/m³ · {t('Vessel')}: {data.modelId}</p></>}
    {data && !ready && <p role="status">{t('Complete all inputs to calculate trim.')}</p>}
    {calculationError && <p role="alert" className="error">{t(calculationError)}</p>}
    <p className="muted">{t('This method balances table LCB against LCG at fixed displacement. It does not solve coupled heel and trim or establish stability. KG projection at finite trim and liquid redistribution are not included.')}</p>
    {result && <>
      {tcg !== 0 && <p className="warnings">{t('Nonzero TCG: this is a longitudinal reference calculation, not the actual ship attitude.')}</p>}
      <dl className="summary-grid">{([
        ['Signed trim', result.trimMetres * reference.trimSign, 'm'],
        ['Trim angle', result.trimDeg * reference.trimSign, '°'],
        ['Tabulated draft', result.draft, 'm'],
        ['LCB', reference.toDisplay('x', result.lcb)!, 'm'],
        ['LCF', reference.toDisplay('x', result.lcf), 'm'],
        ['Draft at AP', result.draftAft, 'm'], ['Draft at FP', result.draftForward, 'm'],
        ['Residual LCB − LCG', reference.toDisplay('x', result.lcb)! - reference.toDisplay('x', lcg)!, 'm'],
      ] as const).map(([label, value, unit]) => <div key={label}><dt>{reference.symbol(t(label))}</dt><dd>{value === undefined ? t('Unavailable') : `${fmt(value)} ${unit}`}</dd></div>)}</dl>
      {data?.draftDatumFromAP === undefined && <p>{t('Aft and forward drafts are withheld: the table does not declare its draft datum.')}</p>}
      <details><summary>{t('Interpolation details')}</summary>
        <p>{t('Bracketing trims')}: {result.bracket.map(v => fmt(v * reference.trimSign)).join(' / ')} m. {t('Interpolation fraction')}: {fmt(result.fraction)}</p>
        <table><thead><tr><th>{t('Signed trim')} (m)</th><th>{t('Tabulated draft')} (m)</th><th>LCB (m)</th></tr></thead><tbody>{result.samples.map((s, i) => <tr key={i}><td>{fmt(data!.tables[i].trimMetres * reference.trimSign)}</td><td>{s ? fmt(s.draft) : t('Unavailable')}</td><td>{s ? fmt(reference.toDisplay('x', s.lcb)!) : t('Unavailable')}</td></tr>)}</tbody></table>
      </details>
    </>}
  </section>;
}
