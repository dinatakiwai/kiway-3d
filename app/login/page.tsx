"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

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

  async function handleLogin(event: FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: loginError } =
      await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
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

    const userId = data.user?.id;

    if (!userId) {
      setLoading(false);
      setError("Login berhasil, tetapi akun tidak ditemukan.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();

    setLoading(false);

    if (profileError) {
      setError("Profil akun belum dapat dimuat. Coba lagi.");
      return;
    }

    if (profile?.role === "admin" || profile?.role === "employee") {
      window.location.replace("/admin");
      return;
    }

    if (profile?.role === "customer") {
      window.location.replace("/account");
      return;
    }

    setError(
      "Role akun belum dapat diverifikasi. Silakan login kembali atau hubungi admin."
    );
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
