import {cargoTypeInfo,type CargoTypeId} from './cargo-types';
import type {Footprint} from './cargo-layout';
import type {WeightDraft} from './loading-state';
export const cargoShapes=['box','cylinder-x','cylinder-y','cylinder-z','ellipsoid'] as const;
export type CargoShape=typeof cargoShapes[number];
export const shapeLabels:Record<CargoShape,string>={box:'Box / packaged envelope','cylinder-x':'Cylinder — length axis','cylinder-y':'Cylinder — width axis','cylinder-z':'Cylinder — upright',ellipsoid:'Ellipsoid / oval package'};
export function worldShape(p:Pick<Footprint,'shape'|'rotation'>):CargoShape{const s=p.shape??'box';return p.rotation===90?s==='cylinder-x'?'cylinder-y':s==='cylinder-y'?'cylinder-x':s:s;}
export function defaultCargoShape(family:string):CargoShape{return cargoTypeInfo[family as CargoTypeId]?.shape??'box';}
type V=[number,number,number];
const dot=(a:V,b:V)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const sub=(a:V,b:V):V=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
const neg=(a:V):V=>[-a[0],-a[1],-a[2]];
const cross=(a:V,b:V):V=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const triple=(a:V,b:V,c:V)=>cross(cross(a,b),c);
function support(w:WeightDraft,d:V):V{
 const p=w.footprint!,r:V=[(p.rotation===0?p.length:p.width)/2,(p.rotation===0?p.width:p.length)/2,p.height/2];
 const c:V=[+w.lcg,+w.tcg,(p.bottomZ??p.deckZ)+r[2]],s=worldShape(p);
 const axis=s==='cylinder-x'?0:s==='cylinder-y'?1:s==='cylinder-z'?2:-1;
 const norm=Math.sqrt(r.reduce((sum,v,i)=>sum+(i===axis?0:(v*d[i])**2),0));
 return c.map((v,i)=>v+(s==='box'||i===axis?(d[i]>=0?r[i]:-r[i]):norm?r[i]*r[i]*d[i]/norm:0)) as V;
}
/** Analytic convex support mapping; bounding envelopes remain the broad phase.
 * GJK rejects tangency. A non-convergent case is conservatively treated as occupied. */
export function shapeIntersects(a:WeightDraft,b:WeightDraft){
 const pa=a.footprint,pb=b.footprint;if(!pa||!pb)return false;
 const ca=[+a.lcg,+a.tcg,(pa.bottomZ??pa.deckZ)+pa.height/2],cb=[+b.lcg,+b.tcg,(pb.bottomZ??pb.deckZ)+pb.height/2],sa=[pa.rotation===0?pa.length:pa.width,pa.rotation===0?pa.width:pa.length,pa.height],sb=[pb.rotation===0?pb.length:pb.width,pb.rotation===0?pb.width:pb.length,pb.height];
 if(ca.some((v,i)=>!Number.isFinite(v)||!Number.isFinite(cb[i])||Math.abs(v-cb[i])>=(sa[i]+sb[i])/2-1e-8))return false;
 if((a.footprint?.shape??'box')==='box'&&(b.footprint?.shape??'box')==='box')return true;

 const minkowski=(d:V)=>{const v=sub(support(a,d),support(b,neg(d)));const n=Math.hypot(...d);return v.map((x,i)=>x-1e-8*d[i]/n) as V;};
 let d:V=[+b.lcg-+a.lcg,+b.tcg-+a.tcg,((b.footprint!.bottomZ??b.footprint!.deckZ)+b.footprint!.height/2)-((a.footprint!.bottomZ??a.footprint!.deckZ)+a.footprint!.height/2)];
 if(Math.hypot(...d)<1e-12)d=[1,0,0];
 const simplex:V[]=[minkowski(d)];d=neg(simplex[0]);
 for(let iteration=0;iteration<64;iteration++){
  if(Math.hypot(...d)<1e-12)return true;
  const p=minkowski(d);if(dot(p,d)<=0)return false;simplex.unshift(p);
  const A=simplex[0],AO=neg(A),B=simplex[1],AB=sub(B,A);
  if(simplex.length===2){if(dot(AB,AO)>0)d=triple(AB,AO,AB);else{simplex.splice(1);d=AO;}continue;}
  const C=simplex[2],AC=sub(C,A),ABC=cross(AB,AC);
  if(simplex.length===3){
   if(dot(cross(ABC,AC),AO)>0){if(dot(AC,AO)>0){simplex.splice(1,1);d=triple(AC,AO,AC);}else{simplex.splice(2);if(dot(AB,AO)>0)d=triple(AB,AO,AB);else{simplex.splice(1);d=AO;}}}
   else if(dot(cross(AB,ABC),AO)>0){simplex.splice(2);if(dot(AB,AO)>0)d=triple(AB,AO,AB);else{simplex.splice(1);d=AO;}}
   else if(dot(ABC,AO)>0)d=ABC;else{simplex[1]=C;simplex[2]=B;d=neg(ABC);}continue;
  }
  const D=simplex[3];let outside=false;
  for(const [u,v,opposite] of [[B,C,D],[C,D,B],[D,B,C]]){let n=cross(sub(u,A),sub(v,A));if(dot(n,sub(opposite,A))>0)n=neg(n);if(dot(n,AO)>0){simplex.splice(0,4,A,u,v);d=n;outside=true;break;}}
  if(!outside)return true;
 }
 return true;
}
export type P=[number,number];
export function projectionEllipse(p:Pick<Footprint,'shape'|'rotation'>,view:'top'|'side'|'end'){
 const s=worldShape(p);return s==='ellipsoid'||s===(view==='top'?'cylinder-z':view==='side'?'cylinder-y':'cylinder-x');
}
/** Horizontal extreme contact faces. Curved crowns/keels have no finite planar patch. */
export function flatContactPolygon(w:WeightDraft):P[]{
 const p=w.footprint!,s=worldShape(p),rx=(p.rotation===0?p.length:p.width)/2,ry=(p.rotation===0?p.width:p.length)/2,x=+w.lcg,y=+w.tcg;
 if(s==='box')return [[x-rx,y-ry],[x+rx,y-ry],[x+rx,y+ry],[x-rx,y+ry]];
 if(s==='cylinder-z')return Array.from({length:64},(_,i)=>{const a=i*Math.PI/32;return [x+rx*Math.cos(a),y+ry*Math.sin(a)];});
 return [];
}
const side=(a:P,b:P,p:P)=>(b[0]-a[0])*(p[1]-a[1])-(b[1]-a[1])*(p[0]-a[0]);
function clipHalf(poly:P[],a:P,b:P,inside=true):P[]{
 const out:P[]=[];for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],dp=side(a,b,p)*(inside?1:-1),dq=side(a,b,q)*(inside?1:-1);if(dp>=-1e-10)out.push(p);if((dp>0&&dq<0)||(dp<0&&dq>0)){const t=dp/(dp-dq);out.push([p[0]+t*(q[0]-p[0]),p[1]+t*(q[1]-p[1])]);}}return out;
}
export const polygonArea=(p:P[])=>Math.abs(p.reduce((s,a,i)=>{const b=p[(i+1)%p.length];return s+a[0]*b[1]-a[1]*b[0];},0))/2;
export function contactPatch(a:WeightDraft,b:WeightDraft){let p=flatContactPolygon(a);const q=flatContactPolygon(b);if(!q.length)return [];for(let i=0;i<q.length&&p.length;i++)p=clipHalf(p,q[i],q[(i+1)%q.length]);return polygonArea(p)>1e-8?p:[];}
export function polygonCovered(target:P[],supports:P[][]){
 if(!target.length)return false;let remaining=[target];
 for(const support of supports){if(!support.length)continue;const next:P[][]=[];for(const fragment of remaining){let inside=fragment;for(let i=0;i<support.length&&inside.length;i++){const a=support[i],b=support[(i+1)%support.length],outside=clipHalf(inside,a,b,false);if(polygonArea(outside)>1e-8)next.push(outside);inside=clipHalf(inside,a,b);}}remaining=next;if(!remaining.length)return true;}return false;
}
