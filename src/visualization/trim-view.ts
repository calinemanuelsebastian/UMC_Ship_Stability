import {sharedResults,normalizedCondition} from '../core/calculations/shared-results';
import type {ShipModelPackage,SimulationCondition} from '../core/domain/ship-model';
import {loadTrimmedTable} from '../core/trim/shared-trim-table';
import {computeTableTrim} from '../core/trim/trimmed-table';
import {computeTrimEquilibrium} from '../core/trim/compute-trim-equilibrium';
import {computeUprightHydrostatics} from '../core/hydrostatics/compute-upright-hydrostatics';
export function hasTrimView(ship:ShipModelPackage){return ship.manifest.resources.some(r=>['hydrostatics.trimmed-table','trim.linear-equilibrium'].includes(r.kind));}
/** Rendering consumes established solvers; no buoyancy is inferred from the display mesh. */
async function calculateTrimView(ship:ShipModelPackage,condition:SimulationCondition,fsm:number){
 const resource=ship.manifest.resources.find(r=>r.kind==='hydrostatics.trimmed-table');
 if(!resource)return {...await computeTrimEquilibrium(ship,condition,{freeSurfaceMomentLongitudinal:fsm}),illustrativeDrafts:false};
 if(!resource.path)throw new Error('Trim table path is missing.');
 if(fsm!==0)throw new Error('Table LCB balance requires zero longitudinal FSM; liquid redistribution is not modelled.');
 const table=await loadTrimmedTable(ship);
 const result=computeTableTrim(table,{displacementTonnes:condition.displacementTonnes!,lcg:condition.lcg,waterDensity:condition.waterDensity},ship.manifest.principalDimensions.lbp);
 if(result.draftAft!==undefined&&result.draftForward!==undefined)return {...result,draftAft:result.draftAft,draftForward:result.draftForward,illustrativeDrafts:false};
 const upright=await computeUprightHydrostatics(ship,condition);
 if(upright.draft===undefined)throw new Error('No draft is available for the 3D view.');
 // Explicit illustration only: centre the signed trim about the upright reference draft.
 const half=ship.manifest.principalDimensions.lbp*Math.tan(result.trimDeg*Math.PI/180)/2;
 return {...result,draftAft:upright.draft-half,draftForward:upright.draft+half,illustrativeDrafts:true};
}

export function computeTrimView(ship:ShipModelPackage,condition:SimulationCondition,fsm:number){
 return sharedResults.read(ship,'trim-view',{condition:normalizedCondition(condition),fsm},(snapshot,input)=>calculateTrimView(snapshot,input.condition,input.fsm));
}
