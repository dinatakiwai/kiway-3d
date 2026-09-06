"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type TrackingOrder = {
  order_code: string | null;
  customer_name: string | null;
  product: string | null;
  custom_name: string | null;
  quantity: number | null;
  total: number | null;
  payment_status: string | null;
  production_status: string | null;
  created_at: string | null;
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function productionLabel(status: string | null) {
  if (status === "processing") return "Sedang Diproses";
  if (status === "finished") return "Selesai";
  if (status === "shipped") return "Dikirim";
  return "Pesanan Baru";
}

function paymentLabel(status: string | null) {
  if (status === "paid") return "Sudah Dibayar";
  if (status === "refunded") return "Refund";
  return "Menunggu Pembayaran";
}

function statusClass(status: string | null) {
  if (status === "finished" || status === "shipped" || status === "paid") {
    return "border-green-200 bg-green-50 text-green-700";
  }

  if (status === "processing") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }

  if (status === "refunded") {
    return "border-red-200 bg-red-50 text-red-700";
  }

  return "border-orange-200 bg-orange-50 text-orange-700";
}

function TrackingContent() {
  const searchParams = useSearchParams();

  const [code, setCode] = useState(searchParams.get("code") || "");
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const urlCode = searchParams.get("code");

    if (urlCode) {
      setCode(urlCode);
      loadOrder(urlCode);
    }
  }, [searchParams]);

  async function loadOrder(value: string) {
    const cleanCode = value.trim().toUpperCase();

    if (!cleanCode) {
      setError("Masukkan kode pesanan terlebih dahulu.");
      setOrder(null);
      return;
    }

    setLoading(true);
    setError("");
    setOrder(null);

    const { data, error: rpcError } = await supabase.rpc(
      "get_order_tracking",
      {
        p_order_code: cleanCode,
      }
    );

    setLoading(false);

    if (rpcError) {
      setError("Pesanan tidak ditemukan atau kode pesanan tidak valid.");
      return;
    }

    const result = Array.isArray(data) ? data[0] : data;

    if (!result) {
      setError("Pesanan tidak ditemukan. Periksa kembali kode pesananmu.");
      return;
    }

    setOrder(result as TrackingOrder);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    await loadOrder(code);
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] px-5 py-10 text-zinc-900">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[2rem] bg-zinc-950 p-7 text-white md:p-10">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            KIWAY TRACKING
          </p>

          <h1 className="mt-3 text-3xl font-black tracking-tight md:text-4xl">
            Lacak Pesanan
          </h1>

          <p className="mt-3 max-w-xl text-sm leading-6 text-zinc-300">
            Masukkan kode pesanan KIWAY untuk melihat status pesananmu.
          </p>

          <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-3 sm:flex-row">
            <input
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="Contoh: KW-20260907-0001"
              className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white px-4 py-4 font-bold text-zinc-900 outline-none focus:ring-4 focus:ring-orange-500/30"
            />

            <button
              type="submit"
              disabled={loading}
              className="rounded-2xl bg-orange-500 px-7 py-4 font-black text-white hover:bg-orange-400 disabled:opacity-50"
            >
              {loading ? "Mencari..." : "Lacak Pesanan →"}
            </button>
          </form>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        {order && (
          <section className="mt-6 rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-start">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Kode Pesanan
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {order.order_code || code}
                </h2>

                <p className="mt-3 text-sm text-zinc-500">
                  {order.custom_name || order.product || "Pesanan KIWAY"}
                </p>
              </div>

              <span
                className={`w-fit rounded-full border px-4 py-2 text-sm font-bold ${statusClass(
                  order.production_status
                )}`}
              >
                {productionLabel(order.production_status)}
              </span>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl bg-zinc-50 p-5">
                <p className="text-xs font-bold text-zinc-400">Customer</p>
                <p className="mt-1 font-bold">
                  {order.customer_name || "Customer"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-5">
                <p className="text-xs font-bold text-zinc-400">Produk</p>
                <p className="mt-1 font-bold">
                  {order.product || "Custom Product"}
                </p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-5">
                <p className="text-xs font-bold text-zinc-400">Jumlah</p>
                <p className="mt-1 font-bold">{Number(order.quantity || 0)}</p>
              </div>

              <div className="rounded-2xl bg-zinc-50 p-5">
                <p className="text-xs font-bold text-zinc-400">Total</p>
                <p className="mt-1 font-bold">
                  {rupiah(Number(order.total || 0))}
                </p>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <span
                className={`rounded-full border px-4 py-2 text-xs font-bold ${statusClass(
                  order.payment_status
                )}`}
              >
                {paymentLabel(order.payment_status)}
              </span>
            </div>

            <div className="mt-7 border-t border-zinc-100 pt-6">
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                STATUS PRODUKSI
              </p>

              <div className="mt-5 grid grid-cols-4 gap-2">
                {["new", "processing", "finished", "shipped"].map((status) => {
                  const statuses = ["new", "processing", "finished", "shipped"];
                  const currentIndex = statuses.indexOf(
                    order.production_status || "new"
                  );
                  const index = statuses.indexOf(status);
                  const active = index <= currentIndex;

                  return (
                    <div key={status} className="text-center">
                      <div
                        className={`mx-auto h-3 w-3 rounded-full ${
                          active ? "bg-orange-500" : "bg-zinc-200"
                        }`}
                      />
                      <p
                        className={`mt-2 text-[10px] font-bold leading-4 sm:text-xs ${
                          active ? "text-zinc-900" : "text-zinc-400"
                        }`}
                      >
                        {productionLabel(status)}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        <div className="mt-7 text-center">
          <Link
            href="/catalog"
            className="text-sm font-bold text-orange-500 hover:text-orange-600"
          >
            ← Kembali Belanja
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={null}>
      <TrackingContent />
    </Suspense>
  );
}
