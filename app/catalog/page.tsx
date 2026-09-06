"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ProductPreview3D = dynamic(
  () => import("@/components/ProductPreview3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center bg-zinc-100">
        <span className="text-sm font-semibold text-zinc-400">
          Menyiapkan 3D...
        </span>
      </div>
    ),
  }
);

const products = [
  {
    name: "Custom Clicker",
    category: "Custom 3D",
    price: "Mulai Rp54.000",
    description: "Clicker custom dengan nama dan pilihan warna.",
    active: true,
  },
  {
    name: "Custom Keycap",
    category: "Keyboard",
    price: "Coming Soon",
    description: "Keycap custom dengan desain dan warna pilihanmu.",
    active: false,
  },
  {
    name: "Custom Name Tag",
    category: "Accessories",
    price: "Coming Soon",
    description: "Name tag 3D custom untuk tas, koper, dan lainnya.",
    active: false,
  },
  {
    name: "Custom Phone Case",
    category: "Phone",
    price: "Coming Soon",
    description: "Case HP dengan desain 3D yang unik.",
    active: false,
  },
  {
    name: "Mini Figurine",
    category: "Figure",
    price: "Coming Soon",
    description: "Figurine mini custom untuk koleksi atau hadiah.",
    active: false,
  },
  {
    name: "Desk Accessories",
    category: "Desk",
    price: "Coming Soon",
    description: "Berbagai aksesori meja hasil 3D printing.",
    active: false,
  },
];

function ProductIcon({ name }: { name: string }) {
  return (
    <div className="text-center">
      <div className="mb-3 text-6xl">
        {name === "Custom Keycap"
          ? "🔤"
          : name === "Custom Name Tag"
          ? "🏷️"
          : name === "Custom Phone Case"
          ? "📱"
          : name === "Mini Figurine"
          ? "🧸"
          : "🖥️"}
      </div>
    </div>
  );
}

export default function CatalogPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-12">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em] text-zinc-500">
            KIWAY 3D
          </p>
          <h1 className="text-4xl font-bold tracking-tight text-zinc-900 md:text-5xl">
            Our Catalog
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-zinc-500">
            Temukan berbagai produk 3D print unik dari KIWAY. Custom sesuai
            keinginanmu.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.name}
              className="group overflow-hidden rounded-3xl border border-zinc-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="relative flex h-64 items-center justify-center overflow-hidden bg-zinc-100">
                {product.name === "Custom Clicker" ? (
                  <div className="h-[300px] w-full">
                    <ProductPreview3D />
                  </div>
                ) : (
                  <ProductIcon name={product.name} />
                )}

                {!product.active && (
                  <span className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-zinc-900 px-3 py-1 text-xs font-medium text-white">
                    COMING SOON
                  </span>
                )}
              </div>

              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  {product.category}
                </p>
                <h2 className="mt-2 text-xl font-bold text-zinc-900">
                  {product.name}
                </h2>
                <p className="mt-2 min-h-[48px] text-sm leading-6 text-zinc-500">
                  {product.description}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="font-semibold text-zinc-900">
                    {product.price}
                  </span>

                  {product.active ? (
                    <Link
                      href="/catalog/clicker"
                      className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
                    >
                      Lihat Produk
                    </Link>
                  ) : (
                    <button
                      disabled
                      className="cursor-not-allowed rounded-xl bg-zinc-100 px-4 py-2.5 text-sm font-semibold text-zinc-400"
                    >
                      Segera
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
