import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((item): item is string => typeof item === "string")
    .map((item) => item.trim().slice(0, 40)).filter(Boolean))];
}

async function getCategories() {
  const { data: settings } = await supabaseAdmin.from("store_settings")
    .select("catalog_categories").eq("id", "default").maybeSingle();
  const saved = cleanList(settings?.catalog_categories);
  if (saved.length) return saved;
  const { data } = await supabaseAdmin.from("products").select("category").eq("is_active", true);
  return [...new Set((data ?? []).map((item) => String(item.category ?? "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b));
}

async function isAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" && profile.is_active !== false;
}

export async function GET() {
  return NextResponse.json({ categories: await getCategories() });
}

export async function POST(request: NextRequest) {
  if (!await isAdmin(request)) return NextResponse.json({ error: "Hanya admin yang dapat mengatur kategori." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const action = body?.action;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 40) : "";
  const nextName = typeof body?.nextName === "string" ? body.nextName.trim().slice(0, 40) : "";
  let categories = await getCategories();

  if (action === "create") {
    if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
    if (name.toLowerCase() === "semua") return NextResponse.json({ error: "Nama Semua digunakan untuk menampilkan seluruh produk." }, { status: 400 });
    if (categories.some((category) => category.toLowerCase() === name.toLowerCase())) return NextResponse.json({ error: "Kategori tersebut sudah ada." }, { status: 409 });
    categories = [...categories, name].sort((a, b) => a.localeCompare(b));
  } else if (action === "rename") {
    if (!name || !nextName) return NextResponse.json({ error: "Nama kategori baru wajib diisi." }, { status: 400 });
    if (nextName.toLowerCase() === "semua") return NextResponse.json({ error: "Nama Semua digunakan untuk menampilkan seluruh produk." }, { status: 400 });
    if (!categories.includes(name)) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    if (categories.some((category) => category.toLowerCase() === nextName.toLowerCase() && category !== name)) return NextResponse.json({ error: "Nama kategori tersebut sudah dipakai." }, { status: 409 });
    const { error } = await supabaseAdmin.from("products").update({ category: nextName }).eq("category", name);
    if (error) return NextResponse.json({ error: "Kategori produk gagal diperbarui." }, { status: 500 });
    categories = categories.map((category) => category === name ? nextName : category).sort((a, b) => a.localeCompare(b));
  } else if (action === "delete") {
    if (!categories.includes(name)) return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    const { error } = await supabaseAdmin.from("products").update({ category: "Lainnya" }).eq("category", name);
    if (error) return NextResponse.json({ error: "Produk dalam kategori ini tidak dapat dipindahkan." }, { status: 500 });
    categories = [...new Set([...categories.filter((category) => category !== name), "Lainnya"])].sort((a, b) => a.localeCompare(b));
  } else {
    return NextResponse.json({ error: "Perintah kategori tidak dikenal." }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("store_settings").upsert({
    id: "default", catalog_categories: categories, updated_at: new Date().toISOString(),
  }, { onConflict: "id" });
  if (error) {
    console.error("Catalog categories save failed", { code: error.code, message: error.message });
    return NextResponse.json({ error: "Kategori gagal disimpan. Jalankan migration kategori katalog." }, { status: 500 });
  }
  return NextResponse.json({ categories });
}
