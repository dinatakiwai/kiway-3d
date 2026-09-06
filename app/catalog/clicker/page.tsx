"use client";

import dynamic from "next/dynamic";
import Link from "next/link";

const ProductPreview3D = dynamic(
  () => import("@/components/ProductPreview3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[460px] items-center justify-center rounded-3xl bg-zinc-100">
        <span className="text-sm font-semibold text-zinc-400">
          Menyiapkan 3D...
        </span>
      </div>
    ),
  }
);

export default function ClickerProductPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-5 py-10 md:px-8 md:py-14">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/catalog"
          className="mb-8 inline-flex items-center gap-2 text-sm font-semibold text-zinc-500 transition hover:text-zinc-900"
        >
          ← Kembali ke Catalog
        </Link>

        <section className="grid overflow-hidden rounded-[2rem] border border-zinc-200 bg-white shadow-sm lg:grid-cols-2">
          <div className="flex min-h-[460px] items-center justify-center bg-zinc-100 p-4 md:p-8">
            <div className="h-[460px] w-full">
              <ProductPreview3D />
            </div>
          </div>

          <div className="flex flex-col justify-center p-7 md:p-10 lg:p-12">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-zinc-400">
              CUSTOM 3D
            </p>

            <h1 className="mt-3 text-4xl font-black tracking-tight text-zinc-950 md:text-5xl">
              Custom Clicker
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-zinc-500">
              Clicker custom dengan nama pilihanmu. Pilih nama, warna base,
              dan warna setiap huruf, lalu lihat hasilnya langsung dalam
              preview 3D.
            </p>

            <div className="mt-7">
              <p className="text-sm font-medium text-zinc-400">
                Harga mulai
              </p>
              <p className="mt-1 text-3xl font-black text-zinc-950">
                Rp54.000
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Harga menyesuaikan jumlah huruf.
              </p>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-bold text-zinc-900">01</p>
                <p className="mt-1 text-sm text-zinc-500">Tulis nama</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-bold text-zinc-900">02</p>
                <p className="mt-1 text-sm text-zinc-500">Pilih warna</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-bold text-zinc-900">03</p>
                <p className="mt-1 text-sm text-zinc-500">Lihat preview 3D</p>
              </div>
              <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
                <p className="text-sm font-bold text-zinc-900">04</p>
                <p className="mt-1 text-sm text-zinc-500">Tambah ke keranjang</p>
              </div>
            </div>

            <Link
              href="/customizer"
              className="mt-8 inline-flex w-full items-center justify-center rounded-2xl bg-zinc-950 px-6 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              Custom Sekarang →
            </Link>

            <p className="mt-4 text-center text-xs text-zinc-400">
              Dibuat sesuai pesanan • 3D printed by KIWAY
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
