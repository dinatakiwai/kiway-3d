"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfitRow = {
  id: string;
  order_code: string | null;
  customer_name: string;
  product: string;
  custom_name: string | null;
  quantity: number;
  total: number;
  payment_status: string;
  production_status: string;
  created_at: string;
  material_cost: number;
  gross_profit: number;
  margin_percent: number;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default function ProfitPage() {
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      window.location.href = "/admin/login";
      return;
    }

    const { data, error: queryError } = await supabase
      .from("order_profit_view")
      .select("*")
      .order("created_at", { ascending: false });

    if (queryError) {
      setError(queryError.message);
    } else {
      setRows((data ?? []) as ProfitRow[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;

    return rows.filter((row) =>
      [
        row.order_code,
        row.customer_name,
        row.product,
        row.custom_name,
      ]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, search]);

  const revenue = filtered.reduce((s, r) => s + Number(r.total || 0), 0);
  const material = filtered.reduce(
    (s, r) => s + Number(r.material_cost || 0),
    0
  );
  const profit = filtered.reduce(
    (s, r) => s + Number(r.gross_profit || 0),
    0
  );
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              KIWAY 3D
            </p>
            <h1 className="mt-1 text-3xl font-black">Profit per Order</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Estimasi profit berdasarkan harga jual dan biaya filament yang
              tercatat saat produksi.
            </p>
          </div>

          <button
            onClick={load}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-zinc-100"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Omzet</p>
            <p className="mt-1 text-xl font-black">{rupiah(revenue)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Biaya Filament</p>
            <p className="mt-1 text-xl font-black">{rupiah(material)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Estimasi Profit</p>
            <p className="mt-1 text-xl font-black">{rupiah(profit)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Margin</p>
            <p className="mt-1 text-xl font-black">{margin.toFixed(1)}%</p>
          </div>
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari order, customer, produk..."
          className="mb-6 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none ring-orange-500 focus:ring-2"
        />

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-zinc-500">
            Menghitung profit...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-5 py-4 font-black">Order</th>
                    <th className="px-5 py-4 font-black">Produk</th>
                    <th className="px-5 py-4 font-black">Qty</th>
                    <th className="px-5 py-4 font-black">Harga Jual</th>
                    <th className="px-5 py-4 font-black">Filament</th>
                    <th className="px-5 py-4 font-black">Profit</th>
                    <th className="px-5 py-4 font-black">Margin</th>
                    <th className="px-5 py-4 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-4">
                        <div className="font-black text-orange-600">
                          {row.order_code ?? "-"}
                        </div>
                        <div className="text-xs text-zinc-500">
                          {row.customer_name}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {row.custom_name || row.product}
                      </td>
                      <td className="px-5 py-4 font-bold">{row.quantity}</td>
                      <td className="px-5 py-4">{rupiah(Number(row.total || 0))}</td>
                      <td className="px-5 py-4">
                        {rupiah(Number(row.material_cost || 0))}
                      </td>
                      <td className="px-5 py-4 font-black">
                        {rupiah(Number(row.gross_profit || 0))}
                      </td>
                      <td className="px-5 py-4 font-black">
                        {Number(row.margin_percent || 0).toFixed(1)}%
                      </td>
                      <td className="px-5 py-4">
                        <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold">
                          {row.production_status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {!filtered.length && (
              <div className="p-10 text-center text-sm text-zinc-500">
                Belum ada data order.
              </div>
            )}
          </div>
        )}

        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <strong>Catatan:</strong> Profit saat ini baru menghitung
          <strong> harga jual − biaya filament</strong>. Packaging, listrik,
          komponen, ongkir, dan biaya lainnya belum dihitung.
        </div>
      </div>
    </main>
  );
}
