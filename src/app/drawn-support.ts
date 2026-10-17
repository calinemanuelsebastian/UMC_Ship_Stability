import type {DunnagePattern} from './dunnage';
import {dunnageMassTonnes} from './dunnage-materials';
/** Axis-aligned bearer between endpoints; width and thickness remain user-defined. */
export function drawnSupport(s:DunnagePattern,a:{x:number;y:number},b:{x:number;y:number}){
 const dx=b.x-a.x,dy=b.y-a.y,alongX=Math.abs(dx)>=Math.abs(dy),length=Math.abs(alongX?dx:dy);
 if(![a.x,a.y,b.x,b.y].every(Number.isFinite)||length<.001)throw new Error('Choose a second point at least 1 mm away.');
 const settings:DunnagePattern={...s,shape:'box',count:1,length:alongX?length:s.width,width:alongX?s.width:length,massMode:'calculated',mass:dunnageMassTonnes(length,s.width,s.thickness,s.densityKgM3)};
 return {settings,position:{x:alongX?(a.x+b.x)/2:a.x,y:alongX?a.y:(a.y+b.y)/2}};
}
