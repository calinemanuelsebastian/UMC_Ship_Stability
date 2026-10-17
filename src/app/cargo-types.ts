import type {CargoShape} from './cargo-shape';
// Stable IDs remain compatible with saved plans. New choices never reshape existing units.
export const cargoFamilies=[
 ["boxed","Boxes / cartons","boxed"],
 ["pallet","Palletised cargo","boxed"],
 ["perishable","Ventilated perishables","ventilated"],
 ["crate","Crates / cases","boxed"],
 ["bag","Sacks / small bags","unspecified"],
 ["bulk-bag","Bulk bags / FIBC","unspecified"],
 ["bale","Bales","unspecified"],
 ["drum","Drums","drums"],
 ["barrel","Barrels / casks","drums"],
 ["ibc","Rigid IBC","boxed"],
 ["roll","Rolls","rolls"],
 ["reel","Reels / cable drums","rolls"],
 ["coil","Coils","rolls"],
 ["pipe","Individual pipes / tubes","unspecified"],
 ["bundle","Bundles","unspecified"],
 ["project","Custom / project cargo","unspecified"],
 ["container","ISO containers","unspecified"],
] as const;
export type CargoTypeId=typeof cargoFamilies[number][0];
export const cargoTypeInfo:Record<CargoTypeId,{romanian:string;shape:CargoShape;description:string;reference:string;guidance:string}>={
 "boxed":{romanian:"Cutii / cartoane",shape:"box",description:"Packed goods in rectangular cartons. The contents and packaging determine compression resistance.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 14–15",guidance:"Use packed outer dimensions; obtain the permitted tier load from the shipper."},
 "pallet":{romanian:"Marfă paletizată",shape:"box",description:"A unit load includes its pallet, packaging and contents. Pallet size alone does not define loaded height.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 44–50",guidance:"Measure the entire load, including overhang. Include pallet tare once in gross mass."},
 "perishable":{romanian:"Mărfuri perisabile ventilate",shape:"box",description:"A cargo-care category, usually carried in cartons, crates or pallet loads; ventilation passages remain necessary.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 15",guidance:"Select the packed envelope and preserve the ventilation arrangement required for the commodity."},
 "crate":{romanian:"Lăzi / casete",shape:"box",description:"Protective cases and open crates may include skids, reinforced lifting points and uneven weight distribution.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 14–15",guidance:"Include skids in height; use documented lifting points and stacking limits."},
 "bag":{romanian:"Saci mici",shape:"ellipsoid",description:"Flexible sacks change shape with filling, settling and compression. A rounded envelope is only an approximation.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 11–14",guidance:"Measure the filled sack; protect against chafe, moisture and projections. No deformation is calculated."},
 "bulk-bag":{romanian:"Saci vrac / FIBC",shape:"cylinder-z",description:"Flexible intermediate bulk containers differ in construction and filled form. Rounded and shape-retaining bags require different envelopes.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 13, 18",guidance:"Use filled dimensions and the manufacturer’s handling and stacking instructions; do not assume a universal bag size."},
 "bale":{romanian:"Baloturi",shape:"box",description:"Compressed or bound goods such as fibres and pulp. Rectangular bales are common, but cylindrical and irregular forms also occur.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 14",guidance:"Protect bindings and covers. Enter the shipped dimensions; compression and expansion are not simulated."},
 "drum":{romanian:"Butoaie cilindrice",shape:"cylinder-z",description:"Metal, fibreboard or plastic drums carry liquids or dry goods. Rims and hoops can change the maximum diameter.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 17",guidance:"Use maximum outside diameter, not nominal capacity. Follow manufacturer orientation and stacking instructions."},
 "barrel":{romanian:"Butoaie cu doage",shape:"cylinder-z",description:"Casks have a bulging body and different support requirements from straight-sided drums.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 17",guidance:"The app uses a maximum-diameter cylinder, not the true bulged body. Horizontal support requires separate review."},
 "ibc":{romanian:"IBC rigid",shape:"box",description:"A rigid intermediate bulk container may include a cage, pallet or skids. It is distinct from a flexible bulk bag.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 18",guidance:"Measure cage and base together; follow the manufacturer’s capacity and stacking limits."},
 "roll":{romanian:"Role",shape:"cylinder-x",description:"Wound material is represented by its outer cylinder. Packaging and the permitted axis orientation depend on the product.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 68–73 (coil comparison)",guidance:"Enter roll width along its axis and the outside diameter. A curved side is not a flat stacking face."},
 "reel":{romanian:"Bobine / tamburi de cablu",shape:"cylinder-x",description:"A flanged reel has a core and two end discs. Its maximum flange diameter defines the conservative outer envelope.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 68–73 (coil comparison)",guidance:"Flanges and the bore are not resolved by the cylinder model. Verify actual bearing points separately."},
 "coil":{romanian:"Colaci",shape:"cylinder-x",description:"Coiled steel and wire products have an eye and can have different packing and stowage orientations.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 70–73",guidance:"Use outside diameter and axial width. The bore is occupied in the collision envelope; securing is not inferred."},
 "pipe":{romanian:"Țevi / tuburi individuale",shape:"cylinder-x",description:"A single round pipe has a cylindrical outside surface. A bundle of pipes is a different transported unit.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 68–78",guidance:"Use pipe length and outside diameter. The bore is not available for nesting in the current model."},
 "bundle":{romanian:"Legături de marfă",shape:"box",description:"Several members are bound into one unit. The outside section depends on the members and their arrangement.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 14, 73",guidance:"Choose rectangular or round envelope to match the bundle. Irregular or hexagonal bundles need a conservative envelope."},
 "project":{romanian:"Marfă personalizată / de proiect",shape:"box",description:"An individual load may have irregular geometry, an offset centre of gravity and special lifting or support requirements.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 20–25",guidance:"Define a conservative envelope and declared mass/CG; it does not reproduce a detailed engineering model."},
 "container":{romanian:"Containere ISO",shape:"box",description:"A freight container is a transport unit; its external envelope differs from its usable internal cargo space.",reference:"Thomas’ Stowage, 8th ed. (2018), Part 2, pp. 51–61",guidance:"Use the actual equipment specification. Corner supports and securing are not generated by the envelope."},
};
export function cargoVariants(id:string):[CargoShape,string][]{
 const cylinder:[CargoShape,string][]=[["cylinder-x","Horizontal — length axis"],["cylinder-y","Horizontal — width axis"],["cylinder-z","Upright"]];
 if(["drum","barrel","roll","reel","coil","pipe"].includes(id))return cylinder;
 if(id==="bulk-bag")return [["cylinder-z","Rounded filled bag"],["box","Shape-retaining / baffled bag"]];
 if(id==="bag")return [["ellipsoid","Rounded sack envelope"],["box","Rectangular packed envelope"]];
 if(id==="bale"||id==="bundle")return [["box","Rectangular"],...cylinder];
 return [["box","Rectangular packed envelope"]];
}
export type CargoSizePreset={id:string;name:string;types:string[];length:number;width:number;height?:number;source:string;note:string};
export const cargoSizePresets:CargoSizePreset[]=[
 {id:"eur1",name:"EUR 1 / EPAL 1 — 1.20 × 0.80 m",types:["pallet","perishable"],length:1.2,width:.8,source:"https://www.epal-pallets.org/eu-en/load-carriers/epal-euro-pallet",note:"Pallet base: 0.144 m high. Enter the total loaded height and gross mass including the pallet; these are not standardised."},
 {id:"eur2",name:"EUR 2 / EPAL 2 — 1.20 × 1.00 m",types:["pallet","perishable"],length:1.2,width:1,source:"https://www.epal-pallets.org/eu-fr/porteur-de-charge/palette-epal-2",note:"Pallet base: 0.162 m high. Enter the total loaded height and gross mass including the pallet; these are not standardised."},
];

for(const [id,name,length,width,base] of [
 ['eur3','EUR 3 / EPAL 3',1,1.2,.144],['eur6','EUR 6 / EPAL 6',.8,.6,.144],['epal7','EPAL 7 half pallet',.8,.6,.163],
 ['cp1','EPAL CP1',1,1.2,.138],['cp2','EPAL CP2',.8,1.2,.138],['cp3','EPAL CP3',1.14,1.14,.138],['cp4','EPAL CP4',1.1,1.3,.138],['cp5','EPAL CP5',.76,1.14,.138],['cp6','EPAL CP6',1.2,1,.156],['cp7','EPAL CP7',1.3,1.1,.156],['cp8','EPAL CP8',1.14,1.14,.156],['cp9','EPAL CP9',1.14,1.14,.156],
] as const) cargoSizePresets.push({id,name:`${name} — ${length} × ${width} m`,types:['pallet','perishable'],length,width,source:'https://www.epal-pallets.org/eu-en/load-carriers/overview/',note:`Pallet base: ${base} m high. Enter total loaded height and gross mass including pallet; these are not standardised.`});
cargoSizePresets.push({id:'greif217',name:'Greif 217 S 08 CS — 217 L',types:['drum'],length:.585,width:.585,height:.88,source:'https://admin.net17025.com/files/certificates/certificate_296_120827133352.pdf',note:'Manufacturer-specific external dimensions, NET0706C. Not a universal 200 L drum size or a current dangerous-goods approval. Confirm the actual drum and gross mass.'});

for(const [id,name,length,height] of [['20gp',"20 ft standard",6.058,2.591],['40gp',"40 ft standard",12.192,2.591],['40hc',"40 ft high cube",12.192,2.896]] as const) cargoSizePresets.push({id,name,types:['container'],length,width:2.438,height,source:'https://www.fesco.com/en/assets/containers/',note:'External container envelope. Confirm actual equipment dimensions and gross mass; internal capacity and securing fittings are not represented.'});
