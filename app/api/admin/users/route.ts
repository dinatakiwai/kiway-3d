import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const modules = ["orders", "inventory", "production", "products", "finance"] as const;
type Permissions = Record<(typeof modules)[number], { read: boolean; write: boolean }>;
const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });

function validPermissions(value: unknown): value is Permissions {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, any>;
  return modules.every((key) =>
    p[key] && typeof p[key].read === "boolean" && typeof p[key].write === "boolean" &&
    (!p[key].write || p[key].read)
  );
}

async function superAdmin(request: NextRequest) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { user: null, error: "Sesi login tidak ditemukan. Keluar lalu masuk kembali." };
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { user: null, error: "Sesi login situs tidak cocok dengan Supabase server. Pastikan NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di Vercel berasal dari proyek Supabase yang sama, lalu masuk kembali." };
  const { data, error: profileError } = await supabaseAdmin.from("profiles").select("role,is_active").eq("id", user.id).maybeSingle();
  if (profileError) return { user: null, error: "Profil akun tidak dapat dibaca oleh server. Periksa kredensial Supabase Production di Vercel." };
  if (!data) return { user: null, error: "Akun ini belum memiliki profil di tabel profiles pada proyek Supabase online." };
  if (data.role !== "admin") return { user: null, error: `Role akun di Supabase online adalah '${data.role}', sedangkan halaman ini memerlukan role 'admin'.` };
  if (data.is_active === false) return { user: null, error: "Akun Super Admin ini berstatus nonaktif di Supabase online." };
  return { user, error: null };
}

export async function GET(request: NextRequest) {
  const access = await superAdmin(request);
  if (access.error) return fail(access.error, 403);
  const { data, error } = await supabaseAdmin.from("profiles")
    .select("id,full_name,phone,role,is_active,permissions,created_at")
    .in("role", ["manager", "staff"]).order("created_at", { ascending: false });
  if (error) return fail("Gagal memuat akun karyawan.", 500);
  const { data: auth, error: authError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (authError) return fail("Gagal memuat email akun.", 500);
  const emails = new Map(auth.users.map((u) => [u.id, u.email ?? ""]));
  return NextResponse.json({ users: (data ?? []).map((u) => ({ ...u, email: emails.get(u.id) ?? "" })) });
}

export async function POST(request: NextRequest) {
  const access = await superAdmin(request);
  if (access.error) return fail(access.error, 403);
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const password = typeof body?.password === "string" ? body.password : "";
  const full_name = typeof body?.full_name === "string" ? body.full_name.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (!/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || !full_name ||
      !["manager", "staff"].includes(body?.role) || !validPermissions(body?.permissions)) {
    return fail("Periksa email, nama, password minimal 8 karakter, role, dan izin.");
  }
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true, user_metadata: { full_name, phone },
  });
  if (error || !data.user) return fail(error?.message ?? "Akun gagal dibuat.");
  const { error: profileError } = await supabaseAdmin.from("profiles").upsert({
    id: data.user.id, full_name, phone, role: body.role, is_active: true, permissions: body.permissions,
  }, { onConflict: "id" });
  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(data.user.id);
    return fail("Profil gagal disimpan; akun baru dibatalkan.", 500);
  }
  return NextResponse.json({ id: data.user.id }, { status: 201 });
}

export async function PATCH(request: NextRequest) {
  const access = await superAdmin(request);
  if (access.error || !access.user) return fail(access.error ?? "Akses hanya untuk Super Admin.", 403);
  const actor = access.user;
  const body = await request.json().catch(() => null);
  if (!body?.id || body.id === actor.id) return fail("Akun target tidak valid.");
  const { data: target } = await supabaseAdmin.from("profiles").select("role").eq("id", body.id).maybeSingle();
  if (!target || !["manager", "staff"].includes(target.role)) return fail("Hanya akun karyawan yang dapat dikelola.", 404);
  if (!body.full_name?.trim() || !["manager", "staff"].includes(body.role) ||
      typeof body.is_active !== "boolean" || !validPermissions(body.permissions)) return fail("Data akun atau izin tidak valid.");

  const { error } = await supabaseAdmin.from("profiles").update({
    full_name: body.full_name.trim(), phone: String(body.phone ?? "").trim(),
    role: body.role, permissions: body.permissions, is_active: body.is_active,
  }).eq("id", body.id);
  if (error) return fail("Perubahan profil gagal disimpan.", 500);
  const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(body.id, {
    ban_duration: body.is_active ? "none" : "876000h",
  });
  if (authError) {
    await supabaseAdmin.from("profiles").update({ is_active: !body.is_active }).eq("id", body.id);
    return fail("Status login gagal diperbarui.", 500);
  }
  return NextResponse.json({ ok: true });
}
