export const dunnageMaterials:Array<{id:string;name:string;density:number;thickness:number;source:string;note:string;manualOnly?:boolean;unsupported?:boolean}>=[
 {id:'pine',name:'Pine timber',density:470,thickness:.05,source:'https://www.swedishwood.com/wood-facts/about-wood/from-log-to-plank/properties-of-softwood/',note:'Timber densities are reference values at 12% moisture; actual timber varies.'},
 {id:'spruce',name:'Spruce timber',density:440,thickness:.05,source:'https://www.swedishwood.com/wood-facts/about-wood/from-log-to-plank/properties-of-softwood/',note:'Timber densities are reference values at 12% moisture; actual timber varies.'},
 {id:'spruce-plywood',name:'Spruce plywood',density:460,thickness:.018,source:'https://www.wisaplywood.com/specifying-wisa/sizes-thicknesses-and-weights/',note:'Manufacturer reference density; use the actual product value where available.'},
 {id:'birch-plywood',name:'Birch plywood',density:680,thickness:.018,source:'https://www.wisaplywood.com/specifying-wisa/sizes-thicknesses-and-weights/',note:'Manufacturer reference density; use the actual product value where available.'},
 {id:'rubber-mat',name:'Rubber anti-slip mat',density:860,thickness:.008,source:'https://loadsecuring.regupol.com/fileadmin/user_upload/load_securing/products/documents/technical_data_sheets/en/regupol_cargo_mat_7210/REG_TD_CARGO-MAT-7210_EN_-_c2c.pdf',note:'Density example: REGUPOL cargo mat 7210. Other rubber mats can differ.'},
 {id:'steel',name:'Steel solid members',density:0,thickness:.05,source:'',manualOnly:true,note:'Enter the actual material density. Solid members only; hollow sections require a separately defined assembly and mass. No structural rating is assumed.'},
 {id:'aluminium',name:'Aluminium solid members',density:0,thickness:.05,source:'',manualOnly:true,note:'Enter the actual alloy density. Solid members only; no structural rating is assumed.'},
 {id:'rated-bag',name:'Purpose-rated dunnage bag — manual review only',density:0,thickness:.1,source:'',manualOnly:true,unsupported:true,note:'Inflation, contact pressure and rated restraint require the specific product data. Automatic placement and capacity evaluation are not implemented.'},
 {id:'chock',name:'Shaped chock — manual review only',density:0,thickness:.05,source:'',manualOnly:true,unsupported:true,note:'Curved or wedge contact is not modelled. Define a verified support assembly separately.'},
 {id:'custom',name:'Custom material',density:470,thickness:.05,source:'',note:'Enter the density supplied for your material.'},
];
export function dunnageMassTonnes(length:number,width:number,thickness:number,density:number){
 if(![length,width,thickness,density].every(n=>Number.isFinite(n)&&n>0))throw new Error('Enter positive dimensions and material density.');
 const result=length*width*thickness*density/1000;
 if(!Number.isFinite(result))throw new Error('Dunnage mass exceeds the supported range.');
 return result;
}
