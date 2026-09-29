"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Product = {
  id: string;
  title: string;
  image_url: string | null;
  price: number;
  stock: number;
  category: string;
  description: string | null;
  is_active: boolean;
  inventory_id: string | null;
  created_at: string;
};

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
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
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
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
    setForm(emptyForm);
    setFile(null);
    setPreview(null);
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
    setFile(null);
    setPreview(product.image_url);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleFileChange(nextFile: File | null) {
    if (preview?.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }

    setFile(nextFile);
    setPreview(
      nextFile
        ? URL.createObjectURL(nextFile)
        : editing?.image_url ?? null
    );
  }

  async function uploadImage(nextFile: File) {
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

      if (file && !file.type.startsWith("image/")) {
        throw new Error("File harus berupa foto.");
      }

      let imageUrl = editing?.image_url ?? null;

      if (file) {
        imageUrl = await uploadImage(file);
      }

      const payload = {
        title,
        image_url: imageUrl,
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

              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-neutral-300 bg-neutral-50 text-center hover:border-orange-400">
                {preview ? (
                  <img
                    src={preview}
                    alt="Preview produk"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <>
                    <span className="text-4xl">📷</span>
                    <span className="mt-3 text-sm font-semibold">
                      Pilih Foto
                    </span>
                    <span className="mt-1 px-5 text-xs text-neutral-500">
                      JPG, PNG, WEBP
                    </span>
                  </>
                )}

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) =>
                    handleFileChange(e.target.files?.[0] ?? null)
                  }
                />
              </label>
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
                  placeholder="Clicker"
                  className="w-full rounded-xl border border-neutral-300 px-4 py-3 outline-none focus:border-orange-500"
                />
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
