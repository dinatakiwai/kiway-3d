"use client";

import { FormEvent, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { DEFAULT_BASE_COLORS, DEFAULT_CAP_COLORS, DEFAULT_FONT_COLORS, STORE, type ClickerColor } from "@/lib/store";
import { notifyStoreSettingsChanged } from "@/lib/useStoreSettings";

function PaletteEditor({
  title,
  description,
  colors,
  onChange,
}: {
  title: string;
  description: string;
  colors: ClickerColor[];
  onChange: (colors: ClickerColor[]) => void;
}) {
  const [name, setName] = useState("");
  const [value, setValue] = useState("#06b6d4");

  function addColor() {
    const cleanName = name.trim();
    if (!cleanName || colors.length >= 24) return;
    if (colors.some((color) => color.name.toLowerCase() === cleanName.toLowerCase() || color.value.toLowerCase() === value.toLowerCase())) return;
    onChange([...colors, { name: cleanName, value: value.toLowerCase() }]);
    setName("");
  }

  return (
    <div className="space-y-4 rounded-xl border border-zinc-200 p-4">
      <div>
        <h3 className="font-bold text-zinc-900">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{description}</p>
      </div>
      <div className="space-y-2">
        {colors.map((color, index) => (
          <div key={`${color.value}-${index}`} className="grid grid-cols-[44px_1fr_auto] items-center gap-3 rounded-lg bg-zinc-50 p-2 sm:grid-cols-[44px_1fr_90px_auto]">
            <input type="color" aria-label={`${title}: ${color.name}`} value={color.value} onChange={(event) => onChange(colors.map((item, i) => i === index ? { ...item, value: event.target.value } : item))} className="h-9 w-11 cursor-pointer rounded border-0 bg-transparent p-0" />
            <input aria-label={`Nama ${title}`} value={color.name} maxLength={30} onChange={(event) => onChange(colors.map((item, i) => i === index ? { ...item, name: event.target.value } : item))} className="min-w-0 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400" />
            <span className="hidden font-mono text-xs text-zinc-400 sm:block">{color.value.toUpperCase()}</span>
            <button type="button" disabled={colors.length <= 1} onClick={() => onChange(colors.filter((_, i) => i !== index))} className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50 disabled:opacity-30">Hapus</button>
          </div>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <input aria-label={`Nama warna baru untuk ${title}`} value={name} onChange={(event) => setName(event.target.value)} maxLength={30} placeholder="Nama warna ready" className="rounded-lg border border-zinc-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400" />
        <input type="color" aria-label={`Pilih warna baru untuk ${title}`} value={value} onChange={(event) => setValue(event.target.value)} className="h-10 w-full cursor-pointer rounded-lg border border-zinc-200 bg-white p-1" />
        <button type="button" onClick={addColor} disabled={!name.trim() || colors.length >= 24 || colors.some((color) => color.name.toLowerCase() === name.trim().toLowerCase() || color.value.toLowerCase() === value.toLowerCase())} className="rounded-lg bg-zinc-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-40">+ Tambah warna</button>
      </div>
    </div>
  );
}

export default function StoreSettingsPage() {
  const [whatsapp, setWhatsapp] = useState(STORE.whatsapp);
  const [greeting, setGreeting] = useState(STORE.whatsappGreeting);
  const [instagramUrl, setInstagramUrl] = useState("");
  const [tiktokUrl, setTiktokUrl] = useState("");
  const [shopeeUrl, setShopeeUrl] = useState("");
  const [baseColors, setBaseColors] = useState<ClickerColor[]>(DEFAULT_BASE_COLORS);
  const [capColors, setCapColors] = useState<ClickerColor[]>(DEFAULT_CAP_COLORS);
  const [fontColors, setFontColors] = useState<ClickerColor[]>(DEFAULT_FONT_COLORS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) {
          setError("Masuk sebagai Super Admin untuk mengubah pengaturan toko.");
          setLoading(false);
        }
        return;
      }

      const { data: profile } = await supabase.from("profiles")
        .select("role,is_active").eq("id", user.id).maybeSingle();

      if (!active) return;
      if (profile?.role !== "admin" || profile.is_active === false) {
        setError("Menu ini hanya dapat dibuka oleh Super Admin.");
        setLoading(false);
        return;
      }
      setAllowed(true);

      try {
        const response = await fetch("/api/store-settings", { cache: "no-store" });
        const result = await response.json();
        if (active && result.settings) {
          setWhatsapp(result.settings.whatsapp || STORE.whatsapp);
          setGreeting(result.settings.whatsappGreeting || STORE.whatsappGreeting);
          setInstagramUrl(result.settings.instagramUrl || "");
          setTiktokUrl(result.settings.tiktokUrl || "");
          setShopeeUrl(result.settings.shopeeUrl || "");
          setBaseColors(result.settings.baseColors?.length ? result.settings.baseColors : DEFAULT_BASE_COLORS);
          setCapColors(result.settings.capColors?.length ? result.settings.capColors : DEFAULT_CAP_COLORS);
          setFontColors(result.settings.fontColors?.length ? result.settings.fontColors : DEFAULT_FONT_COLORS);
        }
      } catch {
        if (active) setError("Pengaturan belum dapat dimuat. Coba muat ulang halaman.");
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      setError("Sesi login berakhir. Masuk kembali sebagai Super Admin.");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/store-settings", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ whatsapp, whatsappGreeting: greeting, baseColors, capColors, fontColors, instagramUrl, tiktokUrl, shopeeUrl }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Pengaturan gagal disimpan.");

      setWhatsapp(result.settings.whatsapp);
      setGreeting(result.settings.whatsappGreeting);
      setInstagramUrl(result.settings.instagramUrl || "");
      setTiktokUrl(result.settings.tiktokUrl || "");
      setShopeeUrl(result.settings.shopeeUrl || "");
      setBaseColors(result.settings.baseColors);
      setCapColors(result.settings.capColors);
      setFontColors(result.settings.fontColors);
      notifyStoreSettingsChanged();
      setSuccess("Pengaturan toko dan stok warna berhasil disimpan.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pengaturan gagal disimpan.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mx-auto max-w-5xl px-5 py-8 md:px-8 md:py-10">
      <div className="mb-7">
        <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">Pengaturan toko</p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-zinc-950 md:text-4xl">Kontak & Warna Produk</h1>
        <p className="mt-2 text-sm text-zinc-500">Atur WhatsApp pemesanan dan warna filament yang tersedia untuk Custom Clicker.</p>
      </div>

      {error && <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {success && <div role="status" className="mb-5 rounded-xl border border-green-200 bg-green-50 p-4 text-sm font-semibold text-green-700">{success}</div>}

      {loading ? (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Memuat pengaturan...</div>
      ) : allowed ? (
        <form onSubmit={save} className="space-y-7">
          <div className="space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
            <div>
              <h2 className="text-xl font-black text-zinc-950">WhatsApp Pemesanan</h2>
              <p className="mt-1 text-sm text-zinc-500">Perubahan dipakai di tombol WhatsApp, tanya produk, dan checkout.</p>
            </div>
            <div>
              <label htmlFor="whatsapp" className="block text-sm font-bold text-zinc-900">Nomor WhatsApp</label>
              <input id="whatsapp" type="tel" inputMode="tel" autoComplete="tel" value={whatsapp} onChange={(event) => setWhatsapp(event.target.value)} placeholder="6281234567890" maxLength={20} required className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              <p className="mt-2 text-xs leading-5 text-zinc-500">Gunakan kode negara, misalnya 62, tanpa tanda +. Spasi dan tanda hubung akan dibersihkan otomatis.</p>
            </div>
            <div>
              <label htmlFor="greeting" className="block text-sm font-bold text-zinc-900">Pesan pembuka WhatsApp</label>
              <textarea id="greeting" value={greeting} onChange={(event) => setGreeting(event.target.value)} maxLength={500} rows={3} required className="mt-2 w-full resize-y rounded-xl border border-zinc-300 px-4 py-3 outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              <p className="mt-2 text-xs text-zinc-500">Pesan ini menjadi pembuka chat dan otomatis diikuti rincian pesanan saat checkout.</p>
            </div>
          </div>

          <div className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
            <div>
              <h2 className="text-xl font-black text-zinc-950">Media Sosial KEILAB</h2>
              <p className="mt-1 text-sm text-zinc-500">Isi link akun resmi. Tombolnya akan tampil di bagian Tentang website.</p>
            </div>
            {([["Instagram", instagramUrl, setInstagramUrl, "https://instagram.com/akun"], ["TikTok", tiktokUrl, setTiktokUrl, "https://tiktok.com/@akun"], ["Shopee", shopeeUrl, setShopeeUrl, "https://shopee.co.id/namatoko"]] as const).map(([label, value, setter, placeholder]) => (
              <label key={label} className="block text-sm font-bold text-zinc-900">Link {label}
                <input type="url" value={value} onChange={(event) => setter(event.target.value)} placeholder={placeholder} className="mt-2 w-full rounded-xl border border-zinc-300 px-4 py-3 font-normal outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100" />
              </label>
            ))}
          </div>


          <details className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm md:p-8">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
              <span><span className="block text-xl font-black text-zinc-950">Stok Warna Filament</span><span className="mt-1 block text-sm text-zinc-500">Atur warna untuk setiap bagian clicker.</span></span>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-zinc-100 text-lg transition group-open:rotate-180">⌄</span>
            </summary>
            <div className="mt-6 space-y-5">
              <PaletteEditor title="Warna Base" description="Warna untuk badan / dudukan clicker." colors={baseColors} onChange={setBaseColors} />
              <PaletteEditor title="Warna Caps" description="Warna untuk masing-masing caps huruf." colors={capColors} onChange={setCapColors} />
              <PaletteEditor title="Warna Huruf" description="Warna untuk tulisan di atas caps." colors={fontColors} onChange={setFontColors} />
              <p className="text-xs text-zinc-500">Setiap bagian wajib memiliki minimal satu warna. Maksimal 24 warna per bagian.</p>
            </div>
          </details>

          <div className="flex flex-col gap-3 border-t border-zinc-200 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-zinc-500">Simpan agar perubahan berlaku untuk pelanggan.</p>
            <button type="submit" disabled={saving} className="rounded-xl bg-zinc-950 px-6 py-3 text-sm font-black text-white transition hover:bg-orange-500 disabled:cursor-wait disabled:opacity-60">
              {saving ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
          </div>
        </form>
      ) : (
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-sm text-zinc-500">Pengaturan ini hanya tersedia untuk Super Admin.</div>
      )}
    </section>
  );
}
