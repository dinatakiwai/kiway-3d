"use client";


import Link from "next/link";
import dynamic from "next/dynamic";

const ProductPreview3D = dynamic(
  () => import("@/components/ProductPreview3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[520px] items-center justify-center rounded-[2rem] bg-zinc-100">
        <span className="text-sm font-semibold text-zinc-400">
          Menyiapkan 3D...
        </span>
      </div>
    ),
  }
);

const features = [
  "Nama custom hingga 10 karakter",
  "Pilih warna base",
  "Pilih warna setiap keycap",
  "Preview 3D secara langsung",
];

export default function ClickerProductPage() {
  return (
    <main className="min-h-screen bg-[#faf9f7]">
      <section className="mx-auto max-w-7xl px-6 pb-20 pt-10">
        <Link
          href="/catalog"
          className="inline-flex items-center text-sm font-semibold text-zinc-500 transition hover:text-orange-500"
        >
          ← Kembali ke Catalog
        </Link>

        <div className="mt-8 grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          {/* 3D Preview */}
          <div className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm">
            <ProductPreview3D />
          </div>

          {/* Product Information */}
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.25em] text-orange-500">
              Custom 3D
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-900 md:text-5xl">
              Custom Clicker
            </h1>

            <p className="mt-5 text-base leading-7 text-zinc-500">
              Buat clicker yang benar-benar punya kamu. Masukkan nama,
              pilih kombinasi warna, lalu lihat hasilnya langsung dalam
              preview 3D.
            </p>

            <div className="mt-8">
              <p className="text-sm font-medium text-zinc-400">
                Mulai dari
              </p>
              <p className="text-3xl font-black text-zinc-900">
                Rp54.000
              </p>
            </div>

            <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
              <p className="font-bold text-zinc-900">
                Kamu bisa custom:
              </p>

              <ul className="mt-4 space-y-3">
                {features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-center gap-3 text-sm text-zinc-600"
                  >
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-orange-500">
                      ✓
                    </span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <Link
              href="/customizer"
              className="mt-8 flex w-full items-center justify-center rounded-full bg-zinc-900 px-7 py-4 text-base font-bold text-white transition hover:bg-orange-500"
            >
              ✨ Customize Sekarang
            </Link>

            <p className="mt-4 text-center text-xs text-zinc-400">
              Setelah memilih Customize, kamu bisa mengatur nama dan
              warna produk sebelum melakukan pemesanan.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
