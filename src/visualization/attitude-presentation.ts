import type {ShipModelPackage} from '../core/domain/ship-model';
import {hasCoupledEquilibrium} from '../core/hydrostatics/coupled-equilibrium';
import {hasTrimView} from './trim-view';
export type AttitudeMode='equilibrium'|'trim'|'heel'|'upright'|'teaching';
export const isCalculatedMode=(mode:AttitudeMode)=>mode==='equilibrium'||mode==='trim'||mode==='heel';
export function defaultCalculatedMode(ship:ShipModelPackage):AttitudeMode {
 return hasCoupledEquilibrium(ship)?'equilibrium':hasTrimView(ship)?'trim':'equilibrium';
}
export function attitudeBasis(ship:ShipModelPackage,mode:AttitudeMode){
 const table=ship.manifest.resources.some(r=>r.kind==='hydrostatics.trimmed-table');
 const constant=ship.manifest.resources.some(r=>r.kind==='stability.constant-lcb-cross-curves');
 switch(mode){
 case 'equilibrium':return {title:'Coupled heel, trim and immersion',description:'Displaced volume and buoyancy moments balance the current mass and physical centre of gravity. Declared rectangular hull and fixed liquid centres only.'};
 case 'trim':return {title:table?'Trim from hydrostatic tables':'Small-angle longitudinal equilibrium',description:table?'Displacement and LCG determine initial trim and draughts by interpolation. Heel is not solved; the reconstructed hull does not supply buoyancy.':'Longitudinal equilibrium uses the shared hydrostatic and free-surface inputs. Heel is not solved; the small-angle assumptions remain applicable.'};
 case 'heel':return {title:constant?'Heel from constant-LCB cross curves':'Heel from zero-trim cross curves',description:constant?'The corrected GZ curve supplies heel. Displayed trim and immersion remain the initial unheeled reference, not a coupled solution.':'The corrected GZ curve supplies heel at zero trim. Longitudinal equilibrium is not solved.'};
 case 'upright':return {title:'Upright reference',description:'Even-keel immersion is a reference only. It does not establish equilibrium heel or trim.'};
 case 'teaching':return {title:'Imposed attitude',description:'Angles are controlled by the user. They do not change the loading condition or establish equilibrium.'};
 }
}
export type AttitudeNumbers={draftAft:number;draftForward:number;trimDeg:number;heelDeg?:number;verticalDraftAft?:number;verticalDraftForward?:number;illustrativeDrafts?:boolean;initialTrimReference?:boolean};
/** Never label unheeled reference drafts as calculated heeled drafts. Display conventions only. */
export function attitudeReadouts(mode:AttitudeMode,r:AttitudeNumbers,heelSign:number,trimSign:number,teaching:{axis:'heel'|'trim';heel:number;trim:number}){
 if(mode==='teaching')return [{label:'Imposed heel',value:teaching.axis==='heel'?teaching.heel*heelSign:0,unit:'°'},{label:'Imposed trim',value:teaching.axis==='trim'?teaching.trim*trimSign:0,unit:'°'}];
 if(mode==='upright')return [{label:'Even-keel reference draft',value:r.draftAft,unit:'m'}];
 const heel={label:'Calculated heel',value:mode==='trim'||r.heelDeg===undefined?undefined:r.heelDeg*heelSign,unit:'°'};
 const trim={label:mode==='heel'?'Initial reference trim angle':'Calculated trim angle',value:mode==='heel'&&!r.initialTrimReference?undefined:r.trimDeg*trimSign,unit:'°'};
 const unknownDraft=mode==='heel'||r.illustrativeDrafts;
 return [heel,trim,{label:'Draft at AP',value:unknownDraft?undefined:r.verticalDraftAft??r.draftAft,unit:'m'},{label:'Draft at FP',value:unknownDraft?undefined:r.verticalDraftForward??r.draftForward,unit:'m'}];
}
