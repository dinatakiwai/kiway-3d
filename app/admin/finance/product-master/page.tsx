"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Inventory = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  cost_per_unit: number;
};

type Item = {
  inventory_id: string;
  quantity: string;
};

type Product = {
  id: string;
  name: string;
  selling_price: number;
  labor_cost: number;
  packaging_cost: number;
  notes: string | null;
  product_cost_template_items: Array<{
    id: string;
    inventory_id: string;
    quantity: number;
    inventory: Inventory | null;
  }>;
};

const money = (value: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value || 0);

export default function ProductMasterPage() {
  const [inventory, setInventory] = useState<Inventory[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [labor, setLabor] = useState("");
  const [packaging, setPackaging] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<Item[]>([
    { inventory_id: "", quantity: "" },
  ]);

  async function loadData() {
    setLoading(true);

    const inventoryResult = await supabase
      .from("inventory")
      .select("id,name,unit,stock,cost_per_unit")
      .order("name");

    const productResult = await supabase
      .from("product_cost_templates")
      .select(`
        id,
        name,
        selling_price,
        labor_cost,
        packaging_cost,
        notes,
        product_cost_template_items(
          id,
          inventory_id,
          quantity,
          inventory(id,name,unit,stock,cost_per_unit)
        )
      `)
      .order("name");

    if (inventoryResult.error) {
      console.error(inventoryResult.error);
    }

    if (productResult.error) {
      console.error(productResult.error);
    }

    setInventory((inventoryResult.data || []) as Inventory[]);
    setProducts((productResult.data ?? []) as unknown as Product[]);
    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  const usableInventory = useMemo(
    () =>
      inventory.filter((item) =>
        ["gram", "pcs"].includes(String(item.unit).toLowerCase())
      ),
    [inventory]
  );

  const materialCost = useMemo(() => {
    return items.reduce((total, item) => {
      const inv = usableInventory.find(
        (x) => x.id === item.inventory_id
      );

      return (
        total +
        Number(item.quantity || 0) *
          Number(inv?.cost_per_unit || 0)
      );
    }, 0);
  }, [items, usableInventory]);

  const hpp =
    materialCost +
    Number(labor || 0) +
    Number(packaging || 0);

  const profit = Number(price || 0) - hpp;

  const margin =
    Number(price || 0) > 0
      ? (profit / Number(price || 0)) * 100
      : 0;

  function resetForm() {
    setEditingId(null);
    setName("");
    setPrice("");
    setLabor("");
    setPackaging("");
    setNotes("");
    setItems([{ inventory_id: "", quantity: "" }]);
  }

  function addItem() {
    setItems((current) => [
      ...current,
      { inventory_id: "", quantity: "" },
    ]);
  }

  function removeItem(index: number) {
    setItems((current) =>
      current.filter((_, itemIndex) => itemIndex !== index)
    );
  }

  function changeItem(
    index: number,
    field: "inventory_id" | "quantity",
    value: string
  ) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return { ...item, [field]: value };
      })
    );
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setName(product.name);
    setPrice(String(product.selling_price || ""));
    setLabor(String(product.labor_cost || ""));
    setPackaging(String(product.packaging_cost || ""));
    setNotes(product.notes || "");

    const oldItems = product.product_cost_template_items || [];

    setItems(
      oldItems.length
        ? oldItems.map((item) => ({
            inventory_id: item.inventory_id,
            quantity: String(item.quantity),
          }))
        : [{ inventory_id: "", quantity: "" }]
    );

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveProduct() {
    if (!name.trim()) {
      alert("Nama produk wajib diisi.");
      return;
    }

    if (Number(price || 0) <= 0) {
      alert("Harga jual harus lebih dari 0.");
      return;
    }

    const validItems = items.filter(
      (item) =>
        item.inventory_id &&
        Number(item.quantity || 0) > 0
    );

    if (!validItems.length) {
      alert("Tambahkan minimal 1 material.");
      return;
    }

    setSaving(true);

    const payload = {
      name: name.trim(),
      selling_price: Number(price),
      labor_cost: Number(labor || 0),
      packaging_cost: Number(packaging || 0),
      notes: notes.trim() || null,
      updated_at: new Date().toISOString(),
    };

    let productId = editingId;

    if (editingId) {
      const result = await supabase
        .from("product_cost_templates")
        .update(payload)
        .eq("id", editingId);

      if (result.error) {
        setSaving(false);
        alert(result.error.message);
        return;
      }
    } else {
      const result = await supabase
        .from("product_cost_templates")
        .insert(payload)
        .select("id")
        .single();

      if (result.error || !result.data) {
        setSaving(false);
        alert(
          result.error?.message ||
            "Gagal membuat Product Master."
        );
        return;
      }

      productId = result.data.id;
    }

    const deleteResult = await supabase
      .from("product_cost_template_items")
      .delete()
      .eq("template_id", productId);

    if (deleteResult.error) {
      setSaving(false);
      alert(deleteResult.error.message);
      return;
    }

    const insertResult = await supabase
      .from("product_cost_template_items")
      .insert(
        validItems.map((item) => ({
          template_id: productId,
          inventory_id: item.inventory_id,
          quantity: Number(item.quantity),
        }))
      );

    setSaving(false);

    if (insertResult.error) {
      alert(insertResult.error.message);
      return;
    }

    alert(
      editingId
        ? "Product Master berhasil diperbarui."
        : "Product Master berhasil dibuat."
    );

    resetForm();
    await loadData();
  }

  async function deleteProduct(id: string) {
    const ok = confirm("Hapus Product Master ini?");
    if (!ok) return;

    const result = await supabase
      .from("product_cost_templates")
      .delete()
      .eq("id", id);

    if (result.error) {
      alert(result.error.message);
      return;
    }

    await loadData();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <div className="text-sm text-gray-500">
          Memuat Product Master...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6 md:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-gray-400">
          KIWAY 3D
        </div>

        <h1 className="mt-1 text-3xl font-black">
          Product Master
        </h1>

        <p className="mt-1 text-sm text-gray-500">
          Standar HPP produk berdasarkan Inventory.
        </p>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">
                {editingId ? "Edit Produk" : "Tambah Produk"}
              </h2>

              {editingId && (
                <button
                  onClick={resetForm}
                  className="rounded-xl border px-3 py-2 text-xs font-bold"
                >
                  Batal
                </button>
              )}
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nama Produk">
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Clicker RAHMA"
                />
              </Field>

              <Field label="Harga Jual">
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="84000"
                />
              </Field>

              <Field label="Tenaga Kerja">
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={labor}
                  onChange={(e) => setLabor(e.target.value)}
                  placeholder="0"
                />
              </Field>

              <Field label="Packaging">
                <input
                  className="input"
                  type="number"
                  min="0"
                  value={packaging}
                  onChange={(e) => setPackaging(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>

            <div className="mt-6 flex items-center justify-between">
              <div>
                <h3 className="font-black">
                  Material / Komponen
                </h3>
                <p className="text-xs text-gray-400">
                  Pilih item dari Inventory.
                </p>
              </div>

              <button
                onClick={addItem}
                className="rounded-xl border px-3 py-2 text-xs font-bold"
              >
                + Material
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {items.map((item, index) => {
                const inv = usableInventory.find(
                  (x) => x.id === item.inventory_id
                );

                return (
                  <div
                    key={index}
                    className="rounded-2xl border bg-gray-50 p-3"
                  >
                    <div className="grid gap-2 sm:grid-cols-[1fr_110px_auto]">
                      <select
                        className="input"
                        value={item.inventory_id}
                        onChange={(e) =>
                          changeItem(
                            index,
                            "inventory_id",
                            e.target.value
                          )
                        }
                      >
                        <option value="">
                          Pilih inventory...
                        </option>

                        {usableInventory.map((x) => (
                          <option key={x.id} value={x.id}>
                            {x.name} — {x.unit} — Rp
                            {Number(
                              x.cost_per_unit || 0
                            ).toLocaleString("id-ID")}
                          </option>
                        ))}
                      </select>

                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.1"
                        value={item.quantity}
                        onChange={(e) =>
                          changeItem(
                            index,
                            "quantity",
                            e.target.value
                          )
                        }
                        placeholder="Qty"
                      />

                      <button
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="rounded-xl border bg-white px-3 py-2 text-xs font-bold disabled:opacity-30"
                      >
                        Hapus
                      </button>
                    </div>

                    {inv && (
                      <div className="mt-2 text-xs text-gray-500">
                        {item.quantity || 0} {inv.unit} ×{" "}
                        {money(inv.cost_per_unit)} ={" "}
                        <b>
                          {money(
                            Number(item.quantity || 0) *
                              Number(
                                inv.cost_per_unit || 0
                              )
                          )}
                        </b>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <Field label="Catatan">
              <textarea
                className="input"
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Catatan..."
              />
            </Field>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Mini
                title="Material"
                value={money(materialCost)}
              />
              <Mini
                title="Packaging"
                value={money(Number(packaging || 0))}
              />
              <Mini
                title="Tenaga Kerja"
                value={money(Number(labor || 0))}
              />
              <Mini title="HPP" value={money(hpp)} />
            </div>

            <div className="mt-4 flex items-end justify-between rounded-2xl bg-gray-50 p-5">
              <div>
                <div className="text-xs text-gray-400">
                  Profit Standar
                </div>
                <div
                  className={`text-2xl font-black ${
                    profit < 0 ? "text-red-600" : ""
                  }`}
                >
                  {money(profit)}
                </div>
              </div>

              <div className="text-right">
                <div className="text-xs text-gray-400">
                  Margin
                </div>
                <div className="text-xl font-black">
                  {margin.toFixed(1)}%
                </div>
              </div>
            </div>

            <button
              disabled={saving}
              onClick={saveProduct}
              className="mt-5 w-full rounded-2xl bg-black px-5 py-4 text-sm font-black text-white disabled:opacity-50"
            >
              {saving
                ? "Menyimpan..."
                : editingId
                ? "Simpan Perubahan"
                : "Simpan Product Master"}
            </button>
          </section>

          <section className="rounded-3xl border bg-white p-6 shadow-sm">
            <h2 className="text-xl font-black">
              Produk Terdaftar
            </h2>

            <div className="mt-4 space-y-3">
              {products.length === 0 && (
                <div className="rounded-2xl bg-gray-50 p-6 text-sm text-gray-500">
                  Belum ada Product Master.
                </div>
              )}

              {products.map((product) => {
                const material = (
                  product.product_cost_template_items || []
                ).reduce(
                  (sum, item) =>
                    sum +
                    Number(item.quantity || 0) *
                      Number(
                        item.inventory?.cost_per_unit || 0
                      ),
                  0
                );

                const productHpp =
                  material +
                  Number(product.labor_cost || 0) +
                  Number(product.packaging_cost || 0);

                const productProfit =
                  Number(product.selling_price || 0) -
                  productHpp;

                const productMargin =
                  Number(product.selling_price || 0) > 0
                    ? (productProfit /
                        Number(product.selling_price || 0)) *
                      100
                    : 0;

                return (
                  <div
                    key={product.id}
                    className="rounded-2xl border p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="font-black">
                        {product.name}
                      </div>

                      <div className="font-black">
                        {money(product.selling_price)}
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Mini
                        title="HPP"
                        value={money(productHpp)}
                      />
                      <Mini
                        title="Profit"
                        value={money(productProfit)}
                      />
                      <Mini
                        title="Margin"
                        value={`${productMargin.toFixed(1)}%`}
                      />
                      <Mini
                        title="Komponen"
                        value={`${(
                          product.product_cost_template_items ||
                          []
                        ).length}`}
                      />
                    </div>

                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => startEdit(product)}
                        className="flex-1 rounded-xl border px-3 py-2 text-xs font-bold"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => deleteProduct(product.id)}
                        className="rounded-xl border px-3 py-2 text-xs font-bold text-red-600"
                      >
                        Hapus
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid #e5e7eb;
          background: white;
          padding: 0.75rem 1rem;
          font-size: 0.875rem;
          outline: none;
        }

        .input:focus {
          box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.08);
        }
      `}</style>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">
        {label}
      </div>
      {children}
    </label>
  );
}

function Mini({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-white p-3">
      <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">
        {title}
      </div>
      <div className="mt-1 font-black">{value}</div>
    </div>
  );
}
