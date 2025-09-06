// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL!; // 例如 https://pub-xxxxxx.r2.dev

// 只做 presign，不會向 R2 打任何請求
export const r2Client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT, // 例如 https://<accountid>.r2.cloudflarestorage.com
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});
