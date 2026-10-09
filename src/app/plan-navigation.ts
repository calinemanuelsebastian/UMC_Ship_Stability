export const clampPlanZoom=(zoom:number)=>Math.max(1,Math.min(15,zoom));
export function anchoredPlanOffset(start:{x:number;y:number},anchor:{x:number;y:number},centre:{x:number;y:number},movement:{x:number;y:number},oldZoom:number,newZoom:number){
 const ratio=oldZoom/newZoom;
 return {x:start.x+(anchor.x-centre.x)*(1-ratio)-movement.x*ratio,y:start.y+(anchor.y-centre.y)*(1-ratio)-movement.y*ratio};
}
