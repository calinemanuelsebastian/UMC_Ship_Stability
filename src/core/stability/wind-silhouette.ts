/** Source-coordinate lateral rectangles; never reconstructed display meshes. */
export type WindRectangle={xMin:number;xMax:number;zMin:number;zMax:number};
export function validateWindRectangles(raw:unknown):WindRectangle[]{
 if(!Array.isArray(raw)||!raw.length||raw.length>50000)throw new Error('Provide 1–50000 documented wind rectangles.');
 return raw.map(r=>{if(!r||![r.xMin,r.xMax,r.zMin,r.zMax].every(Number.isFinite)||r.xMax<=r.xMin||r.zMax<=r.zMin)throw new Error('Invalid wind silhouette rectangle.');return {xMin:r.xMin,xMax:r.xMax,zMin:r.zMin,zMax:r.zMax};});
}
/** Exact union of orthogonal lateral profiles. Shielded/overlapping area is counted once. */
export function silhouetteWind(rectangles:WindRectangle[],draft:number,mass:number,pressurePa=504){
 if(![draft,mass,pressurePa].every(Number.isFinite)||draft<=0||mass<=0||pressurePa<=0)throw new Error('Invalid wind condition.');
 const clipped=validateWindRectangles(rectangles).filter(r=>r.zMax>draft).map(r=>({...r,zMin:Math.max(draft,r.zMin)}));
 // Sweep x events with a covered-z segment tree: O(n log n), including dense cargo plans.
 const zs=[...new Set(clipped.flatMap(r=>[r.zMin,r.zMax]))].sort((a,b)=>a-b);
 const index=new Map(zs.map((z,i)=>[z,i]));
 const events=clipped.flatMap(r=>[{x:r.xMin,lo:index.get(r.zMin)!,hi:index.get(r.zMax)!,delta:1},{x:r.xMax,lo:index.get(r.zMin)!,hi:index.get(r.zMax)!,delta:-1}]).sort((a,b)=>a.x-b.x);
 const size=Math.max(4,zs.length*4),count=new Int32Array(size),length=new Float64Array(size),moment=new Float64Array(size);
 function update(node:number,lo:number,hi:number,from:number,to:number,delta:number){
  if(from>=hi||to<=lo)return;
  const mid=(lo+hi)>>1;
  if(from<=lo&&to>=hi)count[node]+=delta;
  else{update(node*2,lo,mid,from,to,delta);update(node*2+1,mid,hi,from,to,delta);}
  if(count[node]>0){length[node]=zs[hi]-zs[lo];moment[node]=(zs[hi]**2-zs[lo]**2)/2;}
  else if(hi-lo===1){length[node]=0;moment[node]=0;}
  else{length[node]=length[node*2]+length[node*2+1];moment[node]=moment[node*2]+moment[node*2+1];}
 }
 let areaM2=0,verticalMomentM3=0,last=events[0]?.x??0;
 for(const event of events){areaM2+=(event.x-last)*length[1];verticalMomentM3+=(event.x-last)*moment[1];update(1,0,zs.length-1,event.lo,event.hi,event.delta);last=event.x;}
 const leverMomentM3=verticalMomentM3-areaM2*draft/2;
 return {areaM2,centroidAboveBaselineM:areaM2?verticalMomentM3/areaM2:undefined,pressurePa,steadyLever:pressurePa*leverMomentM3/(1000*9.81*mass)};
}
