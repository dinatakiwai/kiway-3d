import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_BASE_COLORS, DEFAULT_CAP_COLORS, DEFAULT_FONT_COLORS, STORE, type ClickerColor } from "@/lib/store";

const defaultSettings = {
  whatsapp: STORE.whatsapp,
  whatsappGreeting: STORE.whatsappGreeting,
  baseColors: DEFAULT_BASE_COLORS,
  capColors: DEFAULT_CAP_COLORS,
  fontColors: DEFAULT_FONT_COLORS,
  instagramUrl: "",
  tiktokUrl: "",
  shopeeUrl: "",
  clickerStartingPrice: 54000,
  pricePerExtraKeycap: 5000,
};

async function superAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return null;
  const { data: profile } = await supabaseAdmin.from("profiles")
    .select("role,is_active").eq("id", user.id).maybeSingle();
  return profile?.role === "admin" && profile.is_active !== false ? user : null;
}

function validColors(value: unknown): value is ClickerColor[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 24) return false;
  const names = new Set<string>();
  const values = new Set<string>();
  return value.every((item) => {
    if (!item || typeof item.name !== "string" || typeof item.value !== "string") return false;
    const name = item.name.trim();
    const color = item.value.trim().toLowerCase();
    if (!name || name.length > 30 || !/^#[0-9a-f]{6}$/.test(color) || names.has(name.toLowerCase()) || values.has(color)) return false;
    names.add(name.toLowerCase());
    values.add(color);
    return true;
  });
}

export async function GET() {
  const { data, error } = await supabaseAdmin.from("store_settings")
    .select("whatsapp,whatsapp_greeting,base_colors,cap_colors,font_colors,clicker_starting_price,price_per_extra_keycap,instagram_url,tiktok_url,shopee_url")
    .eq("id", "default").maybeSingle();
  if (error || !data) return NextResponse.json({ settings: defaultSettings });
  return NextResponse.json({ settings: {
    whatsapp: data.whatsapp,
    whatsappGreeting: data.whatsapp_greeting,
    baseColors: Array.isArray(data.base_colors) && data.base_colors.length ? data.base_colors : DEFAULT_BASE_COLORS,
    capColors: Array.isArray(data.cap_colors) && data.cap_colors.length ? data.cap_colors : DEFAULT_CAP_COLORS,
    fontColors: Array.isArray(data.font_colors) && data.font_colors.length ? data.font_colors : DEFAULT_FONT_COLORS,
    instagramUrl: data.instagram_url ?? "",
    tiktokUrl: data.tiktok_url ?? "",
    shopeeUrl: data.shopee_url ?? "",
    clickerStartingPrice: data.clicker_starting_price,
    pricePerExtraKeycap: data.price_per_extra_keycap,
  } });
}

export async function PUT(request: NextRequest) {
  if (!await superAdmin(request)) {
    return NextResponse.json({ error: "Pengaturan ini hanya dapat diubah Super Admin." }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const whatsapp = typeof body?.whatsapp === "string" ? body.whatsapp.replace(/\D/g, "") : "";
  const whatsappGreeting = typeof body?.whatsappGreeting === "string" ? body.whatsappGreeting.trim() : "";
  const baseColors = body?.baseColors;
  const capColors = body?.capColors;
  const fontColors = body?.fontColors;
  const socials = {
    instagram_url: typeof body?.instagramUrl === "string" ? body.instagramUrl.trim() : "",
    tiktok_url: typeof body?.tiktokUrl === "string" ? body.tiktokUrl.trim() : "",
    shopee_url: typeof body?.shopeeUrl === "string" ? body.shopeeUrl.trim() : "",
  };
  const validUrl = (value: string) => {
    if (!value) return true;
    try { return ["http:", "https:"].includes(new URL(value).protocol); } catch { return false; }
  };

  if (whatsapp.length < 8 || whatsapp.length > 15 || !whatsappGreeting || whatsappGreeting.length > 500 || !validColors(baseColors) || !validColors(capColors) || !validColors(fontColors) || !Object.values(socials).every(validUrl)) {
    return NextResponse.json({ error: "Periksa nomor WhatsApp, pesan pembuka, daftar warna, dan link sosial media (gunakan https://)." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("store_settings").upsert({
    id: "default",
    whatsapp,
    whatsapp_greeting: whatsappGreeting,
    base_colors: baseColors.map((color) => ({ name: color.name.trim(), value: color.value.toLowerCase() })),
    cap_colors: capColors.map((color) => ({ name: color.name.trim(), value: color.value.toLowerCase() })),
    font_colors: fontColors.map((color) => ({ name: color.name.trim(), value: color.value.toLowerCase() })),
    ...socials,
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).select("whatsapp,whatsapp_greeting,base_colors,cap_colors,font_colors,instagram_url,tiktok_url,shopee_url").single();

  if (error || !data) {
    const missingSocialColumns = error?.code === "42703" || error?.code === "PGRST204" || /instagram_url|tiktok_url|shopee_url/i.test(error?.message ?? "");
    return NextResponse.json({ error: missingSocialColumns
      ? "Kolom media sosial belum tersedia. Jalankan migration 202610090001_product_options_video_socials.sql di Supabase SQL Editor, lalu coba simpan lagi."
      : "Pengaturan gagal disimpan. Periksa koneksi dan migration pengaturan toko di Supabase." }, { status: 500 });
  }

  return NextResponse.json({ settings: {
    whatsapp: data.whatsapp,
    whatsappGreeting: data.whatsapp_greeting,
    baseColors: data.base_colors,
    capColors: data.cap_colors,
    fontColors: data.font_colors,
    instagramUrl: data.instagram_url ?? "",
    tiktokUrl: data.tiktok_url ?? "",
    shopeeUrl: data.shopee_url ?? "",
  } });
}
