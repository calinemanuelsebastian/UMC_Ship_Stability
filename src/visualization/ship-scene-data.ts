import {deckDefinition,type StoredPanel} from '../app/tween-deck';
import {shipResourceUrl} from '../core/domain/ship-resource';
import {parseArea,type CargoArea} from '../app/cargo-layout';
import type { ShipModelPackage, Point3 } from '../core/domain/ship-model';
import type { ReferenceSettings } from '../core/reference/reference-system';
export type BoxHull = { length: number; beam: number; depth: number; schematic?: boolean; model?: { url: string; exteriorGroup: string; panelGroup: string; hatchSurfaces?:CargoArea[]; waterlineMeshes: string[]; storedPanels?:StoredPanel[] } };
export type SceneCondition = { buoyancy?:Point3; metacentre?:Point3; teachingTrimDeg?: number; didactic?: boolean; heelDeg?: number; draftAft: number; draftForward: number; gravity: Point3; origin: Point3; directions: { x: Point3; y: Point3; z: Point3 } };
/** Only an explicitly declared rectangular hull may be drawn as a box. */
export function boxHullFor(ship: ShipModelPackage): BoxHull {
  if (!ship.manifest.resources.some(item => item.kind === 'visualization.box-hull')) throw new Error('This model does not yet provide supported 3D hull geometry.');
  const { lbp: length, beam, mouldedDepth: depth } = ship.manifest.principalDimensions;
  const { units, coordinateSystem } = ship.manifest;
  if (depth === undefined || units.length !== 'm' || coordinateSystem.longitudinalOriginFromAP === undefined || !Number.isFinite(coordinateSystem.longitudinalOriginFromAP) || ![length, beam, depth].every(n => Number.isFinite(n) && n > 0 && n <= 100000)) throw new Error('3D geometry requires metre dimensions and an explicit AP datum.');
  return { length, beam, depth };
}
/** Schematic geometry is display-only; it never opts into rectangular buoyancy. */
export function visualHullFor(ship: ShipModelPackage): BoxHull {
  if (!ship.manifest.resources.some(r => r.kind === 'visualization.schematic-cargo-hull')) return boxHullFor(ship);
  const {lbp:length,beam,mouldedDepth:depth}=ship.manifest.principalDimensions;
  if (depth === undefined || ![length,beam,depth].every(n=>Number.isFinite(n)&&n>0&&n<=100000) || ship.manifest.units.length!=='m' || !Number.isFinite(ship.manifest.coordinateSystem.longitudinalOriginFromAP)) throw new Error('3D geometry requires metre dimensions and an explicit AP datum.');
  const resource=ship.manifest.resources.find(r=>r.kind==='visualization.gltf');
  const model=resource?.path ? {url:shipResourceUrl(ship,resource.path),storedPanels:deckDefinition(ship)?.storedPanels,hatchSurfaces:Array.isArray(resource.config?.hatchSurfaces)&&resource.config.hatchSurfaces.length?resource.config.hatchSurfaces.map(parseArea):[],exteriorGroup:String(resource.config?.exteriorGroup??''),panelGroup:String(resource.config?.panelGroup??''),waterlineMeshes:Array.isArray(resource.config?.waterlineMeshes)?resource.config.waterlineMeshes.filter((v):v is string=>typeof v==='string'):[]} : undefined;
  return {length,beam,depth,schematic:true,...(model?{model}:{})};
}
/** Generic tapered outline, not traced offsets or a hydrostatic model. AP and FP remain the LBP endpoints. */
export function schematicOutline(hull: BoxHull): [number,number][] {
  return [[-.5,-.28],[-.38,-.5],[.28,-.5],[.43,-.3],[.5,0],[.43,.3],[.28,.5],[-.38,.5],[-.5,.28]].map(([x,z])=>[x*hull.length,z*hull.beam]);
}
/** Nautical source coordinates -> Three.js body frame: X forward, Y up, Z starboard. */
export function bodyPoint(ship: ShipModelPackage, point: Point3): Point3 {
  const hull = visualHullFor(ship);
  const source = ship.manifest.coordinateSystem;
  const result = { x: source.longitudinalOriginFromAP! + (source.xPositive === 'forward' ? point.x : -point.x) - hull.length / 2,
    y: source.zPositive === 'up' ? point.z : -point.z, z: source.yPositive === 'starboard' ? point.y : -point.y };
  if (!Object.values(result).every(Number.isFinite)) throw new Error('3D coordinates must be finite.');
  return result;
}
export function sceneCondition(ship: ShipModelPackage, reference: ReferenceSettings, gravity: Point3, draftAft: number, draftForward: number): SceneCondition {
  const hull = visualHullFor(ship);
  if (![draftAft, draftForward].every(value => Number.isFinite(value) && value >= 0 && value <= hull.depth)) throw new Error('3D drafts must lie within the hull depth.');
  const active = reference.profile === 'source' ? ship.manifest.coordinateSystem : reference;
  return { draftAft, draftForward, gravity: bodyPoint(ship, gravity), origin: bodyPoint(ship, { x: reference.profile === 'source' ? 0 : reference.longitudinalOrigin, y: 0, z: 0 }),
    directions: { x: { x: active.xPositive === 'forward' ? 1 : -1, y: 0, z: 0 }, y: { x: 0, y: 0, z: active.yPositive === 'starboard' ? 1 : -1 }, z: { x: 0, y: active.zPositive === 'up' ? 1 : -1, z: 0 } } };
}
/** Rigid pitch of the hull; every point on z=T_AP + x_AP*slope reaches world water level Y=0. */
export function hullPose(hull: BoxHull, data: SceneCondition) {
  const pitch = -Math.atan((data.draftForward - data.draftAft) / hull.length);
  return { pitch, heave: -(data.draftAft + data.draftForward) / 2 * Math.cos(pitch) };
}

/** Visual-only angular amplification; preserve mean end draft and never mutate results. */
export function exaggerateTrim(hull: BoxHull, data: SceneCondition, factor: number): SceneCondition | undefined {
  if (![1, 5, 10].includes(factor)) return undefined;
  if (factor === 1) return data;
  const angle = Math.atan((data.draftForward - data.draftAft) / hull.length) * factor;
  if (Math.abs(angle) >= Math.PI / 2) return undefined;
  const mean = (data.draftForward + data.draftAft) / 2;
  const halfTrim = hull.length * Math.tan(angle) / 2;
  const draftAft = mean - halfTrim, draftForward = mean + halfTrim;
  if (![draftAft, draftForward].every(n => Number.isFinite(n) && n >= 0 && n <= hull.depth)) return undefined;
  return { ...data, draftAft, draftForward };
}

/** Preserve the submerged area of the declared rectangular section at a given heel. */
export function heeledBox(hull: BoxHull, draft: number, heelDeg: number) {
  if (hull.schematic) throw new Error('Rectangular buoyancy is unavailable for schematic hulls.');
  if (!Number.isFinite(heelDeg) || !Number.isFinite(draft) || draft <= 0 || draft >= hull.depth) throw new Error('Heeled box requires a finite angle and a draft inside its depth.');
  const angle=heelDeg*Math.PI/180, c=Math.cos(angle), s=Math.sin(angle);
  const polygon=[[0,-hull.beam/2],[hull.depth,-hull.beam/2],[hull.depth,hull.beam/2],[0,hull.beam/2]];
  const elevation=([y,z]: number[])=>c*y-s*z;
  const clip=(level:number)=>{
    const out:number[][]=[];
    polygon.forEach((a,i)=>{const b=polygon[(i+1)%4], da=elevation(a)-level, db=elevation(b)-level;
      if(da<=0)out.push(a);
      if((da<0 && db>0)||(da>0 && db<0)){const f=da/(da-db);out.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]);}
    });return out;
  };
  const area=(p:number[][])=>Math.abs(p.reduce((sum,a,i)=>{const b=p[(i+1)%p.length];return sum+a[0]*b[1]-b[0]*a[1];},0))/2;
  let lo=Math.min(...polygon.map(elevation)), hi=Math.max(...polygon.map(elevation));
  for(let i=0;i<70;i++){const mid=(lo+hi)/2;if(area(clip(mid))<hull.beam*draft)lo=mid;else hi=mid;}
  const level=(lo+hi)/2;
  const crossings:number[][]=[];
  polygon.forEach((a,i)=>{const b=polygon[(i+1)%4], da=elevation(a)-level, db=elevation(b)-level;
    if(Math.abs(da)<1e-10)crossings.push(a);
    if(da*db<0){const f=da/(da-db);crossings.push([a[0]+f*(b[0]-a[0]),a[1]+f*(b[1]-a[1])]);}
  });
  const ends=crossings.filter((a,i)=>crossings.findIndex(b=>Math.hypot(a[0]-b[0],a[1]-b[1])<1e-8)===i);
  if(ends.length!==2)throw new Error('Unable to resolve the heeled waterline.');
  return {angle,heave:-level,area:area(clip(level)),ends};
}

/** Water plane in body coordinates for a zero-heel trimmed attitude. */
export function trimWaterlineHeight(length:number,draftAft:number,draftForward:number,x:number){return draftAft+(x/length+.5)*(draftForward-draftAft);}

/** Visual rotation about the centreline at the upright water level; no volume constraint. */
export function illustrativeHeelPose(draft:number,heelDeg:number){
 if(!Number.isFinite(draft)||draft<0||!Number.isFinite(heelDeg)||Math.abs(heelDeg)>90)throw new Error('Illustrative heel requires a finite reference draft and an angle between −90° and 90°.');
 const angle=heelDeg*Math.PI/180;
 return {angle,heave:-draft*Math.cos(angle)};
}
export function waterPlaneDistance(plane:readonly number[],point:{x:number;y:number;z:number}){return plane[0]*point.x+plane[1]*point.y+plane[2]*point.z+plane[3];}

/** Retain initial pitch while rolling about the midship reference water level. Visual only. */
export function illustrativeAttitudePose(hull:BoxHull,data:SceneCondition){
 const imposedTrim=data.teachingTrimDeg;
 if(imposedTrim!==undefined&&(!Number.isFinite(imposedTrim)||Math.abs(imposedTrim)>45))throw new Error('Imposed trim must be between −45° and 45°.');
 const pitch=imposedTrim===undefined?hullPose(hull,data).pitch:-imposedTrim*Math.PI/180;
 const {angle}=illustrativeHeelPose((data.draftAft+data.draftForward)/2,data.heelDeg??0);
 return {pitch,angle,heave:-(data.draftAft+data.draftForward)/2*Math.cos(pitch)*Math.cos(angle)};
}
