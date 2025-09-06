// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_ENDPOINT = process.env.R2_ENDPOINT!;
export const R2_BUCKET = process.env.R2_BUCKET!;
const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "").trim(); // 可留空

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
  console.warn(
    "[R2] Missing env values. Please set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET"
  );
}

export const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

/** 產生可用於 <img src> 的 URL：有 Public Domain 就回公網；否則走本機 proxy */
export function r2PublicUrl(key: string) {
  if (R2_PUBLIC_BASE_URL) {
    return `${R2_PUBLIC_BASE_URL.replace(/\/+$/, "")}/${key}`;
  }
  return `/api/upload/proxy?key=${encodeURIComponent(key)}`;
}
