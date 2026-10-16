import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
const BUCKET = "customer-clicker-designs";

export async function GET(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data: profile } = await supabaseAdmin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (profile?.role !== "admin" || profile.is_active === false) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const id = request.nextUrl.searchParams.get("id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Desain tidak valid." }, { status: 400 });
  const paths = [`${id}/source.png`, `${id}/source.jpg`, `${id}/source.webp`, `${id}/model.3mf`];
  const result = await supabaseAdmin.storage.from(BUCKET).createSignedUrls(paths, 15 * 60);
  if (result.error) return NextResponse.json({ error: "File desain tidak ditemukan." }, { status: 404 });
  const urls = result.data ?? [];
  return NextResponse.json({
    source: urls.find((x) => x.path?.includes("/source."))?.signedUrl ?? null,
    model: urls.find((x) => x.path?.endsWith("/model.3mf"))?.signedUrl ?? null,
  });
}
