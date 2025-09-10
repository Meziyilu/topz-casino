type Handler = (data:any)=>void;

export class SSEHub {
  private subs = new Map<string, Set<Handler>>();
  emit(topic:string, data:any){ this.subs.get(topic)?.forEach(h=>h(data)); }
  subscribe(topic:string, h:Handler){
    if(!this.subs.has(topic)) this.subs.set(topic, new Set());
    this.subs.get(topic)!.add(h);
    return ()=> this.subs.get(topic)!.delete(h);
  }
}
export const sicboHub: SSEHub = (globalThis as any).__sicboHub ??= new SSEHub();
