import type { ShipModelPackage } from '../core/domain/ship-model';
import { parseCargoPlan, type CargoPlan, type PlanRecord } from './cargo-plans';
import { parseScenario, type SavedScenario } from './saved-scenarios';
import type { WeightDraft } from './loading-state';

export type RecoveryPlan = SavedScenario & { kind: 'recovery-plan'; voyage: string };
export type RestorablePlan = CargoPlan | RecoveryPlan;
export const recoveryPrefix = 'umc-recovery-v2:';
export const maxRecoveryBytes = 25_000_000;
export function parseRecovery(value: unknown, model: string, fixed: WeightDraft[], ship?: ShipModelPackage): RecoveryPlan {
  const raw = value as Partial<RecoveryPlan> | null;
  if (!raw || raw.kind !== 'recovery-plan') throw new Error('Invalid recovery draft.');
  const scenario = parseScenario(value, model);
  // Reuse fixed-weight and cargo validation without converting the restored mode.
  const cargo = parseCargoPlan({ ...raw, kind: 'cargo-plan', state: { ...scenario.state, scenario: 'loading' } }, model, fixed, ship);
  return { ...scenario, kind: 'recovery-plan', voyage: cargo.voyage };
}
export function readPlanRecords(records: unknown[], model: string, fixed: WeightDraft[], ship?: ShipModelPackage) {
  const plans: CargoPlan[] = [], drafts: { key: string; plan: RestorablePlan }[] = [];
  let damaged = 0;
  for (const value of records) {
    const record = value as Partial<PlanRecord> | null;
    if (!record || record.model !== model) continue;
    try {
      if (typeof record.key !== 'string') throw new Error('Missing key');
      const plan = record.plan?.kind === 'recovery-plan' ? parseRecovery(record.plan, model, fixed, ship) : parseCargoPlan(record.plan, model, fixed, ship);
      if (record.key.startsWith('draft:')) drafts.push({ key: record.key, plan });
      else if (record.key === `plan:${plan.id}` && plan.kind === 'cargo-plan') plans.push(plan);
      else throw new Error('Invalid record key');
    } catch { damaged++; }
  }
  // Validate before merging: a damaged journal must never hide a valid database copy.
  const latest = new Map<string, {key:string;plan:RestorablePlan}>();
  for (const entry of drafts) {
    const old = latest.get(entry.key);
    if (!old || Date.parse(entry.plan.savedAt) >= Date.parse(old.plan.savedAt)) latest.set(entry.key, entry);
  }
  return { plans, drafts: [...latest.values()].sort((a,b) => Date.parse(b.plan.savedAt) - Date.parse(a.plan.savedAt)), damaged };
}
export function writeRecoveryJournal(storage: Pick<Storage,'setItem'>, key: string, record: PlanRecord) {
  const json = JSON.stringify(record);
  if (json.length > maxRecoveryBytes) throw new Error('Recovery draft exceeds 25 MB. Download a backup.');
  storage.setItem(recoveryPrefix + key, json);
}
export function readRecoveryJournals(storage: Pick<Storage,'length'|'key'|'getItem'>) {
  const records: unknown[] = []; let damaged = 0;
  for (let i=0; i<storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(recoveryPrefix)) continue;
    try {
      const raw = storage.getItem(key);
      if (!raw || raw.length > maxRecoveryBytes) throw new Error('Invalid journal');
      records.push(JSON.parse(raw));
    } catch { damaged++; }
  }
  return { records, damaged };
}

// Checkpoint synchronously before joining the database queue. A blocked older
// write must not prevent newer input from reaching the crash-recovery journal.
export function queueRecoveryWrite(previous: Promise<void>, storage: Pick<Storage,'getItem'|'setItem'|'removeItem'>, record: PlanRecord, persist: (record:PlanRecord)=>Promise<unknown>): Promise<void> {
  try { writeRecoveryJournal(storage,record.key,record); }
  catch { /* Database saving remains available if localStorage is full/disabled. */ }
  return previous.catch(()=>{}).then(async()=>{
    await persist(record);
    try {
      const raw=storage.getItem(recoveryPrefix+record.key);
      if(raw === JSON.stringify(record)) storage.removeItem(recoveryPrefix+record.key);
    } catch { /* A committed database write remains successful if cleanup fails. */ }
  });
}
