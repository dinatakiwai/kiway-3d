"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

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
  is_active: boolean;
  inventory_id: string | null;
  created_at: string;
};

type ProductOptionChoice = { label: string; price: number; stock: number | null; imageUrl?: string | null };
type ProductOptionGroup = { id: string; name: string; priceMode?: "add" | "set"; choices: ProductOptionChoice[] };
type AdminOptionChoice = ProductOptionChoice & { imageFile?: File };
type AdminOptionGroup = Omit<ProductOptionGroup, "choices"> & { priceMode: "add" | "set"; choices: AdminOptionChoice[] };

type InventoryItem = {
  id: string;
  name: string;
  stock: number;
  unit: string;
  is_finished_product: boolean | null;
};

const emptyForm = {
  title: "",
  price: "",
  stock: "0",
  category: "Lainnya",
  description: "",
  inventory_id: "",
};

function formatRupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function AdminCatalogPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [photos, setPhotos] = useState<{ url: string; file?: File }[]>([]);
  const [videos, setVideos] = useState<{ url: string; file?: File }[]>([]);
  const [optionGroups, setOptionGroups] = useState<AdminOptionGroup[]>([]);
  const [newGroupName, setNewGroupName] = useState("");
  const [editing, setEditing] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const finishedProducts = useMemo(
    () =>
      inventory.filter(
        (item) =>
          item.unit?.toLowerCase() === "pcs" &&
          item.is_finished_product === true
      ),
    [inventory]
  );

  async function loadData() {
    setLoading(true);
    setError("");

    const [productsResult, inventoryResult] = await Promise.all([
      supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory")
        .select("id, name, stock, unit, is_finished_product")
        .eq("unit", "pcs")
        .eq("is_finished_product", true)
        .order("name", { ascending: true }),
    ]);

    if (productsResult.error) {
      setError(productsResult.error.message);
    } else {
      setProducts((productsResult.data ?? []) as Product[]);
    }

    if (inventoryResult.error) {
      setError((current) =>
        current
          ? `${current} | ${inventoryResult.error!.message}`
          : inventoryResult.error!.message
      );
    } else {
      setInventory((inventoryResult.data ?? []) as InventoryItem[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  function resetForm() {
    photos.forEach((photo) => { if (photo.file) URL.revokeObjectURL(photo.url); });
    videos.forEach((video) => { if (video.file) URL.revokeObjectURL(video.url); });
    optionGroups.forEach((group) => group.choices.forEach((choice) => { if (choice.imageFile && choice.imageUrl) URL.revokeObjectURL(choice.imageUrl); }));
    setForm(emptyForm);
    setPhotos([]);
    setVideos([]);
    setOptionGroups([]);
    setNewGroupName("");
    setEditing(null);
    setMessage("");
    setError("");
  }

  function startEdit(product: Product) {
    setEditing(product);
    setForm({
      title: product.title,
      price: String(product.price),
      stock: String(product.stock),
      category: product.category,
      description: product.description ?? "",
      inventory_id: product.inventory_id ?? "",
    });
    setPhotos((product.image_urls?.length ? product.image_urls : product.image_url ? [product.image_url] : []).slice(0, 4).map((url) => ({ url })));
    setVideos((product.video_urls ?? []).slice(0, 4).map((url) => ({ url })));
    setOptionGroups((product.option_groups ?? []).map((group) => ({
      ...group,
      id: group.id || crypto.randomUUID(),
      priceMode: group.priceMode === "set" ? "set" : "add",
      choices: Array.isArray(group.choices) ? group.choices : [],
    })));
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(selected: FileList | null) {
    if (!selected) return;
    const picked = Array.from(selected);
    const slots = Math.max(4 - photos.length, 0);
    if (picked.length > slots) setError(`Maksimal 4 foto. Kamu masih bisa menambah ${slots} foto.`);
    setPhotos((current) => [...current, ...picked.slice(0, slots).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function removePhoto(index: number) {
    setPhotos((current) => {
      const photo = current[index];
      if (photo?.file) URL.revokeObjectURL(photo.url);
      return current.filter((_, itemIndex) => itemIndex !== index);
    });
  }

  function handleVideoChange(selected: FileList | null) {
    if (!selected) return;
    const picked = Array.from(selected).filter((file) => file.type.startsWith("video/"));
    const slots = Math.max(4 - videos.length, 0);
    if (picked.length > slots) setError(`Maksimal 4 video. Kamu masih bisa menambah ${slots} video.`);
    if (picked.some((file) => file.size > 50 * 1024 * 1024)) {
      setError("Ukuran setiap video maksimal 50 MB.");
    }
    setVideos((current) => [...current, ...picked.filter((file) => file.size <= 50 * 1024 * 1024).slice(0, slots).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  }

  function updateOptionGroup(groupId: string, update: (group: AdminOptionGroup) => AdminOptionGroup) {
    setOptionGroups((groups) => groups.map((group) => group.id === groupId ? update(group) : group));
  }

  async function uploadAsset(nextFile: File) {
    const extension =
      nextFile.name.split(".").pop()?.toLowerCase() || "jpg";

    const path = `products/${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(path, nextFile, {
        cacheControl: "3600",
        upsert: false,
        contentType: nextFile.type,
      });

    if (uploadError) throw uploadError;

    return supabase.storage
      .from("product-images")
      .getPublicUrl(path).data.publicUrl;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const title = form.title.trim();
      const price = Number(form.price);
      const manualStock = Number(form.stock);

      if (!title) {
        throw new Error("Judul produk wajib diisi.");
      }

      if (!Number.isFinite(price) || price < 0) {
        throw new Error("Harga produk tidak valid.");
      }

      if (!Number.isFinite(manualStock) || manualStock < 0) {
        throw new Error("Qty / stok tidak valid.");
      }

      if (photos.length > 4 || photos.some((photo) => photo.file && !photo.file.type.startsWith("image/"))) throw new Error("Pilih maksimal 4 file foto.");
      if (videos.length > 4 || videos.some((video) => video.file && (!video.file.type.startsWith("video/") || video.file.size > 50 * 1024 * 1024))) throw new Error("Pilih maksimal 4 video dengan ukuran maksimal 50 MB per video.");
      if (optionGroups.filter((group) => group.priceMode === "set").length > 1) throw new Error("Gunakan maksimal satu menu untuk menetapkan harga akhir, misalnya menu HURUF.");
      if (optionGroups.some((group) => !group.name.trim() || group.choices.length === 0 || group.choices.some((choice) => !choice.label.trim() || !Number.isFinite(choice.price) || choice.price < 0 || (choice.stock !== null && choice.stock !== undefined && (!Number.isFinite(choice.stock) || choice.stock < 0)) || (choice.imageFile && (!choice.imageFile.type.startsWith("image/") || choice.imageFile.size > 10 * 1024 * 1024))))) throw new Error("Lengkapi nama menu, pilihan, harga, dan stok. Gambar pilihan maksimal 10 MB.");
      const savedImageUrls = await Promise.all(photos.map((photo) => photo.file ? uploadAsset(photo.file) : Promise.resolve(photo.url)));
      const savedVideoUrls = await Promise.all(videos.map((video) => video.file ? uploadAsset(video.file) : Promise.resolve(video.url)));

      const payload = {
        title,
        image_url: savedImageUrls[0] ?? null,
        image_urls: savedImageUrls,
        video_urls: savedVideoUrls,
        option_groups: await Promise.all(optionGroups.map(async (group) => ({
          id: group.id,
          name: group.name.trim(),
          priceMode: group.priceMode,
          choices: await Promise.all(group.choices.map(async (choice) => ({
            label: choice.label.trim(),
            price: Number(choice.price),
            stock: choice.stock == null ? null : Number(choice.stock),
            imageUrl: choice.imageFile ? await uploadAsset(choice.imageFile) : choice.imageUrl ?? null,
          }))),
        }))),
        price,
        stock: manualStock,
        category: form.category.trim() || "Lainnya",
        description: form.description.trim() || null,
        inventory_id: form.inventory_id || null,
        is_active: editing?.is_active ?? true,
        updated_at: new Date().toISOString(),
      };

      if (editing) {
        const { error: updateError } = await supabase
          .from("products")
          .update(payload)
          .eq("id", editing.id);

        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase
          .from("products")
          .insert(payload);

        if (insertError) throw insertError;
      }

      const wasEditing = Boolean(editing);
      resetForm();
      setMessage(
        wasEditing
          ? "Produk berhasil diperbarui."
          : "Produk berhasil ditambahkan ke katalog."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Terjadi kesalahan."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product: Product) {
    setError("");

    const { error: updateError } = await supabase
      .from("products")
      .update({
        is_active: !product.is_active,
        updated_at: new Date().toISOString(),
      })
      .eq("id", product.id);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await loadData();
  }

  async function deleteProduct(product: Product) {
    if (
      !window.confirm(
        `Hapus produk "${product.title}" dari katalog?`
      )
    ) {
      return;
    }

    const { error: deleteError } = await supabase
      .from("products")
      .delete()
      .eq("id", product.id);

    if (deleteError) {
      setError(deleteError.message);
      return;
    }

    if (editing?.id === product.id) {
      resetForm();
    }

    await loadData();
  }

  return (
    <main className="min-h-screen bg-neutral-50 px-4 py-8 text-neutral-900 md:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-orange-500">
              KEILAB.ID
            </p>
            <h1 className="mt-1 text-3xl font-black">
              Katalog Produk
            </h1>
            <p className="mt-2 text-sm text-neutral-500">
              Upload produk tanpa perlu edit coding. Stok bisa disambungkan
              langsung ke Inventory.
            </p>
          </div>

          <div className="rounded-2xl bg-white px-5 py-4 shadow-sm ring-1 ring-neutral-200">
            <div className="text-xs font-medium text-neutral-500">
              Produk aktif
            </div>
            <div className="mt-1 text-2xl font-black">
              {products.filter((p) => p.is_active).length}
            </div>
          </div>
        </div>

        <section className="mb-8 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-neutral-200 md:p-7">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold">
                {editing ? "Edit Produk" : "Tambah Produk"}
              </h2>
              <p className="mt-1 text-sm text-neutral-500">
                Pilih Inventory jika stok produk ini dikelola sebagai barang
                jadi.
              </p>
            </div>

            {editing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-semibold hover:bg-neutral-50"
              >
                Batal Edit
              </button>
            )}
          </div>

          <form
            onSubmit={handleSubmit}
            className="grid gap-6 lg:grid-cols-[280px_1fr]"
          >
            <div>
              <label className="mb-2 block text-sm font-semibold">
                Foto Produk
              </label>

              <div className="grid grid-cols-2 gap-2">
                {photos.map((photo, index) => (
                  <div key={`${photo.url}-${index}`} className="relative aspect-square overflow-hidden rounded-xl bg-neutral-100">
                    <img src={photo.url} alt={`Foto produk ${index + 1}`} className="h-full w-full object-cover" />
                    <button type="button" onClick={() => removePhoto(index)} aria-label={`Hapus foto ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white">✕</button>
                    {index === 0 && <span className="absolute bottom-2 left-2 rounded-full bg-white/90 px-2 py-1 text-[10px] font-bold">Foto utama</span>}
                  </div>
                ))}
                {photos.length < 4 && <label className="flex aspect-square cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center hover:border-orange-400">
                  <span className="text-3xl">📷</span>
                  <span className="mt-2 px-2 text-sm font-semibold">Tambah Foto</span>
                  <span className="mt-1 text-xs text-neutral-500">{photos.length}/4</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => { handleFileChange(event.target.files); event.target.value = ""; }} />
                </label>}
              </div>
              <p className="mt-2 text-xs text-neutral-500">Maksimal 4 foto. Foto pertama menjadi foto utama.</p>
              <label className="mb-2 mt-6 block text-sm font-semibold">Video Produk</label>
              <div className="grid grid-cols-2 gap-2">
                {videos.map((video, index) => (
                  <div key={`${video.url}-${index}`} className="relative aspect-video overflow-hidden rounded-xl bg-neutral-900">
                    <video src={video.url} muted playsInline className="h-full w-full object-cover" />
                    <button type="button" onClick={() => setVideos((current) => { const item = current[index]; if (item?.file) URL.revokeObjectURL(item.url); return current.filter((_, i) => i !== index); })} aria-label={`Hapus video ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-black/75 px-2.5 py-1 text-xs font-bold text-white">✕</button>
                    <span className="absolute bottom-2 left-2 rounded-full bg-black/70 px-2 py-1 text-[10px] font-bold text-white">▶ Video {index + 1}</span>
                  </div>
                ))}
                {videos.length < 4 && <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center hover:border-orange-400">
                  <span className="text-3xl">🎬</span><span className="mt-1 px-2 text-sm font-semibold">Tambah Video</span><span className="mt-1 text-xs text-neutral-500">{videos.length}/4 · maks 50 MB</span>
                  <input type="file" accept="video/mp4,video/webm,video/quicktime" multiple className="hidden" onChange={(event) => { handleVideoChange(event.target.files); event.target.value = ""; }} />
                </label>}
              </div>
              <p className="mt-2 text-xs text-neutral-500">Maksimal 4 video. Format MP4/WebM lebih disarankan.</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Judul Produk
                </label>
                <input
                  value={form.title}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      title: e.target.value,
                    }))
                  }
                  placeholder="Contoh: BAKUGAN"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Harga Produk
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      price: e.target.value,
                    }))
                  }
                  placeholder="84000"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Stok Manual
                </label>
                <input
                  type="number"
                  min="0"
                  value={form.stock}
                  disabled={Boolean(form.inventory_id)}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      stock: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-orange-500 disabled:bg-neutral-100"
                />
                {form.inventory_id && (
                  <p className="mt-1 text-xs text-neutral-500">
                    Tidak dipakai karena stok mengikuti Inventory.
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Sumber Stok
                </label>

                <select
                  value={form.inventory_id}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      inventory_id: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 outline-none focus:border-orange-500"
                >
                  <option value="">Stok Manual</option>

                  {finishedProducts.map((item) => (
                    <option key={item.id} value={item.id}>
                      Inventory → {item.name} ({item.stock} {item.unit})
                    </option>
                  ))}
                </select>

                <p className="mt-2 text-xs text-neutral-400">
                  Hanya Inventory barang jadi (pcs) yang muncul di sini.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold">
                  Kategori
                </label>
                <input
                  value={form.category}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      category: e.target.value,
                    }))
                  }
                  placeholder="Contoh: Gantungan Kunci"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-orange-500"
                />
                <p className="mt-2 text-xs text-neutral-500">Agar foto dan harga produk muncul di customizer clicker, gunakan kategori “Gantungan Kunci”, isi stok lebih dari 0, dan pastikan produk aktif.</p>
              </div>

              <div className="md:col-span-2 rounded-2xl border border-neutral-200 p-4 md:p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex-1 text-sm font-semibold">Nama menu pilihan
                    <input value={newGroupName} onChange={(event) => setNewGroupName(event.target.value)} maxLength={40} placeholder="Contoh: WARNA atau JUMLAH HURUF" className="mt-2 w-full rounded-xl border border-neutral-300 px-4 py-3 font-normal outline-none focus:border-orange-500" />
                  </label>
                  <button type="button" disabled={!newGroupName.trim()} onClick={() => { setOptionGroups((groups) => [...groups, { id: crypto.randomUUID(), name: newGroupName.trim(), priceMode: "add", choices: [] }]); setNewGroupName(""); }} className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-bold text-white disabled:opacity-40">+ Tambah menu</button>
                </div>
                <p className="mt-2 text-xs text-neutral-500">Buat menu seperti WARNA dan JUMLAH HURUF, lalu masukkan pilihan, tambahan harga, dan stok tiap pilihan.</p>
                <div className="mt-4 space-y-4">
                  {optionGroups.map((group) => (
                    <div key={group.id} className="rounded-xl bg-neutral-50 p-4">
                      <div className="flex items-center gap-2">
                        <input value={group.name} maxLength={40} onChange={(event) => updateOptionGroup(group.id, (item) => ({ ...item, name: event.target.value }))} aria-label="Nama menu pilihan" className="min-w-0 flex-1 rounded-lg border border-neutral-300 bg-white px-3 py-2 font-bold" />
                        <select value={group.priceMode} onChange={(event) => updateOptionGroup(group.id, (item) => ({ ...item, priceMode: event.target.value as "add" | "set" }))} aria-label="Aturan harga menu" className="rounded-lg border border-neutral-300 bg-white px-2 py-2 text-xs font-bold">
                          <option value="add">Harga tambahan</option>
                          <option value="set">Harga akhir</option>
                        </select>
                        <button type="button" onClick={() => setOptionGroups((groups) => groups.filter((item) => item.id !== group.id))} className="rounded-lg px-3 py-2 text-sm font-bold text-red-600 hover:bg-red-50">Hapus menu</button>
                      </div>
                      <p className="mt-2 text-xs text-neutral-500">{group.priceMode === "set" ? "Pilih salah satu harga akhir untuk menu ini. Cocok untuk jumlah huruf." : "Nilai pilihan ditambahkan ke harga produk. Cocok untuk warna yang gratis atau punya biaya tambahan."}</p>
                      <div className="mt-3 space-y-2">
                        {group.choices.map((choice, index) => (
                          <div key={`${group.id}-${index}`} className="grid gap-2 sm:grid-cols-[minmax(150px,1fr)_1fr_130px_120px_auto]">
                            <div className="flex min-w-0 items-center gap-2 rounded-lg border border-neutral-300 bg-white p-1.5">
                              {choice.imageUrl ? <img src={choice.imageUrl} alt={`Gambar ${choice.label || "pilihan"}`} className="h-12 w-12 shrink-0 rounded-md object-cover" /> : <span className="grid h-12 w-12 shrink-0 place-items-center rounded-md bg-neutral-100 text-xl">🎨</span>}
                              <label className="min-w-0 flex-1 cursor-pointer text-xs font-bold text-orange-700">{choice.imageUrl ? "Ganti gambar" : "Tambah gambar"}
                                <input type="file" accept="image/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (!file) return; const preview = URL.createObjectURL(file); updateOptionGroup(group.id, (item) => ({ ...item, choices: item.choices.map((value, i) => { if (i !== index) return value; if (value.imageFile && value.imageUrl) URL.revokeObjectURL(value.imageUrl); return { ...value, imageUrl: preview, imageFile: file }; }) })); event.target.value = ""; }} />
                              </label>
                              {choice.imageUrl && <button type="button" aria-label="Hapus gambar pilihan" onClick={() => { if (choice.imageFile) URL.revokeObjectURL(choice.imageUrl!); updateOptionGroup(group.id, (item) => ({ ...item, choices: item.choices.map((value, i) => i === index ? { ...value, imageUrl: null, imageFile: undefined } : value) })); }} className="px-1 text-xs text-red-600">✕</button>}
                            </div>
                            <input value={choice.label} maxLength={50} onChange={(event) => updateOptionGroup(group.id, (item) => ({ ...item, choices: item.choices.map((value, i) => i === index ? { ...value, label: event.target.value } : value) }))} placeholder="Nama pilihan" aria-label="Nama pilihan variasi" className="min-w-0 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm" />
                            <label className="text-[11px] font-semibold text-neutral-500">{group.priceMode === "set" ? "Harga jual" : "Harga tambahan"}
                              <input type="number" min="0" value={choice.price} onChange={(event) => updateOptionGroup(group.id, (item) => ({ ...item, choices: item.choices.map((value, i) => i === index ? { ...value, price: Number(event.target.value) } : value) }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" />
                            </label>
                            <label className="text-[11px] font-semibold text-neutral-500">Stok (kosong = ikut stok produk)
                              <input type="number" min="0" value={choice.stock ?? ""} onChange={(event) => updateOptionGroup(group.id, (item) => ({ ...item, choices: item.choices.map((value, i) => i === index ? { ...value, stock: event.target.value === "" ? null : Number(event.target.value) } : value) }))} className="mt-1 w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900" />
                            </label>
                            <button type="button" onClick={() => updateOptionGroup(group.id, (item) => ({ ...item, choices: item.choices.filter((_, i) => i !== index) }))} className="self-end rounded-lg px-3 py-2 text-sm font-bold text-red-600">Hapus</button>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={() => updateOptionGroup(group.id, (item) => ({ ...item, choices: [...item.choices, { label: "", price: 0, stock: null }] }))} className="mt-3 rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-bold hover:border-orange-400">+ Tambah pilihan</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-semibold">
                  Deskripsi
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm((v) => ({
                      ...v,
                      description: e.target.value,
                    }))
                  }
                  rows={5}
                  placeholder="Tulis deskripsi singkat produk..."
                  className="w-full resize-none rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-orange-500"
                />
              </div>

              {error && (
                <div className="md:col-span-2 rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {error}
                </div>
              )}

              {message && (
                <div className="md:col-span-2 rounded-xl bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
                  {message}
                </div>
              )}

              <div className="md:col-span-2">
                <button
                  disabled={saving}
                  className="w-full rounded-xl bg-orange-500 px-5 py-3.5 font-bold text-white shadow-sm hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving
                    ? "Menyimpan..."
                    : editing
                      ? "Simpan Perubahan"
                      : "🚀 Simpan Produk"}
                </button>
              </div>
            </div>
          </form>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold">Daftar Produk</h2>
            <span className="text-sm text-neutral-500">
              {products.length} produk
            </span>
          </div>

          {loading ? (
            <div className="rounded-2xl bg-white p-8 text-center text-neutral-500">
              Memuat katalog...
            </div>
          ) : products.length === 0 ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm ring-1 ring-neutral-200">
              <div className="text-4xl">📦</div>
              <h3 className="mt-3 font-bold">Belum ada produk</h3>
              <p className="mt-1 text-sm text-neutral-500">
                Tambahkan produk pertama kamu di form di atas.
              </p>
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => {
                const linked = Boolean(product.inventory_id);
                const linkedInventory = inventory.find(
                  (item) => item.id === product.inventory_id
                );
                const displayStock = linked
                  ? Number(linkedInventory?.stock ?? 0)
                  : Number(product.stock);

                return (
                  <article
                    key={product.id}
                    className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-neutral-200"
                  >
                    <div className="aspect-[4/3] bg-neutral-100">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.title}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-5xl">
                          📦
                        </div>
                      )}
                    </div>

                    <div className="p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold">
                            {product.title}
                          </h3>
                          <p className="mt-1 text-sm text-neutral-500">
                            {product.category}
                          </p>
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-bold ${
                            product.is_active
                              ? "bg-green-100 text-green-700"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {product.is_active ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>

                      <div className="mt-4">
                        <div className="text-lg font-black">
                          {formatRupiah(Number(product.price))}
                        </div>

                        <div className="text-sm text-neutral-500">
                          Stok: {displayStock}
                        </div>

                        <div className="mt-1 text-xs font-semibold text-neutral-400">
                          {linked
                            ? `↕ Inventory: ${
                                linkedInventory?.name ?? "terhubung"
                              }`
                            : "Stok manual"}
                        </div>
                      </div>

                      <div className="mt-5 grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => startEdit(product)}
                          className="rounded-lg border border-neutral-300 px-2 py-2 text-sm font-semibold hover:bg-neutral-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleActive(product)}
                          className="rounded-lg border border-neutral-300 px-2 py-2 text-sm font-semibold hover:bg-neutral-50"
                        >
                          {product.is_active
                            ? "Nonaktif"
                            : "Aktifkan"}
                        </button>

                        <button
                          type="button"
                          onClick={() => deleteProduct(product)}
                          className="rounded-lg border border-red-200 px-2 py-2 text-sm font-semibold text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
