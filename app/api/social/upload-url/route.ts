import { NextResponse } from "next/server";

// 簡化版：直接回傳 public 資料夾 url
// 若要 R2/S3 上傳，可換成 presigned URL 流程
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file" }, { status: 400 });

  // 假設先存在 public/uploads 下（示範用）
  const fakeUrl = `/uploads/${file.name}`;
  return NextResponse.json({ url: fakeUrl });
}
