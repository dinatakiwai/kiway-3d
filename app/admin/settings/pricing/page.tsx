"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { notifyStoreSettingsChanged } from "@/lib/useStoreSettings";
import { DEFAULT_CLICKER_STARTING_PRICE, DEFAULT_PRICE_PER_EXTRA_KEYCAP } from "@/lib/pricing";

export default function ClickerPricingPage() {
  const [startingPrice, setStartingPrice] = useState(DEFAULT_CLICKER_STARTING_PRICE);
  const [extraPrice, setExtraPrice] = useState(DEFAULT_PRICE_PER_EXTRA_KEYCAP);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { if (active) { setError("Masuk sebagai Super Admin untuk mengubah harga."); setLoading(false); } return; }
      const response = await fetch("/api/admin/pricing", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const result = await response.json();
      if (!active) return;
      if (!response.ok) setError(result.error || "Harga belum dapat dimuat.");
      else {
        setAllowed(true);
        setStartingPrice(Number(result.settings.clickerStartingPrice));
        setExtraPrice(Number(result.settings.pricePerExtraKeycap));
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setError("Sesi login berakhir. Masuk kembali sebagai Super Admin."); setSaving(false); return; }
    const response = await fetch("/api/admin/pricing", {
      method: "PUT",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ clickerStartingPrice: startingPrice, pricePerExtraKeycap: extraPrice }),
    });
    const result = await response.json(); setSaving(false);
    if (!response.ok) { setError(result.error || "Harga gagal disimpan."); return; }
    setStartingPrice(Number(result.settings.clickerStartingPrice));
    setExtraPrice(Number(result.settings.pricePerExtraKeycap));
    notifyStoreSettingsChanged(); setMessage("Harga berhasil disimpan dan diperbarui untuk pelanggan.");
  }

  return <main className="min-h-screen bg-[#faf9f7] px-6 py-10 text-zinc-900">
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-bold uppercase tracking-widest text-orange-500">Pengaturan harga</p>
      <h1 className="mt-2 text-3xl font-black">Harga Custom Clicker</h1>
      <p className="mt-2 text-sm text-zinc-500">Atur harga mulai dan tambahan untuk setiap huruf setelah huruf pertama.</p>
      {error && <p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</p>}
      {message && <p role="status" className="mt-5 rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">{message}</p>}
      {loading ? <p className="mt-6 rounded-2xl border bg-white p-6 text-sm text-zinc-500">Memuat pengaturan...</p> : allowed && <form onSubmit={save} className="mt-6 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="grid gap-5 md:grid-cols-2">
          <label className="text-sm font-bold">Harga mulai (1 huruf)
            <input type="number" min="1000" max="10000000" step="1000" required value={startingPrice} onChange={(event) => setStartingPrice(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 font-normal outline-none focus:border-orange-400" />
          </label>
          <label className="text-sm font-bold">Tambahan setiap huruf berikutnya
            <input type="number" min="0" max="10000000" step="1000" required value={extraPrice} onChange={(event) => setExtraPrice(Number(event.target.value))} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 font-normal outline-none focus:border-orange-400" />
          </label>
        </div>
        <p className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-600">Contoh: harga mulai Rp{startingPrice.toLocaleString("id-ID")} dan tambahan Rp{extraPrice.toLocaleString("id-ID")}, maka nama 3 huruf berharga Rp{(startingPrice + extraPrice * 2).toLocaleString("id-ID")}.</p>
        <button disabled={saving} className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-black text-white transition hover:bg-orange-500 disabled:opacity-60">{saving ? "Menyimpan..." : "Simpan Harga"}</button>
      </form>}
    </div>
  </main>;
}
