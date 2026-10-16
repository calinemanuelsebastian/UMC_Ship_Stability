import {conditionRevision} from '../app/condition-transaction';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ShipModelPackage } from '../core/domain/ship-model';
import { modelSignature, type ScenarioState } from '../app/saved-scenarios';
import { parseCargoPlan, planStorage, type CargoPlan } from '../app/cargo-plans';
import { parseRecovery, queueRecoveryWrite, readPlanRecords, readRecoveryJournals, writeRecoveryJournal, recoveryPrefix, type RestorablePlan } from '../app/recovery';
import { evaluateWeights, type WeightDraft } from '../app/loading-state';
import { useLanguage } from '../app/language-context';

export function CargoPlans({ ship, state, fixed, ready, onRestore, onRecoveryAvailable }: { ship: ShipModelPackage; state: ScenarioState; fixed: WeightDraft[]; ready: boolean; onRestore: (value: ScenarioState) => void; onRecoveryAvailable?: (available:boolean)=>void }) {
  const { t } = useLanguage();
  const [writer] = useState(() => crypto.randomUUID());
  const model = modelSignature(ship), draftKey = `draft:${model}:${writer}`;
  const [items, setItems] = useState<CargoPlan[]>([]), [selected, setSelected] = useState('');
  const [name, setName] = useState(''), [voyage, setVoyage] = useState('');
  const [draftStatus, setDraftStatus] = useState('');
  const [backup,setBackup]=useState<{url:string;source:string}>();
  useEffect(()=>()=>{if(backup)URL.revokeObjectURL(backup.url);},[backup]);
  const [message, setMessage] = useState(''), [hydrated, setHydrated] = useState(false), [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState<RestorablePlan>(), [preview, setPreview] = useState<RestorablePlan>();
  const [previous, setPrevious] = useState<RestorablePlan>();
  const [appliedRevision,setAppliedRevision]=useState<string>();
  const sequence = useRef(Promise.resolve());
  const [drafts, setDrafts] = useState<{key:string;plan:RestorablePlan}[]>([]);
  const [refresh, setRefresh] = useState(0);
  const pendingFlush = useRef<(() => void) | undefined>(undefined);
  const snapshot = (id: string = crypto.randomUUID()): CargoPlan => parseCargoPlan({ kind: 'cargo-plan', version: 1, id,
    name: name.trim() || 'Untitled cargo plan', voyage, model, savedAt: new Date().toISOString(),
    state: { capacity:state.capacity, assessment:state.assessment, tweenDeck:state.tweenDeck, scenario: 'loading', cargoArea:state.cargoArea, weights: state.weights, density: state.density, longitudinalFsm: state.longitudinalFsm, manual: {}, manualMode: 'displacement' } }, model, fixed, ship);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    // Read each store independently: an unavailable store must not hide the other.
    Promise.allSettled([planStorage('read'), Promise.resolve().then(() => readRecoveryJournals(localStorage))]).then(results => {
      if (!active) return;
      const db = results[0], journal = results[1];
      const records = db.status === 'fulfilled' ? db.value : [];
      const fallback = journal.status === 'fulfilled' ? journal.value : {records:[],damaged:0};
      const loaded = readPlanRecords([...records, ...fallback.records], model, fixed, ship);
      setItems(loaded.plans); setDrafts(loaded.drafts); setRecovery(loaded.drafts[0]?.plan);
      setHydrated(true);
      if (loaded.damaged + fallback.damaged) setMessage('Some saved records could not be read. They were retained; other plans and recovery remain available.');
      else if (db.status === 'rejected' || journal.status === 'rejected') setMessage('One local storage service is unavailable. Download a backup of important changes.');
    });
    return () => { active = false; };
  }, [model, ready, fixed, ship, refresh]);
  const encoded = JSON.stringify({ state, name, voyage });
  useLayoutEffect(() => {
    if (!ready || !hydrated || recovery) return;
    let flushed = false;
    const create = () => parseRecovery({kind:'recovery-plan',version:1,id:writer,
      name:name.trim() || 'Untitled cargo plan',voyage,model,savedAt:new Date().toISOString(),state},model,fixed,ship);
    const flushJournal = () => {
      if (flushed) return;
      try { writeRecoveryJournal(localStorage,draftKey,{key:draftKey,model,plan:create()}); }
      catch { /* The unload warning below remains active; never claim this write succeeded. */ }
    };
    pendingFlush.current = flushJournal;
    setDraftStatus('Saving recovery draft…');
    const timer = setTimeout(() => {
      try {
        const plan = create();
        sequence.current = queueRecoveryWrite(sequence.current,localStorage,{key:draftKey,model,plan},record=>planStorage('put',record)).catch(error => {
            const raw=localStorage.getItem(recoveryPrefix+draftKey);
            if(!raw || Date.parse(JSON.parse(raw).plan.savedAt)<Date.parse(plan.savedAt)) writeRecoveryJournal(localStorage,draftKey,{key:draftKey,model,plan});
            if (pendingFlush.current === flushJournal) setMessage(error instanceof Error ? error.message : 'Local cargo storage failed. Export a backup instead.');
        }).then(() => {
          flushed = true;
          if (pendingFlush.current === flushJournal) { pendingFlush.current = undefined; setDraftStatus('Recovery draft saved locally.'); }
        }).catch(e => { if (pendingFlush.current === flushJournal) { setMessage(e.message); setDraftStatus('Draft recovery could not be saved.'); } });
      } catch (e) { setDraftStatus('Draft recovery could not be saved.'); setMessage(e instanceof Error ? e.message : 'Draft recovery could not be saved.'); }
    }, 250);
    return () => { clearTimeout(timer); };
    // The serialized input tracks the complete condition, including assessment and manual mode.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [encoded, ready, hydrated, recovery, draftKey, model]);
  useEffect(() => {
    const flush = () => pendingFlush.current?.();
    const hide = () => { if (document.visibilityState === 'hidden') flush(); };
    const warn = (event: BeforeUnloadEvent) => { if (pendingFlush.current) { flush(); event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('pagehide',flush); document.addEventListener('visibilitychange',hide); window.addEventListener('beforeunload',warn);
    return () => { flush(); window.removeEventListener('pagehide',flush); document.removeEventListener('visibilitychange',hide); window.removeEventListener('beforeunload',warn); };
  }, []);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    try { await work(); } catch (e) { setMessage(e instanceof Error ? e.message : 'Cargo plan operation failed.'); }
    finally { setBusy(false); }
  }
  function apply(plan: RestorablePlan) {
    try {
    setPrevious({ ...plan, name: name || 'Untitled cargo plan', voyage, state: structuredClone(state) }); onRestore(structuredClone(plan.state)); setAppliedRevision(conditionRevision(plan.state)); setName(plan.name); setVoyage(plan.voyage);
    setPreview(undefined); setRecovery(undefined); setSelected(items.some(p => p.id === plan.id) ? plan.id : '');
    setMessage('Cargo plan applied.');
    } catch(e){setMessage(e instanceof Error?e.message:'Cargo plan operation failed.');}
  }
  useEffect(()=>{onRecoveryAvailable?.(!!recovery);},[recovery,onRecoveryAvailable]);
  const summary = preview && evaluateWeights(preview.state.weights);
  return <section className="panel cargo-plans"><h1>{t('Cargo Plans')}</h1>
    <p>{t('Create a loading plan below. Save named plans in this browser or download a JSON backup to transfer them. Browser storage is local to this device and website address; clearing browser data removes it.')}</p>
    <div className="curve-inputs"><label>{t('Plan name (optional)')}<input maxLength={120} value={name} onChange={e => setName(e.target.value)}/></label><label>{t('Voyage / notes (optional)')}<input maxLength={200} value={voyage} onChange={e => setVoyage(e.target.value)}/></label></div>
 <p className="muted">{t('Leave the name blank to use a default name.')}</p>
    {state.scenario !== 'loading' && <p>{t('Manual mode is active. Plans contain the weight list; applying a plan selects weight-based loading.')}</p>}
    <div className="scene-toolbar">
      <button disabled={!ready || busy} onClick={() => { const plan = { kind: 'cargo-plan' as const, version: 1 as const, model, savedAt: new Date().toISOString(), id: crypto.randomUUID(), name: 'Untitled cargo plan', voyage: '', state: { scenario: 'loading' as const, cargoArea:state.cargoArea, weights: structuredClone(fixed), density: ship.manifest.defaultCondition.waterDensity, longitudinalFsm: 0, manual: {}, manualMode: 'displacement' as const } }; apply(plan); }}>{t('New plan (fixed weights only)')}</button>
      <button disabled={!ready || busy || !hydrated} onClick={() => action(async () => {
        const plan = snapshot(); await planStorage('put', { key: `plan:${plan.id}`, model, plan }, undefined, null); setItems([...items, plan]); setSelected(plan.id); setMessage('Cargo plan saved.');
      })}>{t('Save as new plan')}</button>
      <button disabled={!ready || busy || !hydrated || !selected} onClick={() => action(async () => {
        const plan = snapshot(selected); await planStorage('put', { key: `plan:${plan.id}`, model, plan }, undefined, items.find(p=>p.id===selected)?.savedAt ?? null); setItems(items.map(p => p.id === selected ? plan : p)); setMessage('Cargo plan saved.');
      })}>{t('Update selected plan')}</button>
      <button disabled={!ready || busy} onClick={() => action(async () => {
        const plan = snapshot(); const url = URL.createObjectURL(new Blob([JSON.stringify(plan, null, 2)], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'cargo-plan.json'; document.body.appendChild(link); link.click(); link.remove(); setBackup({url,source:encoded});
        setMessage('Cargo plan exported.');
      })}>{t('Download backup')}</button>
      {backup?.source===encoded&&<a href={backup.url} download="cargo-plan.json">{t('Download prepared backup')}</a>}
    </div>
    <label>{t('Saved cargo plans')} <select value={selected} onChange={e => setSelected(e.target.value)}><option value="">{t('Choose a plan')}</option>{items.map(p => <option key={p.id} value={p.id}>{p.name} · {new Date(p.savedAt).toLocaleString()}</option>)}</select></label>
    <div className="scene-toolbar"><button disabled={!selected || !ready || busy} onClick={() => setPreview(items.find(p => p.id === selected))}>{t('Preview selected plan')}</button>
      <button disabled={!selected || busy} onClick={() => action(async () => { await planStorage('delete', undefined, `plan:${selected}`, items.find(p=>p.id===selected)?.savedAt ?? null); setItems(items.filter(p => p.id !== selected)); setSelected(''); setMessage('Named plan deleted. Current loading is unchanged.'); })}>{t('Delete named plan')}</button>
      <button disabled={!previous || busy || appliedRevision!==conditionRevision(state)} onClick={() => { if (previous && appliedRevision===conditionRevision(state)) { onRestore(previous.state); setName(previous.name); setVoyage(previous.voyage); setPrevious(undefined); setSelected(''); } }}>{t('Undo plan application')}</button></div>
    <label>{t('Import cargo plan (JSON)')} <input type="file" accept=".json,application/json" disabled={!ready || busy} onChange={e => {
      const file = e.target.files?.[0]; e.target.value = ''; if (!file) return;
      void action(async () => { setPreview(undefined); if (file.size > 25_000_000) throw new Error('Cargo plan file exceeds 25 MB.'); setPreview(parseCargoPlan(JSON.parse(await file.text()), model, fixed, ship)); });
    }}/></label>
    <button disabled={busy} onClick={()=>setRefresh(v=>v+1)}>{t('Reload saved plans')}</button>
    {recovery && <div><label>{t('Recovery draft')} <select value={drafts.find(d=>d.plan===recovery)?.key??''} onChange={e=>{setRecovery(drafts.find(d=>d.key===e.target.value)?.plan);setPreview(undefined);}}>{drafts.map(d=><option key={d.key} value={d.key}>{d.plan.name} · {new Date(d.plan.savedAt).toLocaleString()}</option>)}</select></label><p>{t('A recovery draft is available. Review it or keep the current condition to resume automatic saving.')}</p><button onClick={() => setPreview(recovery)}>{t('Review recovery draft')}</button> <button onClick={()=>{setRecovery(undefined);setPreview(undefined);}}>{t('Keep current condition')}</button> <button disabled={busy} onClick={() => action(async () => { const entry=drafts.find(d=>d.plan===recovery); if(entry){const records=await planStorage('read');const stored=records.find(r=>r.key===entry.key);if(stored){if(Date.parse(stored.plan.savedAt)>Date.parse(entry.plan.savedAt))throw new Error('This plan changed in another tab. Reload the saved plans before updating it.');await planStorage('delete',undefined,entry.key,stored.plan.savedAt);}const raw=localStorage.getItem(recoveryPrefix+entry.key);if(raw&&Date.parse(JSON.parse(raw).plan.savedAt)>Date.parse(entry.plan.savedAt))throw new Error('This plan changed in another tab. Reload the saved plans before updating it.');localStorage.removeItem(recoveryPrefix+entry.key);} setDrafts(ds=>ds.filter(d=>d!==entry)); setRecovery(undefined); setPreview(undefined); })}>{t('Discard recovery draft')}</button></div>}
    {preview?.kind==='recovery-plan' && <p>{t('Recovery restores the full condition, including assessment settings and manual inputs.')}</p>}
    {preview && <section className="panel" aria-label={t('Cargo plan preview')}><h2>{preview.name}</h2><p>{preview.voyage}</p><p>{ship.manifest.name} · {preview.state.weights.length} {t('loading items')} · {summary?.result ? `${summary.result.displacementTonnes.toFixed(3)} t` : t('Incomplete loading inputs')}</p>
      <p>{t('Applying replaces the current weight list, water density and longitudinal FSM. Fixed vessel weights are checked. No weights are appended.')}</p>
      <details><summary>{t('Review loading items')}</summary><ul>{preview.state.weights.map(w => <li key={w.id}>{w.name}: {w.massTonnes || '—'} t · {w.category} · {w.hold} · LCG {w.lcg || '—'} m · KG {w.vcg || '—'} m · TCG {w.tcg || '—'} m · FSM {w.freeSurfaceMomentTransverse || '—'} t·m</li>)}</ul></details>
      <button disabled={busy} onClick={() => action(async () => apply(preview))}>{t('Apply cargo plan')}</button> <button onClick={() => setPreview(undefined)}>{t('Cancel preview')}</button></section>}
    <p className="muted">{t('Incomplete plans can be saved. Coordinates must be entered explicitly; hold names do not supply positions. Quantity is descriptive; Mass (t) is the total mass of the row.')}</p>
    <p role="status">{t(message)}</p>{!recovery && <p className="muted">{t(draftStatus)}</p>}
  </section>;
}
