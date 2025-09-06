// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || ""; // 可選，建議提供
export const R2_ENDPOINT = process.env.R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : "");
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || ""; // 可選

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET) {
  // 避免 build-time crash，runtime 再檢查
  console.warn("[r2] Missing required env(s): R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY / R2_BUCKET");
}

export const s3Client = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT || undefined,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});
