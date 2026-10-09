"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getCart,
  removeFromCart,
  updateCartQuantity,
  getCartTotal,
  type CartItem,
} from "@/lib/cart";

function rupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function CartPage() {
  const [items, setItems] = useState<CartItem[]>([]);

  function refresh() {
    setItems(getCart());
  }

  useEffect(() => {
    refresh();
    window.addEventListener("kiway-cart-updated", refresh);
    return () => window.removeEventListener("kiway-cart-updated", refresh);
  }, []);

  const total = getCartTotal();

  return (
    <main className="min-h-screen bg-[#faf9f7] px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <Link href="/catalog" className="text-sm font-bold text-zinc-500 hover:text-orange-500">
          ← Kembali ke Katalog
        </Link>

        <h1 className="mt-4 text-4xl font-black">Keranjang</h1>
        <p className="mt-2 text-zinc-500">
          Periksa produk sebelum lanjut ke checkout.
        </p>

        {!items.length ? (
          <div className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-12 text-center">
            <div className="text-6xl">🛒</div>
            <h2 className="mt-5 text-2xl font-black">Keranjang masih kosong</h2>
            <Link
              href="/catalog"
              className="mt-6 inline-flex rounded-full bg-zinc-950 px-6 py-3 font-bold text-white hover:bg-orange-500"
            >
              Belanja Sekarang
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <section className="space-y-4">
              {items.map((item) => (
                <article
                  key={item.id}
                  className="flex gap-4 rounded-3xl border border-zinc-200 bg-white p-4 shadow-sm"
                >
                  <div className="h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-zinc-100">
                    {item.product === "clicker" && item.keychain?.imageUrl ? (
                      <img src={item.keychain.imageUrl} alt={item.keychain.name} className="h-full w-full object-cover" />
                    ) : "imageUrl" in item && item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-3xl">⌨️</div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="font-black">{item.name}</h2>
                        {item.product === "clicker" && item.keychain && <p className="mt-1 text-xs font-semibold text-orange-600">Gantungan: {item.keychain.name}</p>}
                        {item.product === "catalog" && item.selectedOptions?.filter((option) => option.choiceLabel).map((option) => <p key={option.groupName} className="mt-1 text-xs font-semibold text-zinc-500">{option.groupName}: {option.choiceLabel}</p>)}
                        <p className="mt-1 text-sm text-zinc-500">
                          {rupiah(item.price)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          removeFromCart(item.id);
                          refresh();
                        }}
                        className="text-sm font-bold text-red-500 hover:text-red-700"
                      >
                        Hapus
                      </button>
                    </div>

                    <div className="mt-4 flex items-center justify-between gap-4">
                      <div className="flex items-center overflow-hidden rounded-xl border border-zinc-200">
                        <button
                          type="button"
                          onClick={() => {
                            updateCartQuantity(item.id, item.quantity - 1);
                            refresh();
                          }}
                          disabled={item.quantity <= 1}
                          className="px-4 py-2 font-black disabled:opacity-30"
                        >
                          −
                        </button>
                        <span className="min-w-10 text-center font-black">{item.quantity}</span>
                        <button
                          type="button"
                          onClick={() => {
                            updateCartQuantity(item.id, item.quantity + 1);
                            refresh();
                          }}
                          className="px-4 py-2 font-black"
                        >
                          +
                        </button>
                      </div>

                      <strong>{rupiah(item.price * item.quantity)}</strong>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <aside className="h-fit rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-24">
              <p className="text-sm font-bold text-zinc-400">Ringkasan</p>

              <div className="mt-5 flex justify-between">
                <span>Total</span>
                <strong className="text-2xl">{rupiah(total)}</strong>
              </div>

              <Link
                href="/checkout"
                className="mt-6 flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-5 py-4 font-black text-white hover:bg-orange-500"
              >
                Lanjut Checkout →
              </Link>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
