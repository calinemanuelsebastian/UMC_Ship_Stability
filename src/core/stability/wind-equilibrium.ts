import type {StabilityResult} from '../domain/stability-result';
import {heelEquilibrium} from './heel-equilibrium';

/** Positive/source-starboard wind only. No port mirroring or additional FSM correction. */
export function steadyWindEquilibrium(curve:StabilityResult, steadyLever:number) {
 if(!Number.isFinite(steadyLever)||steadyLever<0)throw new Error('Invalid steady wind lever.');
 const shifted={...curve,points:curve.points.map(p=>({...p,gzCorrected:p.gzCorrected-steadyLever}))};
 const solution=heelEquilibrium(shifted);
 const angle=solution.equilibrium?.heelDeg;
 return {...solution,angle,marginTo16:angle===undefined?undefined:16-Math.abs(angle)};
}
