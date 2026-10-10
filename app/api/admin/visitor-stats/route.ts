import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.is_active === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data, error } = await supabaseAdmin.from("daily_site_visits")
    .select("visit_date,visitor_count").order("visit_date", { ascending: false }).limit(30);
  if (error) return NextResponse.json({ error: "Jalankan migration 202610100002_daily_visitors.sql di Supabase." }, { status: 503 });
  return NextResponse.json({ visits: (data ?? []).reverse() });
}
