// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

export const R2_ENDPOINT = process.env.R2_ENDPOINT!;
export const R2_BUCKET = process.env.R2_BUCKET!;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;

if (!R2_ENDPOINT || !R2_BUCKET || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
  console.warn("[R2] Missing ENV. endpoint/bucket/key/secret must be set.");
}

export const s3Client = new S3Client({
  endpoint: R2_ENDPOINT,    // 不要帶 bucket
  region: "auto",           // R2 固定這樣
  forcePathStyle: true,     // R2 必須 path-style
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
