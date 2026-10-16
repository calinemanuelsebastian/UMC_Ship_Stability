import type {ShipModelPackage} from '../core/domain/ship-model';
import type {ReferenceSettings} from '../core/reference/reference-system';
import {sceneCondition,visualHullFor} from './ship-scene-data';
/** Geometry-only fallback. Never reuse a previous vessel/condition's solved pose. */
export function referencePreview(ship:ShipModelPackage,reference:ReferenceSettings,gravity:{x?:number;y?:number;z?:number}) {
 const hull=visualHullFor(ship), original=ship.manifest.defaultCondition;
 const finite=(value:number|undefined,fallback:number)=>value!==undefined&&Number.isFinite(value)?value:fallback;
 const draft=original.draft!==undefined&&Number.isFinite(original.draft)&&original.draft>=0&&original.draft<=hull.depth?original.draft:hull.depth/2;
 return {...sceneCondition(ship,reference,{x:finite(gravity.x,original.lcg),y:finite(gravity.y,original.tcg),z:finite(gravity.z,original.vcg)},draft,draft),calculated:false};
}
