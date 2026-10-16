import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const BUCKET = "customer-clicker-designs";
const imageTypes: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function POST(request: NextRequest) {
  try {
    const { data: settings } = await supabaseAdmin.from("store_settings").select("image_clicker_enabled").eq("id", "default").maybeSingle();
    if (settings?.image_clicker_enabled === false) return NextResponse.json({ error: "Fitur clicker dari gambar sedang dinonaktifkan oleh toko." }, { status: 403 });
    const data = await request.formData();
    const image = data.get("image"); const model = data.get("model"); const mode = data.get("mode");
    if (!(image instanceof File) || !(model instanceof File)) return NextResponse.json({ error: "Gambar dan file model 3MF wajib disertakan." }, { status: 400 });
    const ext = imageTypes[image.type];
    if (!ext || image.size > 5 * 1024 * 1024 || model.size > 8 * 1024 * 1024 || (mode !== "relief" && mode !== "silhouette")) return NextResponse.json({ error: "Gunakan PNG/JPG/WebP maksimal 5 MB dan desain yang valid." }, { status: 400 });
    if (model.type !== "model/3mf" && model.type !== "application/octet-stream") return NextResponse.json({ error: "File model 3MF tidak valid." }, { status: 400 });
    const id = randomUUID();
    const files = [{ path: `${id}/source.${ext}`, file: image, type: image.type }, { path: `${id}/model.3mf`, file: model, type: "model/3mf" }];
    for (const entry of files) {
      const { error } = await supabaseAdmin.storage.from(BUCKET).upload(entry.path, entry.file, { contentType: entry.type, upsert: false });
      if (error) {
        await supabaseAdmin.storage.from(BUCKET).remove(files.map((f) => f.path));
        return NextResponse.json({ error: "Penyimpanan desain belum siap. Pastikan migration clicker_design_storage sudah dijalankan." }, { status: 503 });
      }
    }
    return NextResponse.json({ designId: id, mode });
  } catch { return NextResponse.json({ error: "Gagal mengunggah desain. Coba lagi." }, { status: 400 }); }
}
