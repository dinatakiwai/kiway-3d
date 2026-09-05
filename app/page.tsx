"use client";

import Link from "next/link";

const products = [
  {
    name: "Custom Clicker",
    description: "Clicker nama dengan warna sesuai pilihanmu.",
    price: "Mulai Rp49.000",
    icon: "🖱️",
  },
  {
    name: "Mini Keyboard",
    description: "Keyboard mini custom untuk meja kerja kamu.",
    price: "Mulai Rp79.000",
    icon: "⌨️",
  },
  {
    name: "Custom Keycap",
    description: "Keycap unik dengan nama dan warna pilihan.",
    price: "Mulai Rp19.000",
    icon: "🔤",
  },
  {
    name: "Name Keychain",
    description: "Gantungan nama 3D yang bisa kamu desain sendiri.",
    price: "Mulai Rp15.000",
    icon: "🔑",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 md:grid-cols-2 md:py-28">
          <div>
            <div className="mb-6 inline-flex rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-medium text-orange-600">
              ✨ Custom 3D Printing
            </div>

            <h1 className="max-w-3xl text-5xl font-black leading-[1.05] tracking-tight md:text-7xl">
              Bikin sesuatu yang{" "}
              <span className="text-orange-500">punya kamu.</span>
            </h1>

            <p className="mt-7 max-w-xl text-lg leading-8 text-zinc-600">
              Custom clicker, mini keyboard, keycap, dan berbagai produk
              3D printing sesuai warna, nama, dan gaya yang kamu suka.
            </p>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/customizer"
                className="rounded-full bg-zinc-900 px-7 py-4 text-center font-bold text-white transition hover:-translate-y-0.5 hover:bg-orange-500"
              >
                🎨 Mulai Custom
              </Link>

              <Link
                href="/catalog"
                className="rounded-full border border-zinc-300 bg-white px-7 py-4 text-center font-bold transition hover:border-zinc-900"
              >
                Lihat Produk
              </Link>
            </div>
          </div>

          {/* HERO PRODUCT */}
          <div className="relative">
            <div className="absolute -inset-10 rounded-full bg-orange-200/40 blur-3xl" />

            <div className="relative mx-auto max-w-lg rotate-2 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-2xl">
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
                      key={index}
                      className={`flex h-20 w-20 items-center justify-center rounded-2xl border-b-4 text-3xl font-black shadow-lg ${
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
        <div className="mx-auto max-w-7xl px-6 py-20">
          <div className="mb-12">
            <p className="font-bold uppercase tracking-widest text-orange-500">
              Produk
            </p>

            <h2 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">
              Produk yang bisa kamu custom
            </h2>

            <p className="mt-4 max-w-2xl text-zinc-500">
              Pilih produk, tentukan desainmu, lalu biarkan kami
              mencetaknya menjadi barang nyata.
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {products.map((product) => (
              <Link
                href="/customizer"
                key={product.name}
                className="group rounded-3xl border border-zinc-200 bg-[#faf9f7] p-5 transition duration-300 hover:-translate-y-1 hover:border-orange-300 hover:shadow-xl"
              >
                <div className="flex aspect-square items-center justify-center rounded-2xl bg-zinc-100 text-7xl transition group-hover:scale-[1.02]">
                  {product.icon}
                </div>

                <h3 className="mt-5 text-xl font-black">
                  {product.name}
                </h3>

                <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">
                  {product.description}
                </p>

                <div className="mt-5 flex items-center justify-between">
                  <span className="text-sm font-bold">
                    {product.price}
                  </span>

                  <span className="text-orange-500 transition group-hover:translate-x-1">
                    →
                  </span>
                </div>
              </Link>
            ))}
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
              ["01", "Pilih Produk", "Pilih clicker, keyboard, keycap, atau produk lainnya."],
              ["02", "Custom", "Pilih nama, warna, dan kombinasi desain yang kamu inginkan."],
              ["03", "Kami Print", "Desainmu diproses dan dicetak menggunakan 3D printer."],
            ].map(([number, title, description]) => (
              <div
                key={number}
                className="rounded-3xl border border-white/10 bg-white/5 p-7"
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

      {/* CTA */}
      <section id="tentang" className="bg-orange-500">
        <div className="mx-auto max-w-7xl px-6 py-20 text-center">
          <h2 className="text-4xl font-black tracking-tight text-white md:text-6xl">
            Siap bikin versi kamu?
          </h2>

          <p className="mx-auto mt-5 max-w-xl text-orange-100">
            Custom produk 3D kamu sendiri. Pilih warna, nama, dan desainnya.
          </p>

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
        © 2026 KIWAY. Made with 3D printing.
      </footer>
    </main>
  );
}
