"use client";
import { useEffect, useRef, useState } from "react";

export function useSSE<T=any>(url: string, onEvent?: (ev:MessageEvent)=>void){
  const [last, setLast] = useState<T|null>(null);
  const ref = useRef<EventSource|null>(null);
  useEffect(()=>{
    const es = new EventSource(url, { withCredentials:true });
    ref.current = es;
    es.onmessage = (e)=>{ try{ setLast(JSON.parse(e.data)); }catch{} };
    if (onEvent){
      ["state","tick","result","exposure"].forEach(t=> es.addEventListener(t, onEvent as any));
    }
    return ()=> { es.close(); ref.current=null; };
  }, [url]);
  return last;
}
