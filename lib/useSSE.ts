"use client";

import { useEffect } from "react";

export function useSSE(url: string, onEvent: (e: MessageEvent & { type: string }) => void) {
  useEffect(() => {
    const ev = new EventSource(url);
    ev.onmessage = (e) => onEvent({ ...e, type: "message" });
    ev.addEventListener("state", (e) => onEvent({ ...(e as MessageEvent), type: "state" }));
    ev.addEventListener("result", (e) => onEvent({ ...(e as MessageEvent), type: "result" }));
    ev.addEventListener("tick", (e) => onEvent({ ...(e as MessageEvent), type: "tick" }));
    return () => ev.close();
  }, [url, onEvent]);
}
