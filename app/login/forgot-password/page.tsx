"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      {
        redirectTo: `${window.location.origin}/login/reset-password`,
      }
    );

    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      return;
    }

    setMessage(
      "Link reset password sudah dikirim. Silakan cek inbox email kamu."
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
            <Link
              href="/login"
              className="text-sm font-semibold text-zinc-400 hover:text-zinc-900"
            >
              ← Kembali ke Login
            </Link>

            <h1 className="mt-6 text-3xl font-black tracking-tight">
              Lupa password?
            </h1>

            <p className="mt-3 text-sm leading-6 text-zinc-500">
              Masukkan email akun KIWAY kamu. Kami akan mengirimkan link untuk
              membuat password baru.
            </p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-5">
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
                className="w-full rounded-2xl bg-zinc-950 px-5 py-4 font-black text-white transition hover:bg-orange-500 disabled:opacity-50"
              >
                {loading ? "Mengirim..." : "Kirim Link Reset →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
