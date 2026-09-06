"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setReady(Boolean(data.session));
    });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sama.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password,
    });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    setMessage("Password berhasil diubah. Mengarahkan ke halaman login...");

    setTimeout(() => {
      router.push("/login");
    }, 1200);
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
            <h1 className="text-3xl font-black tracking-tight">
              Buat password baru
            </h1>

            {!ready ? (
              <div className="mt-6 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 text-sm leading-6 text-zinc-500">
                Link reset mungkin sudah kedaluwarsa atau sesi belum tersedia.
                Silakan buka link dari email reset password sekali lagi.
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                <label className="block">
                  <span className="text-sm font-bold">Password baru</span>
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
                    onChange={(event) =>
                      setConfirmPassword(event.target.value)
                    }
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
                  className="w-full rounded-2xl bg-zinc-950 px-5 py-4 font-black text-white transition hover:bg-orange-500 disabled:opacity-50"
                >
                  {loading ? "Menyimpan..." : "Simpan Password →"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
