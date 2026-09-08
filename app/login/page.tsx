"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type UserRole = "admin" | "employee" | "customer";

type ProfileRow = {
  role: UserRole | null;
};

function isStaffRole(role: unknown) {
  return role === "admin" || role === "employee";
}

function getMetadataRole(user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const role =
    user.user_metadata?.role ?? user.app_metadata?.role ?? null;

  return role === "admin" || role === "employee" || role === "customer"
    ? role
    : null;
}

async function getDestination(userId: string, user: {
  user_metadata?: Record<string, unknown> | null;
  app_metadata?: Record<string, unknown> | null;
}) {
  const metadataRole = getMetadataRole(user);

  // Staff metadata is checked first so an admin/employee session can never
  // fall through to the customer page while the profile request is resolving.
  if (isStaffRole(metadataRole)) {
    return "/admin" as const;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    throw error;
  }

  if (isStaffRole(profile?.role)) {
    return "/admin" as const;
  }

  if (profile?.role === "customer") {
    return "/account" as const;
  }

  if (metadataRole === "customer") {
    return "/account" as const;
  }

  return null;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") || "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const registered = searchParams.get("registered") === "1";

  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [searchParams]);

  // Important: if an already-authenticated admin opens /login directly,
  // resolve the role again instead of showing the customer flow.
  useEffect(() => {
    let mounted = true;

    async function checkExistingSession() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted || !user) return;

      try {
        const destination = await getDestination(user.id, user);
        if (!mounted || !destination) return;

        window.location.replace(destination);
      } catch {
        // Do not redirect to customer when the role cannot be verified.
      }
    }

    checkExistingSession();

    return () => {
      mounted = false;
    };
  }, []);

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password,
      });

    if (loginError) {
      setLoading(false);

      const message = loginError.message.toLowerCase();

      if (
        message.includes("email not confirmed") ||
        message.includes("email_not_confirmed")
      ) {
        setError(
          "Email kamu belum diverifikasi. Silakan cek inbox email dan klik link verifikasi dari KIWAY."
        );
      } else if (
        message.includes("invalid login credentials") ||
        message.includes("invalid credentials")
      ) {
        setError("Email atau password salah. Silakan coba lagi.");
      } else {
        setError(loginError.message);
      }

      return;
    }

    const user = data.user;

    if (!user?.id) {
      setLoading(false);
      setError("Login berhasil, tetapi akun tidak ditemukan.");
      return;
    }

    try {
      const destination = await getDestination(user.id, user);

      if (destination === "/admin") {
        // Full navigation guarantees the new authenticated session is used.
        window.location.replace("/admin");
        return;
      }

      if (destination === "/account") {
        window.location.replace("/account");
        return;
      }

      // Never silently treat an unknown role as a customer.
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "Role akun belum dapat diverifikasi. Silakan hubungi admin sebelum melanjutkan."
      );
    } catch (profileError) {
      console.error("KIWAY login role check failed:", profileError);
      await supabase.auth.signOut();
      setLoading(false);
      setError(
        "Profil akun belum dapat dimuat. Login dibatalkan agar akun tidak salah masuk ke halaman customer."
      );
    }
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] px-5 py-10 text-zinc-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md items-center">
        <div className="w-full">
          <Link
            href="/"
            className="mx-auto block w-fit text-3xl font-black tracking-tight"
          >
            KIWAY<span className="text-orange-500">.</span>
          </Link>

          <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-8">
            <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-500">
              KIWAY ACCOUNT
            </p>

            <h1 className="mt-3 text-3xl font-black tracking-tight">
              Selamat datang kembali
            </h1>
            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Login untuk melihat pesanan dan mengakses akun KIWAY kamu.
            </p>

            {registered && (
              <div className="mt-5 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm leading-5 font-semibold text-green-700">
                Akun berhasil dibuat. Silakan cek email kamu untuk verifikasi,
                lalu login menggunakan email dan password yang sudah didaftarkan.
              </div>
            )}

            <form onSubmit={handleLogin} className="mt-7 space-y-5">
              <label className="block">
                <span className="text-sm font-bold">Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nama@email.com"
                  autoComplete="email"
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold">Password</span>
                  <Link
                    href="/login/forgot-password"
                    className="text-xs font-bold text-orange-500 hover:text-orange-600"
                  >
                    Lupa password?
                  </Link>
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-zinc-950 px-5 py-4 font-black text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Memproses..." : "Login →"}
              </button>
            </form>

            <div className="my-7 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-200" />
              <span className="text-xs font-semibold text-zinc-400">ATAU</span>
              <div className="h-px flex-1 bg-zinc-200" />
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4 text-center">
              <p className="text-sm text-zinc-500">Belum punya akun?</p>
              <Link
                href="/register"
                className="mt-1 inline-block font-black text-orange-500 hover:text-orange-600"
              >
                Daftar sebagai Customer →
              </Link>
            </div>

            <Link
              href="/catalog"
              className="mt-5 block text-center text-sm font-semibold text-zinc-400 hover:text-zinc-900"
            >
              Lanjut belanja tanpa login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
