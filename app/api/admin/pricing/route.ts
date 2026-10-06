import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const DEFAULTS = { clicker_starting_price: 54000, price_per_extra_keycap: 5000 };

async function isSuperAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return false;
  const { data } = await supabaseAdmin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  return data?.role === "admin" && data.is_active !== false;
}

export async function GET(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Menu ini hanya dapat dibuka Super Admin." }, { status: 403 });
  const { data, error } = await supabaseAdmin.from("store_settings")
    .select("clicker_starting_price,price_per_extra_keycap").eq("id", "default").maybeSingle();
  if (error) return NextResponse.json({ error: "Pengaturan harga belum tersedia. Jalankan pembaruan database terlebih dahulu." }, { status: 500 });
  return NextResponse.json({ settings: {
    clickerStartingPrice: data?.clicker_starting_price ?? DEFAULTS.clicker_starting_price,
    pricePerExtraKeycap: data?.price_per_extra_keycap ?? DEFAULTS.price_per_extra_keycap,
  } });
}

export async function PUT(request: NextRequest) {
  if (!await isSuperAdmin(request)) return NextResponse.json({ error: "Menu ini hanya dapat diubah Super Admin." }, { status: 403 });
  const body = await request.json().catch(() => null);
  const clickerStartingPrice = Number(body?.clickerStartingPrice);
  const pricePerExtraKeycap = Number(body?.pricePerExtraKeycap);
  if (!Number.isSafeInteger(clickerStartingPrice) || clickerStartingPrice < 1000 || clickerStartingPrice > 10000000 || !Number.isSafeInteger(pricePerExtraKeycap) || pricePerExtraKeycap < 0 || pricePerExtraKeycap > 10000000) {
    return NextResponse.json({ error: "Harga mulai minimal Rp1.000. Periksa kembali kedua harga." }, { status: 400 });
  }
  const { data, error } = await supabaseAdmin.from("store_settings").update({
    clicker_starting_price: clickerStartingPrice,
    price_per_extra_keycap: pricePerExtraKeycap,
    updated_at: new Date().toISOString(),
  }).eq("id", "default").select("clicker_starting_price,price_per_extra_keycap").single();
  if (error || !data) return NextResponse.json({ error: "Harga gagal disimpan. Pastikan pembaruan database sudah dijalankan." }, { status: 500 });
  return NextResponse.json({ settings: {
    clickerStartingPrice: data.clicker_starting_price,
    pricePerExtraKeycap: data.price_per_extra_keycap,
  } });
}
