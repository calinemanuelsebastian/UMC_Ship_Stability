import type {SVGProps} from 'react';
import type {Footprint} from '../app/cargo-layout';
import {projectionEllipse} from '../app/cargo-shape';
/** One primitive for committed objects and pointer ghosts in every orthographic view. */
export function CargoProjection({footprint,view='top',x,y,width,height,...props}:Omit<SVGProps<SVGRectElement>,'x'|'y'|'width'|'height'>&{footprint:Pick<Footprint,'shape'|'rotation'>;view?:'top'|'side'|'end';x:number;y:number;width:number;height:number}){
 if(projectionEllipse(footprint as Footprint,view))return <ellipse {...props as SVGProps<SVGEllipseElement>} cx={x+width/2} cy={y+height/2} rx={width/2} ry={height/2}/>;
 return <rect {...props} x={x} y={y} width={width} height={height}/>;
}
