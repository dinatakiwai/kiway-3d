"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  customer_name: string | null;
  product: string | null;
  total: number | null;
  payment_status: string | null;
  production_status: string | null;
  created_at: string;
};

type Profit = {
  id: string;
  total: number | null;
  material_cost: number | null;
  gross_profit: number | null;
  created_at: string;
  product: string | null;
};

type Inventory = {
  id: string;
  name: string;
  category: string;
  stock: number | null;
  unit: string;
  low_stock: number | null;
  cost_per_unit: number | null;
};

type OperatingCost = {
  id: string;
  name: string;
  category: string;
  amount: number | null;
  cost_date: string;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n || 0);

const costLabels: Record<string, string> = {
  electricity: "Listrik",
  packaging: "Packaging",
  maintenance: "Maintenance",
  component: "Komponen",
  labor: "Tenaga Kerja",
  shipping: "Pengiriman",
  other: "Lainnya",
};

function startOfMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthName() {
  return new Date().toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });
}

export default function OwnerDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [profits, setProfits] = useState<Profit[]>([]);
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [costs, setCosts] = useState<OperatingCost[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadDashboard() {
    setLoading(true);

    const [
      { data: ordersData, error: ordersError },
      { data: profitData, error: profitError },
      { data: inventoryData, error: inventoryError },
      { data: costsData, error: costsError },
    ] = await Promise.all([
      supabase
        .from("orders")
        .select(
          "id,customer_name,product,total,payment_status,production_status,created_at"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("order_profit_view")
        .select(
          "id,total,material_cost,gross_profit,created_at,product"
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory")
        .select(
          "id,name,category,stock,unit,low_stock,cost_per_unit"
        )
        .order("name", { ascending: true }),
      supabase
        .from("operating_costs")
        .select("id,name,category,amount,cost_date")
        .order("cost_date", { ascending: false }),
    ]);

    if (ordersError) console.error("orders:", ordersError);
    if (profitError) console.error("profit:", profitError);
    if (inventoryError) console.error("inventory:", inventoryError);
    if (costsError) console.error("costs:", costsError);

    setOrders((ordersData || []) as Order[]);
    setProfits((profitData || []) as Profit[]);
    setInventory((inventoryData || []) as Inventory[]);
    setCosts((costsData || []) as OperatingCost[]);
    setLoading(false);
  }

  useEffect(() => {
    loadDashboard();
  }, []);

  const thisMonth = startOfMonth();

  const monthOrders = useMemo(
    () =>
      orders.filter(
        (o) =>
          new Date(o.created_at) >= thisMonth &&
          o.payment_status === "paid"
      ),
    [orders, thisMonth]
  );

  const monthProfits = useMemo(
    () => profits.filter((p) => new Date(p.created_at) >= thisMonth),
    [profits, thisMonth]
  );

  const monthCosts = useMemo(
    () => costs.filter((c) => new Date(`${c.cost_date}T00:00:00`) >= thisMonth),
    [costs, thisMonth]
  );

  const revenue = monthOrders.reduce(
    (sum, o) => sum + Number(o.total || 0),
    0
  );

  const materialCost = monthProfits.reduce(
    (sum, p) => sum + Number(p.material_cost || 0),
    0
  );

  const operatingCost = monthCosts.reduce(
    (sum, c) => sum + Number(c.amount || 0),
    0
  );

  const grossProfit = revenue - materialCost;
  const netProfit = grossProfit - operatingCost;
  const margin = revenue ? (netProfit / revenue) * 100 : 0;

  const pipeline = useMemo(() => {
    const result = {
      new: 0,
      processing: 0,
      finished: 0,
      shipped: 0,
    };

    orders.forEach((o) => {
      if (o.production_status === "new") result.new++;
      if (o.production_status === "processing") result.processing++;
      if (o.production_status === "finished") result.finished++;
      if (o.production_status === "shipped") result.shipped++;
    });

    return result;
  }, [orders]);

  const inventoryAlerts = useMemo(
    () =>
      inventory.filter(
        (item) =>
          Number(item.stock || 0) <= Number(item.low_stock || 0)
      ),
    [inventory]
  );

  const inventoryValue = useMemo(
    () =>
      inventory.reduce(
        (sum, item) =>
          sum +
          Number(item.stock || 0) * Number(item.cost_per_unit || 0),
        0
      ),
    [inventory]
  );

  const topProducts = useMemo(() => {
    const map = new Map<string, { orders: number; revenue: number }>();

    monthOrders.forEach((o) => {
      const name = o.product || "Produk";
      const item = map.get(name) || { orders: 0, revenue: 0 };
      item.orders++;
      item.revenue += Number(o.total || 0);
      map.set(name, item);
    });

    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);
  }, [monthOrders]);

  const topCostCategories = useMemo(() => {
    const map = new Map<string, number>();

    monthCosts.forEach((c) => {
      map.set(
        c.category,
        (map.get(c.category) || 0) + Number(c.amount || 0)
      );
    });

    return Array.from(map.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5);
  }, [monthCosts]);

  const recentOrders = orders.slice(0, 6);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="mx-auto max-w-7xl animate-pulse">
          <div className="h-9 w-72 rounded bg-gray-200" />
          <div className="mt-7 grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 rounded-3xl bg-gray-200" />
            ))}
          </div>
        </div>
      </div>
    );
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
              Owner Dashboard
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Ringkasan bisnis {monthName()}.
            </p>
          </div>

          <button
            onClick={loadDashboard}
            className="w-fit rounded-xl border bg-white px-4 py-2 text-sm font-bold hover:bg-gray-100"
          >
            ↻ Refresh
          </button>
        </header>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat
            label="Omzet Bulan Ini"
            value={rupiah(revenue)}
            note={`${monthOrders.length} order paid`}
          />
          <Stat
            label="Modal Filament"
            value={rupiah(materialCost)}
            note="Dari production records"
          />
          <Stat
            label="Biaya Operasional"
            value={rupiah(operatingCost)}
            note={`${monthCosts.length} transaksi`}
          />
          <Stat
            label="Profit Bersih"
            value={rupiah(netProfit)}
            note={`Margin ${margin.toFixed(1)}%`}
            strong
          />
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Pipeline
            label="Pesanan Baru"
            value={pipeline.new}
            href="/admin/production"
          />
          <Pipeline
            label="Diproses"
            value={pipeline.processing}
            href="/admin/production"
          />
          <Pipeline
            label="Selesai"
            value={pipeline.finished}
            href="/admin/production"
          />
          <Pipeline
            label="Dikirim"
            value={pipeline.shipped}
            href="/admin/production"
          />
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <section className="rounded-3xl border bg-white p-6 shadow-sm xl:col-span-2">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-black">Kinerja Bulan Ini</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Perbandingan omzet dengan biaya dan profit.
                </p>
              </div>
              <Link
                href="/admin/finance"
                className="rounded-xl border px-4 py-2 text-xs font-bold hover:bg-gray-100"
              >
                Finance →
              </Link>
            </div>

            <div className="mt-7 space-y-5">
              <Bar label="Omzet" value={revenue} max={Math.max(revenue, 1)} />
              <Bar
                label="Modal Filament"
                value={materialCost}
                max={Math.max(revenue, 1)}
              />
              <Bar
                label="Operasional"
                value={operatingCost}
                max={Math.max(revenue, 1)}
              />
              <Bar
                label="Profit Bersih"
                value={Math.max(netProfit, 0)}
                max={Math.max(revenue, 1)}
              />
            </div>

            <div className="mt-7 grid gap-3 sm:grid-cols-3">
              <SmallMetric label="Profit Kotor" value={rupiah(grossProfit)} />
              <SmallMetric label="Profit Bersih" value={rupiah(netProfit)} />
              <SmallMetric label="Nilai Inventory" value={rupiah(inventoryValue)} />
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Inventory Alert</h2>
                <p className="mt-1 text-sm text-gray-500">
                  Stok sudah menyentuh batas minimum.
                </p>
              </div>
              <Link
                href="/admin/inventory"
                className="rounded-xl border px-3 py-2 text-xs font-bold hover:bg-gray-100"
              >
                Inventory →
              </Link>
            </div>

            <div className="mt-5 space-y-3">
              {inventoryAlerts.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm font-semibold text-gray-500">
                  ✅ Semua stok masih aman.
                </div>
              ) : (
                inventoryAlerts.slice(0, 6).map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl border p-4"
                  >
                    <div>
                      <div className="font-bold">{item.name}</div>
                      <div className="mt-1 text-xs text-gray-400">
                        Minimum {item.low_stock} {item.unit}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-black">
                        {item.stock} {item.unit}
                      </div>
                      <div className="text-xs font-bold text-gray-400">
                        LOW
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Produk Terlaris</h2>
                <p className="text-sm text-gray-500">Berdasarkan omzet bulan ini.</p>
              </div>
              <Link
                href="/admin"
                className="text-xs font-bold underline underline-offset-4"
              >
                Semua Orders
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {topProducts.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                  Belum ada order paid bulan ini.
                </div>
              ) : (
                topProducts.map((product, index) => (
                  <div
                    key={product.name}
                    className="flex items-center gap-4 rounded-2xl border p-4"
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-black text-sm font-black text-white">
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-bold">{product.name}</div>
                      <div className="text-xs text-gray-400">
                        {product.orders} order
                      </div>
                    </div>
                    <div className="text-right font-black">
                      {rupiah(product.revenue)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black">Pengeluaran Terbesar</h2>
                <p className="text-sm text-gray-500">
                  Kategori biaya bulan ini.
                </p>
              </div>
              <Link
                href="/admin/finance/costs"
                className="text-xs font-bold underline underline-offset-4"
              >
                Kelola Biaya
              </Link>
            </div>

            <div className="mt-5 space-y-4">
              {topCostCategories.length === 0 ? (
                <div className="rounded-2xl bg-gray-50 p-5 text-sm text-gray-500">
                  Belum ada biaya operasional bulan ini.
                </div>
              ) : (
                topCostCategories.map((item) => (
                  <div key={item.category}>
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-bold">
                        {costLabels[item.category] || item.category}
                      </span>
                      <span className="font-black">{rupiah(item.amount)}</span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      <div
                        className="h-full rounded-full bg-black"
                        style={{
                          width: `${Math.min(
                            100,
                            (item.amount /
                              Math.max(1, topCostCategories[0].amount)) *
                              100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <section className="mt-6 overflow-hidden rounded-3xl border bg-white shadow-sm">
          <div className="flex items-center justify-between border-b px-6 py-5">
            <div>
              <h2 className="text-xl font-black">Order Terbaru</h2>
              <p className="text-sm text-gray-500">
                Aktivitas order terbaru di KIWAY.
              </p>
            </div>
            <Link
              href="/admin"
              className="rounded-xl bg-black px-4 py-2 text-xs font-bold text-white hover:opacity-90"
            >
              Buka Orders →
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-400">
                <tr>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Produk</th>
                  <th className="px-6 py-4">Pembayaran</th>
                  <th className="px-6 py-4">Produksi</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {recentOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold">
                      {order.customer_name || "-"}
                    </td>
                    <td className="px-6 py-4">{order.product || "-"}</td>
                    <td className="px-6 py-4">
                      <Status value={order.payment_status || "-"} />
                    </td>
                    <td className="px-6 py-4">
                      <Status value={order.production_status || "-"} />
                    </td>
                    <td className="px-6 py-4 text-right font-black">
                      {rupiah(Number(order.total || 0))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {recentOrders.length === 0 && (
              <div className="p-8 text-center text-sm text-gray-500">
                Belum ada order.
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Quick href="/admin" icon="🛒" label="Orders" />
          <Quick href="/admin/production" icon="🏭" label="Production" />
          <Quick href="/admin/inventory" icon="📦" label="Inventory" />
          <Quick href="/admin/finance" icon="💰" label="Finance" />
          <Quick href="/admin/production/history" icon="📜" label="Riwayat" />
        </section>
      </div>
    </main>
  );
}

function Stat({
  label,
  value,
  note,
  strong = false,
}: {
  label: string;
  value: string;
  note: string;
  strong?: boolean;
}) {
  return (
    <div className="rounded-3xl border bg-white p-5 shadow-sm">
      <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      <div className={`mt-2 text-2xl ${strong ? "font-black" : "font-bold"}`}>
        {value}
      </div>
      <div className="mt-2 text-xs text-gray-400">{note}</div>
    </div>
  );
}

function Pipeline({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="text-xs font-bold text-gray-400">{label}</div>
      <div className="mt-1 text-2xl font-black">{value}</div>
    </Link>
  );
}

function Bar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  return (
    <div>
      <div className="mb-2 flex justify-between text-sm">
        <span className="font-bold">{label}</span>
        <span className="font-black">{rupiah(value)}</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-black"
          style={{ width: `${Math.min(100, (value / max) * 100)}%` }}
        />
      </div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-gray-50 p-4">
      <div className="text-xs font-bold text-gray-400">{label}</div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}

function Status({ value }: { value: string }) {
  const label =
    value === "paid"
      ? "Paid"
      : value === "pending"
        ? "Pending"
        : value === "refunded"
          ? "Refunded"
          : value === "new"
            ? "Baru"
            : value === "processing"
              ? "Diproses"
              : value === "finished"
                ? "Selesai"
                : value === "shipped"
                  ? "Dikirim"
                  : value;

  return (
    <span className="inline-flex rounded-full border bg-gray-50 px-2.5 py-1 text-xs font-bold">
      {label}
    </span>
  );
}

function Quick({
  href,
  icon,
  label,
}: {
  href: string;
  icon: string;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="rounded-2xl border bg-white p-4 text-center text-sm font-black shadow-sm transition hover:bg-gray-100"
    >
      <div className="text-xl">{icon}</div>
      <div className="mt-1">{label}</div>
    </Link>
  );
}
