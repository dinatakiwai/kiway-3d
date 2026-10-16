import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

function digits(value: unknown) {
  return String(value ?? "").replace(/\D/g, "");
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const previousCode = typeof body?.previousCode === "string" ? body.previousCode.trim() : "";
  const phone = digits(body?.phone);
  if (!previousCode || phone.length < 8) {
    return NextResponse.json({ error: "Data order tidak valid." }, { status: 400 });
  }

  const { data: order, error: lookupError } = await supabaseAdmin.from("orders")
    .select("id,order_code,customer_phone,created_at")
    .eq("order_code", previousCode).maybeSingle();
  if (lookupError || !order || digits(order.customer_phone) !== phone) {
    return NextResponse.json({ error: "Order tidak ditemukan." }, { status: 404 });
  }
  if (order.order_code?.startsWith("KEILAB-")) return NextResponse.json({ orderCode: order.order_code });
  if (order.order_code !== previousCode) return NextResponse.json({ error: "Kode order sudah berubah." }, { status: 409 });

  const date = new Date(order.created_at || Date.now()).toISOString().slice(0, 10).replaceAll("-", "");
  const orderCode = `KEILAB-${date}-${order.id.replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const { data: updated, error } = await supabaseAdmin.from("orders")
    .update({ order_code: orderCode }).eq("id", order.id).eq("order_code", previousCode).eq("customer_phone", order.customer_phone)
    .select("order_code").maybeSingle();
  if (error || !updated) {
    console.error("Order tracking code update failed", { code: error?.code, message: error?.message });
    return NextResponse.json({ error: "Kode lacak belum dapat diperbarui." }, { status: 500 });
  }
  return NextResponse.json({ orderCode: updated.order_code });
}
