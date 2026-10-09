import type { MovementHistory } from '../app/movement-history';
import { useEffect, useState, type Dispatch, type SetStateAction } from 'react';
import type { WeightDraft } from '../app/loading-state';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { NumberInput } from './number-input';
import { useReference } from '../app/reference-context';
import { useLanguage } from '../app/language-context';

export function WeightMovement({ history, ship, weights, setWeights, selectedId, onSelect, onMove }: {
  history: MovementHistory; ship: ShipModelPackage; weights: WeightDraft[]; setWeights: Dispatch<SetStateAction<WeightDraft[]>>;
  selectedId: string; onSelect: (id: string) => void; onMove: (axis: 'lcg' | 'tcg') => void;
}) {
  const { t } = useLanguage(); const reference = useReference();
  useEffect(() => () => history.end(), [history]);
  const [axis, setAxis] = useState<'lcg' | 'tcg'>('lcg');

  const weight = weights.find(w => w.id === selectedId);
  const source = ship.manifest.coordinateSystem;
  const length = ship.manifest.principalDimensions.lbp;
  const origin = source.longitudinalOriginFromAP;
  const sign = source.xPositive === 'forward' ? 1 : -1;
  const x = weight?.[axis].trim() ? Number(weight[axis]) : undefined;
  const fromAP = x === undefined || origin === undefined ? undefined : origin + sign*x;
  function move(next: string) {
    if (!weight || next === weight[axis]) return;
    history.record(weight.id, axis, weight[axis], next);
    setWeights(items => items.map(item => item.id === weight.id ? {...item, [axis]: next} : item));
    onMove(axis);
  }
  function undo() {
    const last = history.undo(weights); if (!last) return;
    setWeights(items => items.map(item => item.id === last.id ? {...item, [last.axis]: last.before} : item));
    onSelect(last.id); setAxis(last.axis); onMove(last.axis);
  }
  return <section className="panel weight-movement"><h2>{t('Move a weight')}</h2>

    <label>{t('Selected weight')} <select aria-label={t('Selected weight')} value={weight?.id ?? ''} onChange={event => onSelect(event.target.value)}><option value="">{t('Choose a weight')}</option>{weights.map((w,index) => <option key={w.id} value={w.id}>{index+1} · {w.name}</option>)}</select></label>
    <label>{t('Movement direction')} <select aria-label={t('Movement direction')} value={axis} onChange={event => setAxis(event.target.value as 'lcg' | 'tcg')}><option value="lcg">{t('Longitudinal')}</option><option value="tcg">{t('Transverse')}</option></select></label>
    {weight && <>
      <p>{weight.name} · {weight.massTonnes || '—'} t · {reference.symbol('KG')}: {reference.toDisplay('z',Number(weight.vcg))?.toFixed(3)} m · {reference.symbol('TCG')}: {reference.toDisplay('y',Number(weight.tcg))?.toFixed(3)} m</p>
      <div onFocusCapture={() => history.begin()} onBlurCapture={() => history.end()}><NumberInput label={axis === 'lcg' ? "Weight LCG (m)" : "Weight TCG (m)"} coordinate={axis === 'lcg' ? "x" : "y"} value={x} onChange={value => move(value === undefined ? '' : String(value))}/></div>
      {axis === 'lcg' && origin !== undefined && <label>{t('Longitudinal position from AP (m)')} <output>{fromAP?.toFixed(3) ?? '—'} m</output><input type="range" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); history.begin(); }} onPointerUp={() => history.end()} onPointerCancel={() => history.end()} onKeyDown={event => { if (!event.repeat) history.begin(); }} onKeyUp={() => history.end()} onBlur={() => history.end()} aria-label={t('Longitudinal position from AP (m)')} min={0} max={length} step={0.1} value={Math.max(0,Math.min(length,fromAP ?? 0))} onChange={event => move(String(sign*(Number(event.target.value)-origin)))}/><span>AP 0 m — FP {length} m</span></label>}
      {axis === 'tcg' && <label>{t('Transverse position (starboard positive, m)')}<input type="range" onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); history.begin(); }} onPointerUp={() => history.end()} onPointerCancel={() => history.end()} onKeyDown={event => { if (!event.repeat) history.begin(); }} onKeyUp={() => history.end()} onBlur={() => history.end()} aria-label={t('Transverse position (starboard positive, m)')} min={-ship.manifest.principalDimensions.beam/2} max={ship.manifest.principalDimensions.beam/2} step={0.05} value={(x ?? 0)*(source.yPositive === 'starboard' ? 1 : -1)} onChange={event => move(String(Number(event.target.value)*(source.yPositive === 'starboard' ? 1 : -1)))}/></label>}
      <p className="muted">{t('Transverse movement selects heel-only equilibrium. Longitudinal movement selects trim-only equilibrium.')}</p>
      {axis === 'lcg' && <p className="muted">{t('The slider runs from AP to FP. The numerical LCG follows the selected reference system. Unsupported conditions show an error.')}</p>}
      <button disabled={history.initial(weight.id, axis) === undefined || weight[axis] === history.initial(weight.id, axis)} onClick={() => move(history.initial(weight.id, axis)!)}>{t('Reset selected position')}</button>
    </>}
    <button disabled={!history.canUndo(weights)} onClick={undo}>{t('Undo movement')}</button>
    <details className="inspector-help"><summary>{t('Movement help')}</summary>    <p>{t('Select a purple marker or choose a weight below. Move it longitudinally or transversely to observe trim or heel. Markers show centres of mass, not cargo dimensions.')}</p>
    <p className="muted">{t('Reset restores the position before the first 3D movement. Undo retains the last 100 movements across tabs and modes until the model changes or the page reloads. Only the selected coordinate changes; mass and vertical position stay unchanged.')}</p>
    </details>
  </section>;
}
