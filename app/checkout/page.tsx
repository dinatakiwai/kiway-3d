"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearCart,
  getCart,
  getCartTotal,
  type ClickerCartItem,
} from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { STORE } from "@/lib/store";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

type CreatedOrder = {
  order_code: string;
  custom_name: string;
  quantity: number;
  total: number;
};

export default function CheckoutPage() {
  const [items, setItems] = useState<ClickerCartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdOrders, setCreatedOrders] = useState<CreatedOrder[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  async function submitOrder() {
    setError("");

    if (!items.length) {
      setError("Keranjang masih kosong.");
      return;
    }

    if (!customerName.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    const phone = normalizePhone(customerPhone);
    if (phone.length < 10) {
      setError("Nomor WhatsApp belum valid.");
      return;
    }

    setLoading(true);

    const results: CreatedOrder[] = [];

    for (const item of items) {
      const { data, error: insertError } = await supabase.rpc(
        "create_order",
        {
          p_customer_name: customerName.trim(),
          p_customer_phone: customerPhone.trim(),
          p_notes: notes.trim() || null,
          p_product: "clicker",
          p_custom_name: item.name,
          p_letters: item.letters,
          p_base_color: item.baseColor,
          p_letter_colors: item.letterColors,
          p_quantity: item.quantity,
          p_price: item.price,
          p_total: item.price * item.quantity,
        }
      );

      const createdOrder = Array.isArray(data) ? data[0] : data;

      if (insertError) {
        setLoading(false);
        setError(
          "Pesanan gagal dibuat. " +
            insertError.message
        );
        return;
      }

      if (!createdOrder?.order_code) {
        setLoading(false);
        setError("Pesanan berhasil dibuat, tetapi nomor order tidak tersedia.");
        return;
      }

      results.push(createdOrder as CreatedOrder);
    }

    setLoading(false);
    setCreatedOrders(results);
    clearCart();

    const orderLines = results
      .map(
        (order) =>
          `• ${order.order_code} — ${order.custom_name} × ${order.quantity} (${formatRupiah(order.total)})`
      )
      .join("\n");

    const message = [
      `Halo ${STORE.name} 👋`,
      "",
      `Saya ${customerName.trim()} ingin melakukan order:`,
      "",
      orderLines,
      "",
      `Total: ${formatRupiah(total)}`,
      "",
      notes.trim() ? `Catatan: ${notes.trim()}` : "",
      "",
      "Mohon info pembayaran dan proses selanjutnya. Terima kasih 🙏",
    ]
      .filter(Boolean)
      .join("\n");
    const primaryOrder = results[0];

    if (!primaryOrder?.order_code) {
      setError("Pesanan berhasil dibuat, tetapi nomor order tidak tersedia.");
      return;
    }

    localStorage.removeItem("kiway-cart");

    window.open(
      `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  }

  if (createdOrders.length > 0) {
    const trackingCode = createdOrders[0].order_code;
    const trackingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/tracking?order=${encodeURIComponent(trackingCode)}`
        : `/tracking?order=${encodeURIComponent(trackingCode)}`;

    const whatsappText = [
      `Halo ${STORE.name} 👋`,
      "",
      `Saya ${customerName.trim()} sudah membuat pesanan.`,
      "",
      ...createdOrders.map(
        (order) =>
          `• ${order.order_code} — ${order.custom_name} × ${order.quantity} (${formatRupiah(order.total)})`
      ),
      "",
      `Total: ${formatRupiah(total)}`,
      "",
      `Tracking: ${trackingUrl}`,
    ].join("\n");

    return (
      <main className="min-h-screen bg-[#faf9f7] px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
            ✓
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-orange-500">
            KIWAY 3D
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Pesanan Berhasil!
          </h1>

          <p className="mt-3 text-zinc-500">
            Pesanan kamu sudah masuk ke sistem KIWAY. Simpan nomor order ini
            untuk mengecek status pesanan.
          </p>

          <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-7 text-left shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Nomor Order
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-3xl font-black text-orange-500">
                {trackingCode}
              </p>

              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(trackingCode);
                  alert("Nomor order berhasil disalin.");
                }}
                className="rounded-full border border-zinc-200 px-3 py-2 text-xs font-bold text-zinc-600 hover:bg-zinc-100"
              >
                Salin
              </button>
            </div>

            {createdOrders.length > 1 && (
              <div className="mt-5 space-y-2">
                {createdOrders.slice(1).map((order) => (
                  <div
                    key={order.order_code}
                    className="rounded-xl bg-zinc-50 p-3 text-sm"
                  >
                    <span className="font-bold text-orange-500">
                      {order.order_code}
                    </span>{" "}
                    · {order.custom_name} · {order.quantity} pcs
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <a
                href={trackingUrl}
                className="rounded-2xl bg-zinc-900 px-6 py-4 text-center font-black text-white transition hover:bg-orange-500"
              >
                🔎 Lacak Pesanan
              </a>

              <a
                href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
                  whatsappText
                )}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-green-500 px-6 py-4 text-center font-black text-white transition hover:bg-green-600"
              >
                💬 Bagikan ke WhatsApp
              </a>

              <a
                href="/"
                className="rounded-2xl border border-zinc-200 px-6 py-4 text-center font-bold text-zinc-700 transition hover:bg-zinc-50"
              >
                Kembali ke Beranda
              </a>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/cart"
          className="text-sm font-semibold text-zinc-500 hover:text-orange-500"
        >
          ← Kembali ke Keranjang
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            KIWAY
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Checkout
          </h1>
          <p className="mt-3 text-zinc-500">
            Isi data kamu. Setelah order dibuat, WhatsApp akan terbuka otomatis.
          </p>
        </div>

        {!items.length ? (
          <div className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🛒</div>
            <h2 className="mt-4 text-2xl font-black">Keranjang kosong</h2>
            <Link
              href="/customizer"
              className="mt-6 inline-flex rounded-full bg-zinc-900 px-6 py-3 font-bold text-white hover:bg-orange-500"
            >
              Mulai Custom
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="text-xl font-black">Data Customer</h2>

              <div className="mt-6 space-y-5">
                <label className="block">
                  <span className="text-sm font-bold">Nama</span>
                  <input
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Nama lengkap"
                    className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">WhatsApp</span>
                  <input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="08xxxxxxxxxx"
                    inputMode="tel"
                    className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold">
                    Catatan <span className="font-normal text-zinc-400">(opsional)</span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: warna packaging, request khusus, dll."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                  />
                </label>
              </div>

              {error && (
                <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={loading}
                className="mt-6 w-full rounded-2xl bg-zinc-900 px-5 py-4 font-black text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Membuat Pesanan..." : "Buat Pesanan & WhatsApp →"}
              </button>
            </section>

            <aside className="h-fit rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <p className="text-sm font-semibold text-zinc-400">
                Ringkasan Pesanan
              </p>

              <div className="mt-5 space-y-3">
                {items.map((item) => (
                  <div key={item.id} className="flex justify-between gap-4 text-sm">
                    <div>
                      <p className="font-bold">{item.name}</p>
                      <p className="text-zinc-400">
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>
                    <p className="font-bold">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-5">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Total</span>
                  <span className="text-2xl font-black">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-orange-50 p-4 text-xs leading-5 text-orange-700">
                Setelah pesanan dibuat, kamu akan mendapatkan nomor order
                <strong> KW-...</strong> untuk tracking.
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
