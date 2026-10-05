import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { DEFAULT_BASE_COLORS, DEFAULT_CAP_COLORS, DEFAULT_FONT_COLORS, STORE, type ClickerColor } from "@/lib/store";

const defaultSettings = {
  whatsapp: STORE.whatsapp,
  whatsappGreeting: STORE.whatsappGreeting,
  baseColors: DEFAULT_BASE_COLORS,
  capColors: DEFAULT_CAP_COLORS,
  fontColors: DEFAULT_FONT_COLORS,
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
    .select("whatsapp,whatsapp_greeting,base_colors,cap_colors,font_colors")
    .eq("id", "default").maybeSingle();
  if (error || !data) return NextResponse.json({ settings: defaultSettings });
  return NextResponse.json({ settings: {
    whatsapp: data.whatsapp,
    whatsappGreeting: data.whatsapp_greeting,
    baseColors: Array.isArray(data.base_colors) && data.base_colors.length ? data.base_colors : DEFAULT_BASE_COLORS,
    capColors: Array.isArray(data.cap_colors) && data.cap_colors.length ? data.cap_colors : DEFAULT_CAP_COLORS,
    fontColors: Array.isArray(data.font_colors) && data.font_colors.length ? data.font_colors : DEFAULT_FONT_COLORS,
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

  if (whatsapp.length < 8 || whatsapp.length > 15 || !whatsappGreeting || whatsappGreeting.length > 500 || !validColors(baseColors) || !validColors(capColors) || !validColors(fontColors)) {
    return NextResponse.json({ error: "Periksa nomor WhatsApp, pesan pembuka, dan daftar warna." }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin.from("store_settings").upsert({
    id: "default",
    whatsapp,
    whatsapp_greeting: whatsappGreeting,
    base_colors: baseColors.map((color) => ({ name: color.name.trim(), value: color.value.toLowerCase() })),
    cap_colors: capColors.map((color) => ({ name: color.name.trim(), value: color.value.toLowerCase() })),
    font_colors: fontColors.map((color) => ({ name: color.name.trim(), value: color.value.toLowerCase() })),
    updated_at: new Date().toISOString(),
  }, { onConflict: "id" }).select("whatsapp,whatsapp_greeting,base_colors,cap_colors,font_colors").single();

  if (error || !data) {
    return NextResponse.json({ error: "Pengaturan gagal disimpan. Pastikan SQL pengaturan toko sudah dijalankan di Supabase." }, { status: 500 });
  }

  return NextResponse.json({ settings: {
    whatsapp: data.whatsapp,
    whatsappGreeting: data.whatsapp_greeting,
    baseColors: data.base_colors,
    capColors: data.cap_colors,
    fontColors: data.font_colors,
  } });
}