"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type ProfitRow = {
  id: string;
  customer_name: string | null;
  product: string | null;
  total: number | null;
  payment_status: string | null;
  created_at: string;
  material_cost: number | null;
  gross_profit: number | null;
};

type CostRow = {
  id: string;
  name: string;
  category: string;
  amount: number | null;
  cost_date: string;
};

type MonthRow = {
  key: string;
  label: string;
  orders: number;
  revenue: number;
  material: number;
  operating: number;
  gross: number;
  net: number;
  margin: number;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const categoryLabel: Record<string, string> = {
  electricity: "Listrik",
  packaging: "Packaging",
  maintenance: "Maintenance",
  component: "Komponen",
  labor: "Tenaga Kerja",
  shipping: "Pengiriman",
  other: "Lainnya",
};

function keyOf(date: string) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function labelOf(key: string) {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function ProfitLossPage() {
  const [profits, setProfits] = useState<ProfitRow[]>([]);
  const [costs, setCosts] = useState<CostRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [months, setMonths] = useState(6);
  const [onlyPaid, setOnlyPaid] = useState(true);

  async function load() {
    setLoading(true);

    const [{ data: profitData, error: profitError }, { data: costData, error: costError }] =
      await Promise.all([
        supabase
          .from("order_profit_view")
          .select(
            "id,customer_name,product,total,payment_status,created_at,material_cost,gross_profit"
          )
          .order("created_at", { ascending: true }),
        supabase
          .from("operating_costs")
          .select("id,name,category,amount,cost_date")
          .order("cost_date", { ascending: true }),
      ]);

    if (profitError) console.error(profitError);
    if (costError) console.error(costError);

    setProfits((profitData || []) as ProfitRow[]);
    setCosts((costData || []) as CostRow[]);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo<MonthRow[]>(() => {
    const map = new Map<string, MonthRow>();

    const ensure = (key: string) => {
      if (!map.has(key)) {
        map.set(key, {
          key,
          label: labelOf(key),
          orders: 0,
          revenue: 0,
          material: 0,
          operating: 0,
          gross: 0,
          net: 0,
          margin: 0,
        });
      }
      return map.get(key)!;
    };

    profits.forEach((p) => {
      if (onlyPaid && p.payment_status !== "paid") return;
      const x = ensure(keyOf(p.created_at));
      x.orders += 1;
      x.revenue += Number(p.total || 0);
      x.material += Number(p.material_cost || 0);
    });

    costs.forEach((c) => {
      const x = ensure(keyOf(c.cost_date));
      x.operating += Number(c.amount || 0);
    });

    map.forEach((x) => {
      x.gross = x.revenue - x.material;
      x.net = x.gross - x.operating;
      x.margin = x.revenue ? (x.net / x.revenue) * 100 : 0;
    });

    return Array.from(map.values()).sort((a, b) => a.key.localeCompare(b.key)).slice(-months);
  }, [profits, costs, months, onlyPaid]);

  const totals = useMemo(() => {
    return rows.reduce(
      (a, x) => ({
        orders: a.orders + x.orders,
        revenue: a.revenue + x.revenue,
        material: a.material + x.material,
        operating: a.operating + x.operating,
        gross: a.gross + x.gross,
        net: a.net + x.net,
      }),
      { orders: 0, revenue: 0, material: 0, operating: 0, gross: 0, net: 0 }
    );
  }, [rows]);

  const totalMargin = totals.revenue ? (totals.net / totals.revenue) * 100 : 0;
  const maxValue = Math.max(1, ...rows.map((x) => Math.max(x.revenue, x.material + x.operating, Math.max(x.net, 0))));

  function exportCSV() {
    const header = [
      "Bulan",
      "Order Paid",
      "Omzet",
      "Modal Filament",
      "Biaya Operasional",
      "Profit Kotor",
      "Profit Bersih",
      "Margin Bersih",
    ];

    const body = rows.map((x) => [
      x.label,
      x.orders,
      x.revenue,
      x.material,
      x.operating,
      x.gross,
      x.net,
      `${x.margin.toFixed(2)}%`,
    ]);

    const csv = [header, ...body]
      .map((line) =>
        line
          .map((value) => `"${String(value).replaceAll('"', '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "kiway-laporan-laba-rugi.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="p-8 text-sm text-gray-500">Memuat laporan...</div>;
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">KIWAY 3D</div>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Laporan Laba Rugi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Ringkasan omzet, modal filament, biaya operasional, dan profit bersih.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <select
              value={months}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="rounded-xl border bg-white px-4 py-2 text-sm font-bold"
            >
              <option value={3}>3 Bulan</option>
              <option value={6}>6 Bulan</option>
              <option value={12}>12 Bulan</option>
              <option value={24}>24 Bulan</option>
            </select>

            <label className="flex items-center gap-2 rounded-xl border bg-white px-3 py-2 text-sm font-semibold">
              <input type="checkbox" checked={onlyPaid} onChange={(e) => setOnlyPaid(e.target.checked)} />
              Hanya paid
            </label>

            <button onClick={exportCSV} className="rounded-xl bg-black px-4 py-2 text-sm font-bold text-white">
              ↓ Export CSV
            </button>

            <button onClick={load} className="rounded-xl border bg-white px-4 py-2 text-sm font-bold">
              ↻
            </button>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Card title="Omzet" value={rupiah(totals.revenue)} />
          <Card title="Modal Filament" value={rupiah(totals.material)} />
          <Card title="Operasional" value={rupiah(totals.operating)} />
          <Card title="Profit Kotor" value={rupiah(totals.gross)} />
          <Card title="Profit Bersih" value={rupiah(totals.net)} strong />
        </section>

        <div className="mt-4 flex flex-wrap gap-3">
          <Info label="Total Order" value={`${totals.orders}`} />
          <Info label="Margin Bersih" value={`${totalMargin.toFixed(1)}%`} />
          <Link href="/admin/finance" className="rounded-xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100">
            ← Finance Center
          </Link>
          <Link href="/admin/finance/costs" className="rounded-xl border bg-white px-4 py-3 text-sm font-bold hover:bg-gray-100">
            Kelola Biaya →
          </Link>
        </div>

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <div>
            <h2 className="text-xl font-black">Trend Bulanan</h2>
            <p className="mt-1 text-sm text-gray-500">Visual omzet, total pengeluaran, dan profit bersih.</p>
          </div>

          {rows.length === 0 ? (
            <div className="mt-8 rounded-2xl bg-gray-50 p-8 text-center text-sm text-gray-500">Belum ada data.</div>
          ) : (
            <div className="mt-8 flex h-80 items-end gap-4 overflow-x-auto border-b">
              {rows.map((x) => (
                <div key={x.key} className="flex min-w-[100px] flex-1 flex-col items-center justify-end">
                  <div className="mb-2 text-[10px] font-bold text-gray-500">{rupiah(x.net)}</div>
                  <div className="flex h-[240px] items-end gap-1">
                    <div className="w-6 rounded-t-lg bg-black" title={`Omzet ${rupiah(x.revenue)}`} style={{ height: Math.max(8, (x.revenue / maxValue) * 240) }} />
                    <div className="w-6 rounded-t-lg bg-gray-300" title={`Pengeluaran ${rupiah(x.material + x.operating)}`} style={{ height: Math.max(8, ((x.material + x.operating) / maxValue) * 240) }} />
                    <div className="w-6 rounded-t-lg bg-gray-500" title={`Profit ${rupiah(x.net)}`} style={{ height: Math.max(6, (Math.max(x.net, 0) / maxValue) * 240) }} />
                  </div>
                  <div className="mt-3 text-xs font-black">{x.label.split(" ")[0]}</div>
                  <div className="text-[10px] text-gray-400">{x.orders} order</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="border-b px-6 py-5">
            <h2 className="text-xl font-black">Laporan Laba Rugi Bulanan</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-6 py-4">Bulan</th>
                  <th className="px-6 py-4 text-right">Order</th>
                  <th className="px-6 py-4 text-right">Omzet</th>
                  <th className="px-6 py-4 text-right">Modal</th>
                  <th className="px-6 py-4 text-right">Operasional</th>
                  <th className="px-6 py-4 text-right">Profit Kotor</th>
                  <th className="px-6 py-4 text-right">Profit Bersih</th>
                  <th className="px-6 py-4 text-right">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rows.map((x) => (
                  <tr key={x.key} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-black">{x.label}</td>
                    <td className="px-6 py-4 text-right">{x.orders}</td>
                    <td className="px-6 py-4 text-right font-bold">{rupiah(x.revenue)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{rupiah(x.material)}</td>
                    <td className="px-6 py-4 text-right text-gray-500">{rupiah(x.operating)}</td>
                    <td className="px-6 py-4 text-right font-bold">{rupiah(x.gross)}</td>
                    <td className={`px-6 py-4 text-right font-black ${x.net < 0 ? "text-red-600" : ""}`}>{rupiah(x.net)}</td>
                    <td className="px-6 py-4 text-right font-bold">{x.margin.toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t bg-gray-50">
                <tr>
                  <td className="px-6 py-4 font-black">TOTAL</td>
                  <td className="px-6 py-4 text-right font-black">{totals.orders}</td>
                  <td className="px-6 py-4 text-right font-black">{rupiah(totals.revenue)}</td>
                  <td className="px-6 py-4 text-right font-black">{rupiah(totals.material)}</td>
                  <td className="px-6 py-4 text-right font-black">{rupiah(totals.operating)}</td>
                  <td className="px-6 py-4 text-right font-black">{rupiah(totals.gross)}</td>
                  <td className="px-6 py-4 text-right font-black">{rupiah(totals.net)}</td>
                  <td className="px-6 py-4 text-right font-black">{totalMargin.toFixed(1)}%</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border bg-white p-6 shadow-sm">
          <h2 className="text-xl font-black">Cara membaca laporan</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <Explain title="Profit Kotor" text="Omzet dikurangi modal material produksi." />
            <Explain title="Profit Bersih" text="Profit kotor dikurangi seluruh biaya operasional yang tercatat." />
            <Explain title="Margin Bersih" text="Profit bersih dibagi omzet, dikali 100%." />
          </div>
        </section>
      </div>
    </main>
  );
}

function Card({ title, value, strong = false }: { title: string; value: string; strong?: boolean }) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{title}</div>
      <div className={`mt-2 text-xl ${strong ? "font-black" : "font-bold"}`}>{value}</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-white px-4 py-3">
      <div className="text-xs font-bold text-gray-400">{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

function Explain({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="font-black">{title}</div>
      <div className="mt-1 text-sm text-gray-500">{text}</div>
    </div>
  );
}
