import type { StabilityPoint, StabilityResult } from '../domain/stability-result';
export type HeelRoot = { heelDeg: number; stability: 'stable' | 'unstable' | 'one-sided / indeterminate'; slopeMetresPerRadian: number };
/** Equilibria of the piecewise-linear corrected GZ curve; never extrapolate. */
export function findHeelEquilibria(points: StabilityPoint[]) {
  if (points.length < 3 || points.some((p,i) => !Number.isFinite(p.heelDeg) || !Number.isFinite(p.gzCorrected) || i > 0 && p.heelDeg <= points[i-1].heelDeg)) throw new Error('Heel equilibrium requires at least three ordered finite GZ samples.');
  const roots: HeelRoot[] = [];
  const eps = 1e-10;
  const neutralIntervals: { fromDeg: number; toDeg: number }[] = [];
  for (let i=0;i<points.length-1;i++) {
    if (Math.abs(points[i].gzCorrected)<=eps && Math.abs(points[i+1].gzCorrected)<=eps) {
      const previous=neutralIntervals.at(-1);
      if(previous?.toDeg===points[i].heelDeg) previous.toDeg=points[i+1].heelDeg;
      else neutralIntervals.push({fromDeg:points[i].heelDeg,toDeg:points[i+1].heelDeg});
    }
  }
  for (let i=0;i<points.length;i++) {
    const p=points[i], next=points[i+1], prev=points[i-1];
    if (Math.abs(p.gzCorrected) <= eps && prev && next && !neutralIntervals.some(range => p.heelDeg >= range.fromDeg && p.heelDeg <= range.toDeg)) {
      const left=(p.gzCorrected-prev.gzCorrected)/(p.heelDeg-prev.heelDeg), right=(next.gzCorrected-p.gzCorrected)/(next.heelDeg-p.heelDeg);
      roots.push({heelDeg:p.heelDeg,stability:left>eps && right>eps?'stable':left < -eps && right < -eps?'unstable':'one-sided / indeterminate',slopeMetresPerRadian:Math.min(left,right)*180/Math.PI});
    } else if (next && Math.abs(p.gzCorrected)>eps && Math.abs(next.gzCorrected)>eps && p.gzCorrected*next.gzCorrected<0) {
      const slope=(next.gzCorrected-p.gzCorrected)/(next.heelDeg-p.heelDeg);
      roots.push({heelDeg:p.heelDeg-p.gzCorrected/slope,stability:slope>0?'stable':'unstable',slopeMetresPerRadian:slope*180/Math.PI});
    }
  }
  const stable = roots.filter(root => root.stability === 'stable');
  return { roots, neutralIntervals, equilibrium: stable.length===1 && neutralIntervals.length===0 ? stable[0] : undefined, message: neutralIntervals.length ? 'The sampled curve contains a neutral interval; no unique attitude is selected.' : stable.length>1 ? 'Multiple stable heel equilibria: no single attitude is selected.' : stable.length===0 ? 'No isolated stable heel equilibrium was found inside the sampled range.' : 'Stable heel equilibrium of the interpolated corrected GZ curve.' };
}
export function heelEquilibrium(result: StabilityResult) { const solution=findHeelEquilibria(result.points); const limit=result.downflooding?.firstReachedAngle; if(solution.equilibrium&&limit!==undefined&&solution.equilibrium.heelDeg>=limit)return {...solution,equilibrium:undefined,message:'The curve root reaches or exceeds a supplied downflooding threshold; no 3D equilibrium attitude is selected.'}; return solution; }
