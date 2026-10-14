// Refuse input fields that the historical parser would silently omit.
export function requirePreservedFields(raw: unknown, parsed: unknown, path = 'inputs'): void {
  if (!raw || typeof raw !== 'object') return;
  for (const [key, value] of Object.entries(raw)) {
    // Imported calculation results are deliberately discarded and recomputed.
    if (value === undefined || path === 'inputs' && (key === 'result' || key === 'results')) continue;
    if (!parsed || typeof parsed !== 'object' || !Object.prototype.hasOwnProperty.call(parsed, key)) {
      throw new Error(`This plan requires a newer simulator (${path}.${key}). It was not loaded. Return to the current version; keep the original backup.`);
    }
    requirePreservedFields(value, (parsed as Record<string, unknown>)[key], `${path}.${key}`);
  }
}
