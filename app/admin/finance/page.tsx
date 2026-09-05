"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProfitRow = {
  id: string;
  order_code: string | null;
  customer_name: string;
  product: string;
  custom_name: string | null;
  finished_product_name: string | null;
  quantity: number;
  total: number;
  payment_status: "pending" | "paid" | "refunded";
  production_status: "new" | "processing" | "finished" | "shipped";
  created_at: string;
  material_cost: number;
  gross_profit: number;
  margin_percent: number;
};

type OperatingCost = {
  id: string;
  name: string;
  category: string;
  amount: number;
  cost_date: string;
  notes: string | null;
  created_at: string;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const categoryLabel: Record<string, string> = {
  electricity: "Listrik",
  packaging: "Packaging",
  maintenance: "Maintenance",
  component: "Komponen",
  labor: "Tenaga Kerja",
  shipping: "Ongkir",
  other: "Lainnya",
};

export default function FinancePage() {
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [costs, setCosts] = useState<OperatingCost[]>([]);
  const [period, setPeriod] = useState<"today" | "7" | "30" | "all">("30");
  const [onlyPaid, setOnlyPaid] = useState(false);
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

    const [profitResult, costResult] = await Promise.all([
      supabase
        .from("order_profit_view")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("operating_costs")
        .select("*")
        .order("cost_date", { ascending: false })
        .order("created_at", { ascending: false }),
    ]);

    if (profitResult.error) {
      setError(profitResult.error.message);
    } else {
      setRows((profitResult.data ?? []) as ProfitRow[]);
    }

    if (costResult.error) {
      setError((current) => current || costResult.error.message);
    } else {
      setCosts((costResult.data ?? []) as OperatingCost[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function inPeriod(dateValue: string) {
    const now = new Date();

    if (period === "all") return true;

    const date = new Date(dateValue);

    if (period === "today") {
      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    }

    const days = period === "7" ? 7 : 30;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    return date >= start;
  }

  function costInPeriod(cost: OperatingCost) {
    if (period === "all") return true;

    const now = new Date();

    if (period === "today") {
      const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");
      return cost.cost_date === today;
    }

    const date = new Date(`${cost.cost_date}T23:59:59`);
    const days = period === "7" ? 7 : 30;
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - (days - 1));

    return date >= start;
  }

  const filteredOrders = useMemo(
    () =>
      rows.filter(
        (row) =>
          (!onlyPaid || row.payment_status === "paid") &&
          inPeriod(row.created_at)
      ),
    [rows, period, onlyPaid]
  );

  const filteredCosts = useMemo(
    () => costs.filter(costInPeriod),
    [costs, period]
  );

  const metrics = useMemo(() => {
    const revenue = filteredOrders.reduce(
      (s, r) => s + Number(r.total || 0),
      0
    );
    const material = filteredOrders.reduce(
      (s, r) => s + Number(r.material_cost || 0),
      0
    );
    const operating = filteredCosts.reduce(
      (s, r) => s + Number(r.amount || 0),
      0
    );
    const grossProfit = revenue - material;
    const netProfit = grossProfit - operating;
    const orders = filteredOrders.length;
    const paid = filteredOrders.filter(
      (r) => r.payment_status === "paid"
    ).length;
    const margin = revenue ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      material,
      operating,
      grossProfit,
      netProfit,
      orders,
      paid,
      margin,
    };
  }, [filteredOrders, filteredCosts]);

  const productStats = useMemo(() => {
    const map = new Map<
      string,
      {
        name: string;
        orders: number;
        revenue: number;
        material: number;
        profit: number;
      }
    >();

    for (const row of filteredOrders) {
      const name =
        row.finished_product_name || row.custom_name || row.product || "Produk";
      const current = map.get(name) ?? {
        name,
        orders: 0,
        revenue: 0,
        material: 0,
        profit: 0,
      };

      current.orders += 1;
      current.revenue += Number(row.total || 0);
      current.material += Number(row.material_cost || 0);
      current.profit += Number(row.gross_profit || 0);
      map.set(name, current);
    }

    return Array.from(map.values())
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 8);
  }, [filteredOrders]);

  const costStats = useMemo(() => {
    const map = new Map<string, number>();

    filteredCosts.forEach((cost) => {
      map.set(
        cost.category,
        (map.get(cost.category) ?? 0) + Number(cost.amount || 0)
      );
    });

    return Array.from(map.entries())
      .map(([key, amount]) => ({
        key,
        label: categoryLabel[key] ?? key,
        amount,
      }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredCosts]);

  const maxProductProfit = Math.max(
    ...productStats.map((x) => x.profit),
    1
  );

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              KIWAY 3D
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Dashboard Keuangan
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Pantau omzet, modal, biaya operasional, profit, dan margin.
            </p>
          </div>

          <button
            onClick={load}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-zinc-100"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            {[
              ["today", "Hari Ini"],
              ["7", "7 Hari"],
              ["30", "30 Hari"],
              ["all", "Semua"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() => setPeriod(value as typeof period)}
                className={`rounded-xl px-4 py-2 text-sm font-bold ${
                  period === value
                    ? "bg-zinc-900 text-white"
                    : "border border-zinc-200 bg-white hover:bg-zinc-100"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
            <input
              type="checkbox"
              checked={onlyPaid}
              onChange={(e) => setOnlyPaid(e.target.checked)}
              className="h-4 w-4 accent-orange-500"
            />
            Hanya pesanan lunas
          </label>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Omzet", rupiah(metrics.revenue)],
            ["Modal Filament", rupiah(metrics.material)],
            ["Operasional", rupiah(metrics.operating)],
            ["Profit Bersih", rupiah(metrics.netProfit)],
            ["Margin Bersih", `${metrics.margin.toFixed(1)}%`],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold text-zinc-500">{label}</p>
              <p className="mt-1 text-xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Jumlah Order</p>
            <p className="mt-1 text-2xl font-black">{metrics.orders}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Order Lunas</p>
            <p className="mt-1 text-2xl font-black">{metrics.paid}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-black">Profit per Produk</h2>
              <p className="text-sm text-zinc-500">
                Profit kotor produk berdasarkan harga jual dikurangi filament.
              </p>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-zinc-400">
                Menghitung...
              </div>
            ) : productStats.length ? (
              <div className="space-y-4">
                {productStats.map((item) => (
                  <div key={item.name}>
                    <div className="mb-1 flex justify-between gap-3 text-sm">
                      <span className="truncate font-bold">{item.name}</span>
                      <span className="shrink-0 font-black">
                        {rupiah(item.profit)}
                      </span>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-orange-500"
                        style={{
                          width: `${Math.max(
                            3,
                            (item.profit / maxProductProfit) * 100
                          )}%`,
                        }}
                      />
                    </div>
                    <div className="mt-1 text-xs text-zinc-400">
                      {item.orders} order · omzet {rupiah(item.revenue)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-10 text-center text-sm text-zinc-400">
                Belum ada data order.
              </div>
            )}
          </section>

          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black">Biaya Operasional</h2>
            <p className="text-sm text-zinc-500">
              Total biaya berdasarkan kategori pada periode aktif.
            </p>

            <div className="mt-5 space-y-4">
              {costStats.length ? (
                costStats.map((item) => (
                  <div key={item.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold">{item.label}</span>
                      <span className="font-black">{rupiah(item.amount)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-100">
                      <div
                        className="h-3 rounded-full bg-orange-500"
                        style={{
                          width: `${Math.max(
                            4,
                            (item.amount / Math.max(metrics.operating, 1)) * 100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-zinc-400">
                  Belum ada biaya operasional.
                </p>
              )}
            </div>

            <a
              href="/admin/finance/costs"
              className="mt-5 block rounded-xl border border-zinc-200 px-4 py-3 text-center text-sm font-bold hover:bg-zinc-100"
            >
              Kelola Biaya Operasional →
            </a>
          </section>
        </div>

        <section className="mb-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-black">Rumus Keuangan</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500">Profit Kotor</p>
              <p className="mt-1 font-black">
                {rupiah(metrics.grossProfit)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Omzet − modal filament
              </p>
            </div>
            <div className="rounded-xl bg-zinc-50 p-4">
              <p className="text-xs font-bold text-zinc-500">Biaya Operasional</p>
              <p className="mt-1 font-black">
                {rupiah(metrics.operating)}
              </p>
              <p className="mt-1 text-xs text-zinc-400">
                Listrik, packaging, maintenance, dll.
              </p>
            </div>
            <div className="rounded-xl bg-orange-50 p-4">
              <p className="text-xs font-bold text-orange-700">Profit Bersih</p>
              <p className="mt-1 font-black text-orange-700">
                {rupiah(metrics.netProfit)}
              </p>
              <p className="mt-1 text-xs text-orange-700/70">
                Profit kotor − operasional
              </p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <div className="border-b border-zinc-200 px-5 py-4">
            <h2 className="font-black">Order & Profit</h2>
          </div>

          {loading ? (
            <div className="p-10 text-center text-sm text-zinc-400">
              Memuat data...
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[1100px] w-full text-left text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-5 py-4 font-black">Order</th>
                    <th className="px-5 py-4 font-black">Produk</th>
                    <th className="px-5 py-4 font-black">Omzet</th>
                    <th className="px-5 py-4 font-black">Filament</th>
                    <th className="px-5 py-4 font-black">Profit Kotor</th>
                    <th className="px-5 py-4 font-black">Margin</th>
                    <th className="px-5 py-4 font-black">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filteredOrders.map((row) => (
                    <tr key={row.id} className="hover:bg-zinc-50">
                      <td className="px-5 py-4">
                        <p className="font-black text-orange-600">
                          {row.order_code ?? "-"}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {row.customer_name}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {row.finished_product_name || row.custom_name || row.product}
                      </td>
                      <td className="px-5 py-4">
                        {rupiah(Number(row.total || 0))}
                      </td>
                      <td className="px-5 py-4">
                        {rupiah(Number(row.material_cost || 0))}
                      </td>
                      <td className="px-5 py-4 font-black">
                        {rupiah(Number(row.gross_profit || 0))}
                      </td>
                      <td className="px-5 py-4 font-black">
                        {Number(row.margin_percent || 0).toFixed(1)}%
                      </td>
                      <td className="px-5 py-4 text-zinc-500">
                        {new Intl.DateTimeFormat("id-ID", {
                          dateStyle: "medium",
                        }).format(new Date(row.created_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !filteredOrders.length && (
            <div className="p-10 text-center text-sm text-zinc-400">
              Belum ada data pada periode ini.
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
