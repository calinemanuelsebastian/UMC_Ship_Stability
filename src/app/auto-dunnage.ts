import {CargoNeighbours} from './cargo-neighbours';
import {dunnageMembers} from './dunnage-arrangement';
import {dunnageJunctions,isClosedDunnageJunction,hasJunctionPair} from './dunnage-junctions';
import {boundaryDunnageFits,permitsAutoDunnage,type DunnageFit} from './boundary-dunnage';
import {cargoGapPairs} from './cargo-gap-pairs';
import {dunnageGap,createDunnage,type DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
import {cargoBottom,placeSupportedCargo} from './cargo-placement';
import type {CargoArea} from './cargo-layout';
import type {WeightDraft} from './loading-state';
/** Selected cargo scopes the operation, but neighbours remain available as gap boundaries. */
export function autoDunnageBatch({cargo,selection,areas,settings,maxGap,walls,id}:{cargo:WeightDraft[];selection:string[];areas:CargoArea[];settings:DunnagePattern;maxGap:number;walls:boolean;id:()=>string}){
 if(!Number.isFinite(maxGap)||maxGap<=0)throw new Error('Enter a positive maximum gap.');
 const units=cargo.filter(w=>w.footprint&&w.footprint.kind!=='dunnage');
 const selected=new Set(selection),targeted=selection.length?units.filter(w=>selected.has(w.id)):units;
 const eligible=units.filter(permitsAutoDunnage),targets=targeted.filter(permitsAutoDunnage),targetIds=new Set(targets.map(w=>w.id));
 const candidates:{fit:DunnageFit;area:CargoArea}[]=[];
 const surface=(w:WeightDraft)=>areas.find(a=>a.id===w.footprint?.areaId);
 for(const [a,b] of cargoGapPairs(eligible,maxGap)){
  if(!targetIds.has(a.id)&&!targetIds.has(b.id))continue;
  const area=surface(a);if(area)candidates.push({fit:dunnageGap(a,b),area});
 }
 if(walls)for(const w of targets){const area=surface(w);if(area)for(const fit of boundaryDunnageFits(w,area,maxGap))candidates.push({fit,area});}
 const neighbours=new CargoNeighbours(cargo);
 const parts:WeightDraft[]=[];let solidMassTonnes=0;let skipped=0;const reasons=new Set<string>();
 const place=(envelope:DunnageFit,area:CargoArea)=>{const start=parts.length;try{
 for(const fit of dunnageMembers(envelope,settings)){
  const mass=dunnageMassTonnes(fit.length,fit.width,settings.thickness,settings.densityKgM3);
  const base=createDunnage({id:id(),area,areas,weights:[],length:fit.length,width:fit.width,thickness:settings.thickness,mass,material:settings.material,densityKgM3:settings.densityKgM3,massMode:'calculated',position:fit});
  const placed=placeSupportedCargo(base,[area],[...neighbours.query({xMin:fit.x-fit.length/2,xMax:fit.x+fit.length/2,yMin:fit.y-fit.width/2,yMax:fit.y+fit.width/2}),...parts.slice(start)],fit,Math.abs(fit.z-area.deckZ)>1e-8,false);
  if(Math.abs(cargoBottom(placed)-fit.z)>1e-8||Math.abs(Number(placed.lcg)-fit.x)>1e-8||Math.abs(Number(placed.tcg)-fit.y)>1e-8)throw new Error('Unsupported gap');
  if(settings.arrangement==='frame')placed.name=`${settings.material} · Dunnage member`;
  parts.push(placed);
 }
 for(const part of parts.slice(start))neighbours.add(part);
 solidMassTonnes+=dunnageMassTonnes(envelope.length,envelope.width,settings.thickness,settings.densityKgM3);
 }catch(e){parts.splice(start);skipped++;reasons.add((e as Error).message);}};
 for(const {fit,area} of candidates)place(fit,area);
 // Candidate strips define the scoped network, including strips already present.
 // A junction is accepted only when actual existing/new dunnage covers all four sides.
 for(const area of areas){
  const scoped=candidates.filter(c=>c.area.id===area.id);
  if(!scoped.length)continue;
  const actual=[...cargo,...parts].filter(w=>w.footprint?.kind==='dunnage'&&w.footprint.areaId===area.id&&w.footprint.height>=settings.thickness-1e-8).map(w=>({length:w.footprint!.rotation===90?w.footprint!.width:w.footprint!.length,width:w.footprint!.rotation===90?w.footprint!.length:w.footprint!.width,x:Number(w.lcg),y:Number(w.tcg),z:cargoBottom(w)}));
  const scopedJunctions=dunnageJunctions(scoped.map(c=>c.fit),maxGap);
  for(const fit of scopedJunctions)if(hasJunctionPair(fit,actual)&&isClosedDunnageJunction(fit,actual))place(fit,area);
 }
 return {parts,massTonnes:parts.reduce((sum,w)=>sum+Number(w.massTonnes),0),solidMassTonnes,skipped,reasons:[...reasons],excluded:targeted.length-targets.length,targetCount:targeted.length,eligibleCount:targets.length};
}
