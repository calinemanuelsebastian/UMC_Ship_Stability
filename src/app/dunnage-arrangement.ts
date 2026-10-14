import type {DunnageFit} from './boundary-dunnage';
export type DunnageArrangement={boundarySource?:string;arrangement?:'solid'|'frame';solidLimit?:number;memberWidth?:number;bearerSpacing?:number};
/** Open rectangular frame with butt-jointed perimeter rails and intermediate cross-bearers.
 * Geometry only: no joint capacity, buckling or securing-force design is implied.
 */
export function dunnageMembers(f:DunnageFit,options:DunnageArrangement):DunnageFit[]{
 if(options.arrangement!=='frame')return [f];
 const limit=options.solidLimit??.2,w=options.memberWidth??.1,spacing=options.bearerSpacing??1;
 if(![limit,w,spacing].every(n=>Number.isFinite(n)&&n>0))throw new Error('Enter positive frame dimensions and spacing.');
 const swap=f.width>f.length,L=swap?f.width:f.length,W=swap?f.length:f.width;
 if(W<=limit||W<=2*w||L<=2*w)return [f];
 const member=(length:number,width:number,x:number,y:number):DunnageFit=>({length:swap?width:length,width:swap?length:width,x:f.x+(swap?y:x),y:f.y+(swap?x:y),z:f.z});
 const count=Math.ceil((L-w)/Math.max(spacing,w));
 if(count>1000)throw new Error('Frame spacing creates too many members. Increase the spacing.');
 const members=[member(L,w,0,-(W-w)/2),member(L,w,0,(W-w)/2)];
 for(let i=0;i<=count;i++)members.push(member(w,W-2*w,-(L-w)/2+i*(L-w)/count,0));
 // Dense settings must not cost more material than a solid spacer.
 return members.reduce((v,m)=>v+m.length*m.width,0)>=L*W-1e-8?[f]:members;
}
