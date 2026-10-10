import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST() {
  const { error } = await supabaseAdmin.rpc("record_daily_site_visit");
  if (error) return NextResponse.json({ error: "Visit tracking is not configured." }, { status: 503 });
  return new NextResponse(null, { status: 204 });
}
