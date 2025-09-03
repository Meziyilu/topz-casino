// ==============================
// file: lib/ws.ts (SSE helpers)
// ==============================
export type SSEController = {
stream: ReadableStream;
send: (event: string, data: unknown) => void;
close: () => void;
};


export function createSSE(): SSEController {
let controller: ReadableStreamDefaultController<string>;
const stream = new ReadableStream<string>({
start(c) { controller = c; },
cancel() { /* noop */ },
});
const enc = (e: string, d: string) => `event: ${e}\ndata: ${d}\n\n`;
return {
stream,
send: (event, data) => {
controller.enqueue(enc(event, JSON.stringify(data)));
},
close: () => controller.close(),
};
}


export function sseHeaders(): HeadersInit {
return {
"Content-Type": "text/event-stream; charset=utf-8",
"Cache-Control": "no-cache, no-transform",
Connection: "keep-alive",
};
}