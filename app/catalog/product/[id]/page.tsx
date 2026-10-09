"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useStoreSettings } from "@/lib/useStoreSettings";
import { addToCart } from "@/lib/cart";

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  image_urls?: string[] | null;
  video_urls?: string[] | null;
  option_groups?: ProductOptionGroup[] | null;
  price: number;
  stock: number;
  category: string;
  description: string | null;
};

type ProductOptionChoice = { label: string; price: number; stock: number | null; imageUrl?: string | null };
type ProductOptionGroup = { id: string; name: string; priceMode?: "add" | "set"; choices: ProductOptionChoice[] };

function DescriptionWithLinks({ text }: { text: string }) {
  const urlPattern = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const parts = text.split(urlPattern);
  return <>{parts.map((part, index) => {
    if (!/^(https?:\/\/|www\.)/i.test(part)) return <span key={index}>{part}</span>;
    const cleanUrl = part.replace(/[),.!?;:]+$/, "");
    const suffix = part.slice(cleanUrl.length);
    const href = cleanUrl.startsWith("www.") ? `https://${cleanUrl}` : cleanUrl;
    return <span key={index}><a href={href} target="_blank" rel="noreferrer" className="font-semibold text-orange-600 underline underline-offset-2">{cleanUrl}</a>{suffix}</span>;
  })}</>;
}

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
  const [activeMedia, setActiveMedia] = useState(-1);
  const [selectedChoices, setSelectedChoices] = useState<Record<string, string>>({});
  const [shareMessage, setShareMessage] = useState("");
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const storeSettings = useStoreSettings();

  useEffect(() => {
    async function load() {
      if (!params?.id) return;

      const { data, error } = await supabase.rpc(
        "get_public_catalog_product_gallery",
        { p_id: params.id }
      );

      if (error) {
        setError(error.message);
      } else {
        const row = Array.isArray(data) ? data[0] : data;
        if (!row) setError("Produk tidak ditemukan atau sudah tidak tersedia.");
        else {
          const loaded = row as Product;
          setProduct(loaded);
          setSelectedChoices(Object.fromEntries((loaded.option_groups ?? []).map((group) => [group.id, (group.choices ?? []).find((choice) => choice.stock == null || choice.stock > 0)?.label ?? ""])));
        }
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
  const photos = (currentProduct.image_urls?.length ? currentProduct.image_urls : currentProduct.image_url ? [currentProduct.image_url] : []).slice(0, 4);
  const videos = (currentProduct.video_urls ?? []).slice(0, 4);
  const media = [...photos.map((url) => ({ type: "image" as const, url })), ...videos.map((url) => ({ type: "video" as const, url }))];
  const groups = currentProduct.option_groups ?? [];
  const selectedOptions = groups.map((group) => ({
    groupName: group.name,
    choiceLabel: selectedChoices[group.id] ?? "",
    price: Number(group.choices.find((choice) => choice.label === selectedChoices[group.id])?.price ?? 0),
    priceMode: group.priceMode === "set" ? "set" as const : "add" as const,
    imageUrl: group.choices.find((choice) => choice.label === selectedChoices[group.id])?.imageUrl ?? null,
  }));
  const fixedPrice = selectedOptions.find((item) => item.priceMode === "set" && item.choiceLabel)?.price;
  const variantPrice = (fixedPrice ?? Number(currentProduct.price)) + selectedOptions.filter((item) => item.priceMode === "add").reduce((total, item) => total + (item.choiceLabel ? item.price : 0), 0);
  const selectedVariantImage = selectedOptions.find((item) => item.imageUrl)?.imageUrl ?? null;
  const selectedStocks = groups.map((group) => group.choices.find((choice) => choice.label === selectedChoices[group.id])?.stock).filter((value): value is number => typeof value === "number");
  const stock = Math.min(Number(currentProduct.stock), ...(selectedStocks.length ? selectedStocks : [Number(currentProduct.stock)]));
  const missingOption = groups.some((group) => !group.choices.some((choice) => choice.label === selectedChoices[group.id] && choice.stock !== 0));
  const outOfStock = stock <= 0 || missingOption;
  const maxQty = Math.max(1, stock);
  const activeMediaItem = activeMedia === -1 && selectedVariantImage
    ? { type: "image" as const, url: selectedVariantImage }
    : media[Math.max(0, Math.min(activeMedia, media.length - 1))];

  async function shareProduct() {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: currentProduct.title, text: `Lihat ${currentProduct.title} di KEILAB`, url });
      else {
        await navigator.clipboard.writeText(url);
        setShareMessage("Link produk disalin.");
      }
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") setShareMessage("Link belum bisa dibagikan. Coba salin alamat halaman ini.");
    }
  }

  async function copyProductLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareMessage("Link produk disalin.");
    } catch {
      setShareMessage("Browser belum mengizinkan menyalin link. Salin alamat halaman dari kolom browser.");
    }
  }

  function addProductToCart() {
    if (outOfStock) return;

    setAdding(true);

    addToCart({
      product: "catalog",
      productId: currentProduct.id,
      name: currentProduct.title,
      letters: [],
      baseColor: "",
      capColors: {},
      fontColors: {},
      price: variantPrice,
      quantity,
      imageUrl: currentProduct.image_url,
      selectedOptions,
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

  const whatsappText = `${storeSettings.whatsappGreeting}

Produk: ${currentProduct.title}
Harga: ${rupiah(variantPrice)}
Stok: ${stock} pcs`;

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <section className="mx-auto max-w-6xl px-6 py-10 md:py-14">
        <Link href="/catalog" className="text-sm font-bold text-zinc-500 hover:text-orange-500">
          ← Kembali ke Katalog
        </Link>

        <div className="mt-8 grid items-start gap-10 md:grid-cols-2">
          <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm">
            <div className="aspect-square bg-zinc-100">
              {activeMediaItem ? (
                activeMediaItem.type === "video" ? (
                  <video src={activeMediaItem.url} poster={photos[0]} controls playsInline className="h-full w-full object-contain" />
                ) : <img src={activeMediaItem.url} alt={`${currentProduct.title} ${activeMedia === -1 ? selectedOptions.find((item) => item.imageUrl)?.choiceLabel ?? "" : activeMedia + 1}`} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-8xl">📦</div>
              )}
            </div>
            {media.length > 1 && <div className="flex gap-2 overflow-x-auto p-3">
              {media.map((item, index) => <button key={`${item.url}-${index}`} type="button" onClick={() => setActiveMedia(index)} aria-label={item.type === "video" ? `Putar video ${index - photos.length + 1}` : `Lihat foto ${index + 1}`} className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${activeMedia === index ? "border-orange-500" : "border-transparent"}`}>
                {item.type === "video" ? <><video src={item.url} muted className="h-full w-full object-cover" /><span className="absolute inset-0 grid place-items-center bg-black/25 text-white">▶</span></> : <img src={item.url} alt={`${currentProduct.title} ${index + 1}`} className="h-full w-full object-cover" />}
              </button>)}
            </div>}
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
            <p className="mt-5 text-3xl font-black">{rupiah(variantPrice)}</p>

            <div className="my-8 h-px bg-zinc-200" />

            <h2 className="text-sm font-black uppercase tracking-[0.16em] text-zinc-400">
              Deskripsi Produk
            </h2>
<p className={`mt-3 whitespace-pre-line leading-7 text-zinc-600 ${descriptionExpanded ? "" : "line-clamp-2"}`}>
              <DescriptionWithLinks text={currentProduct.description || "Produk 3D printing KEILAB."} />
            </p>
            {currentProduct.description && currentProduct.description.length > 100 && <button type="button" onClick={() => setDescriptionExpanded((expanded) => !expanded)} className="mt-2 text-sm font-bold text-orange-600 hover:text-orange-700">
              {descriptionExpanded ? "Tampilkan lebih sedikit" : "Baca selengkapnya"}
            </button>}

            {groups.map((group) => (
              <fieldset key={group.id} className="mt-6">
                <legend className="text-sm font-black uppercase tracking-wide">{group.name}</legend>
                <div className="mt-3 flex flex-wrap gap-2">
                  {group.choices.map((choice) => {
                    const selected = selectedChoices[group.id] === choice.label;
                    const unavailable = typeof choice.stock === "number" && choice.stock <= 0;
                    return <button key={choice.label} type="button" disabled={unavailable} onClick={() => { setSelectedChoices((current) => ({ ...current, [group.id]: choice.label })); setActiveMedia(choice.imageUrl ? -1 : 0); setQuantity(1); }} className={`flex min-w-[118px] items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-bold transition ${selected ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-100" : "border-zinc-200 hover:border-orange-300"} disabled:cursor-not-allowed disabled:opacity-40`}>
                      {choice.imageUrl && <img src={choice.imageUrl} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />}
                      <span><span className="block">{choice.label}</span><span className="mt-1 block text-[11px] font-semibold text-zinc-500">{group.priceMode === "set" ? rupiah(choice.price) : choice.price > 0 ? `+${rupiah(choice.price)}` : "Harga dasar"}{typeof choice.stock === "number" ? ` · Stok ${choice.stock}` : ""}</span></span>
                    </button>;
                  })}
                </div>
              </fieldset>
            ))}

            {!outOfStock && (
              <div className="mt-8">
                <p className="text-sm font-bold">Jumlah</p>
                <div className="mt-2 flex w-fit items-center overflow-hidden rounded-xl border border-zinc-200">
                  <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-5 py-3 font-black">
                    −
                  </button>
                  <span className="min-w-12 text-center font-black">{quantity}</span>
              <button type="button" onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))} disabled={quantity >= maxQty} className="px-5 py-3 font-black disabled:opacity-30">
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
              href={`https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(whatsappText)}`}
              target="_blank"
              rel="noreferrer"
              className="mt-3 flex w-full items-center justify-center rounded-xl border border-zinc-200 px-5 py-4 font-black hover:bg-zinc-50"
            >
              💬 Tanya via WhatsApp
            </a>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" onClick={shareProduct} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold hover:bg-zinc-50">↗ Bagikan</button>
              <button type="button" onClick={copyProductLink} className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-bold hover:bg-zinc-50">⧉ Salin link</button>
            </div>
            {shareMessage && <p role="status" className="mt-2 text-center text-xs font-semibold text-green-700">{shareMessage}</p>}
          </div>
        </div>
      </section>
    </main>
  );
}
