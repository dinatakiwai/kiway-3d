"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleRegister(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    const cleanName = name.trim();
    const cleanPhone = phone.trim();
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanName) {
      setError("Nama lengkap wajib diisi.");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          full_name: cleanName,
          phone: cleanPhone,
        },
      },
    });

    setLoading(false);

    if (signUpError) {
      const errorMessage = signUpError.message.toLowerCase();

      if (errorMessage.includes("already registered")) {
        setError("Email ini sudah terdaftar. Silakan login.");
      } else {
        setError(signUpError.message);
      }

      return;
    }

    // Jika Supabase langsung memberikan session, user sudah bisa masuk.
    if (data.session) {
      router.push("/account");
      router.refresh();
      return;
    }

    // Jika email verification aktif, arahkan langsung ke halaman login.
    router.push(`/login?registered=1&email=${encodeURIComponent(cleanEmail)}`);
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
              Buat akun
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Daftar untuk menyimpan pesanan dan melihat riwayat pembelianmu.
            </p>

            <div className="mt-5 rounded-2xl border border-orange-100 bg-orange-50 p-4 text-xs leading-5 text-orange-700">
              Akun yang dibuat dari halaman ini otomatis menjadi{" "}
              <strong>Customer</strong>. Admin dan karyawan dibuat oleh Admin.
            </div>

            <form onSubmit={handleRegister} className="mt-6 space-y-4">
              <label className="block">
                <span className="text-sm font-bold">Nama lengkap</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nama kamu"
                  autoComplete="name"
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold">
                  WhatsApp{" "}
                  <span className="font-normal text-zinc-400">(opsional)</span>
                </span>
                <input
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="08xxxxxxxxxx"
                  inputMode="tel"
                  autoComplete="tel"
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

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
                <span className="text-sm font-bold">Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Minimal 6 karakter"
                  autoComplete="new-password"
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold">Konfirmasi password</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="Ulangi password"
                  autoComplete="new-password"
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </label>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              {message && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-zinc-950 px-5 py-4 font-black text-white transition hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Membuat akun..." : "Daftar sebagai Customer →"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-zinc-500">
              Sudah punya akun?{" "}
              <Link
                href="/login"
                className="font-black text-orange-500 hover:text-orange-600"
              >
                Login
              </Link>
            </p>

            <Link
              href="/catalog"
              className="mt-4 block text-center text-sm font-semibold text-zinc-400 hover:text-zinc-900"
            >
              Lanjut sebagai guest
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
