import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file) {
      return NextResponse.json({ ok: false, error: "NO_FILE" }, { status: 400 });
    }

    // 產生隨機檔名
    const bytes = await file.arrayBuffer();
    const buf = Buffer.from(bytes);
    const ext = file.type.split("/")[1] || "png";
    const filename = crypto.randomBytes(12).toString("hex") + "." + ext;

    const filePath = path.join(process.cwd(), "public", "uploads", filename);
    await writeFile(filePath, buf);

    // 回傳可直接用於 <img src="">
    const url = "/uploads/" + filename;
    return NextResponse.json({ ok: true, url });
  } catch (e) {
    console.error("UPLOAD_AVATAR", e);
    return NextResponse.json({ ok: false, error: "INTERNAL" }, { status: 500 });
  }
}

export const config = {
  api: { bodyParser: false },
};
