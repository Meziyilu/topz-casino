// lib/r2.ts
import { S3Client } from "@aws-sdk/client-s3";

const endpoint = process.env.R2_ENDPOINT!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_BASE_URL = process.env.R2_PUBLIC_BASE_URL || ""; // e.g. https://pub-xxxxx.r2.dev

export const r2 = new S3Client({
  region: "auto",
  endpoint,
  forcePathStyle: true,
  credentials: { accessKeyId, secretAccessKey },
});
