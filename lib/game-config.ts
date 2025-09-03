// ==============================
// file: lib/game-config.ts
// ==============================
import prisma from "./prisma";
import { GameCode } from "@prisma/client";


export type ConfigValue = string | number | boolean | Record<string, unknown> | null;


export async function getConfigRaw(gameCode: GameCode, key: string) {
return prisma.gameConfig.findUnique({ where: { gameCode_key: { gameCode, key } } });
}


export async function getConfig<T extends ConfigValue>(gameCode: GameCode, key: string, fallback: T): Promise<T> {
const row = await getConfigRaw(gameCode, key);
if (!row) return fallback;
if (typeof fallback === "string") return (row.valueString ?? String(row.valueInt ?? row.valueFloat ?? row.valueBool ?? fallback)) as T;
if (typeof fallback === "number") return (row.valueInt ?? row.valueFloat ?? Number(row.valueString ?? fallback)) as T;
if (typeof fallback === "boolean") return (typeof row.valueBool === "boolean" ? row.valueBool : String(row.valueString ?? "false") === "true") as T;
if (fallback && typeof fallback === "object") return (row.json as T) ?? fallback;
return fallback;
}


export async function setConfig(gameCode: GameCode, key: string, value: ConfigValue) {
const data: any = { valueString: null, valueInt: null, valueFloat: null, valueBool: null, json: null };
if (typeof value === "string") data.valueString = value;
else if (typeof value === "number") data.valueFloat = value; // keep in float; you may prefer valueInt if integer only
else if (typeof value === "boolean") data.valueBool = value;
else if (value && typeof value === "object") data.json = value;
return prisma.gameConfig.upsert({
where: { gameCode_key: { gameCode, key } },
create: { gameCode, key, ...data },
update: data,
});
}


export async function getAllConfigs(gameCode: GameCode) {
return prisma.gameConfig.findMany({ where: { gameCode } });
}