/** Editing commands end provisional pointer gestures before changing selection,
 * geometry or history. Modifiers alone do not end a drag. */
export function cancelsCargoDrag(event:Pick<KeyboardEvent,'key'|'ctrlKey'|'metaKey'|'altKey'>){
 const key=event.key.toLowerCase();
 if(key==='escape')return true;
 if(event.ctrlKey||event.metaKey)return !event.altKey&&['a','c','v','d','z','y'].includes(key);
 return !event.altKey&&['delete','backspace','r','1','2','3','4','arrowleft','arrowright','arrowup','arrowdown'].includes(key);
}
export function bindCargoDragCancellation(target:EventTarget,page:EventTarget&{hidden:boolean},cancel:()=>void){
 const key=(event:Event)=>{if(cancelsCargoDrag(event as KeyboardEvent))cancel();};
 const leave=()=>cancel(),hidden=()=>{if(page.hidden)cancel();};
 target.addEventListener('keydown',key,true);target.addEventListener('blur',leave);page.addEventListener('visibilitychange',hidden);
 return()=>{target.removeEventListener('keydown',key,true);target.removeEventListener('blur',leave);page.removeEventListener('visibilitychange',hidden);};
}
