"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Row = {
  id: string;
  product: string | null;
  total: number | null;
  payment_status: string | null;
  created_at: string;
  material_cost: number | null;
  gross_profit: number | null;
};

type ProductCost = {
  product: string;
  orders: number;
  revenue: number;
  material: number;
  profit: number;
  margin: number;
  avgHpp: number;
  avgSelling: number;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

export default function ProductCostingPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [paidOnly, setPaidOnly] = useState(true);
  const [period, setPeriod] = useState<"30" | "90" | "all">("90");

  async function load() {
    setLoading(true);

    const { data, error } = await supabase
      .from("order_profit_view")
      .select(
        "id,product,total,payment_status,created_at,material_cost,gross_profit"
      )
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setRows((data || []) as Row[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const startDate = useMemo(() => {
    if (period === "all") return null;
    const d = new Date();
    d.setDate(d.getDate() - Number(period));
    d.setHours(0, 0, 0, 0);
    return d;
  }, [period]);

  const filtered = useMemo(
    () =>
      rows.filter((r) => {
        if (paidOnly && r.payment_status !== "paid") return false;
        if (startDate && new Date(r.created_at) < startDate) return false;
        return true;
      }),
    [rows, paidOnly, startDate]
  );

  const products = useMemo<ProductCost[]>(() => {
    const map = new Map<
      string,
      { orders: number; revenue: number; material: number; profit: number }
    >();

    filtered.forEach((r) => {
      const name = r.product || "Produk";
      const x = map.get(name) || {
        orders: 0,
        revenue: 0,
        material: 0,
        profit: 0,
      };

      x.orders += 1;
      x.revenue += Number(r.total || 0);
      x.material += Number(r.material_cost || 0);
      x.profit += Number(r.gross_profit || 0);
      map.set(name, x);
    });

    return Array.from(map.entries())
      .map(([product, x]) => ({
        product,
        ...x,
        margin: x.revenue ? (x.profit / x.revenue) * 100 : 0,
        avgHpp: x.orders ? x.material / x.orders : 0,
        avgSelling: x.orders ? x.revenue / x.orders : 0,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [filtered]);

  const bestProfit = products[0];
  const bestMargin = [...products].sort((a, b) => b.margin - a.margin)[0];
  const bestSales = [...products].sort((a, b) => b.revenue - a.revenue)[0];

  function exportCSV() {
    const header = [
      "Produk",
      "Order",
      "Omzet",
      "Rata-rata HPP Material",
      "Rata-rata Harga Jual",
      "Profit Kotor",
      "Margin",
    ];

    const body = products.map((p) => [
      p.product,
      p.orders,
      p.revenue,
      Math.round(p.avgHpp),
      Math.round(p.avgSelling),
      p.profit,
      `${p.margin.toFixed(2)}%`,
    ]);

    const csv = [header, ...body]
      .map((line) =>
        line
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], {
      type: "text/csv;charset=utf-8;",
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kiway-costing-produk.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Memuat costing produk...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
              KIWAY 3D
            </div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Costing Produk
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              HPP material aktual berdasarkan production records.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value as "30" | "90" | "all")}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"
            >
              <option value="30">30 Hari</option>
              <option value="90">90 Hari</option>
              <option value="all">Semua Data</option>
            </select>

            <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={paidOnly}
                onChange={(e) => setPaidOnly(e.target.checked)}
              />
              Hanya paid
            </label>

            <button
              onClick={exportCSV}
              className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white"
            >
              ↓ Export CSV
            </button>

            <button
              onClick={load}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"
            >
              ↻
            </button>
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-3">
          <Highlight
            title="Paling Menguntungkan"
            value={bestProfit?.product || "-"}
            note={bestProfit ? rupiah(bestProfit.profit) : "-"}
          />
          <Highlight
            title="Margin Tertinggi"
            value={bestMargin?.product || "-"}
            note={bestMargin ? `${bestMargin.margin.toFixed(1)}%` : "-"}
          />
          <Highlight
            title="Omzet Terbesar"
            value={bestSales?.product || "-"}
            note={bestSales ? rupiah(bestSales.revenue) : "-"}
          />
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-black">HPP & Profit per Produk</h2>
            <p className="mt-1 text-sm text-gray-500">
              HPP di halaman ini adalah modal material produksi yang tercatat.
              Packaging, listrik, tenaga kerja, dan komponen lain belum otomatis
              masuk ke HPP produk.
            </p>
          </div>

          {products.length === 0 ? (
            <div className="p-10 text-center text-sm text-gray-500">
              Belum ada data produksi yang sesuai filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                  <tr>
                    <th className="px-6 py-4">Produk</th>
                    <th className="px-6 py-4 text-right">Order</th>
                    <th className="px-6 py-4 text-right">Omzet</th>
                    <th className="px-6 py-4 text-right">Rata-rata HPP</th>
                    <th className="px-6 py-4 text-right">Rata-rata Jual</th>
                    <th className="px-6 py-4 text-right">Profit Kotor</th>
                    <th className="px-6 py-4 text-right">Margin</th>
                  </tr>
                </thead>

                <tbody className="divide-y">
                  {products.map((p) => (
                    <tr key={p.product} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-black">{p.product}</td>
                      <td className="px-6 py-4 text-right">{p.orders}</td>
                      <td className="px-6 py-4 text-right font-bold">
                        {rupiah(p.revenue)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rupiah(p.avgHpp)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {rupiah(p.avgSelling)}
                      </td>
                      <td className="px-6 py-4 text-right font-black">
                        {rupiah(p.profit)}
                      </td>
                      <td className="px-6 py-4 text-right font-black">
                        {p.margin.toFixed(1)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Urutan Profit</h2>
            <div className="mt-5 space-y-4">
              {products.map((p, i) => (
                <div key={p.product}>
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-black text-xs font-black text-white">
                        {i + 1}
                      </span>
                      <div className="truncate font-bold">{p.product}</div>
                    </div>
                    <div className="font-black">{rupiah(p.profit)}</div>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-black"
                      style={{
                        width: `${Math.min(
                          100,
                          (p.profit / Math.max(1, products[0].profit)) * 100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">Catatan HPP</h2>
            <div className="mt-5 space-y-3 text-sm text-gray-600">
              <div className="rounded-2xl bg-gray-50 p-4">
                <b className="text-black">HPP material</b>
                <p className="mt-1">
                  Filament yang benar-benar tercatat ketika produksi diselesaikan.
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <b className="text-black">Profit kotor</b>
                <p className="mt-1">
                  Harga jual dikurangi HPP material.
                </p>
              </div>
              <div className="rounded-2xl bg-gray-50 p-4">
                <b className="text-black">Profit bersih</b>
                <p className="mt-1">
                  Lihat Finance Center karena biaya listrik, packaging,
                  maintenance, tenaga kerja, dan biaya lain dicatat terpisah.
                </p>
              </div>
            </div>
          </section>
        </section>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/admin/finance"
            className="rounded-xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100"
          >
            ← Finance Center
          </Link>
          <Link
            href="/admin/production"
            className="rounded-xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100"
          >
            Production →
          </Link>
          <Link
            href="/admin/inventory"
            className="rounded-xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100"
          >
            Inventory →
          </Link>
        </div>
      </div>
    </main>
  );
}

function Highlight({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      <div className="mt-2 truncate text-xl font-black">{value}</div>
      <div className="mt-1 text-sm font-bold text-gray-500">{note}</div>
    </div>
  );
}
