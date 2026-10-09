import { useEffect, useRef, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { modelSignature, type ScenarioState } from '../app/saved-scenarios';
import { parseCargoPlan, planStorage, type CargoPlan } from '../app/cargo-plans';
import { evaluateWeights, type WeightDraft } from '../app/loading-state';
import { useLanguage } from '../app/language-context';

export function CargoPlans({ ship, state, fixed, ready, onRestore }: { ship: ShipModelPackage; state: ScenarioState; fixed: WeightDraft[]; ready: boolean; onRestore: (value: ScenarioState) => void }) {
  const { t } = useLanguage();
  const model = modelSignature(ship), draftKey = `draft:${model}`;
  const [items, setItems] = useState<CargoPlan[]>([]), [selected, setSelected] = useState('');
  const [name, setName] = useState(''), [voyage, setVoyage] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [message, setMessage] = useState(''), [hydrated, setHydrated] = useState(false), [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<CargoPlan>(), [preview, setPreview] = useState<CargoPlan>();
  const [previous, setPrevious] = useState<CargoPlan>();
  const sequence = useRef(Promise.resolve());
  const snapshot = (id: string = crypto.randomUUID()): CargoPlan => parseCargoPlan({ kind: 'cargo-plan', version: 1, id,
    name: name.trim() || 'Untitled cargo plan', voyage, model, savedAt: new Date().toISOString(),
    state: { tweenDeck:state.tweenDeck, scenario: 'loading', cargoArea:state.cargoArea, weights: state.weights, density: state.density, longitudinalFsm: state.longitudinalFsm, manual: {}, manualMode: 'displacement' } }, model, fixed, ship);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    planStorage('read').then(records => {
      if (!active) return;
      const own = records.filter(r => r.model === model);
      setItems(own.filter(r => r.key !== draftKey).map(r => parseCargoPlan(r.plan, model, fixed, ship)));
      const draft = own.find(r => r.key === draftKey);
      if (draft) setRecovery(parseCargoPlan(draft.plan, model, fixed, ship));
      setHydrated(true);
    }).catch(e => { if (active) setMessage(e.message); });
    return () => { active = false; };
  }, [model, draftKey, ready, fixed, ship]);
  const encoded = JSON.stringify({ tweenDeck:state.tweenDeck, cargoArea:state.cargoArea, weights: state.weights, density: state.density, longitudinalFsm: state.longitudinalFsm, name, voyage });
  useEffect(() => {
    if (!ready || !hydrated || recovery) return;
    const timer = setTimeout(() => {
      try {
        const plan = snapshot('recovery');
        sequence.current = sequence.current.catch(() => {}).then(async () => {
          await planStorage('put', { key: draftKey, model, plan }); setDraftStatus('Recovery draft saved locally.');
        }).catch(e => { setMessage(e.message); setDraftStatus('Draft recovery could not be saved.'); });
      } catch (e) { setDraftStatus('Draft recovery could not be saved.'); setMessage(e instanceof Error ? e.message : 'Draft recovery could not be saved.'); }
    }, 700);
    return () => clearTimeout(timer);
    // Snapshot dependencies are represented by encoded; manual inputs do not belong to cargo recovery.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded, ready, hydrated, recovery, draftKey, model]);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Cargo plan operation failed.'); }
    finally { setBusy(false); }
  }
  function apply(plan: CargoPlan) {
    try {
    setPrevious({ ...plan, name: name || 'Untitled cargo plan', voyage, state: structuredClone(state) }); onRestore(structuredClone(plan.state)); setName(plan.name); setVoyage(plan.voyage);
    setPreview(undefined); setRecovery(undefined); setSelected(items.some(p => p.id === plan.id) ? plan.id : '');
    setMessage('Cargo plan applied.');
    } catch(e){setMessage(e instanceof Error?e.message:'Cargo plan operation failed.');}
  }
  const summary = preview && evaluateWeights(preview.state.weights);
  return <section className="panel cargo-plans"><h1>{t('Cargo Plans')}</h1>
    <p>{t('Create a loading plan below. Save named plans in this browser or download a JSON backup to transfer them. Browser storage is local to this device and website address; clearing browser data removes it.')}</p>
    <div className="curve-inputs"><label>{t('Plan name')}<input maxLength={120} value={name} onChange={e => setName(e.target.value)}/></label><label>{t('Voyage / notes')}<input maxLength={200} value={voyage} onChange={e => setVoyage(e.target.value)}/></label></div>
    {state.scenario !== 'loading' && <p>{t('Manual mode is active. Plans contain the weight list; applying a plan selects weight-based loading.')}</p>}
    <div className="scene-toolbar">
      <button disabled={!ready || busy} onClick={() => { const plan = { kind: 'cargo-plan' as const, version: 1 as const, model, savedAt: new Date().toISOString(), id: crypto.randomUUID(), name: 'Untitled cargo plan', voyage: '', state: { scenario: 'loading' as const, cargoArea:state.cargoArea, weights: structuredClone(fixed), density: ship.manifest.defaultCondition.waterDensity, longitudinalFsm: 0, manual: {}, manualMode: 'displacement' as const } }; apply(plan); }}>{t('New plan (fixed weights only)')}</button>
      <button disabled={!ready || busy || !hydrated || !name.trim()} onClick={() => action(async () => {
        const plan = snapshot(); await planStorage('put', { key: `plan:${plan.id}`, model, plan }); setItems([...items, plan]); setSelected(plan.id); setMessage('Cargo plan saved.');
      })}>{t('Save as new plan')}</button>
      <button disabled={!ready || busy || !hydrated || !selected || !name.trim()} onClick={() => action(async () => {
        const plan = snapshot(selected); await planStorage('put', { key: `plan:${plan.id}`, model, plan }); setItems(items.map(p => p.id === selected ? plan : p)); setMessage('Cargo plan saved.');
      })}>{t('Update selected plan')}</button>
      <button disabled={!ready || busy} onClick={() => action(async () => {
        const plan = snapshot(); const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'cargo-plan.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
        setMessage('Cargo plan exported.');
      })}>{t('Download backup')}</button>
    </div>
    <label>{t('Saved cargo plans')} <select value={selected} onChange={e => setSelected(e.target.value)}><option value="">{t('Choose a plan')}</option>{items.map(p => <option key={p.id} value={p.id}>{p.name} · {new Date(p.savedAt).toLocaleString()}</option>)}</select></label>
    <div className="scene-toolbar"><button disabled={!selected || !ready || busy} onClick={() => setPreview(items.find(p => p.id === selected))}>{t('Preview selected plan')}</button>
      <button disabled={!selected || busy} onClick={() => action(async () => { await planStorage('delete', undefined, `plan:${selected}`); setItems(items.filter(p => p.id !== selected)); setSelected(''); setMessage('Named plan deleted. Current loading is unchanged.'); })}>{t('Delete named plan')}</button>
      <button disabled={!previous || busy} onClick={() => { if (previous) { onRestore(previous.state); setName(previous.name); setVoyage(previous.voyage); setPrevious(undefined); setSelected(''); } }}>{t('Undo plan application')}</button></div>
    <label>{t('Import cargo plan (JSON)')} <input type="file" accept=".json,application/json" disabled={!ready || busy} onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      void action(async () => { setPreview(undefined); if (file.size > 25_000_000) throw new Error('Cargo plan file exceeds 25 MB.'); setPreview(parseCargoPlan(JSON.parse(await file.text()), model, fixed, ship)); });
    }}/></label>
    {recovery && <div><p>{t('A recovery draft is available. Review it or discard it before automatic draft saving resumes.')}</p><button onClick={() => setPreview(recovery)}>{t('Review recovery draft')}</button> <button disabled={busy} onClick={() => action(async () => { await planStorage('delete', undefined, draftKey); setRecovery(undefined); setPreview(undefined); })}>{t('Discard recovery draft')}</button></div>}
    {preview && <section className="panel" aria-label={t('Cargo plan preview')}><h2>{preview.name}</h2><p>{preview.voyage}</p><p>{ship.manifest.name} · {preview.state.weights.length} {t('loading items')} · {summary?.result ? `${summary.result.displacementTonnes.toFixed(3)} t` : t('Incomplete loading inputs')}</p>
      <p>{t('Applying replaces the current weight list, water density and longitudinal FSM. Fixed vessel weights are checked. No weights are appended.')}</p>
      <details><summary>{t('Review loading items')}</summary><ul>{preview.state.weights.map(w => <li key={w.id}>{w.name}: {w.massTonnes || '—'} t · {w.category} · {w.hold} · LCG {w.lcg || '—'} m · KG {w.vcg || '—'} m · TCG {w.tcg || '—'} m · FSM {w.freeSurfaceMomentTransverse || '—'} t·m</li>)}</ul></details>
      <button disabled={busy} onClick={() => action(async () => apply(preview))}>{t('Apply cargo plan')}</button> <button onClick={() => setPreview(undefined)}>{t('Cancel preview')}</button></section>}
    <p className="muted">{t('Incomplete plans can be saved. Coordinates must be entered explicitly; hold names do not supply positions. Quantity is descriptive; Mass (t) is the total mass of the row.')}</p>
    <p role="status">{t(message)}</p>{!recovery && <p className="muted">{t(draftStatus)}</p>}
  </section>;
}
