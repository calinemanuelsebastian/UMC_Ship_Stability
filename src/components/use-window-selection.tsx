import {useRef,useState,type PointerEvent as ReactPointerEvent} from 'react';
export type SelectionRect={id:string;left:number;right:number;top:number;bottom:number};
export function windowHits(rects:SelectionRect[],a:{x:number;y:number},b:{x:number;y:number}){const left=Math.min(a.x,b.x),right=Math.max(a.x,b.x),top=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y);return rects.filter(r=>b.x>=a.x?r.left>=left&&r.right<=right&&r.top>=top&&r.bottom<=bottom:r.right>=left&&r.left<=right&&r.bottom>=top&&r.top<=bottom).map(r=>r.id);}
export function useWindowSelection(enabled:boolean,onSelect:(ids:string[],add:boolean)=>void,getRects?:()=>SelectionRect[]){
 const gesture=useRef<{x:number;y:number;add:boolean}|undefined>(undefined),suppress=useRef(false);
 const [box,setBox]=useState<{x:number;y:number;w:number;h:number;cross:boolean}>();
 const cancel=()=>{gesture.current=undefined;setBox(undefined);};
 const handlers={
 onPointerDownCapture:(e:ReactPointerEvent<SVGSVGElement>)=>{suppress.current=false;if(!enabled||e.button!==0||(e.target as Element).closest('[data-cargo-id]'))return;gesture.current={x:e.clientX,y:e.clientY,add:e.shiftKey};e.currentTarget.focus({preventScroll:true});e.currentTarget.setPointerCapture(e.pointerId);e.stopPropagation();},
 onPointerMoveCapture:(e:ReactPointerEvent<SVGSVGElement>)=>{const a=gesture.current;if(!a)return;const m=e.currentTarget.getScreenCTM()?.inverse();if(!m)return;const p=new DOMPoint(a.x,a.y).matrixTransform(m),q=new DOMPoint(e.clientX,e.clientY).matrixTransform(m);setBox({x:Math.min(p.x,q.x),y:Math.min(p.y,q.y),w:Math.abs(q.x-p.x),h:Math.abs(q.y-p.y),cross:e.clientX<a.x});e.stopPropagation();},
 onPointerUpCapture:(e:ReactPointerEvent<SVGSVGElement>)=>{const a=gesture.current;if(!a)return;const rects=getRects?.()??Array.from(e.currentTarget.querySelectorAll('[data-cargo-id]')).map(el=>({id:el.getAttribute('data-cargo-id')!,...(()=>{const r=el.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom};})()}));const ids=Math.hypot(e.clientX-a.x,e.clientY-a.y)<4?[]:windowHits(rects,a,{x:e.clientX,y:e.clientY});onSelect(ids,a.add);cancel();suppress.current=true;e.stopPropagation();},
 onClickCapture:(e:React.MouseEvent<SVGSVGElement>)=>{if(suppress.current){suppress.current=false;e.stopPropagation();e.preventDefault();}},
 onPointerCancelCapture:cancel,onLostPointerCapture:cancel,
 onKeyDownCapture:(e:React.KeyboardEvent<SVGSVGElement>)=>{if(e.key==='Escape'&&gesture.current){cancel();suppress.current=true;e.stopPropagation();}}
 };
 const overlay=box?<rect pointerEvents="none" x={box.x} y={box.y} width={box.w} height={box.h} fill={box.cross?'#a855f7':'#2563eb'} fillOpacity=".12" stroke={box.cross?'#7e22ce':'#2563eb'} strokeDasharray={box.cross?'5 3':undefined} vectorEffect="non-scaling-stroke"/>:null;
 return {handlers,overlay};
}
