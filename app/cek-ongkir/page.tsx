"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Area = {
  id: string;
  name: string;
  postal_code?: string | number;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
};

type Rate = {
  courierCode: string;
  courierName: string;
  serviceName: string;
  description: string;
  duration: string;
  price: number;
};

const rupiah = (value: number) => `Rp${Number(value || 0).toLocaleString("id-ID")}`;

export default function CekOngkirPage() {
  const [query, setQuery] = useState("");
  const [areaId, setAreaId] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [weight, setWeight] = useState(500);
  const [quantity, setQuantity] = useState(1);
  const [rates, setRates] = useState<Rate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const term = query.trim();
    if (areaId || term.length < 2) {
      if (term.length < 2) setAreas([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      setAreaLoading(true);
      try {
        const response = await fetch(`/api/shipping/areas?input=${encodeURIComponent(term)}`, { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || "Lokasi belum dapat dicari.");
        setAreas(Array.isArray(result.areas) ? result.areas : []);
        setError("");
      } catch (err) {
        setAreas([]);
        setError(err instanceof Error ? err.message : "Lokasi belum dapat dicari.");
      } finally {
        setAreaLoading(false);
      }
    }, 400);
    return () => window.clearTimeout(timer);
  }, [query, areaId]);

  async function checkRates() {
    if (!areaId) { setError("Pilih kecamatan atau area tujuan dari daftar."); return; }
    setLoading(true); setError(""); setRates([]);
    try {
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinationAreaId: areaId,
          items: [{ name: "Paket KEILAB (estimasi)", value: 25000, weight, quantity, length: 20, width: 15, height: 10 }],
        }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Tarif ongkir belum dapat diambil.");
      setRates(Array.isArray(result.pricing) ? result.pricing : []);
      if (!result.pricing?.length) setError("Belum ada layanan kurir untuk area ini.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tarif ongkir belum dapat diambil.");
    } finally { setLoading(false); }
  }

  return <main className="min-h-[75vh] bg-[#faf9f7] px-5 py-12 text-zinc-900">
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm font-bold text-orange-600">← Kembali ke toko</Link>
      <div className="mt-5">
        <p className="text-xs font-black uppercase tracking-[.2em] text-orange-600">KEILAB.ID • PENGIRIMAN</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight">Cek Ongkir</h1>
        <p className="mt-2 text-zinc-600">Lihat perkiraan biaya kirim ke lokasimu sebelum membuat pesanan.</p>
      </div>

      <section className="mt-7 space-y-5 rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-7">
        <label className="relative block">
          <span className="text-sm font-bold">Kecamatan, kota, atau kode pos tujuan</span>
          <input value={query} onChange={(event) => { setQuery(event.target.value); setAreaId(""); setAreas([]); setRates([]); }} placeholder="Contoh: Kebayoran Baru, Bandung, 40115" autoComplete="off" className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none focus:border-orange-400" />
          {areaLoading && <span className="absolute right-4 top-11 text-xs text-zinc-400">Mencari…</span>}
          {areas.length > 0 && !areaId && <div className="absolute inset-x-0 top-full z-20 mt-2 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-xl">{areas.map((area) => <button type="button" key={area.id} onClick={() => { setAreaId(area.id); setQuery(area.name); setAreas([]); setError(""); }} className="block w-full border-b border-zinc-100 px-4 py-3 text-left last:border-0 hover:bg-orange-50"><b className="block text-sm">{area.administrative_division_level_3_name || area.name}</b><span className="mt-1 block text-xs text-zinc-500">{[area.administrative_division_level_2_name, area.administrative_division_level_1_name, area.postal_code].filter(Boolean).join(", ")}</span></button>)}</div>}
          <span className="mt-2 block text-xs text-zinc-400">Pilih area yang cocok dari hasil pencarian.</span>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-bold">Berat paket (gram)<input type="number" min={100} max={30000} step={100} value={weight} onChange={(event) => setWeight(Math.min(30000, Math.max(100, Number(event.target.value) || 100)))} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 font-normal" /></label>
          <label className="text-sm font-bold">Jumlah paket<input type="number" min={1} max={20} value={quantity} onChange={(event) => setQuantity(Math.min(20, Math.max(1, Number(event.target.value) || 1)))} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 font-normal" /></label>
        </div>
        <p className="text-xs leading-5 text-zinc-500">Perkiraan dihitung dengan ukuran paket 20 × 15 × 10 cm. Ongkir akhir dapat berubah mengikuti ukuran dan berat produk di checkout.</p>
        {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <button type="button" onClick={checkRates} disabled={loading || !areaId} className="w-full rounded-xl bg-zinc-950 px-5 py-3 font-black text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50">{loading ? "Menghitung ongkir…" : "Cek tarif kurir"}</button>
      </section>

      {rates.length > 0 && <section className="mt-6 space-y-3" aria-live="polite"><h2 className="text-lg font-black">Pilihan layanan</h2>{rates.map((rate, index) => <div key={`${rate.courierCode}-${rate.serviceName}-${index}`} className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4"><div><p className="font-bold">{rate.courierName} · {rate.serviceName}</p><p className="mt-1 text-xs text-zinc-500">{[rate.description, rate.duration].filter(Boolean).join(" · ")}</p></div><strong className="shrink-0 text-lg">{rupiah(rate.price)}</strong></div>)}</section>}
    </div>
  </main>;
}
