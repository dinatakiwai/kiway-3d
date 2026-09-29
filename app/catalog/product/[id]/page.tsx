"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { STORE } from "@/lib/store";
import { addToCart } from "@/lib/cart";

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  stock: number;
  category: string;
  description: string | null;
};

function rupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [product, setProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      if (!params?.id) return;

      const { data, error } = await supabase.rpc(
        "get_public_catalog_product",
        { p_id: params.id }
      );

      if (error) {
        setError(error.message);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) setError("Produk tidak ditemukan atau sudah tidak tersedia.");
        else setProduct(row as Product);
      }

      setLoading(false);
    }

    load();
  }, [params?.id]);

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-6 py-20">
        <div className="mx-auto max-w-6xl animate-pulse">
          <div className="h-6 w-40 rounded bg-zinc-200" />
          <div className="mt-8 grid gap-10 md:grid-cols-2">
            <div className="aspect-square rounded-[2rem] bg-zinc-200" />
            <div className="h-96 rounded-[2rem] bg-zinc-200" />
          </div>
        </div>
      </main>
    );
  }

  if (!product || error) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-6 py-20">
        <div className="mx-auto max-w-xl rounded-[2rem] bg-white p-10 text-center">
          <div className="text-5xl">😕</div>
          <h1 className="mt-5 text-2xl font-black">Produk tidak tersedia</h1>
          <p className="mt-3 text-sm text-zinc-500">{error}</p>
          <Link href="/catalog" className="mt-7 inline-flex rounded-full bg-zinc-950 px-6 py-3 font-bold text-white">
            ← Kembali ke Katalog
          </Link>
        </div>
      </main>
    );
  }

  const currentProduct = product;

  const stock = Number(currentProduct.stock);
  const outOfStock = stock <= 0;
  const maxQty = Math.max(1, stock);

  function addProductToCart() {
    if (outOfStock) return;

    setAdding(true);

    addToCart({
      product: "catalog",
      productId: currentProduct.id,
      name: currentProduct.title,
      letters: [],
      baseColor: "",
      letterColors: {},
      price: Number(currentProduct.price),
      quantity,
      imageUrl: currentProduct.image_url,
      // Sementara default paket katalog 500g.
      // Nanti bisa diganti per produk dari Admin Catalog.
      shippingWeightGram: 500,
      shippingLengthCm: 20,
      shippingWidthCm: 20,
      shippingHeightCm: 10,
    });

    setTimeout(() => {
      router.push("/cart");
    }, 150);
  }

  const whatsappText = `Halo ${STORE.name} 👋

Saya ingin bertanya tentang produk:
${currentProduct.title}

Harga: ${rupiah(Number(currentProduct.price))}
Stok: ${stock} pcs`;

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Link href="/catalog" className="text-sm font-bold text-zinc-500 hover:text-orange-500">
          ← Kembali ke Katalog
        </Link>

        <div className="mt-8 grid gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
            <div className="aspect-square bg-zinc-100">
              {currentProduct.image_url ? (
                <img src={currentProduct.image_url} alt={currentProduct.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-8xl">📦</div>
              )}
            </div>
          </div>

          <div className="rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-9">
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-black text-orange-600">
                {currentProduct.category}
              </span>
              <span className={`rounded-full px-3 py-1.5 text-xs font-black ${outOfStock ? "bg-red-50 text-red-600" : "bg-green-50 text-green-700"}`}>
                {outOfStock ? "Stok Habis" : `Stok ${stock}`}
              </span>
            </div>

            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">{currentProduct.title}</h1>
            <p className="mt-5 text-3xl font-black">{rupiah(Number(currentProduct.price))}</p>

            <div className="my-8 h-px bg-zinc-200" />

            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">
              Deskripsi Produk
            </h2>
            <p className="mt-3 whitespace-pre-line leading-7 text-zinc-600">
              {currentProduct.description || "Produk 3D printing KEILAB."}
            </p>

            {!outOfStock && (
              <div className="mt-8">
                <p className="text-sm font-bold">Jumlah</p>
                <div className="mt-2 flex w-fit items-center overflow-hidden rounded-xl border border-zinc-200">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-5 py-3 font-black">
                    −
                  </button>
                  <span className="min-w-12 text-center font-black">{quantity}</span>
                  <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} className="px-5 py-3 font-black">
                    +
                  </button>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={outOfStock || adding}
              onClick={addProductToCart}
              className="mt-8 w-full rounded-xl bg-orange-500 px-5 py-4 font-black text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-zinc-100 disabled:text-zinc-400"
            >
              {outOfStock ? "Stok Habis" : adding ? "Menambahkan..." : "🛒 Tambah ke Keranjang"}
            </button>

            <a
              href={`https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-200 px-5 py-4 font-black hover:bg-zinc-50"
            >
              💬 Tanya via WhatsApp
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
