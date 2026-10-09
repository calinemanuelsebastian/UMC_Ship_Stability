import type { WeightDraft } from './loading-state';
export type MovementAxis = 'lcg' | 'tcg';
type Edit = { id: string; axis: MovementAxis; before: string; after: string };
/** Model-session history survives view unmounts. One interaction is one undo step. */
export class MovementHistory {
  private edits: Edit[] = [];
  private baseline = new Map<string, Partial<Record<MovementAxis, string>>>();
  private grouping = false;
  private active: Edit | undefined;
  clear() { this.edits = []; this.baseline.clear(); this.end(); }
  begin() { this.grouping = true; this.active = undefined; }
  end() { this.grouping = false; this.active = undefined; }
  initial(id: string, axis: MovementAxis) { return this.baseline.get(id)?.[axis]; }
  record(id: string, axis: MovementAxis, before: string, after: string) {
    if (before === after) return;
    const original = this.baseline.get(id) ?? {};
    if (original[axis] === undefined) original[axis] = before;
    this.baseline.set(id, original);
    if (this.grouping && this.active?.id === id && this.active.axis === axis && this.active.after === before) {
      this.active.after = after;
    } else {
      const edit = { id, axis, before, after };
      this.edits.push(edit); this.edits = this.edits.slice(-100);
      this.active = this.grouping ? edit : undefined;
    }
  }
  private applicable(edit: Edit, weights: WeightDraft[]) {
    return edit.before !== edit.after && weights.find(w => w.id === edit.id)?.[edit.axis] === edit.after;
  }
  canUndo(weights: WeightDraft[]) { return this.edits.some(edit => this.applicable(edit, weights)); }
  undo(weights: WeightDraft[]) {
    this.end();
    while (this.edits.length) {
      const edit = this.edits.pop()!;
      if (this.applicable(edit, weights)) return edit;
    }
    return undefined;
  }
}
