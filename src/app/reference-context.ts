import { createContext, useContext } from 'react';
import { createReferenceTransform, sourceReference, type ReferenceSettings } from '../core/reference/reference-system';
const source = { origin: '', xPositive: 'forward', yPositive: 'starboard', zPositive: 'up' } as const;
const settings = sourceReference(source);
export const ReferenceContext = createContext({ settings, setSettings: (_value: ReferenceSettings) => {}, ...createReferenceTransform(source, settings) });
export function useReference() {
  const context = useContext(ReferenceContext);
  const symbol = (label: string) => context.settings.notation === 'nautical' ? label : label.replace(/VCG \/ KG|KG \/ VCG|VCG|KG|LCG|TCG|LCB|LCF|TCB|KB|KMt|KMl/g, token => ({ 'VCG / KG': 'zG', 'KG / VCG': 'zG', VCG: 'zG', KG: 'zG', LCG: 'xG', TCG: 'yG', LCB: 'xB', LCF: 'xF', TCB: 'yB', KB: 'zB', KMt: 'zMt', KMl: 'zMl' }[token] ?? token));
  return { ...context, symbol };
}
