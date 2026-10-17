import type {CargoShape} from './cargo-shape';
/** Illustrative dimensions only: rotate one elongated cylinder without changing its size. */
export function theoryDimensions(shape:CargoShape):[number,number,number]{
 if(shape==='cylinder-x')return [1.4,.6,.6];
 if(shape==='cylinder-y')return [.6,1.4,.6];
 if(shape==='cylinder-z')return [.6,.6,1.4];
 return [1.4,.9,.6];
}
export function theoryProjection(shape:CargoShape,view:'top'|'side'|'end'){
 const [length,width,height]=theoryDimensions(shape);
 const [horizontal,vertical]=view==='top'?[length,width]:view==='side'?[length,height]:[width,height];
 return {width:horizontal*60,height:vertical*60,horizontalAxis:view==='end'?'Y':'X',verticalAxis:view==='top'?'Y':'Z'};
}
