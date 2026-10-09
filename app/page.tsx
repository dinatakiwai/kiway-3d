"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStoreSettings } from "@/lib/useStoreSettings";

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
export default function Home() {
  const storeSettings = useStoreSettings();
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");

  useEffect(() => {
    async function loadProducts() {
      const { data, error } = await supabase
        .from("products")
        .select("id, title, image_url, price, compare_at_price, stock, category, description, is_active")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (error) setProductsError(error.message);
      else setProducts((data ?? []) as Product[]);
      setProductsLoading(false);
    }

    loadProducts();
  }, []);
  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute -left-32 top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute -right-32 top-10 h-80 w-80 rounded-full bg-zinc-200/50 blur-3xl" />

        <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
<h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              Wujudkan ide jadi{" "}
              <span className="text-orange-500">nyata.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600">
              Temukan produk 3D printing KEILAB dan pilih yang paling kamu suka.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/customizer"
                className="rounded-full bg-zinc-900 px-7 py-4 text-center font-bold text-white transition hover:-translate-y-0.5 hover:bg-orange-500"
              >
                🎨 Mulai Custom
              </Link>

              <a
                href="#produk"
                className="rounded-full border border-zinc-300 bg-white px-7 py-4 text-center font-bold transition hover:border-zinc-900"
              >
                Lihat Produk
              </a>
            </div>

            <div className="mt-10 flex flex-wrap gap-5 text-xs font-semibold uppercase tracking-widest text-zinc-400">
              <span>Made to Order</span>
              <span>•</span>
              <span>3D Printed</span>
              <span>•</span>
              <span>Custom</span>
            </div>
          </div>

          {/* HERO PRODUCT */}
          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-orange-200/40 blur-3xl" />

            <div className="relative mx-auto max-w-lg rotate-2 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-2xl transition duration-500 hover:rotate-1 hover:-translate-y-1">
              <div className="rounded-[1.5rem] bg-zinc-100 p-8">
                <div className="mb-8 flex items-center justify-between">
                  <span className="text-sm font-semibold text-zinc-500">
                    CUSTOM CLICKER
                  </span>

                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-600">
                    3D PRINT
                  </span>
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {["R", "A", "H", "M", "A"].map((letter, index) => (
                    <div
                      key={`${letter}-${index}`}
                      className={`flex h-16 w-16 items-center justify-center rounded-2xl border-b-4 text-2xl font-black shadow-lg transition hover:-translate-y-1 md:h-20 md:w-20 md:text-3xl ${
                        index % 3 === 0
                          ? "border-red-700 bg-red-500 text-white"
                          : index % 3 === 1
                            ? "border-zinc-700 bg-zinc-900 text-white"
                            : "border-orange-600 bg-orange-400 text-white"
                      }`}
                    >
                      {letter}
                    </div>
                  ))}
                </div>

                <div className="mt-8 rounded-2xl bg-white p-5">
                  <div className="text-xs font-medium text-zinc-400">
                    YOUR NAME
                  </div>
                  <div className="mt-1 text-2xl font-black">RAHMA</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PRODUCTS */}
      <section id="produk" className="border-t border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-14 md:py-20">
          <p className="font-bold uppercase tracking-[0.2em] text-orange-500">
            Katalog KEILAB
          </p>

          <div className="mt-3 flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div>
              <h2 className="text-4xl font-black tracking-tight md:text-6xl">
                Pilih produkmu.
              </h2>
              <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-500 md:text-lg">
                Koleksi produk 3D printing KEILAB. Produk yang kamu upload dari
                Admin akan otomatis muncul di sini.
              </p>
            </div>

            <Link
              href="/catalog/clicker"
              className="w-fit rounded-full bg-zinc-950 px-6 py-3 font-bold text-white transition hover:bg-orange-500"
            >
              Custom Clicker
            </Link>
          </div>

          <div className="mt-10">
            {productsLoading ? (
              <div className="rounded-3xl border border-zinc-200 bg-[#faf9f7] p-12 text-center text-zinc-500">
                Memuat katalog...
              </div>
            ) : productsError ? (
              <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-600">
                Katalog belum dapat dimuat.
              </div>
            ) : products.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-zinc-300 bg-[#faf9f7] p-12 text-center">
                <h3 className="text-2xl font-black">Belum ada produk katalog</h3>
                <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                  Produk yang ditambahkan dari Admin → Katalog akan otomatis muncul di sini.
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
                      <Link href={`/catalog/product/${product.id}`} className="flex flex-1 flex-col">
                        <div className="relative aspect-square overflow-hidden bg-zinc-100">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.title}
                              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-6xl">📦</div>
                          )}
                          <div className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-xs font-black text-zinc-700 shadow-sm backdrop-blur">
                            {product.category}
                          </div>
                          <div className={`absolute right-4 top-4 rounded-full px-3 py-1.5 text-xs font-black shadow-sm ${outOfStock ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700"}`}>
                            {outOfStock ? "Habis" : `Stok ${product.stock}`}
                          </div>
                        </div>
                        <div className="flex flex-1 flex-col p-5 pb-2">
                          <h3 className="text-xl font-black">{product.title}</h3>
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
          </div>
        </div>
      </section>
      {/* HOW IT WORKS */}
      <section id="cara-kerja" className="bg-zinc-950 text-white">
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="max-w-2xl">
            <p className="font-bold uppercase tracking-widest text-orange-400">
              Cara kerja
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Dari ide jadi barang nyata.
            </h2>
          </div>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              [
                "01",
                "Pilih Produk",
                "Pilih clicker, keyboard, keycap, atau produk lainnya.",
              ],
              [
                "02",
                "Custom",
                "Pilih nama, warna, dan kombinasi desain yang kamu inginkan.",
              ],
              [
                "03",
                "Kami Print",
                "Desainmu diproses dan dicetak menggunakan 3D printer.",
              ],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-3xl border border-white/10 bg-white/5 p-7 transition hover:-translate-y-1 hover:bg-white/[0.08]"
              >
                <div className="text-5xl font-black text-orange-400">
                  {number}
                </div>

                <h3 className="mt-8 text-2xl font-black">{title}</h3>

                <p className="mt-3 leading-7 text-zinc-400">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT / CTA */}
      <section id="tentang" className="bg-orange-500">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <div className="mx-auto mb-7 flex h-14 w-[210px] items-center justify-center rounded-2xl bg-white/95 px-5 py-2 shadow-sm">
            <img
              src="/keilab-logo.svg"
              alt="KEILAB.ID"
              className="h-full w-full object-contain"
            />
          </div>
          <p className="font-bold uppercase tracking-widest text-orange-100">
            Tempat Ide Jadi Nyata
          </p>

          <h2 className="mt-3 text-4xl font-black tracking-tight text-white md:text-6xl">
            Siap bikin versi kamu?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-orange-100">
            Custom produk 3D kamu sendiri. Pilih warna, nama, dan desainnya.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            {[
              ["Instagram", storeSettings.instagramUrl],
              ["TikTok", storeSettings.tiktokUrl],
              ["Shopee", storeSettings.shopeeUrl],
            ].filter(([, url]) => Boolean(url)).map(([label, url]) => (
              <a key={label} href={url} target="_blank" rel="noreferrer" className="rounded-full border border-white/50 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-white hover:text-orange-600">
                {label} KEILAB ↗
              </a>
            ))}
          </div>

          <Link
            href="/customizer"
            className="mt-8 inline-block rounded-full bg-white px-8 py-4 font-black text-zinc-900 transition hover:scale-105"
          >
            Mulai Custom →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-zinc-950 px-6 py-8 text-center text-sm text-zinc-500">
        © 2026 KEILAB. Made with 3D printing.
      </footer>
    </main>
  );
}
