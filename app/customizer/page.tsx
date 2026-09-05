"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart";
import { getClickerPrice } from "@/lib/pricing";

const Clicker3D = dynamic(
  () => import("@/components/Clicker3D"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-[480px] items-center justify-center rounded-[1.5rem] bg-zinc-100">
        <p className="text-sm font-semibold text-zinc-400">Menyiapkan 3D...</p>
      </div>
    ),
  }
);

type ColorOption = { name: string; value: string };

const colors: ColorOption[] = [
  { name: "Putih", value: "#ffffff" },
  { name: "Hitam", value: "#18181b" },
  { name: "Merah", value: "#ef4444" },
  { name: "Orange", value: "#f97316" },
  { name: "Kuning", value: "#facc15" },
  { name: "Hijau", value: "#22c55e" },
  { name: "Biru", value: "#3b82f6" },
  { name: "Ungu", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
];

export default function CustomizerPage() {
  const router = useRouter();
  const [name, setName] = useState("RAHMA");
  const [baseColor, setBaseColor] = useState("#ffffff");
  const [letterColors, setLetterColors] = useState<Record<number, string>>({
    0: "#ef4444",
    1: "#18181b",
    2: "#ef4444",
    3: "#ec4899",
    4: "#3b82f6",
  });
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);

  const cleanName = useMemo(
    () => name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 12),
    [name]
  );

  const letters = cleanName.replace(/ /g, "").split("");
  const totalPrice = getClickerPrice(letters.length);

  function changeLetterColor(index: number, color: string) {
    setLetterColors((current) => ({ ...current, [index]: color }));
  }

  function addCurrentToCart() {
    if (!cleanName) {
      alert("Masukkan nama clicker terlebih dahulu.");
      return;
    }

    addToCart({
      product: "clicker",
      name: cleanName.replace(/ /g, ""),
      letters,
      baseColor,
      letterColors: { ...letterColors },
      price: totalPrice,
      quantity: 1,
    });

    router.push("/cart");
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <nav className="border-b border-zinc-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">
            KIWAY<span className="text-orange-500">.</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className="hidden text-sm font-semibold text-zinc-500 hover:text-zinc-900 sm:block">
              ← Kembali
            </Link>
            <Link
              href="/cart"
              className="rounded-full bg-zinc-100 px-4 py-2 text-sm font-bold hover:bg-zinc-200"
            >
              🛒 Keranjang
            </Link>
          </div>
        </div>
      </nav>

      <section className="mx-auto max-w-7xl px-6 pb-5 pt-10">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
          Product Customizer
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
          Custom Clicker
        </h1>
        <p className="mt-3 max-w-2xl text-zinc-500">
          Buat clicker dengan nama dan kombinasi warna pilihanmu sendiri.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-20">
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Live Preview
                </p>
                <p className="mt-1 text-sm font-semibold">
                  Klik huruf untuk mengganti warnanya
                </p>
              </div>
              <span className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600">
                3D PRINT
              </span>
            </div>

            <div className="relative mt-6 overflow-hidden rounded-[1.5rem]">
              <div className="absolute right-5 top-5 z-10 rounded-full bg-white/90 px-4 py-2 text-xs font-bold text-zinc-500 shadow-sm backdrop-blur">
                🖱️ DRAG TO ROTATE
              </div>
              <Clicker3D
                letters={letters}
                baseColor={baseColor}
                letterColors={letterColors}
                selectedLetter={selectedLetter}
                onSelectLetter={setSelectedLetter}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-400">Nama</p>
                <p className="mt-1 font-black">{cleanName || "-"}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-400">Jumlah huruf</p>
                <p className="mt-1 font-black">{letters.length}</p>
              </div>
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-400">Material</p>
                <p className="mt-1 font-black">PLA</p>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm md:p-7 lg:sticky lg:top-6">
            <div>
              <label className="text-sm font-black">1. Nama Clicker</label>
              <div className="relative mt-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: RAHMA"
                  maxLength={12}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 text-lg font-black uppercase outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  {cleanName.length}/12
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">Maksimal 12 karakter.</p>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black">2. Warna Base</label>
                <span className="text-xs font-semibold text-zinc-400">
                  {colors.find((c) => c.value === baseColor)?.name}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-3">
                {colors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    onClick={() => {
                      setSelectedLetter(null);
                      setBaseColor(color.value);
                    }}
                    className={`h-11 w-11 rounded-full border-2 transition hover:scale-110 ${
                      baseColor === color.value && selectedLetter === null
                        ? "scale-110 border-orange-500 ring-4 ring-orange-100"
                        : "border-zinc-200"
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-8">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black">3. Warna Setiap Huruf</label>
                {selectedLetter !== null && (
                  <button
                    type="button"
                    onClick={() => setSelectedLetter(null)}
                    className="text-xs font-bold text-orange-500"
                  >
                    Selesai
                  </button>
                )}
              </div>

              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Pilih huruf di preview, kemudian pilih warnanya.
              </p>

              <div className="mt-4 space-y-2">
                {letters.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-center text-sm text-zinc-400">
                    Masukkan nama terlebih dahulu.
                  </div>
                ) : (
                  letters.map((letter, index) => {
                    const currentColor = letterColors[index] ?? "#18181b";
                    return (
                      <button
                        key={`${letter}-control-${index}`}
                        type="button"
                        onClick={() => setSelectedLetter(index)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${
                          selectedLetter === index
                            ? "border-orange-400 bg-orange-50"
                            : "border-zinc-200 hover:border-zinc-300"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm"
                            style={{ backgroundColor: currentColor }}
                          >
                            {letter}
                          </div>
                          <div>
                            <p className="text-sm font-bold">Huruf {index + 1}</p>
                            <p className="text-xs text-zinc-400">
                              {colors.find((c) => c.value === currentColor)?.name ?? "Custom"}
                            </p>
                          </div>
                        </div>
                        <span className="text-zinc-400">→</span>
                      </button>
                    );
                  })
                )}
              </div>

              {selectedLetter !== null && letters[selectedLetter] && (
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-bold text-zinc-500">
                    Warna untuk huruf{" "}
                    <span className="text-zinc-900">{letters[selectedLetter]}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {colors.map((color) => (
                      <button
                        key={`selected-${color.value}`}
                        type="button"
                        title={color.name}
                        onClick={() => changeLetterColor(selectedLetter, color.value)}
                        className={`h-9 w-9 rounded-full border-2 transition hover:scale-110 ${
                          letterColors[selectedLetter] === color.value
                            ? "border-orange-500 ring-2 ring-orange-200"
                            : "border-zinc-200"
                        }`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 border-t border-zinc-200 pt-6">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-zinc-400">Estimasi harga</p>
                  <p className="mt-1 text-3xl font-black">
                    Rp{totalPrice.toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1.5 text-xs font-bold text-green-600">
                  Custom
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-zinc-500">
                <div className="flex justify-between">
                  <span>Harga dasar</span>
                  <span>Rp49.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Custom huruf ({letters.length} × Rp5.000)</span>
                  <span>Rp{(letters.length * 5000).toLocaleString("id-ID")}</span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={addCurrentToCart}
              className="mt-6 w-full rounded-2xl bg-zinc-900 px-5 py-4 font-black text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-orange-500"
            >
              🛒 Tambah ke Keranjang
            </button>

            <p className="mt-3 text-center text-[11px] leading-5 text-zinc-400">
              Desain akan disimpan di keranjang sebelum checkout.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
