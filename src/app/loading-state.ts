import type { LoadingWeight } from '../core/domain/loading-condition';
import { computeLoadingCondition } from '../core/loading/compute-loading-condition';
import type { Footprint } from './cargo-layout';
export const numericFields = ['massTonnes', 'lcg', 'vcg', 'tcg', 'freeSurfaceMomentTransverse'] as const;
export type WeightDraft = { tank?: {id:string;volumeM3:number;density:number}; id: string; name: string; category?: string; hold?: string; quantity?: string; footprint?: Footprint } & Record<typeof numericFields[number], string>;
export const draftWeights = (weights: LoadingWeight[]): WeightDraft[] => weights.map(item => ({ id: item.id, name: item.name, massTonnes: String(item.massTonnes), lcg: String(item.lcg), vcg: String(item.vcg), tcg: String(item.tcg), freeSurfaceMomentTransverse: String(item.freeSurfaceMomentTransverse ?? 0) }));
export function evaluateWeights(weights: WeightDraft[]) {
  try {
    const result = computeLoadingCondition(weights.map(item => {
      if (numericFields.some(key => item[key].trim() === '')) throw new Error('Complete every mass and coordinate before calculating.');
      return { ...item, ...Object.fromEntries(numericFields.map(key => [key, Number(item[key])])) } as unknown as LoadingWeight;
    }));
    return { result, error: '' };
  } catch (error) { return { result: undefined, error: error instanceof Error ? error.message : 'Unable to calculate loading condition.' }; }
}
