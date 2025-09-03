// ==============================
// file: lib/redis.ts
// ==============================
import { invariant } from "./utils";


// Lazy import to avoid forcing dependency if REDIS_URL is not provided
let RedisImpl: any; // typed via factory below, no runtime any leak


export type RedisLike = {
get(key: string): Promise<string | null>;
set(key: string, value: string, mode?: string, duration?: number): Promise<unknown>;
del(key: string): Promise<unknown>;
publish?(channel: string, message: string): Promise<number>;
subscribe?(channel: string, listener: (message: string) => void): Promise<void> | void;
};


class MemoryRedis implements RedisLike {
private store = new Map<string, string>();
async get(key: string) { return this.store.get(key) ?? null; }
async set(key: string, value: string) { this.store.set(key, value); return true; }
async del(key: string) { this.store.delete(key); return true; }
}


let singleton: RedisLike | null = null;


export function redis(): RedisLike {
if (singleton) return singleton;
const url = process.env.REDIS_URL;
if (!url) {
singleton = new MemoryRedis();
return singleton;
}
try {
// eslint-disable-next-line @typescript-eslint/no-var-requires
RedisImpl = require("ioredis");
} catch (e) {
throw new Error("REDIS_URL is set but ioredis is not installed. Run `npm i ioredis`. ");
}
const client = new RedisImpl(url);
singleton = client as unknown as RedisLike;
return singleton;
}