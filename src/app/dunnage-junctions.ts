import type {DunnageFit} from './boundary-dunnage';
const eps=1e-8;
const bounds=(f:DunnageFit)=>({x0:f.x-f.length/2,x1:f.x+f.length/2,y0:f.y-f.width/2,y1:f.y+f.width/2});
/** Fill only closed four-sided junctions, never extend strips into open space. */
export function dunnageJunctions(fits:DunnageFit[],maxGap:number):DunnageFit[]{
 const boxes=fits.map(bounds),result:DunnageFit[]=[],seen=new Set<string>();

 for(let i=0;i<fits.length;i++)for(let j=i+1;j<fits.length;j++){
  if(Math.abs(fits[i].z-fits[j].z)>eps)continue;
  const a=boxes[i],b=boxes[j];let x0=Math.max(a.x0,b.x0),x1=Math.min(a.x1,b.x1),y0=Math.min(a.y1,b.y1),y1=Math.max(a.y0,b.y0);
  if(x1-x0<=eps||y1-y0<=eps){x0=Math.min(a.x1,b.x1);x1=Math.max(a.x0,b.x0);y0=Math.max(a.y0,b.y0);y1=Math.min(a.y1,b.y1);}
  if(x1-x0<=eps||y1-y0<=eps||x1-x0>maxGap+eps||y1-y0>maxGap+eps)continue;
  const candidate={length:x1-x0,width:y1-y0,x:(x0+x1)/2,y:(y0+y1)/2,z:fits[i].z};
  if(!isClosedDunnageJunction(candidate,fits))continue;
  const f={length:x1-x0,width:y1-y0,x:(x0+x1)/2,y:(y0+y1)/2,z:fits[i].z};const key=Object.values(f).map(v=>v.toFixed(8)).join(':');if(!seen.has(key)){seen.add(key);result.push(f);}
 }
 return result;
}

export function isClosedDunnageJunction(f:DunnageFit,fits:DunnageFit[]):boolean{
 const {x0,x1,y0,y1}=bounds(f);
 const covered=(intervals:number[][],lo:number,hi:number)=>{let end=lo;for(const [a,b] of intervals.sort((a,b)=>a[0]-b[0])){if(a>end+eps)break;if(b>end)end=b;}return end>=hi-eps;};
 const same=fits.filter(v=>Math.abs(v.z-f.z)<eps).map(bounds);
 if(same.some(c=>Math.min(c.x1,x1)-Math.max(c.x0,x0)>eps&&Math.min(c.y1,y1)-Math.max(c.y0,y0)>eps))return false;
 return covered(same.filter(c=>Math.abs(c.x1-x0)<eps).map(c=>[c.y0,c.y1]),y0,y1)&&covered(same.filter(c=>Math.abs(c.x0-x1)<eps).map(c=>[c.y0,c.y1]),y0,y1)&&covered(same.filter(c=>Math.abs(c.y1-y0)<eps).map(c=>[c.x0,c.x1]),x0,x1)&&covered(same.filter(c=>Math.abs(c.y0-y1)<eps).map(c=>[c.x0,c.x1]),x0,x1);
}

/** Match the original pair-generated envelope without an all-members pair scan. */
export function hasJunctionPair(f:DunnageFit,fits:DunnageFit[]){
 const b=bounds(f),same=fits.filter(v=>Math.abs(v.z-f.z)<eps).map(bounds);
 const below=same.filter(v=>Math.abs(v.y1-b.y0)<eps),above=same.filter(v=>Math.abs(v.y0-b.y1)<eps);
 if(below.some(a=>above.some(c=>Math.abs(Math.max(a.x0,c.x0)-b.x0)<eps&&Math.abs(Math.min(a.x1,c.x1)-b.x1)<eps)))return true;
 const left=same.filter(v=>Math.abs(v.x1-b.x0)<eps),right=same.filter(v=>Math.abs(v.x0-b.x1)<eps);
 return left.some(a=>right.some(c=>Math.abs(Math.max(a.y0,c.y0)-b.y0)<eps&&Math.abs(Math.min(a.y1,c.y1)-b.y1)<eps));
}
