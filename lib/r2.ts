import { S3Client } from "@aws-sdk/client-s3";

export const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID!;
export const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY!;
export const R2_ENDPOINT = process.env.R2_ENDPOINT!;
export const R2_BUCKET = process.env.R2_BUCKET!;
export const R2_PUBLIC_BASE_URL = (process.env.R2_PUBLIC_BASE_URL || "").replace(/\/$/, "");

if (!R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_ENDPOINT || !R2_BUCKET) {
  // 在 render log 看到就知道缺了什麼
  console.error("R2 ENV MISSING", { R2_ACCESS_KEY_ID: !!R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY: !!R2_SECRET_ACCESS_KEY, R2_ENDPOINT, R2_BUCKET });
}

export const s3 = new S3Client({
  region: "auto",
  endpoint: R2_ENDPOINT,        // <= 僅帳號主機名
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
  forcePathStyle: true,         // <= R2 必須
});
