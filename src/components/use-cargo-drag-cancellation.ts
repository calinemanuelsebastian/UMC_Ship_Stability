import {useEffect,useRef} from 'react';
import {bindCargoDragCancellation} from '../app/drag-cancellation';
/** A drag is provisional. Commands, leaving the app or replacing its condition
 * discard it before a later pointer-up can commit stale coordinates. */
export function useCargoDragCancellation(cancel:()=>void,condition:unknown,mode:unknown){
 const current=useRef(cancel);current.current=cancel;
 useEffect(()=>{current.current();},[condition,mode]);
 useEffect(()=>bindCargoDragCancellation(window,document,()=>current.current()),[]);
}
