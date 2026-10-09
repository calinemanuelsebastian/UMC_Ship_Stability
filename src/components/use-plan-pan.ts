import {useEffect,useRef,useState,type PointerEvent} from 'react';
import {anchoredPlanOffset,clampPlanZoom} from '../app/plan-navigation';
/** Editing remains single-pointer; touch navigation uses the explicit Pan tool. */
export function usePlanPan(enabled:boolean,zoom=1,onZoom?:(value:number)=>void){
 const [offset,setOffset]=useState({x:0,y:0});
 const [host,setHost]=useState<HTMLDivElement|null>(null);
 const current=useRef({enabled,zoom,onZoom,offset});current.current={enabled,zoom,onZoom,offset};
 const update=(next:{x:number;y:number})=>{current.current.offset=next;setOffset(next);};
 const pointers=useRef(new Map<number,{x:number;y:number}>());
 const svgRef=useRef<SVGSVGElement|null>(null);
 const gesture=useRef<{point:{x:number;y:number};distance:number;offset:{x:number;y:number};zoom:number;inverse:DOMMatrix;centre:{x:number;y:number}}|undefined>(undefined);
 const suppress=useRef(false);
 function measure(){const ps=[...pointers.current.values()];return {point:ps.length>1?{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2}:ps[0],distance:ps.length>1?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0};}
 function begin(){const svg=svgRef.current,inverse=svg?.getScreenCTM()?.inverse(),m=measure();if(!svg||!inverse||!m.point)return;const b=svg.viewBox.baseVal;gesture.current={...m,offset:current.current.offset,zoom:current.current.zoom,inverse,centre:{x:b.x+b.width/2,y:b.y+b.height/2}};}
 useEffect(()=>{
  if(!host)return;
  const wheel=(e:WheelEvent)=>{
   const svg=(e.target as Element).closest('svg');if(!svg||!host.contains(svg))return;
   const c=current.current;if(!e.ctrlKey&&!c.enabled)return;
   const inverse=svg.getScreenCTM()?.inverse();if(!inverse)return;
   e.preventDefault();
   const scale=e.deltaMode===1?16:e.deltaMode===2?host.clientHeight:1;
   if(e.ctrlKey&&c.onZoom){
    const next=clampPlanZoom(c.zoom*Math.exp(-e.deltaY*scale*.01)),b=svg.viewBox.baseVal;
    const anchor=new DOMPoint(e.clientX,e.clientY).matrixTransform(inverse);
    update(anchoredPlanOffset(c.offset,anchor,{x:b.x+b.width/2,y:b.y+b.height/2},{x:0,y:0},c.zoom,next));
    current.current.zoom=next;c.onZoom(next);
   }else{
    const a=new DOMPoint(0,0).matrixTransform(inverse),b=new DOMPoint(e.deltaX*scale,e.deltaY*scale).matrixTransform(inverse);
    update({x:c.offset.x+b.x-a.x,y:c.offset.y+b.y-a.y});
   }
  };
  host.addEventListener('wheel',wheel,{passive:false});return()=>host.removeEventListener('wheel',wheel);
 },[host]);
 const finish=(e:PointerEvent<HTMLDivElement>)=>{if(!pointers.current.has(e.pointerId))return;pointers.current.delete(e.pointerId);e.stopPropagation();gesture.current=undefined;if(pointers.current.size)begin();};
 return {offset,reset:()=>{gesture.current=undefined;pointers.current.clear();update({x:0,y:0});},handlers:{ref:setHost,
 onPointerDownCapture:(e:PointerEvent<HTMLDivElement>)=>{
  suppress.current=false;if(!(enabled&&e.button===0||e.button===1))return;
  const svg=(e.target as Element).closest('svg');if(!svg)return;
  e.preventDefault();e.stopPropagation();suppress.current=true;svgRef.current=svg;
  pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});begin();e.currentTarget.setPointerCapture(e.pointerId);
 },
 onPointerMoveCapture:(e:PointerEvent<HTMLDivElement>)=>{
  if(!pointers.current.has(e.pointerId)||!gesture.current)return;
  e.preventDefault();e.stopPropagation();pointers.current.set(e.pointerId,{x:e.clientX,y:e.clientY});
  const g=gesture.current,m=measure(),a=new DOMPoint(g.point.x,g.point.y).matrixTransform(g.inverse),b=new DOMPoint(m.point.x,m.point.y).matrixTransform(g.inverse);
  const next=g.distance>0&&onZoom?clampPlanZoom(g.zoom*m.distance/g.distance):g.zoom;
  update(anchoredPlanOffset(g.offset,a,g.centre,{x:b.x-a.x,y:b.y-a.y},g.zoom,next));
  if(onZoom&&next!==current.current.zoom){current.current.zoom=next;onZoom(next);}
 },onPointerUpCapture:finish,onPointerCancelCapture:finish,onLostPointerCapture:finish,
 onClickCapture:(e:React.MouseEvent<HTMLDivElement>)=>{if(suppress.current){suppress.current=false;e.preventDefault();e.stopPropagation();}}}};
}
