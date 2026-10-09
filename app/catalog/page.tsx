"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  compare_at_price?: number | null;
  stock: number;
  category: string;
  description: string | null;
  is_active: boolean;
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    const { data, error: fetchError } = await supabase
      .from("products")
      .select(
        "id, title, image_url, price, compare_at_price, stock, category, description, is_active"
      )
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (fetchError) setError(fetchError.message);
    else setProducts((data ?? []) as Product[]);

    setLoading(false);
  }

  useEffect(() => {
    loadProducts();
  }, []);

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <section className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <p className="font-bold uppercase tracking-[0.2em] text-orange-500">
            Katalog KEILAB
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-black tracking-tight md:text-6xl">
                Pilih produkmu.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500 md:text-lg">
                Koleksi produk 3D printing KEILAB. Produk yang kamu upload dari
                Admin akan otomatis muncul di sini.
              </p>
            </div>

            <Link
              href="/catalog/clicker"
              className="w-fit rounded-full bg-zinc-950 px-6 py-3 font-bold text-white transition hover:bg-orange-500"
            >
              🎨 Custom Clicker
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-12 md:py-16">
        {loading ? (
          <div className="rounded-3xl border border-zinc-200 bg-white p-12 text-center text-zinc-500">
            Memuat katalog...
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
            Katalog belum dapat dimuat: {error}
          </div>
        ) : products.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-zinc-300 bg-white p-12 text-center">
            <div className="text-5xl">🛍️</div>
            <h2 className="mt-5 text-2xl font-black">
              Belum ada produk katalog
            </h2>
            <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
              Produk yang ditambahkan dari Admin → Katalog akan otomatis
              muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => {
              const outOfStock = Number(product.stock) <= 0;

              return (
                <article
                  key={product.id}
                  className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                >
                  <Link
                    href={`/catalog/product/${product.id}`}
                    className="flex flex-1 flex-col"
                    aria-label={`Lihat detail ${product.title}`}
                  >
                    <div className="relative aspect-square overflow-hidden bg-zinc-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-6xl">
                          📦
                        </div>
                      )}

                      <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-zinc-700 shadow-sm backdrop-blur">
                        {product.category}
                      </div>

                      <div
                        className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${
                          outOfStock
                            ? "bg-red-100 text-red-600"
                            : "bg-green-100 text-green-700"
                        }`}
                      >
                        {outOfStock ? "Habis" : `Stok ${product.stock}`}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col p-5 pb-2">
                      <h2 className="text-xl font-black">{product.title}</h2>
                      <p className="mt-2 min-h-12 line-clamp-2 text-sm leading-6 text-zinc-500">
                        {product.description || "Produk 3D printing KEILAB."}
                      </p>
                      <p className="mt-auto flex flex-wrap items-baseline gap-2 pt-4 text-xl font-black">
                        <span className="text-orange-600">{formatRupiah(Number(product.price))}</span>
                        {product.compare_at_price && product.compare_at_price > product.price ? <span className="text-sm font-medium text-zinc-400 line-through">{formatRupiah(Number(product.compare_at_price))}</span> : null}
                      </p>
                    </div>
                  </Link>

                  <div className="p-5 pt-3">
                    <Link
                      href={`/catalog/product/${product.id}`}
                      className="flex w-full items-center justify-center rounded-xl bg-zinc-950 px-4 py-3 text-sm font-black text-white transition hover:bg-orange-500"
                    >
                      Lihat Detail →
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="border-t border-zinc-200 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-7 px-6 py-16 md:flex-row md:items-center">
          <div>
            <p className="font-bold uppercase tracking-[0.2em] text-orange-400">
              Mau yang lebih personal?
            </p>
            <h2 className="mt-3 text-3xl font-black text-white md:text-4xl">
              Buat Custom Clicker kamu sendiri.
            </h2>
            <p className="mt-3 max-w-xl leading-7 text-zinc-400">
              Pilih nama, warna, dan kombinasi huruf sesuai keinginanmu.
            </p>
          </div>

          <Link
            href="/catalog/clicker"
            className="shrink-0 rounded-full bg-orange-500 px-7 py-4 font-black text-white transition hover:bg-orange-400"
          >
            Mulai Custom →
          </Link>
        </div>
      </section>
    </main>
  );
}
