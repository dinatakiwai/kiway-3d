"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ProductPreview3D = dynamic(
  () => import("@/components/ProductPreview3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[300px] items-center justify-center rounded-3xl bg-zinc-100">
        <span className="text-sm font-semibold text-zinc-400">
          Menyiapkan 3D...
        </span>
      </div>
    ),
  }
);

const products = [
  {
    slug: "clicker",
    name: "Custom Clicker",
    category: "Custom 3D",
    price: "Mulai Rp35.000",
    description: "Clicker custom dengan nama dan kombinasi warna pilihanmu.",
    active: true,
    preview: true,
  },
  {
    slug: "keycap",
    name: "Custom Keycap",
    category: "Keyboard",
    price: "Coming Soon",
    description: "Keycap custom dengan warna dan desain sesuai keinginan.",
    active: false,
  },
  {
    slug: "name-tag",
    name: "Custom Name Tag",
    category: "Accessories",
    price: "Coming Soon",
    description: "Name tag 3D untuk tas, koper, kunci, dan berbagai kebutuhan.",
    active: false,
  },
  {
    slug: "phone-case",
    name: "Custom Phone Case",
    category: "Phone",
    price: "Coming Soon",
    description: "Case HP custom dengan desain 3D yang unik.",
    active: false,
  },
  {
    slug: "figurine",
    name: "Mini Figurine",
    category: "Figure",
    price: "Coming Soon",
    description: "Figurine mini untuk koleksi, dekorasi, atau hadiah.",
    active: false,
  },
  {
    slug: "desk-accessories",
    name: "Desk Accessories",
    category: "Desk",
    price: "Coming Soon",
    description: "Aksesori meja unik hasil 3D printing KIWAY.",
    active: false,
  },
];

export default function CatalogPage() {
  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <section className="mx-auto max-w-7xl px-6 pb-12 pt-16">
        <div className="max-w-2xl">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
            KIWAY 3D
          </p>

          <h1 className="text-4xl font-black tracking-tight text-zinc-900 md:text-6xl">
            Produk yang bisa
            <span className="text-orange-500"> kamu custom.</span>
          </h1>

          <p className="mt-5 text-base leading-7 text-zinc-500 md:text-lg">
            Pilih produk favoritmu dan buat sesuatu yang benar-benar punya kamu.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6">
        <div className="mb-8 flex flex-wrap gap-3">
          <button className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white">
            Semua
          </button>
          <button className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-orange-400 hover:text-orange-500">
            Accessories
          </button>
          <button className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-orange-400 hover:text-orange-500">
            Keyboard
          </button>
          <button className="rounded-full border border-zinc-200 bg-white px-5 py-2.5 text-sm font-semibold text-zinc-600 transition hover:border-orange-400 hover:text-orange-500">
            Custom
          </button>
        </div>

        <div className="grid gap-7 pb-20 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => {
            const card = (
              <article
                className={`overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm transition duration-300 ${
                  product.active
                    ? "cursor-pointer hover:-translate-y-1 hover:shadow-xl"
                    : ""
                }`}
              >
                {product.preview ? (
                  <ProductPreview3D />
                ) : (
                  <div className="flex h-[300px] items-center justify-center bg-zinc-100">
                    <div className="text-center">
                      <div className="text-5xl font-black text-zinc-300">3D</div>
                      <p className="mt-3 rounded-full bg-white px-4 py-2 text-xs font-bold text-zinc-400 shadow-sm">
                        COMING SOON
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <p className="text-xs font-bold uppercase tracking-wider text-orange-500">
                    {product.category}
                  </p>

                  <h2 className="mt-2 text-2xl font-black text-zinc-900">
                    {product.name}
                  </h2>

                  <p className="mt-2 min-h-[48px] text-sm leading-6 text-zinc-500">
                    {product.description}
                  </p>

                  <div className="mt-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs text-zinc-400">Harga</p>
                      <p className="font-bold text-zinc-900">{product.price}</p>
                    </div>

                    {product.active ? (
                      <span className="rounded-full bg-zinc-900 px-5 py-3 text-sm font-bold text-white transition group-hover:bg-orange-500">
                        Lihat Detail
                      </span>
                    ) : (
                      <span className="rounded-full bg-zinc-100 px-5 py-3 text-sm font-bold text-zinc-400">
                        Segera
                      </span>
                    )}
                  </div>
                </div>
              </article>
            );

            if (!product.active) {
              return <div key={product.slug}>{card}</div>;
            }

            return (
              <Link
                key={product.slug}
                href={`/catalog/${product.slug}`}
                className="group block rounded-[2rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-4"
              >
                {card}
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
