import {useEffect,useState} from 'react';
import {useLanguage} from '../app/language-context';
/** Delegated help covers lazy panels without scanning or observing the entire DOM. */
export function InputHelp(){
 const {language}=useLanguage();
 const [tip,setTip]=useState<{text:string;x:number;y:number}>();
 useEffect(()=>{
  const ro=language==='ro';
  let active:HTMLElement|undefined;
  const hide=()=>{if(active){const ids=(active.getAttribute('aria-describedby')??'').split(' ').filter(id=>id&&id!=='app-input-help');if(ids.length)active.setAttribute('aria-describedby',ids.join(' '));else active.removeAttribute('aria-describedby');}active=undefined;setTip(undefined);};
  const show=(event:Event)=>{
   const el=event.target;
   if(!(el instanceof HTMLInputElement||el instanceof HTMLSelectElement||el instanceof HTMLTextAreaElement)||el.type==='hidden')return;
   if(el.dataset.helpInline==='true'){hide();return;}
   if(active===el)return;
   hide();active=el;
   el.setAttribute('aria-describedby',[el.getAttribute('aria-describedby'),'app-input-help'].filter(Boolean).join(' '));
   const labels=Array.from(el.labels??[]);
   const wrapper=el.closest('label');if(wrapper&&!labels.includes(wrapper))labels.push(wrapper);
   const explicit=el.dataset.help||labels.map(l=>l.querySelector('.field-help-tooltip')?.textContent).find(Boolean)||el.title;
   const clone=labels[0]?.cloneNode(true) as HTMLElement|undefined;
   clone?.querySelectorAll('input,select,textarea,button,.field-help,.field-optional,output').forEach(n=>n.remove());
   const name=el.getAttribute('aria-label')||clone?.textContent?.trim()||el.getAttribute('placeholder')|| (ro?'Câmp':'Field');
   const details:string[]=[];
   const concepts:[RegExp,string,string][]=[
    [/\b(LCG|longitudinal centre|longitudinal center)\b/i,'Longitudinal centre of gravity. Use the origin and sign shown by the selected reference system.','Centrul de greutate longitudinal. Folosește originea și semnul sistemului de referință selectat.'],
    [/\b(TCG|transverse centre|transverse center)\b/i,'Transverse centre of gravity: the sideways position of the mass centre relative to the selected reference.','Centrul de greutate transversal: poziția laterală a centrului masei în referința selectată.'],
    [/\b(VCG|KG)\b/i,'Vertical centre of gravity. Check the selected reference origin before entering the height.','Centrul de greutate vertical. Verifică originea referinței selectate înainte de a introduce înălțimea.'],
    [/\bFSM\b|free.surface moment|moment.*suprafa/i,'Free-surface moment used for the stability correction of slack liquid tanks. This is not the liquid mass.','Momentul de suprafață liberă utilizat la corecția stabilității pentru tancuri parțial umplute. Nu reprezintă masa lichidului.'],
    [/stowage factor|factor.*stivuire/i,'Volume occupied per tonne of cargo, in m³/t. Keep packaging and allowance assumptions consistent with the cargo definition.','Volumul ocupat de o tonă de marfă, în m³/t. Folosește aceleași ipoteze privind ambalajele și rezervele ca în definiția mărfii.'],
    [/density|densitate/i,'Mass per unit volume. Use the density of the water or liquid named by this field; ballast water and surrounding water can differ.','Masa pe unitatea de volum. Folosește densitatea apei sau lichidului indicat; apa de balast poate avea altă densitate decât apa din exterior.'],
    [/transparency|transparen/i,'0% is opaque; 100% is invisible. This changes the display only.','0% este opac; 100% este invizibil. Modifică doar afișarea.'],
   ];
   const concept=concepts.find(([pattern])=>pattern.test(name));if(concept)details.push(concept[ro?2:1]);
   if(el instanceof HTMLInputElement){
    if(el.type==='number'||el.type==='range'){
     details.push(ro?'Introduceți o valoare numerică în unitățile indicate.':'Enter a numeric value in the indicated units.');
     if(el.min!=='')details.push(`${ro?'Minim':'Minimum'}: ${el.min}.`);
     if(el.max!=='')details.push(`${ro?'Maxim':'Maximum'}: ${el.max}.`);
     if(el.step&&el.step!=='any')details.push(`${ro?'Pas':'Step'}: ${el.step}.`);
    }else if(el.type==='file')details.push(`${ro?'Formate acceptate':'Accepted formats'}: ${el.accept|| (ro?'conform instrucțiunilor panoului':'see panel instructions')}.`);
    else if(el.type==='checkbox')details.push(ro?'Bifați pentru activare; debifați pentru dezactivare.':'Check to enable; uncheck to disable.');
   }
   if(el instanceof HTMLSelectElement)details.push(ro?'Alegeți una dintre opțiunile disponibile.':'Choose one of the available options.');
   if('maxLength' in el&&el.maxLength>0)details.push(`${ro?'Maximum caractere':'Maximum characters'}: ${el.maxLength}.`);
   if(el.required)details.push(ro?'Obligatoriu.':'Required.');
   if(el.disabled)details.push(ro?'Acest câmp nu poate fi editat în starea curentă.':'This field cannot be edited in the current state.');
   const rect=el.getBoundingClientRect();
   setTip({text:explicit?`${name}: ${explicit}`:[name,...details].join(' '),x:Math.max(8,Math.min(rect.left,window.innerWidth-328)),y:rect.bottom+90<window.innerHeight?rect.bottom+6:Math.max(8,rect.top-90)});
  };
  const leave=(event:Event)=>{if(event.target===active)hide();};
  const key=(event:KeyboardEvent)=>{if(event.key==='Escape')hide();};
  document.addEventListener('click',show);document.addEventListener('pointerover',show);document.addEventListener('focusin',show);
  document.addEventListener('pointerout',leave);document.addEventListener('focusout',leave);
  document.addEventListener('keydown',key);window.addEventListener('scroll',hide,true);window.addEventListener('resize',hide);
  return()=>{hide();document.removeEventListener('click',show);document.removeEventListener('pointerover',show);document.removeEventListener('focusin',show);document.removeEventListener('pointerout',leave);document.removeEventListener('focusout',leave);document.removeEventListener('keydown',key);window.removeEventListener('scroll',hide,true);window.removeEventListener('resize',hide);};
 },[language]);
 return tip?<div id="app-input-help" className="input-help-popover" role="tooltip" style={{left:tip.x,top:tip.y}}>{tip.text}</div>:null;
}
