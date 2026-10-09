import * as THREE from 'three';
import {markingLines,type CargoMarkings} from '../app/cargo-identification';
/** Surface art is shared by identical cargo markings, never allocated per animation frame. */
export class CargoMarkingTextures{
 private textures=new Map<string,THREE.CanvasTexture>();private used=new Set<string>();
 begin(){this.used.clear();}
 get(name:string,markings:CargoMarkings|undefined,stackability:string|undefined,invalidate:()=>void){
  if(!markings||typeof document==='undefined')return null;
  const lines=markingLines({id:'',name,footprint:{markings,stackability}}).filter(v=>!v.startsWith('ID ')&&!v.startsWith('SSCC ')&&!v.startsWith('ISO 6346 '));
  const color=markings.layers.destination?markings.color??'#bfdbfe':'#bfdbfe',pattern=markings.layers.destination?markings.pattern:'plain',image=markings.layers.company?markings.image:undefined;
  const key=JSON.stringify([lines,color,pattern,image]);this.used.add(key);const existing=this.textures.get(key);if(existing)return existing;
  const canvas=document.createElement('canvas');canvas.width=256;canvas.height=192;const ctx=canvas.getContext('2d')!;
  ctx.fillStyle=color;ctx.fillRect(0,0,256,192);ctx.strokeStyle='#122d4325';ctx.fillStyle='#122d4325';
  if(pattern==='stripes')for(let x=-192;x<256;x+=20){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+192,192);ctx.stroke();}
  if(pattern==='dots')for(let x=8;x<256;x+=20)for(let y=8;y<192;y+=20){ctx.beginPath();ctx.arc(x,y,2,0,Math.PI*2);ctx.fill();}
  const font=Math.min(18,110/Math.max(lines.length,1));ctx.font=`${font}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';
  lines.forEach((line,i)=>{const y=70+i*font;ctx.fillStyle='#ffffffee';ctx.fillRect(3,y-font/2,250,font);ctx.fillStyle=line.startsWith('DG ')?'#991b1b':'#122d43';ctx.fillText(line,128,y,244);});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;this.textures.set(key,texture);
  if(image){const img=new Image();img.onload=()=>{if(this.textures.get(key)!==texture)return;const scale=Math.min(80/img.width,48/img.height);ctx.drawImage(img,128-img.width*scale/2,8,img.width*scale,img.height*scale);texture.needsUpdate=true;invalidate();};img.src=image;}
  return texture;
 }
 end(){for(const [key,texture] of this.textures)if(!this.used.has(key)){texture.dispose();this.textures.delete(key);}}
 dispose(){for(const t of this.textures.values())t.dispose();this.textures.clear();}
}
