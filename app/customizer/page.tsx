"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addToCart } from "@/lib/cart";
import { getClickerPrice } from "@/lib/pricing";
import { useStoreSettings } from "@/lib/useStoreSettings";
import { supabase } from "@/lib/supabase";

type KeychainProduct = {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  stock: number;
};

const Clicker3D = dynamic(() => import("@/components/Clicker3D"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[520px] items-center justify-center rounded-[2rem] bg-zinc-100">
      <p className="text-sm font-semibold text-zinc-400">Menyiapkan 3D...</p>
    </div>
  ),
});

export default function CustomizerPage() {
  const router = useRouter();
  const { baseColors, capColors: availableCapColors, fontColors: availableFontColors, clickerStartingPrice, pricePerExtraKeycap } = useStoreSettings();

  const [name, setName] = useState("RAHMA");
  const [baseColor, setBaseColor] = useState("#ffffff");
  const [capColors, setCapColors] = useState<Record<number, string>>({
    0: "#ef4444",
    1: "#18181b",
    2: "#f97316",
    3: "#ec4899",
    4: "#3b82f6",
  });
  const [fontColors, setFontColors] = useState<Record<number, string>>({
    0: "#ffffff",
    1: "#ffffff",
    2: "#ffffff",
    3: "#ffffff",
    4: "#ffffff",
  });
  const [selectedLetter, setSelectedLetter] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [keychains, setKeychains] = useState<KeychainProduct[]>([]);
  const [selectedKeychain, setSelectedKeychain] = useState<KeychainProduct | null>(null);

  useEffect(() => {
    const baseValues = baseColors.map((color) => color.value);
    const capValues = availableCapColors.map((color) => color.value);
    const fontValues = availableFontColors.map((color) => color.value);
    if (baseValues.length) setBaseColor((current) => baseValues.includes(current) ? current : baseValues[0]);
    if (capValues.length) setCapColors((current) => Object.fromEntries(
      Object.entries(current).map(([index, value]) => [index, capValues.includes(value) ? value : capValues[0]])
    ));
    if (fontValues.length) setFontColors((current) => Object.fromEntries(
      Object.entries(current).map(([index, value]) => [index, fontValues.includes(value) ? value : fontValues[0]])
    ));
  }, [baseColors, availableCapColors, availableFontColors]);

  useEffect(() => {
    let active = true;
    async function loadKeychains() {
      const { data } = await supabase.from("products")
        .select("id,title,image_url,price,stock")
        .eq("is_active", true)
        .gt("stock", 0)
        .ilike("category", "%gantungan%")
        .order("created_at", { ascending: false });
      if (active) setKeychains((data ?? []) as KeychainProduct[]);
    }
    loadKeychains();
    return () => { active = false; };
  }, []);

  const cleanName = useMemo(
    () => name.toUpperCase().replace(/[^A-Z0-9 ]/g, "").slice(0, 12),
    [name]
  );

  const letters = cleanName.replace(/ /g, "").split("");
  const unitPrice = getClickerPrice(letters.length, clickerStartingPrice, pricePerExtraKeycap);
  const unitTotal = unitPrice + (selectedKeychain?.price ?? 0);
  const orderTotal = unitTotal * quantity;

  function changeCapColor(index: number, color: string) {
    setCapColors((current) => ({ ...current, [index]: color }));
  }

  function changeFontColor(index: number, color: string) {
    setFontColors((current) => ({ ...current, [index]: color }));
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
      capColors: { ...capColors },
      fontColors: { ...fontColors },
      keychain: selectedKeychain ? { productId: selectedKeychain.id, name: selectedKeychain.title, price: Number(selectedKeychain.price), imageUrl: selectedKeychain.image_url } : null,
      price: unitTotal,
      quantity,
    });

    router.push("/cart");
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">

      <section className="mx-auto max-w-7xl px-5 pb-7 pt-9 md:px-6 md:pt-12">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-orange-500">
              KEILAB.ID • CUSTOMIZER
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight md:text-5xl">
              Buat Clicker Kamu
            </h1>
            <p className="mt-3 max-w-2xl text-zinc-500">
              Tulis nama, pilih warna, klik huruf di preview, lalu lihat
              desainmu berubah secara langsung.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white px-5 py-3 shadow-sm">
            <p className="text-xs font-semibold text-zinc-400">Harga mulai</p>
            <p className="text-xl font-black">Rp{clickerStartingPrice.toLocaleString("id-ID")}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-20 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
          <div className="rounded-[2rem] border border-zinc-200 bg-white p-4 shadow-sm md:p-6">
            <div className="flex items-center justify-between px-1">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
                  Live Preview 3D
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-800">
                  Klik huruf untuk memilihnya
                </p>
              </div>
              <span className="hidden rounded-full bg-orange-50 px-3 py-1.5 text-xs font-bold text-orange-600 sm:block">
                DRAG TO ROTATE
              </span>
            </div>

            <div className="relative mt-5 overflow-hidden rounded-[1.75rem] bg-zinc-100">
              <div className="absolute left-4 top-4 z-10 rounded-full bg-white/90 px-3 py-2 text-[11px] font-bold text-zinc-500 shadow-sm backdrop-blur sm:hidden">
                ↔ DRAG
              </div>
              <Clicker3D
                letters={letters}
                baseColor={baseColor}
                capColors={capColors}
                fontColors={fontColors}
                selectedLetter={selectedLetter}
                onSelectLetter={setSelectedLetter}
              />
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl bg-zinc-50 p-4">
                <p className="text-xs text-zinc-400">Nama</p>
                <p className="mt-1 truncate font-black">
                  {cleanName || "-"}
                </p>
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

            <div className="mt-7 border-t border-zinc-100 pt-7">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <label className="text-sm font-black">5. Pilih Gantungan Kunci (Opsional)</label>
                  <p className="mt-1 text-xs leading-5 text-zinc-400">Pilih model dari foto. Harga gantungan ditambahkan ke harga clicker.</p>
                </div>
                {selectedKeychain && <button type="button" onClick={() => setSelectedKeychain(null)} className="shrink-0 text-xs font-bold text-orange-600">Hapus pilihan</button>}
              </div>
              {keychains.length ? (
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {keychains.map((keychain) => {
                    const selected = selectedKeychain?.id === keychain.id;
                    return (
                      <button key={keychain.id} type="button" aria-pressed={selected} onClick={() => setSelectedKeychain(selected ? null : keychain)} className={`overflow-hidden rounded-2xl border text-left transition ${selected ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100" : "border-zinc-200 hover:border-zinc-400"}`}>
                        <div className="aspect-square bg-zinc-100">
                          {keychain.image_url ? <img src={keychain.image_url} alt={keychain.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-3xl">🔑</div>}
                        </div>
                        <div className="p-3">
                          <p className="line-clamp-2 text-xs font-bold">{keychain.title}</p>
                          <p className="mt-1 text-sm font-black text-zinc-950">Rp{Number(keychain.price).toLocaleString("id-ID")}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-4 rounded-xl bg-zinc-50 p-4 text-xs leading-5 text-zinc-500">Etalase belum tersedia. Admin dapat menambahkan foto gantungan dengan kategori “Gantungan Kunci” di menu Katalog.</div>
              )}
            </div>
          </div>

          <aside className="h-fit rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm md:p-7 lg:sticky lg:top-24">
            <div>
              <label className="text-sm font-black">1. Nama Clicker</label>
              <div className="relative mt-3">
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Contoh: RAHMA"
                  maxLength={12}
                  className="w-full rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-4 pr-16 text-lg font-black uppercase outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                  {cleanName.length}/12
                </span>
              </div>
              <p className="mt-2 text-xs text-zinc-400">
                Huruf A-Z dan angka, maksimal 12 karakter.
              </p>
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black">2. Warna Base</label>
                <span className="text-xs font-semibold text-zinc-400">
                  {baseColors.find((c) => c.value === baseColor)?.name}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-5 gap-3">
                {baseColors.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    title={color.name}
                    aria-label={`Pilih base ${color.name}`}
                    onClick={() => {
                      setSelectedLetter(null);
                      setBaseColor(color.value);
                    }}
                    className={`h-10 w-10 rounded-full border-2 transition hover:scale-110 ${
                      baseColor === color.value && selectedLetter === null
                        ? "scale-110 border-orange-500 ring-4 ring-orange-100"
                        : "border-zinc-200"
                    }`}
                    style={{ backgroundColor: color.value }}
                  />
                ))}
              </div>
            </div>

            <div className="mt-7">
              <label className="text-sm font-black">3. Warna Caps</label>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Pilih huruf di preview atau daftar, lalu tentukan warna capsnya.
              </p>

              <div className="mt-4 space-y-2">
                {letters.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-center text-sm text-zinc-400">
                    Masukkan nama terlebih dahulu.
                  </div>
                ) : (
                  letters.map((letter, index) => {
                    const currentColor = capColors[index] ?? availableCapColors[0]?.value ?? "#18181b";
                    return (
                      <button
                        key={`${letter}-${index}`}
                        type="button"
                        onClick={() => setSelectedLetter(index)}
                        className={`flex w-full items-center justify-between rounded-2xl border p-3 text-left transition ${selectedLetter === index ? "border-orange-400 bg-orange-50" : "border-zinc-200 hover:border-zinc-300"}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-black text-white shadow-sm" style={{ backgroundColor: currentColor }}>
                            {letter}
                          </div>
                          <div>
                            <p className="text-sm font-bold">Caps huruf {index + 1}</p>
                            <p className="text-xs text-zinc-400">{availableCapColors.find((color) => color.value === currentColor)?.name ?? "Warna"}</p>
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
                    Pilih warna caps untuk huruf <span className="text-zinc-900">{letters[selectedLetter]}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableCapColors.map((color) => (
                      <button
                        key={`cap-${color.value}`}
                        type="button"
                        title={color.name}
                        aria-label={`Pilih warna caps ${color.name}`}
                        onClick={() => changeCapColor(selectedLetter, color.value)}
                        className={`h-9 w-9 rounded-full border-2 transition hover:scale-110 ${capColors[selectedLetter] === color.value ? "border-orange-500 ring-2 ring-orange-200" : "border-zinc-200"}`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black">4. Warna Huruf</label>
                {selectedLetter !== null && letters[selectedLetter] && (
                  <span className="text-xs font-semibold text-zinc-400">Huruf {letters[selectedLetter]}</span>
                )}
              </div>
              <p className="mt-2 text-xs leading-5 text-zinc-400">
                Warna ini khusus untuk tulisan di atas caps. Pilih huruf pada bagian Warna Caps terlebih dahulu.
              </p>

              {selectedLetter !== null && letters[selectedLetter] ? (
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4">
                  <p className="text-xs font-bold text-zinc-500">
                    Pilih warna tulisan untuk huruf <span className="text-zinc-900">{letters[selectedLetter]}</span>
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {availableFontColors.map((color) => (
                      <button
                        key={`font-${color.value}`}
                        type="button"
                        title={color.name}
                        aria-label={`Pilih warna tulisan ${color.name}`}
                        onClick={() => changeFontColor(selectedLetter, color.value)}
                        className={`h-9 w-9 rounded-full border-2 transition hover:scale-110 ${fontColors[selectedLetter] === color.value ? "border-orange-500 ring-2 ring-orange-200" : "border-zinc-200"}`}
                        style={{ backgroundColor: color.value }}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-400">
                  Pilih salah satu huruf untuk mengatur warna tulisannya.
                </div>
              )}
            </div>


            <div className="mt-7 border-t border-zinc-200 pt-6">
              <div className="flex items-center justify-between">
                <label className="text-sm font-black">6. Jumlah</label>
                <div className="flex items-center rounded-xl border border-zinc-200 bg-zinc-50">
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                    className="h-10 w-10 text-lg font-bold text-zinc-600 hover:bg-zinc-100"
                    aria-label="Kurangi jumlah"
                  >
                    −
                  </button>
                  <span className="flex h-10 w-10 items-center justify-center text-sm font-black">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((value) => Math.min(99, value + 1))}
                    className="h-10 w-10 text-lg font-bold text-zinc-600 hover:bg-zinc-100"
                    aria-label="Tambah jumlah"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-950 p-5 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-400">Total pesanan</p>
                  <p className="mt-1 text-3xl font-black">
                    Rp{orderTotal.toLocaleString("id-ID")}
                  </p>
                </div>
                <span className="rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold">
                  {quantity} pcs
                </span>
              </div>

              <div className="mt-4 space-y-2 border-t border-white/10 pt-4 text-xs text-zinc-400">
                <div className="flex justify-between">
                  <span>Harga per clicker</span>
                  <span className="font-semibold text-zinc-200">
                    Rp{unitPrice.toLocaleString("id-ID")}
                  </span>
                </div>
                {selectedKeychain && <div className="flex justify-between"><span>{selectedKeychain.title}</span><span>Rp{Number(selectedKeychain.price).toLocaleString("id-ID")}</span></div>}
                <div className="flex justify-between">
                  <span>
                    {letters.length} huruf × Rp5.000
                  </span>
                  <span>
                    Rp{(letters.length * 5000).toLocaleString("id-ID")}
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={addCurrentToCart}
              className="mt-4 w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-white shadow-lg shadow-orange-500/20 transition hover:-translate-y-0.5 hover:bg-orange-600"
            >
              🛒 Tambah ke Keranjang
            </button>

            <p className="mt-3 text-center text-[11px] leading-5 text-zinc-400">
              Desain dan warna yang kamu pilih akan disimpan di keranjang.
            </p>
          </aside>
        </div>
      </section>
    </main>
  );
}
