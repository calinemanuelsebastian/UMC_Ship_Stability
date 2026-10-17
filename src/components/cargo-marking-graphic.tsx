import {CargoProjection} from './cargo-projection';
import type {Footprint} from '../app/cargo-layout';
import {useId} from 'react';
import type {WeightDraft} from '../app/loading-state';
import {markingLines} from '../app/cargo-identification';
/** Visual overlays never intercept cargo interaction; each layer has a reserved region. */
export function CargoMarkingGraphic({weight,x,y,width,height,projection='top',footprint=weight.footprint}:{projection?:'top'|'side'|'end';footprint?:Footprint;weight:WeightDraft;x:number;y:number;width:number;height:number}){
 const id=useId().replaceAll(':',''),m=weight.footprint?.markings,lines=markingLines(weight);
 const font=Math.min(width*1.5/Math.max(6,...lines.map(v=>v.length)),height*.65/Math.max(1,lines.length));
 return <g className="cargo-unit-label" pointerEvents="none"><defs><clipPath id={`clip-${id}`}><CargoProjection footprint={footprint??{rotation:0}} view={projection} x={x} y={y} width={width} height={height}/></clipPath><pattern id={`pattern-${id}`} width={Math.min(width,height)/4} height={Math.min(width,height)/4} patternUnits="userSpaceOnUse">{m?.pattern==='dots'?<circle cx={0} cy={0} r={Math.min(width,height)/30} fill="#122d43" opacity=".2"/>:<path d={`M0 0L${Math.min(width,height)/4} ${Math.min(width,height)/4}`} stroke="#122d43" opacity=".2" strokeWidth={Math.min(width,height)/40}/>}</pattern></defs>
 <g clipPath={`url(#clip-${id})`}>
 {m?.layers.destination&&<><rect x={x} y={y} width={width} height={height*.1} fill={m.color??'#bfdbfe'}/>{m.pattern!=='plain'&&<rect x={x} y={y} width={width} height={height} fill={`url(#pattern-${id})`}/>}</>}
 {m?.layers.company&&m.image&&<image href={m.image} x={x+width*.7} y={y+height*.1} width={width*.28} height={height*.2} preserveAspectRatio="xMidYMid meet"/>}
 {lines.map((line,i)=><text key={i} x={x+width/2} y={y+height*.38+i*font} textAnchor="middle" dominantBaseline="middle" fontSize={font} fill={line.startsWith('DG ')?'#991b1b':'#122d43'} stroke="white" strokeWidth={font*.1} paintOrder="stroke">{line}</text>)}
 </g></g>;
}
