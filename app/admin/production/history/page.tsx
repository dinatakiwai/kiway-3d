"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type ProductionRecord = {
  id: string;
  order_id: string;
  order_code: string | null;
  finished_inventory_id: string | null;
  finished_quantity: number;
  material_cost: number;
  notes: string | null;
  created_at: string;
};

type Material = {
  id: string;
  production_record_id: string;
  inventory_name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
};

type Order = {
  id: string;
  customer_name: string;
  product: string;
  custom_name: string | null;
  quantity: number;
  total: number;
};

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

const dateText = (v: string) =>
  new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(v));

export default function ProductionHistoryPage() {
  const [records, setRecords] = useState<ProductionRecord[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ProductionRecord | null>(null);
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

    const [r, m, o] = await Promise.all([
      supabase.from("production_records").select("*").order("created_at", { ascending: false }),
      supabase.from("production_record_materials").select("*").order("created_at", { ascending: true }),
      supabase.from("orders").select("id, customer_name, product, custom_name, quantity, total"),
    ]);

    if (r.error) setError(r.error.message);
    else setRecords((r.data ?? []) as ProductionRecord[]);

    if (m.error) setError((current) => current || m.error.message);
    else setMaterials((m.data ?? []) as Material[]);

    if (o.error) setError((current) => current || o.error.message);
    else setOrders((o.data ?? []) as Order[]);

    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();

    return records.filter((record) => {
      if (!q) return true;
      const order = orders.find((x) => x.id === record.order_id);
      return [
        record.order_code,
        order?.customer_name,
        order?.product,
        order?.custom_name,
      ]
        .filter(Boolean)
        .some((x) => String(x).toLowerCase().includes(q));
    });
  }, [records, orders, search]);

  const totalMaterialCost = rows.reduce(
    (sum, row) => sum + Number(row.material_cost || 0),
    0
  );

  const totalFinished = rows.reduce(
    (sum, row) => sum + Number(row.finished_quantity || 0),
    0
  );

  function rowMaterials(recordId: string) {
    return materials.filter((m) => m.production_record_id === recordId);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              KIWAY 3D
            </p>
            <h1 className="mt-1 text-3xl font-black">Riwayat Produksi</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Riwayat pemakaian filament, produk jadi, dan estimasi biaya material.
            </p>
          </div>
          <button
            onClick={load}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold shadow-sm hover:bg-zinc-100"
          >
            ↻ Refresh
          </button>
        </div>

        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Produksi Tercatat</p>
            <p className="mt-1 text-2xl font-black">{rows.length}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Produk Jadi</p>
            <p className="mt-1 text-2xl font-black">{totalFinished} pcs</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Biaya Material</p>
            <p className="mt-1 text-2xl font-black">{rupiah(totalMaterialCost)}</p>
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
            Memuat riwayat...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[900px] w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="px-5 py-4 font-black">Order</th>
                    <th className="px-5 py-4 font-black">Customer</th>
                    <th className="px-5 py-4 font-black">Produk</th>
                    <th className="px-5 py-4 font-black">Produk Jadi</th>
                    <th className="px-5 py-4 font-black">Material</th>
                    <th className="px-5 py-4 font-black">Biaya</th>
                    <th className="px-5 py-4 font-black">Tanggal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {rows.map((record) => {
                    const order = orders.find((x) => x.id === record.order_id);
                    const mats = rowMaterials(record.id);

                    return (
                      <tr
                        key={record.id}
                        onClick={() => setSelected(record)}
                        className="cursor-pointer hover:bg-zinc-50"
                      >
                        <td className="px-5 py-4 font-black text-orange-600">
                          {record.order_code ?? "-"}
                        </td>
                        <td className="px-5 py-4">{order?.customer_name ?? "-"}</td>
                        <td className="px-5 py-4 font-semibold">
                          {order?.custom_name || order?.product || "-"}
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {record.finished_quantity} pcs
                        </td>
                        <td className="px-5 py-4">
                          {mats.length} material
                        </td>
                        <td className="px-5 py-4 font-bold">
                          {rupiah(Number(record.material_cost || 0))}
                        </td>
                        <td className="px-5 py-4 text-zinc-500">
                          {dateText(record.created_at)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!rows.length && (
              <div className="p-10 text-center text-sm text-zinc-500">
                Belum ada produksi yang tercatat.
              </div>
            )}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-zinc-200 px-6 py-5">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                  Detail Produksi
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {selected.order_code ?? "Tanpa kode"}
                </h2>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="rounded-full bg-zinc-100 px-3 py-2 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-6 p-6">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs text-zinc-500">Produk Jadi</p>
                  <p className="mt-1 font-black">{selected.finished_quantity} pcs</p>
                </div>
                <div className="rounded-2xl bg-zinc-100 p-4">
                  <p className="text-xs text-zinc-500">Biaya Material</p>
                  <p className="mt-1 font-black">{rupiah(Number(selected.material_cost || 0))}</p>
                </div>
              </div>

              <section>
                <h3 className="mb-3 font-black">Pemakaian Filament</h3>
                <div className="space-y-2">
                  {rowMaterials(selected.id).map((m) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between rounded-xl border border-zinc-200 p-3"
                    >
                      <div>
                        <p className="font-bold">{m.inventory_name}</p>
                        <p className="text-xs text-zinc-500">
                          {m.quantity} {m.unit} × {rupiah(Number(m.unit_cost || 0))}
                        </p>
                      </div>
                      <p className="font-black">{rupiah(Number(m.total_cost || 0))}</p>
                    </div>
                  ))}
                </div>
              </section>

              {selected.notes && (
                <section>
                  <h3 className="mb-2 font-black">Catatan</h3>
                  <div className="rounded-xl bg-zinc-100 p-4 text-sm text-zinc-600">
                    {selected.notes}
                  </div>
                </section>
              )}

              <p className="text-xs text-zinc-400">
                Dicatat {dateText(selected.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
