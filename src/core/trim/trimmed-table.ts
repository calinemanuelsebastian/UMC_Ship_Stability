import type { ShipModelPackage } from '../domain/ship-model';

type Row = { displacementTonnes: number; draft: number; lcb: number; lcf?: number; kmTransverse?: number };
export type TrimmedTable = {
  version: 1; modelId: string; source: string; waterDensity: number;
  xPositive: 'forward' | 'aft'; longitudinalOriginFromAP: number;
  trimPositive: 'bow'; draftDatumFromAP?: number; mouldedDraftOffset?: number;
  tables: { trimMetres: number; rows: Row[] }[];
};
const finite = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);
const object = (x: unknown): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x);
export function parseTrimmedTable(value: unknown): TrimmedTable {
  if (!object(value) || value.version !== 1 || typeof value.modelId !== 'string' || !value.modelId.trim() || typeof value.source !== 'string' || !value.source.trim()
    || !finite(value.waterDensity) || value.waterDensity <= 0 || !['forward', 'aft'].includes(String(value.xPositive))
    || !finite(value.longitudinalOriginFromAP) || value.trimPositive !== 'bow'
    || (value.mouldedDraftOffset !== undefined && (!finite(value.mouldedDraftOffset) || value.mouldedDraftOffset < 0))
    || (value.draftDatumFromAP !== undefined && !finite(value.draftDatumFromAP))
    || !Array.isArray(value.tables) || value.tables.length < 2 || value.tables.length > 100) throw new Error('Invalid trimmed-table metadata.');
  let previousTrim = -Infinity;
  for (const table of value.tables) {
    if (!object(table) || !finite(table.trimMetres) || table.trimMetres <= previousTrim || !Array.isArray(table.rows) || table.rows.length < 2 || table.rows.length > 10000) throw new Error('Trim tables must be strictly ordered and contain at least two rows.');
    previousTrim = table.trimMetres;
    let previousMass = 0;
    let previousDraft = -Infinity;
    for (const row of table.rows) {
      if (!object(row) || !finite(row.displacementTonnes) || row.displacementTonnes <= previousMass || !finite(row.draft) || row.draft <= 0 || row.draft <= previousDraft || !finite(row.lcb)
        || (row.lcf !== undefined && !finite(row.lcf)) || (row.kmTransverse !== undefined && (!finite(row.kmTransverse) || row.kmTransverse <= 0))) throw new Error('Table rows require increasing positive displacement and draft, and finite LCB.');
      previousMass = row.displacementTonnes; previousDraft = row.draft;
    }
  }
  return value as TrimmedTable;
}
export function validateTrimmedTableShip(data: TrimmedTable, ship: ShipModelPackage) {
  const { id, units, coordinateSystem: c } = ship.manifest;
  if (data.modelId !== id || data.xPositive !== c.xPositive || data.longitudinalOriginFromAP !== c.longitudinalOriginFromAP
    || units.length !== 'm' || units.mass !== 't' || units.density !== 't/m3' || units.angle !== 'deg' || c.zPositive !== 'up') throw new Error('The trimmed table must match this vessel and its source coordinates and units.');
}

/** Workbook-style LCB/LCG balance at fixed displacement; not a coupled attitude solver. */
function calculateTableTrim(data: TrimmedTable, inputs: { displacementTonnes: number; lcg: number; waterDensity: number }, lbp: number) {
  parseTrimmedTable(data);
  const { displacementTonnes: mass, lcg, waterDensity } = inputs;
  if (![mass, lcg, waterDensity, lbp].every(finite) || mass <= 0 || lbp <= 0 || waterDensity <= 0) throw new Error('Table trim requires positive displacement, density and LBP, and finite LCG.');
  if (Math.abs(waterDensity - data.waterDensity) > 1e-10) throw new Error('Water density must match the trimmed table.');
  if (data.draftDatumFromAP !== undefined && (data.draftDatumFromAP < 0 || data.draftDatumFromAP > lbp)) throw new Error('The draft datum must lie between AP and FP.');
  const blend = (a: number, b: number, f: number) => a + f * (b - a);
  const samples = data.tables.map(table => {
    const rows = table.rows;
    if (mass < rows[0].displacementTonnes || mass > rows.at(-1)!.displacementTonnes) return undefined;
    const index = rows.findIndex(row => row.displacementTonnes >= mass);
    const b = rows[index], a = b.displacementTonnes === mass ? b : rows[index - 1];
    const fraction = a === b ? 0 : (mass - a.displacementTonnes) / (b.displacementTonnes - a.displacementTonnes);
    return { trimMetres: table.trimMetres, draft: blend(a.draft, b.draft, fraction), lcb: blend(a.lcb, b.lcb, fraction),
      lcf: a.lcf !== undefined && b.lcf !== undefined ? blend(a.lcf, b.lcf, fraction) : undefined };
  });
  const candidates: { trimMetres: number; draft: number; lcb: number; lcf?: number; bracket: number[]; fraction: number }[] = [];
  for (let i = 0; i < samples.length - 1; i++) {
    const a = samples[i], b = samples[i + 1];
    if (!a || !b) continue; // Never bridge a table with missing displacement coverage.
    const da = a.lcb - lcg, db = b.lcb - lcg;
    if (Math.abs(da) < 1e-10 && Math.abs(db) < 1e-10) throw new Error('LCB balance is indeterminate across a trim interval.');
    if (da * db > 0 && Math.abs(da) >= 1e-10 && Math.abs(db) >= 1e-10) continue;
    const fraction = Math.abs(da) < 1e-10 ? 0 : Math.abs(db) < 1e-10 ? 1 : -da / (db - da);
    const trimMetres = blend(a.trimMetres, b.trimMetres, fraction);
    if (candidates.some(c => Math.abs(c.trimMetres - trimMetres) < 1e-10)) continue;
    candidates.push({ trimMetres, draft: blend(a.draft, b.draft, fraction), lcb: blend(a.lcb, b.lcb, fraction),
      lcf: fraction === 0 ? a.lcf : fraction === 1 ? b.lcf : a.lcf !== undefined && b.lcf !== undefined ? blend(a.lcf, b.lcf, fraction) : undefined,
      bracket: [a.trimMetres, b.trimMetres], fraction });
  }
  if (candidates.length !== 1) throw new Error(candidates.length ? 'Multiple trim balances exist in these tables.' : 'No trim balance is bracketed by the available tables.');
  const result = candidates[0];
  const datum = data.draftDatumFromAP;
  const draftAft = datum === undefined ? undefined : result.draft - result.trimMetres * datum / lbp;
  const draftForward = draftAft === undefined ? undefined : draftAft + result.trimMetres;
  const trimDeg = Math.atan(result.trimMetres / lbp) * 180 / Math.PI;
  if (![result.draft, result.lcb, result.trimMetres, trimDeg, ...(draftAft === undefined ? [] : [draftAft, draftForward!])].every(finite)) throw new Error('Table interpolation exceeds the supported numeric range.');
  if (draftAft !== undefined && Math.min(draftAft, draftForward!) <= 0) throw new Error('Interpolated end drafts must be positive.');
  return { ...result, mouldedDraft: data.mouldedDraftOffset===undefined?undefined:result.draft-data.mouldedDraftOffset, kmTransverse: interpolateTrimmedKm(data,mass,result.trimMetres), trimDeg, draftAft, draftForward, samples, residualLever: result.lcb - lcg };
}

/** Interpolate KM only across populated mass/trim brackets; never substitute even-keel KM. */
export function interpolateTrimmedKm(data:TrimmedTable,mass:number,trim:number):number|undefined {
 if(!finite(mass)||!finite(trim)||mass<=0||trim<data.tables[0].trimMetres||trim>data.tables.at(-1)!.trimMetres)return undefined;
 const hi=data.tables.findIndex(t=>t.trimMetres>=trim),lo=data.tables[hi].trimMetres===trim?hi:hi-1;
 const at=(index:number)=>{
  const rows=data.tables[index].rows;if(mass<rows[0].displacementTonnes||mass>rows.at(-1)!.displacementTonnes)return undefined;
  const j=rows.findIndex(r=>r.displacementTonnes>=mass),i=rows[j].displacementTonnes===mass?j:j-1;
  const a=rows[i],b=rows[j];if(a.kmTransverse===undefined||b.kmTransverse===undefined)return undefined;
  return i===j?a.kmTransverse:a.kmTransverse+(b.kmTransverse-a.kmTransverse)*(mass-a.displacementTonnes)/(b.displacementTonnes-a.displacementTonnes);
 };
 const a=at(lo),b=at(hi);if(a===undefined||b===undefined)return undefined;
 return lo===hi?a:a+(b-a)*(trim-data.tables[lo].trimMetres)/(data.tables[hi].trimMetres-data.tables[lo].trimMetres);
}

const trimResults=new WeakMap<TrimmedTable,Map<string,ReturnType<typeof calculateTableTrim>>>();
export function computeTableTrim(data:TrimmedTable,inputs:{displacementTonnes:number;lcg:number;waterDensity:number},lbp:number){
 // Mutable caller-owned tables bypass caching; parsed shared resources are frozen.
 if(!Object.isFrozen(data))return calculateTableTrim(data,inputs,lbp);
 const key=[inputs.displacementTonnes,inputs.lcg,inputs.waterDensity,lbp].map(v=>String(v)).join('|');
 let cache=trimResults.get(data);if(!cache){cache=new Map();trimResults.set(data,cache);}
 const hit=cache.get(key);if(hit){cache.delete(key);cache.set(key,hit);return hit;}
 const result=Object.freeze(calculateTableTrim(data,inputs,lbp));cache.set(key,result);
 if(cache.size>16)cache.delete(cache.keys().next().value!);return result;
}
