import type {Tank,TankInput} from './tank-operations';
import type {WeightDraft} from './loading-state';
import type {ShipModelPackage} from '../core/domain/ship-model';
import {tankWeight} from './tank-operations';
import {panelWeight,deckDefinition,type TweenDeckMode} from './tween-deck';
import {cargoSurfaces,cargoOnSurface} from './cargo-surfaces';
import {layoutIssues} from './cargo-layout';
export type TankUnit='volume'|'mass'|'percent';
export type TankAction='set'|'consume';
export function tankAmount(tank:Tank,input:TankInput,unit:TankUnit){
 return unit==='mass'?input.volumeM3*input.density:unit==='percent'?input.volumeM3/tank.capacityM3*100:input.volumeM3;
}
/** All entry modes resolve into one authoritative volume/density pair. */
export function editTankContents(tank:Tank,current:TankInput,unit:TankUnit,action:TankAction,amount:number,density:number):WeightDraft{
 if(!['volume','mass','percent'].includes(unit)||!['set','consume'].includes(action)||!Number.isFinite(amount)||amount<0||!Number.isFinite(density)||density<=0)throw new Error('Enter a non-negative amount and a positive liquid density.');
 // Validate the current record too; consumption must not repair a corrupt tank silently.
 tankWeight(tank,current);
 if(action==='consume'&&density!==current.density)throw new Error('Set the liquid density before recording consumption.');
 const maximum=unit==='percent'?100:unit==='mass'?tank.capacityM3*density:tank.capacityM3;
 if(amount>maximum)throw new Error('Tank contents exceed the documented capacity.');
 const delta=unit==='mass'?amount/density:unit==='percent'?amount/100*tank.capacityM3:amount;
 const currentAmount=tankAmount(tank,current,unit);
 if(action==='consume'&&amount>currentAmount)throw new Error('Consumption exceeds the current tank contents.');
 // Exact endpoint entries survive conversion without treating a slack tank as full.
 const volume=action==='consume'?(amount===currentAmount?0:current.volumeM3-delta):(amount===maximum?tank.capacityM3:delta);
 return tankWeight(tank,{id:tank.id,volumeM3:volume,density});
}
/** Retain cargo coordinates; reject a deck change that removes its support/surface. */
export function planDeckChange(ship:ShipModelPackage,weights:WeightDraft[],mode:TweenDeckMode){
 if(!deckDefinition(ship))throw new Error('This model has no movable deck definition.');
 const surfaces=cargoSurfaces(ship,mode);
 const blocked=weights.filter(w=>w.footprint&&!surfaces.some(a=>cargoOnSurface(w,a)&&!layoutIssues([w],a).length));
 const next=weights.map(w=>panelWeight(w,mode,ship));
 return {weights:next,surfaces,blocked};
}
