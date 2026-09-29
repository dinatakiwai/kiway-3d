"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STORE } from "@/lib/store";

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
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

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!params?.id) return;

      setLoading(true);
      setError("");

      const { data, error: fetchError } = await supabase
        .from("products")
        .select(
          "id, title, image_url, price, stock, category, description, is_active"
        )
        .eq("id", params.id)
        .eq("is_active", true)
        .maybeSingle();

      if (fetchError) {
        setError(fetchError.message);
      } else if (!data) {
        setError("Produk tidak ditemukan atau sudah tidak tersedia.");
      } else {
        setProduct(data as Product);
      }

      setLoading(false);
    }

    loadProduct();
  }, [params?.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-6 py-20">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-5 w-28 rounded bg-zinc-200" />
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div className="aspect-square rounded-[2rem] bg-zinc-200" />
            <div>
              <div className="h-10 w-2/3 rounded bg-zinc-200" />
              <div className="mt-5 h-8 w-40 rounded bg-zinc-200" />
              <div className="mt-8 h-32 rounded bg-zinc-200" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error || !product) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-6 py-20">
        <div className="mx-auto max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-10 text-center">
          <div className="text-5xl">😕</div>
          <h1 className="mt-5 text-2xl font-black">Produk tidak tersedia</h1>
          <p className="mt-3 text-sm leading-6 text-zinc-500">
            {error || "Produk tidak ditemukan."}
          </p>
          <Link
            href="/catalog"
            className="mt-7 inline-flex rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white hover:bg-orange-500"
          >
            ← Kembali ke Katalog
          </Link>
        </div>
      </main>
    );
  }

  const outOfStock = Number(product.stock) <= 0;

  const whatsappMessage = [
    "Halo KEILAB 👋",
    "",
    `Saya ingin memesan: ${product.title}`,
    `Harga: ${formatRupiah(Number(product.price))}`,
    `Stok: ${Number(product.stock)}`,
    "",
    "Mohon info cara pemesanannya.",
  ].join("\n");

  const whatsapp = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
    whatsappMessage
  )}`;

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Link
          href="/catalog"
          className="text-sm font-bold text-zinc-500 hover:text-orange-500"
        >
          ← Kembali ke Katalog
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-[1.05fr_.95fr] md:items-start">
          <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
            <div className="aspect-square bg-zinc-100">
              {product.image_url ? (
                <img
                  src={product.image_url}
                  alt={product.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center text-8xl">
                  📦
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-9">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-600">
                {product.category}
              </span>
              <span
                className={`rounded-full px-3 py-1.5 text-xs font-black ${
                  outOfStock
                    ? "bg-red-50 text-red-600"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {outOfStock ? "Stok Habis" : `Stok ${product.stock}`}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">
              {product.title}
            </h1>

            <p className="mt-5 text-3xl font-black">
              {formatRupiah(Number(product.price))}
            </p>

            <div className="my-8 h-px bg-zinc-200" />

            <div>
              <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">
                Deskripsi Produk
              </h2>
              <p className="mt-3 whitespace-pre-line text-base leading-7 text-zinc-600">
                {product.description || "Produk 3D printing KEILAB."}
              </p>
            </div>

            <div className="mt-8 rounded-2xl bg-zinc-50 p-5">
              <h3 className="font-black">Informasi Produk</h3>
              <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-zinc-400">Kategori</p>
                  <p className="mt-1 font-bold">{product.category}</p>
                </div>
                <div>
                  <p className="text-zinc-400">Ketersediaan</p>
                  <p className="mt-1 font-bold">
                    {outOfStock ? "Habis" : `${product.stock} pcs`}
                  </p>
                </div>
              </div>
            </div>

            <a
              href={outOfStock ? undefined : whatsapp}
              target={outOfStock ? undefined : "_blank"}
              rel={outOfStock ? undefined : "noreferrer"}
              className={`mt-8 flex w-full items-center justify-center rounded-xl px-5 py-4 text-base font-black transition ${
                outOfStock
                  ? "cursor-not-allowed bg-zinc-100 text-zinc-400"
                  : "bg-zinc-950 text-white hover:bg-orange-500"
              }`}
            >
              {outOfStock ? "Stok Habis" : "💬 Pesan Produk via WhatsApp"}
            </a>

            <p className="mt-3 text-center text-xs leading-5 text-zinc-400">
              Pemesanan produk akan diarahkan ke WhatsApp KEILAB.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
