import type { RecoveryPlan } from './recovery';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {panelWeight} from './tween-deck';
import { parseScenario, type ScenarioState } from './saved-scenarios';
import { numericFields, type WeightDraft } from './loading-state';
export type CargoPlan = { kind: 'cargo-plan'; version: 1; id: string; name: string; voyage: string; model: string; savedAt: string; state: ScenarioState };
export function parseCargoPlan(value: unknown, model: string, fixed: WeightDraft[],ship?:ShipModelPackage): CargoPlan {
  const raw = value as Partial<CargoPlan> | null;
  if (!raw || raw.kind !== 'cargo-plan' || typeof raw.voyage !== 'string' || raw.voyage.length > 200) throw new Error('Invalid cargo plan file.');
  const scenario = parseScenario(value, model);
  if (scenario.state.density !== undefined && scenario.state.density <= 0 || scenario.state.longitudinalFsm !== undefined && scenario.state.longitudinalFsm < 0) throw new Error('Density must be positive and longitudinal FSM non-negative.');
  if (scenario.state.scenario !== 'loading') throw new Error('Cargo plans require weight-based loading.');
  for (const original of fixed) {
    const base=panelWeight(original,scenario.state.tweenDeck??'installed',ship);
    const w = scenario.state.weights.find(w => w.id === base.id);
    if (!w || numericFields.some(k => Number(w[k]) !== Number(base[k]) || !w[k].trim())) throw new Error('The plan changes or omits a fixed vessel weight.');
  }
  for (const w of scenario.state.weights) {
    if (w.quantity && (!/^\d+$/.test(w.quantity) || !Number.isSafeInteger(Number(w.quantity)) || Number(w.quantity) < 1)) throw new Error('Quantity must be a positive whole number or blank.');
    if (w.category && !['cargo','ballast','fuel','freshwater','other'].includes(w.category)) throw new Error('Invalid cargo category.');
    for (const k of ['massTonnes','freeSurfaceMomentTransverse'] as const) if (w[k].trim() && Number(w[k]) < 0) throw new Error('Mass and free-surface moment cannot be negative.');
  }
  return { ...scenario, kind: 'cargo-plan', voyage: raw.voyage };
}

export type PlanRecord = { key: string; model: string; plan: CargoPlan | RecoveryPlan };
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open('umc-cargo-plans', 1);
    req.onupgradeneeded = () => req.result.createObjectStore('plans', { keyPath: 'key' });
    req.onsuccess = () => { req.result.onversionchange = () => req.result.close(); resolve(req.result); };
    req.onerror = () => reject(new Error('Local cargo storage is unavailable. Export a backup instead.'));
    req.onblocked = () => reject(new Error('Close other simulator tabs to open local cargo storage.'));
  });
}
export async function planStorage(action: 'read' | 'put' | 'delete', record?: PlanRecord, key?: string, expected?: string | null): Promise<PlanRecord[]> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction('plans', action === 'read' ? 'readonly' : 'readwrite');
      const store = tx.objectStore('plans');
      let conflict = false;
      const req = action === 'read' ? store.getAll() : store.get(action === 'put' ? record!.key : key!);
      if (action !== 'read') req.onsuccess = () => {
        const current = req.result as PlanRecord | undefined;
        if (expected !== undefined && (current?.plan?.savedAt ?? null) !== expected) { conflict = true; tx.abort(); return; }
        if (action === 'put') store.put(record!); else store.delete(key!);
      };
      tx.oncomplete = () => resolve(action === 'read' ? req.result as PlanRecord[] : []);
      tx.onabort = tx.onerror = () => reject(new Error(conflict ? 'This plan changed in another tab. Reload the saved plans before updating it.' : 'Local cargo storage failed. Export a backup instead.'));
    });
  } finally { db.close(); }
}
