// app/admin/page.tsx
"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const Clicker3D = dynamic(() => import("@/components/Clicker3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[360px] items-center justify-center rounded-3xl bg-zinc-100 text-sm text-zinc-400">
      Memuat preview 3D...
    </div>
  ),
});

type Order = {
  id: string;
  customer_name: string;
  customer_phone: string | null;
  notes: string | null;
  product: string;
  custom_name: string;
  letters: string[];
  base_color: string;
  letter_colors: Record<string, string>;
  quantity: number;
  price: number;
  total: number;
  payment_status: string;
  production_status: string;
  created_at: string;
};

type ProductionFilter =
  | "all"
  | "new"
  | "processing"
  | "finished"
  | "shipped";

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

function productionLabel(status: string) {
  const labels: Record<string, string> = {
    new: "Pesanan Baru",
    processing: "Diproses",
    finished: "Selesai",
    shipped: "Dikirim",
  };

  return labels[status] ?? "Pesanan Baru";
}

function paymentLabel(status: string) {
  const labels: Record<string, string> = {
    pending: "Pending",
    paid: "Sudah Dibayar",
    refunded: "Refund",
  };

  return labels[status] ?? "Pending";
}

function normalizePhone(phone: string | null) {
  if (!phone) return "";

  const value = phone.replace(/\D/g, "");

  if (value.startsWith("0")) {
    return `62${value.slice(1)}`;
  }

  return value;
}

export default function AdminPage() {
  const router = useRouter();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [draftPaymentStatus, setDraftPaymentStatus] = useState("");
  const [draftProductionStatus, setDraftProductionStatus] = useState("");
  const [saving, setSaving] = useState(false);
  const [updating, setUpdating] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ProductionFilter>("all");

  async function loadOrders() {
    setLoading(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      router.replace("/admin/login");
      return;
    }

    const { data, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError.message);
      setLoading(false);
      return;
    }

    setOrders((data || []) as Order[]);
    setLoading(false);
  }

  useEffect(() => {
    loadOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    return orders.filter((order) => {
      if (
        filter !== "all" &&
        order.production_status !== filter
      ) {
        return false;
      }

      if (!q) return true;

      return (
        order.customer_name.toLowerCase().includes(q) ||
        order.custom_name.toLowerCase().includes(q) ||
        (order.customer_phone || "").toLowerCase().includes(q) ||
        order.id.toLowerCase().includes(q)
      );
    });
  }, [orders, search, filter]);

  async function handleSaveStatus() {
    if (!selectedOrder) return;

    setSaving(true);

    const { error: updateError } = await supabase
      .from("orders")
      .update({
        payment_status: draftPaymentStatus,
        production_status: draftProductionStatus,
      })
      .eq("id", selectedOrder.id);

    setSaving(false);

    if (updateError) {
      alert("Gagal menyimpan perubahan: " + updateError.message);
      return;
    }

    const updatedOrder = {
      ...selectedOrder,
      payment_status: draftPaymentStatus,
      production_status: draftProductionStatus,
    };

    setOrders((current) =>
      current.map((order) =>
        order.id === selectedOrder.id ? updatedOrder : order
      )
    );

    setSelectedOrder(null);
  }

  function openOrder(order: Order) {
    setSelectedOrder(order);
    setDraftPaymentStatus(order.payment_status);
    setDraftProductionStatus(order.production_status);
  }

  function openWhatsApp(order: Order) {
    const phone = normalizePhone(order.customer_phone);

    if (!phone) {
      alert("Nomor WhatsApp customer belum tersedia.");
      return;
    }

    const message = [
      `Halo ${order.customer_name} 👋`,
      "",
      "Kami dari KIWAY 3D.",
      `Terkait pesanan custom *${order.custom_name}*,`,
      `status produksi saat ini: *${productionLabel(
        order.production_status
      )}*.`,
      "",
      "Terima kasih 🙏",
    ].join("\n");

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/admin/login");
  }

  const totalSales = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  const last7Days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));

    const key = date.toISOString().slice(0, 10);

    const dayOrders = orders.filter(
      (o) =>
        o.created_at &&
        new Date(o.created_at).toISOString().slice(0, 10) === key
    );

    return {
      key,
      label: date.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      orders: dayOrders.length,
      sales: dayOrders.reduce(
        (sum, o) => sum + Number(o.total || 0),
        0
      ),
    };
  });

  const maxDailySales = Math.max(
    ...last7Days.map((d) => d.sales),
    1
  );

  const maxDailyOrders = Math.max(
    ...last7Days.map((d) => d.orders),
    1
  );


  const newOrders = orders.filter(
    (order) => order.production_status === "new"
  ).length;

  const processingOrders = orders.filter(
    (order) => order.production_status === "processing"
  ).length;

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      {/* ADMIN HEADER */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div>
            <div className="text-2xl font-black tracking-tight">
              KIWAY<span className="text-orange-500">.</span>
            </div>

            <p className="mt-1 text-xs font-medium text-zinc-400">
              Admin Dashboard
            </p>
          </div>

          <button
            onClick={logout}
            className="rounded-full border border-zinc-200 px-5 py-2.5 text-sm font-semibold transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            Logout
          </button>
        </div>
      </header>

      {/* CONTENT */}
      <div className="mx-auto max-w-7xl px-6 py-10">
        <p className="text-sm font-bold uppercase tracking-widest text-orange-500">
          Dashboard
        </p>

        <h1 className="mt-2 text-3xl font-black md:text-4xl">
          Pesanan KIWAY
        </h1>

        <p className="mt-2 text-zinc-500">
          Kelola pesanan dan status produksi customer.
        </p>

        {error && (
          <div className="mt-6 rounded-2xl bg-red-50 px-5 py-4 text-sm font-medium text-red-600">
            {error}
          </div>
        )}

        {/* STATISTICS */}
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Ringkasan Order</h2>
          <p className="mt-1 text-sm text-zinc-500">Status pesanan saat ini</p>
          <div className="mt-6 space-y-4">
            {[
              ["Pesanan Baru", orders.filter((o) => o.production_status === "new").length],
              ["Diproses", orders.filter((o) => o.production_status === "processing").length],
              ["Selesai", orders.filter((o) => o.production_status === "finished").length],
              ["Dikirim", orders.filter((o) => o.production_status === "shipped").length],
            ].map(([label, value]) => {
              const count = Number(value);
              const width = orders.length ? Math.max((count / orders.length) * 100, count ? 5 : 0) : 0;
              return (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-zinc-700">{label}</span>
                    <span className="font-bold text-zinc-900">{count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-zinc-900 transition-all" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-zinc-900">Ringkasan Pembayaran</h2>
          <p className="mt-1 text-sm text-zinc-500">Status pembayaran customer</p>
          <div className="mt-6 space-y-4">
            {[
              ["Sudah Dibayar", orders.filter((o) => o.payment_status === "paid").length],
              ["Belum Dibayar", orders.filter((o) => o.payment_status === "pending").length],
              ["Refund", orders.filter((o) => o.payment_status === "refunded").length],
            ].map(([label, value]) => {
              const count = Number(value);
              const width = orders.length ? Math.max((count / orders.length) * 100, count ? 5 : 0) : 0;
              return (
                <div key={String(label)}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span className="font-medium text-zinc-700">{label}</span>
                    <span className="font-bold text-zinc-900">{count}</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-orange-500 transition-all" style={{ width: `${width}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-500">Total Order</p>
            <p className="mt-2 text-3xl font-black">
              {orders.length}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-500">Pesanan Baru</p>
            <p className="mt-2 text-3xl font-black">
              {newOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-500">
              Sedang Diproses
            </p>
            <p className="mt-2 text-3xl font-black">
              {processingOrders}
            </p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-sm text-zinc-500">
              Total Penjualan
            </p>

            <p className="mt-2 text-2xl font-black">
              {rupiah(totalSales)}
            </p>
          </div>
        </div>

        {/* ORDERS */}
        <section className="mt-10">
          <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h2 className="text-xl font-black">
                Pesanan Terbaru
              </h2>

              <p className="mt-1 text-sm text-zinc-500">
                Cari dan filter pesanan customer.
              </p>
            </div>

            <button
              onClick={loadOrders}
              className="w-fit rounded-full border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold transition hover:bg-zinc-50"
            >
              ↻ Refresh
            </button>
          </div>

          {/* SEARCH + FILTER */}
          <div className="rounded-3xl border border-zinc-200 bg-white p-4 md:p-5">
            <div className="flex flex-col gap-4 lg:flex-row">
              <input
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="🔎  Cari customer, nama custom, nomor WhatsApp..."
                className="flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm outline-none transition focus:border-orange-400 focus:bg-white"
              />

              <select
                value={filter}
                onChange={(event) =>
                  setFilter(
                    event.target.value as ProductionFilter
                  )
                }
                className="rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold outline-none focus:border-orange-400"
              >
                <option value="all">Semua Pesanan</option>
                <option value="new">Pesanan Baru</option>
                <option value="processing">Diproses</option>
                <option value="finished">Selesai</option>
                <option value="shipped">Dikirim</option>
              </select>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {(
                [
                  ["all", "Semua"],
                  ["new", "Baru"],
                  ["processing", "Diproses"],
                  ["finished", "Selesai"],
                  ["shipped", "Dikirim"],
                ] as [ProductionFilter, string][]
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={`rounded-full px-4 py-2 text-xs font-bold transition ${
                    filter === value
                      ? "bg-zinc-900 text-white"
                      : "border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* TABLE */}
          <div className="mt-5 overflow-hidden rounded-3xl border border-zinc-200 bg-white">
            {loading ? (
              <div className="p-10 text-center text-zinc-500">
                Memuat pesanan...
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-10 text-center">
                <div className="text-4xl">🔎</div>

                <h3 className="mt-4 font-bold">
                  Order tidak ditemukan
                </h3>

                <p className="mt-1 text-sm text-zinc-500">
                  Coba ubah kata pencarian atau filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[950px] text-left">
                  <thead className="border-b border-zinc-200 bg-zinc-50">
                    <tr>
                      {[
                        "Pesanan",
                        "Customer",
                        "Total",
                        "Pembayaran",
                        "Produksi",
                        "",
                      ].map((heading, index) => (
                        <th
                          key={index}
                          className="px-5 py-4 text-xs font-bold uppercase tracking-wider text-zinc-500"
                        >
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr
                        key={order.id}
                        className="border-b border-zinc-100 last:border-0"
                      >
                        <td className="px-5 py-5">
                          <div className="font-bold">
                            {order.custom_name}
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            {order.letters.length} huruf · Qty{" "}
                            {order.quantity}
                          </div>

                          <div className="mt-1 text-xs text-zinc-400">
                            {new Date(
                              order.created_at
                            ).toLocaleString("id-ID")}
                          </div>
                        </td>

                        <td className="px-5 py-5">
                          <div className="font-semibold">
                            {order.customer_name}
                          </div>

                          <div className="mt-1 text-xs text-zinc-500">
                            {order.customer_phone || "-"}
                          </div>
                        </td>

                        <td className="px-5 py-5 font-bold">
                          {rupiah(Number(order.total || 0))}
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-full bg-yellow-50 px-3 py-1.5 text-xs font-bold text-yellow-700">
                            {paymentLabel(
                              order.payment_status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5">
                          <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold text-zinc-700">
                            {productionLabel(
                              order.production_status
                            )}
                          </span>
                        </td>

                        <td className="px-5 py-5 text-right">
                          <button
                            onClick={() =>
                              openOrder(order)
                            }
                            className="rounded-full bg-zinc-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-orange-500"
                          >
                            Detail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="mt-3 text-xs text-zinc-400">
            Menampilkan {filteredOrders.length} dari{" "}
            {orders.length} pesanan.
          </p>
        </section>
      </div>

      {/* DETAIL MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-[100] overflow-y-auto bg-black/50 p-4">
          <div className="mx-auto my-6 w-full max-w-6xl rounded-3xl bg-white p-5 shadow-2xl md:p-8">
            {/* MODAL HEADER */}
            <div className="flex items-start justify-between gap-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-orange-500">
                  Detail Order
                </p>

                <h2 className="mt-2 text-3xl font-black">
                  {selectedOrder.custom_name}
                </h2>

                <p className="mt-1 break-all text-xs text-zinc-400">
                  #{selectedOrder.id}
                </p>
              </div>

              <button
                onClick={() => setSelectedOrder(null)}
                className="rounded-full bg-zinc-100 px-3 py-2 text-sm font-bold transition hover:bg-zinc-200"
              >
                ✕
              </button>
            </div>

            {/* TWO COLUMNS */}
            <div className="mt-7 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              {/* LEFT: 3D */}
              <div className="overflow-hidden rounded-3xl border border-zinc-200 bg-[#f4f3f1]">
                <div className="border-b border-zinc-200 bg-white px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="font-black">
                        Preview 3D Pesanan
                      </h3>

                      <p className="mt-1 text-xs text-zinc-500">
                        Sesuai konfigurasi yang dikirim customer.
                      </p>
                    </div>

                    <span className="rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-bold">
                      {selectedOrder.letters.length} huruf
                    </span>
                  </div>
                </div>

                <div className="h-[430px]">
                  <Clicker3D
                    letters={selectedOrder.letters}
                    baseColor={selectedOrder.base_color}
                    letterColors={Object.fromEntries(
                      Object.entries(
                        selectedOrder.letter_colors || {}
                      ).map(([key, value]) => [
                        Number(key),
                        value,
                      ])
                    )}
                    selectedLetter={null}
                    onSelectLetter={() => undefined}
                  />
                </div>
              </div>

              {/* RIGHT */}
              <div className="space-y-5">
                {/* CUSTOMER */}
                <div className="rounded-2xl bg-zinc-50 p-5">
                  <h3 className="font-bold">Customer</h3>

                  <p className="mt-3 text-sm font-semibold">
                    {selectedOrder.customer_name}
                  </p>

                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedOrder.customer_phone ||
                      "Nomor tidak tersedia"}
                  </p>

                  {selectedOrder.notes && (
                    <div className="mt-3 rounded-xl bg-white p-3 text-sm text-zinc-600">
                      <span className="font-semibold">
                        Catatan:
                      </span>{" "}
                      {selectedOrder.notes}
                    </div>
                  )}

                  <button
                    onClick={() =>
                      openWhatsApp(selectedOrder)
                    }
                    className="mt-4 w-full rounded-full bg-green-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-green-700"
                  >
                    💬 WhatsApp Customer
                  </button>
                </div>

                {/* CONFIG */}
                <div className="rounded-2xl border border-zinc-200 p-5">
                  <h3 className="font-bold">
                    Konfigurasi Custom
                  </h3>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="text-sm text-zinc-500">
                      Base:
                    </span>

                    <span
                      className="h-7 w-7 rounded-full border border-zinc-300"
                      style={{
                        backgroundColor:
                          selectedOrder.base_color,
                      }}
                    />

                    <span className="text-xs font-mono text-zinc-500">
                      {selectedOrder.base_color}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-5 gap-2">
                    {selectedOrder.letters.map(
                      (letter, index) => {
                        const color =
                          selectedOrder.letter_colors?.[
                            String(index)
                          ] || "#ffffff";

                        return (
                          <div
                            key={`${letter}-${index}`}
                            className="rounded-xl border border-zinc-200 p-2 text-center"
                          >
                            <div
                              className="mx-auto flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-200 font-black"
                              style={{
                                backgroundColor: color,
                                color:
                                  color.toLowerCase() ===
                                  "#ffffff"
                                    ? "#18181b"
                                    : "#ffffff",
                              }}
                            >
                              {letter}
                            </div>

                            <p className="mt-1 truncate text-[9px] font-mono text-zinc-400">
                              {color}
                            </p>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* PRICE */}
                <div className="rounded-2xl border border-zinc-200 p-5">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">
                      Harga
                    </span>

                    <span className="font-semibold">
                      {rupiah(
                        Number(selectedOrder.price || 0)
                      )}
                    </span>
                  </div>

                  <div className="mt-2 flex justify-between text-sm">
                    <span className="text-zinc-500">
                      Quantity
                    </span>

                    <span className="font-semibold">
                      {selectedOrder.quantity}
                    </span>
                  </div>

                  <div className="my-4 border-t border-zinc-200" />

                  <div className="flex justify-between">
                    <span className="font-bold">
                      Total
                    </span>

                    <span className="text-xl font-black">
                      {rupiah(
                        Number(selectedOrder.total || 0)
                      )}
                    </span>
                  </div>
                </div>

                {/* ORDER FLOW */}
                <div className="rounded-2xl border border-zinc-200 p-5">
                  <h3 className="font-bold">Alur Pesanan</h3>
                  <p className="mt-1 text-xs text-zinc-500">
                    Progress produksi pesanan customer.
                  </p>

                  <div className="mt-5 grid grid-cols-4 gap-2">
                    {[
                      ["new", "Pesanan Baru", "📝"],
                      ["processing", "Diproses", "⚙️"],
                      ["finished", "Selesai", "✅"],
                      ["shipped", "Dikirim", "🚚"],
                    ].map(([status, label, icon], index) => {
                      const steps = ["new", "processing", "finished", "shipped"];
                      const currentIndex = steps.indexOf(
                        selectedOrder.production_status
                      );
                      const active = index <= currentIndex;

                      return (
                        <div key={status} className="relative text-center">
                          {index < 3 && (
                            <div
                              className={`absolute left-1/2 top-5 hidden h-0.5 w-full sm:block ${
                                index < currentIndex
                                  ? "bg-orange-500"
                                  : "bg-zinc-200"
                              }`}
                            />
                          )}

                          <div
                            className={`relative z-10 mx-auto flex h-10 w-10 items-center justify-center rounded-full border text-sm ${
                              active
                                ? "border-orange-500 bg-orange-500 text-white"
                                : "border-zinc-200 bg-white text-zinc-400"
                            }`}
                          >
                            {icon}
                          </div>

                          <p
                            className={`mt-2 text-[10px] font-bold sm:text-xs ${
                              active ? "text-zinc-900" : "text-zinc-400"
                            }`}
                          >
                            {label}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* STATUS */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Status Pembayaran
                    </label>

                    <select
                      value={draftPaymentStatus}
                      disabled={saving}
                      onChange={(event) =>
                        setDraftPaymentStatus(event.target.value)
                      }
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="pending">
                        Pending
                      </option>

                      <option value="paid">
                        Sudah Dibayar
                      </option>

                      <option value="refunded">
                        Refund
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-bold">
                      Status Produksi
                    </label>

                    <select
                      value={draftProductionStatus}
                      disabled={saving}
                      onChange={(event) =>
                        setDraftProductionStatus(event.target.value)
                      }
                      className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:border-orange-400"
                    >
                      <option value="new">
                        Pesanan Baru
                      </option>

                      <option value="processing">
                        Diproses
                      </option>

                      <option value="finished">
                        Selesai
                      </option>

                      <option value="shipped">
                        Dikirim
                      </option>
                    </select>
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setSelectedOrder(null)}
                    disabled={saving}
                    className="rounded-full border border-zinc-300 px-6 py-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:opacity-50"
                  >
                    Batal
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveStatus}
                    disabled={saving}
                    className="rounded-full bg-orange-500 px-7 py-3 text-sm font-bold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
