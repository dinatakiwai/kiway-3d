"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  clearCart,
  getCart,
  getCartTotal,
  removeFromCart,
  updateCartQuantity,
  type ClickerCartItem,
} from "@/lib/cart";

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function CartPage() {
  const [items, setItems] = useState<ClickerCartItem[]>([]);

  function refresh() {
    setItems(getCart());
  }

  useEffect(() => {
    refresh();

    const handleUpdate = () => refresh();
    window.addEventListener("kiway-cart-updated", handleUpdate);

    return () => {
      window.removeEventListener("kiway-cart-updated", handleUpdate);
    };
  }, []);

  const total = getCartTotal();

  return (
    <main className="min-h-screen bg-[#faf9f7] px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <Link
          href="/catalog"
          className="text-sm font-semibold text-zinc-500 hover:text-orange-500"
        >
          ← Kembali ke Catalog
        </Link>

        <div className="mt-8">
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            KIWAY
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
            Keranjang
          </h1>
          <p className="mt-3 text-zinc-500">
            Periksa kembali desain custom kamu sebelum checkout.
          </p>
        </div>

        {items.length === 0 ? (
          <div className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🛒</div>
            <h2 className="mt-4 text-2xl font-black">Keranjang masih kosong</h2>
            <p className="mt-2 text-sm text-zinc-500">
              Yuk buat custom clicker pertama kamu.
            </p>
            <Link
              href="/customizer"
              className="mt-6 inline-flex rounded-full bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-orange-500"
            >
              Mulai Custom
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                        Custom 3D
                      </p>
                      <h2 className="mt-1 text-2xl font-black">
                        Custom Clicker
                      </h2>
                      <p className="mt-1 text-sm text-zinc-500">
                        Nama: <strong className="text-zinc-900">{item.name}</strong>
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        {item.letters.length} keycap · Base{" "}
                        <span
                          className="inline-block h-3 w-3 rounded-full border align-middle"
                          style={{ backgroundColor: item.baseColor }}
                        />
                      </p>
                    </div>

                    <div className="text-left sm:text-right">
                      <p className="text-xl font-black">
                        {formatRupiah(item.price)}
                      </p>

                      <div className="mt-3 flex items-center gap-2 sm:justify-end">
                        <button
                          onClick={() =>
                            updateCartQuantity(item.id, item.quantity - 1)
                          }
                          disabled={item.quantity <= 1}
                          className="h-9 w-9 rounded-full border border-zinc-200 font-bold disabled:opacity-30"
                        >
                          −
                        </button>

                        <span className="w-8 text-center font-bold">
                          {item.quantity}
                        </span>

                        <button
                          onClick={() =>
                            updateCartQuantity(item.id, item.quantity + 1)
                          }
                          className="h-9 w-9 rounded-full border border-zinc-200 font-bold"
                        >
                          +
                        </button>

                        <button
                          onClick={() => removeFromCart(item.id)}
                          className="ml-2 text-xs font-bold text-red-500 hover:text-red-600"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <button
                onClick={() => {
                  clearCart();
                  refresh();
                }}
                className="text-sm font-semibold text-zinc-400 hover:text-red-500"
              >
                Kosongkan keranjang
              </button>
            </div>

            <aside className="h-fit rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <p className="text-sm font-semibold text-zinc-400">
                Ringkasan Pesanan
              </p>

              <div className="mt-5 flex items-center justify-between">
                <span className="text-zinc-500">Produk</span>
                <span className="font-bold">
                  {items.reduce((sum, item) => sum + item.quantity, 0)}
                </span>
              </div>

              <div className="mt-3 flex items-center justify-between">
                <span className="text-zinc-500">Total</span>
                <span className="text-2xl font-black">
                  {formatRupiah(total)}
                </span>
              </div>

              <Link
                href="/checkout"
                className="mt-6 block w-full rounded-2xl bg-zinc-900 px-5 py-4 text-center font-black text-white transition hover:bg-orange-500"
              >
                Lanjut Checkout →
              </Link>

              <Link
                href="/customizer"
                className="mt-3 block text-center text-sm font-bold text-orange-500 hover:text-orange-600"
              >
                + Tambah Custom Lain
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
