/** Coalesce invalidations. Continue only for animation and never while hidden. */
export function demandRender(draw:()=>boolean,visible:()=>boolean,request:(fn:()=>void)=>number=requestAnimationFrame,cancel:(id:number)=>void=cancelAnimationFrame){
 let frame:number|undefined,disposed=false;
 const invalidate=()=>{if(!disposed&&frame===undefined&&visible())frame=request(()=>{frame=undefined;if(!disposed&&visible()&&draw())invalidate();});};
 return {invalidate,dispose:()=>{disposed=true;if(frame!==undefined)cancel(frame);frame=undefined;}};
}
