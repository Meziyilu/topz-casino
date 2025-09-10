type Handler = (data: any) => void;

export class SSEHub {
  private subs = new Map<string, Set<Handler>>();

  emit(topic: string, data: any) {
    this.subs.get(topic)?.forEach(h => h(data));
  }

  subscribe(topic: string, h: Handler) {
    if (!this.subs.has(topic)) this.subs.set(topic, new Set());
    const set = this.subs.get(topic)!;
    set.add(h);
    return () => set.delete(h);
  }
}

// 單例（跨 hot-reload）
export const sicboHub: SSEHub = (globalThis as any).__sicboHub ??= new SSEHub();
