// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

export const R2_ENDPOINT = process.env.R2_ENDPOINT!;
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || ""; // 可空
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;

if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn("[R2] Missing ENV. endpoint/bucket/key/secret must be set.");
}

export const s3Client = new S3Client({
  endpoint: R2_ENDPOINT,            // 只放 endpoint，不要加 bucket
  region: "auto",                   // R2 固定 auto
  forcePathStyle: true,             // R2 需要 path-style
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
