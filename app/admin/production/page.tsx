"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Order = {
  id: string;
  order_code?: string | null;
  customer_name?: string | null;
  customer_phone?: string | null;
  product?: string | null;
  custom_name?: string | null;
  quantity?: number | null;
  total?: number | null;
  payment_status?: string | null;
  production_status?: string | null;
  notes?: string | null;
  created_at?: string | null;
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  color?: string | null;
  stock: number;
  unit: string;
  low_stock?: number | null;
  cost_per_unit?: number | null;
};

type RecipeItem = {
  id: string;
  inventory_id: string;
  quantity: number;
  inventory?: InventoryItem | null;
};

type ProductTemplate = {
  id: string;
  name: string;
  selling_price?: number | null;
  labor_cost?: number | null;
  packaging_cost?: number | null;
  notes?: string | null;
  product_cost_template_items?: RecipeItem[];
};

type MaterialDraft = {
  inventory_id: string;
  quantity: number;
};

type ProductionForm = {
  materials: MaterialDraft[];
  finished_inventory_id: string;
  finished_quantity: number;
  notes: string;
};

const STATUS = [
  { key: "new", label: "Pesanan Baru" },
  { key: "processing", label: "Diproses" },
  { key: "finished", label: "Selesai" },
  { key: "shipped", label: "Dikirim" },
] as const;

function rupiah(value: number | null | undefined) {
  return `Rp${Number(value || 0).toLocaleString("id-ID")}`;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/clicker/g, "")
    .replace(/cliker/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

/**
 * Supabase errors are objects. String(error) produces "[object Object]".
 * Keep this helper in one place so the real database error always reaches UI.
 */
function formatError(error: unknown): string {
  if (error instanceof Error) {
    return error.message || "Error tanpa pesan.";
  }

  if (typeof error === "string") {
    return error || "Error tanpa pesan.";
  }

  if (error && typeof error === "object") {
    const value = error as Record<string, unknown>;

    // Supabase/PostgREST normally returns:
    // { message, details, hint, code }
    // But if any nested value is itself an object, String(object)
    // becomes "[object Object]". Never do that here.
    const stringify = (input: unknown): string => {
      if (input === null || input === undefined) return "";
      if (typeof input === "string") return input;
      if (typeof input === "number" || typeof input === "boolean") {
        return String(input);
      }

      try {
        return JSON.stringify(input, null, 2);
      } catch {
        return "";
      }
    };

    const code = stringify(value.code);
    const message = stringify(value.message);
    const details = stringify(value.details);
    const hint = stringify(value.hint);

    const parts = [
      message && `Message: ${message}`,
      details && `Details: ${details}`,
      hint && `Hint: ${hint}`,
      code && `Code: ${code}`,
    ].filter(Boolean);

    if (parts.length) {
      return parts.join("\n");
    }

    return stringify(error) || "Terjadi error yang tidak bisa dibaca.";
  }

  return String(error);
}

function statusLabel(status: string | null | undefined) {
  return STATUS.find((item) => item.key === status)?.label ?? status ?? "-";
}

function statusClass(status: string | null | undefined) {
  if (status === "processing") {
    return "bg-blue-50 text-blue-700 border-blue-200";
  }
  if (status === "finished") {
    return "bg-green-50 text-green-700 border-green-200";
  }
  if (status === "shipped") {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  return "bg-orange-50 text-orange-700 border-orange-200";
}

function findMatchingTemplate(
  order: Order,
  templates: ProductTemplate[]
) {
  const orderNames = [
    order.custom_name,
    order.product,
  ]
    .filter(Boolean)
    .map(normalizeText)
    .filter(Boolean);

  if (!orderNames.length) return null;

  return (
    templates.find((template) => {
      const templateName = normalizeText(template.name);
      if (!templateName) return false;

      return orderNames.some(
        (name) =>
          name === templateName ||
          name.includes(templateName) ||
          templateName.includes(name)
      );
    }) ?? null
  );
}

export default function ProductionPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [templates, setTemplates] = useState<ProductTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [form, setForm] = useState<ProductionForm>({
    materials: [],
    finished_inventory_id: "",
    finished_quantity: 1,
    notes: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [templateMessage, setTemplateMessage] = useState("");

  const loadData = useCallback(async () => {
    setError("");

    const [
      ordersResult,
      inventoryResult,
      templatesResult,
    ] = await Promise.all([
      supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false }),
      supabase
        .from("inventory")
        .select("*")
        .order("name", { ascending: true }),
      supabase
        .from("product_cost_templates")
        .select(
          `
          id,
          name,
          selling_price,
          labor_cost,
          packaging_cost,
          notes,
          product_cost_template_items (
            id,
            inventory_id,
            quantity,
            inventory (
              id,
              name,
              category,
              color,
              stock,
              unit,
              low_stock,
              cost_per_unit
            )
          )
        `
        )
        .order("name", { ascending: true }),
    ]);

    if (ordersResult.error) {
      throw ordersResult.error;
    }
    if (inventoryResult.error) {
      throw inventoryResult.error;
    }
    if (templatesResult.error) {
      throw templatesResult.error;
    }

    setOrders((ordersResult.data ?? []) as Order[]);
    setInventory((inventoryResult.data ?? []) as InventoryItem[]);

    const normalizedTemplates = ((templatesResult.data ?? []) as unknown[]).map(
      (template) => {
        const t = template as Record<string, unknown>;
        return {
          ...t,
          product_cost_template_items:
            (t.product_cost_template_items as RecipeItem[] | null) ?? [],
        } as ProductTemplate;
      }
    );

    setTemplates(normalizedTemplates);
  }, []);

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        await loadData();
      } catch (err) {
        if (alive) setError(formatError(err));
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [loadData]);

  async function refresh() {
    try {
      setRefreshing(true);
      setError("");
      await loadData();
    } catch (err) {
      setError(formatError(err));
    } finally {
      setRefreshing(false);
    }
  }

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();

    if (!q) return orders;

    return orders.filter((order) =>
      [
        order.order_code,
        order.customer_name,
        order.customer_phone,
        order.product,
        order.custom_name,
        order.id,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [orders, search]);

  const grouped = useMemo(() => {
    return STATUS.reduce(
      (acc, status) => {
        acc[status.key] = filteredOrders.filter(
          (order) => (order.production_status ?? "new") === status.key
        );
        return acc;
      },
      {} as Record<string, Order[]>
    );
  }, [filteredOrders]);

  const finishedInventory = useMemo(
    () => inventory.filter((item) => item.unit?.toLowerCase() === "pcs"),
    [inventory]
  );

  const materialInventory = useMemo(
    () => inventory.filter((item) => item.unit?.toLowerCase() === "gram"),
    [inventory]
  );

  function openProduction(order: Order) {
    setSelectedOrder(order);
    setError("");
    setSuccess("");
    setTemplateMessage("");

    const template = findMatchingTemplate(order, templates);
    const quantity = Math.max(Number(order.quantity || 1), 1);

    const recipeMaterials =
      template?.product_cost_template_items
        ?.map((item) => ({
          inventory_id: item.inventory_id,
          quantity: Number(item.quantity || 0) * quantity,
        }))
        .filter((item) => item.quantity > 0) ?? [];

    setForm({
      materials: recipeMaterials,
      finished_inventory_id:
        finishedInventory.find(
          (item) =>
            normalizeText(item.name) ===
            normalizeText(order.custom_name || order.product)
        )?.id ??
        finishedInventory.find(
          (item) =>
            normalizeText(item.name).includes(
              normalizeText(order.custom_name || order.product)
            ) ||
            normalizeText(order.custom_name || order.product).includes(
              normalizeText(item.name)
            )
        )?.id ??
        "",
      finished_quantity: quantity,
      notes: "",
    });

    if (template) {
      setTemplateMessage(
        `Resep "${template.name}" ditemukan. ${recipeMaterials.length} komponen dimuat otomatis.`
      );
    } else {
      setTemplateMessage(
        "Belum ada resep yang cocok. Kamu bisa memilih material secara manual."
      );
    }
  }

  function closeProduction() {
    if (saving) return;
    setSelectedOrder(null);
    setError("");
    setTemplateMessage("");
  }

  function addMaterial() {
    setForm((current) => ({
      ...current,
      materials: [
        ...current.materials,
        {
          inventory_id: materialInventory[0]?.id ?? "",
          quantity: 0,
        },
      ],
    }));
  }

  function removeMaterial(index: number) {
    setForm((current) => ({
      ...current,
      materials: current.materials.filter((_, i) => i !== index),
    }));
  }

  function updateMaterial(
    index: number,
    field: keyof MaterialDraft,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      materials: current.materials.map((material, i) => {
        if (i !== index) return material;

        return {
          ...material,
          [field]:
            field === "quantity" ? Math.max(Number(value) || 0, 0) : value,
        };
      }),
    }));
  }

  function applyRecipe() {
    if (!selectedOrder) return;

    const template = findMatchingTemplate(selectedOrder, templates);

    if (!template) {
      setTemplateMessage(
        `Tidak menemukan resep untuk "${selectedOrder.custom_name || selectedOrder.product || "produk ini"}".`
      );
      return;
    }

    const quantity = Math.max(Number(form.finished_quantity || 1), 1);

    const materials =
      template.product_cost_template_items
        ?.map((item) => ({
          inventory_id: item.inventory_id,
          quantity: Number(item.quantity || 0) * quantity,
        }))
        .filter((item) => item.quantity > 0) ?? [];

    setForm((current) => ({
      ...current,
      materials,
    }));

    setTemplateMessage(
      `Resep "${template.name}" diterapkan untuk ${quantity} pcs.`
    );
    setError("");
  }

  async function saveProduction() {
    if (!selectedOrder) return;

    setError("");
    setSuccess("");

    if (!form.finished_inventory_id) {
      setError("Pilih Produk Jadi terlebih dahulu.");
      return;
    }

    if (!form.finished_quantity || form.finished_quantity < 1) {
      setError("Jumlah Produk Jadi minimal 1 pcs.");
      return;
    }

    const materials = form.materials
      .filter(
        (material) =>
          material.inventory_id && Number(material.quantity) > 0
      )
      .map((material) => ({
        inventory_id: material.inventory_id,
        quantity: Number(material.quantity),
        unit: "gram",
      }));

    if (!materials.length) {
      setError("Minimal satu material harus dipilih.");
      return;
    }

    const insufficient = materials
      .map((material) => {
        const item = inventory.find(
          (inventoryItem) => inventoryItem.id === material.inventory_id
        );

        if (!item) return null;

        if (Number(item.stock) < material.quantity) {
          return `${item.name}: stok ${item.stock} gram, butuh ${material.quantity} gram`;
        }

        return null;
      })
      .filter(Boolean) as string[];

    if (insufficient.length) {
      setError(`Stok tidak cukup — ${insufficient.join("; ")}`);
      return;
    }

    try {
      setSaving(true);

      const { data, error: rpcError } = await supabase.rpc(
  "record_production",
  {
    p_order_id: selectedOrder.id,
    p_order_code: selectedOrder.order_code || null,
    p_materials: materials,
    p_finished_inventory_id: form.finished_inventory_id,
    p_finished_quantity: Number(form.finished_quantity),
    p_notes: form.notes || null,
  }
);

      if (rpcError) {
        const rpcMessage = formatError(rpcError);

        if (
          rpcMessage.toLowerCase().includes("sudah pernah dicatat") ||
          rpcMessage.toLowerCase().includes("already") ||
          rpcMessage.toLowerCase().includes("duplicate")
        ) {
          setError(
            "Produksi untuk order ini sudah tercatat sebelumnya. Stok tidak dipotong lagi."
          );
          return;
        }

        throw rpcError;
      }

      // The RPC is responsible for inventory + production history.
      // Only update the order status after the production transaction succeeds.
      const { error: statusError } = await supabase
        .from("orders")
        .update({ production_status: "finished" })
        .eq("id", selectedOrder.id);

      if (statusError) {
        throw statusError;
      }

      setSuccess(
        `Produksi ${selectedOrder.order_code || selectedOrder.id} berhasil disimpan.`
      );

      await loadData();

      setTimeout(() => {
        setSelectedOrder(null);
        setSuccess("");
      }, 900);

      void data;
    } catch (err) {
      // Do not use console.error here: Next.js DevTools counts it as an Issue.
      // The actual Supabase error is already normalized and shown in the UI.
      setError(formatError(err));
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(order: Order, status: string) {
    try {
      setError("");

      const { error: updateError } = await supabase
        .from("orders")
        .update({ production_status: status })
        .eq("id", order.id);

      if (updateError) throw updateError;

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id
            ? { ...item, production_status: status }
            : item
        )
      );
    } catch (err) {
      setError(formatError(err));
    }
  }

  function sendWhatsApp(order: Order) {
    const phone = String(order.customer_phone || "").replace(/\D/g, "");
    if (!phone) {
      setError("Nomor WhatsApp customer tidak tersedia.");
      return;
    }

    const message = `Halo ${order.customer_name || ""}, pesanan ${
      order.order_code || order.id
    } dari KIWAY sedang ${statusLabel(order.production_status)}.`;

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      "_blank"
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <div className="p-8">
          <div className="h-10 w-64 animate-pulse rounded-xl bg-zinc-200" />
          <div className="mt-6 h-32 animate-pulse rounded-3xl bg-white" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <header className="sticky top-0 z-30 border-b bg-white/90 backdrop-blur">
        <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-500">
              KIWAY 3D
            </p>
            <h1 className="mt-1 text-3xl font-black">Production Board</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Kelola pesanan sampai selesai produksi.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/admin/production/history"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50"
            >
              📜 Riwayat
            </Link>
            <button
              onClick={refresh}
              disabled={refreshing}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-50"
            >
              {refreshing ? "Memuat..." : "↻ Refresh"}
            </button>
          </div>
        </div>

        <div className="border-t px-4 py-4 sm:px-6 lg:px-8">
          <div className="relative max-w-xl">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400">
              🔎
            </span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari order, customer, produk, nomor HP..."
              className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-3 pl-11 pr-4 text-sm outline-none focus:border-orange-400 focus:bg-white"
            />
          </div>
        </div>
      </header>

      {error && (
        <div className="mx-8 mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <div className="font-black">⚠️ Gagal</div>
          <pre className="mt-2 whitespace-pre-wrap break-words font-sans leading-6">
            {error}
          </pre>
        </div>
      )}

      <main className="w-full overflow-x-auto p-4 sm:p-6 lg:p-8">
        <div className="grid w-full min-w-0 grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
          {STATUS.map((status) => {
            const items = grouped[status.key] ?? [];

            return (
              <section key={status.key} className="min-h-[600px]">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h2 className="font-black">{status.label}</h2>
                    <p className="mt-1 text-xs text-zinc-400">
                      {items.length} pesanan
                    </p>
                  </div>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black shadow-sm ring-1 ring-zinc-200">
                    {items.length}
                  </span>
                </div>

                <div className="space-y-4">
                  {items.map((order) => (
                    <article
                      key={order.id}
                      className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold text-orange-500">
                            {order.order_code || order.id.slice(0, 8)}
                          </p>
                          <h3 className="mt-1 font-black">
                            {order.custom_name || order.product || "Produk"}
                          </h3>
                          <p className="mt-1 text-sm text-zinc-500">
                            {order.customer_name || "Customer"}
                          </p>
                        </div>

                        <span
                          className={`rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusClass(
                            order.production_status
                          )}`}
                        >
                          {statusLabel(order.production_status)}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
                        <div className="rounded-xl bg-zinc-50 p-3">
                          <span className="text-zinc-400">Qty</span>
                          <div className="mt-1 font-black">
                            {Number(order.quantity || 1)} pcs
                          </div>
                        </div>
                        <div className="rounded-xl bg-zinc-50 p-3">
                          <span className="text-zinc-400">Total</span>
                          <div className="mt-1 font-black">
                            {rupiah(order.total)}
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 flex gap-2">
                        <button
                          onClick={() => openProduction(order)}
                          className="flex-1 rounded-xl bg-orange-500 px-3 py-2.5 text-xs font-black text-white hover:bg-orange-600"
                        >
                          🏭 Catat Produksi
                        </button>

                        <button
                          onClick={() => sendWhatsApp(order)}
                          className="rounded-xl border border-zinc-200 px-3 py-2.5 text-xs font-bold hover:bg-zinc-50"
                          title="WhatsApp Customer"
                        >
                          WhatsApp
                        </button>
                      </div>

                      <select
                        value={order.production_status || "new"}
                        onChange={(event) =>
                          quickStatus(order, event.target.value)
                        }
                        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-bold outline-none"
                      >
                        {STATUS.map((item) => (
                          <option key={item.key} value={item.key}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </article>
                  ))}

                  {!items.length && (
                    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/60 p-8 text-center text-sm text-zinc-400">
                      Tidak ada pesanan
                    </div>
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {selectedOrder && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4">
          <div className="flex max-h-[94vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.5rem] bg-white shadow-2xl sm:rounded-[2rem]">
            <div className="flex items-start justify-between border-b px-6 py-5">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.2em] text-orange-500">
                  Catat Produksi
                </p>
                <h2 className="mt-1 text-2xl font-black">
                  {selectedOrder.custom_name ||
                    selectedOrder.product ||
                    "Produk"}
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  {selectedOrder.order_code || selectedOrder.id} ·{" "}
                  {selectedOrder.customer_name || "Customer"}
                </p>
              </div>

              <button
                onClick={closeProduction}
                className="rounded-full bg-zinc-100 px-4 py-2 text-xl font-bold hover:bg-zinc-200"
              >
                ×
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-6">
              <div className="rounded-2xl bg-blue-50 p-4 text-sm text-blue-700">
                <b>Stok otomatis berkurang dalam gram.</b>
                <br />
                Material yang kamu pilih akan dipotong saat produksi berhasil
                disimpan.
              </div>

              {templateMessage && (
                <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-4 text-sm text-orange-700">
                  {templateMessage}
                </div>
              )}

              <div className="mt-6 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black">Material</h3>
                  <p className="text-xs text-zinc-400">
                    Komponen resep dikalikan jumlah produk jadi.
                  </p>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={applyRecipe}
                    className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs font-black text-orange-700 hover:bg-orange-100"
                  >
                    ⚡ Gunakan Resep
                  </button>
                  <button
                    onClick={addMaterial}
                    className="rounded-xl bg-zinc-900 px-3 py-2 text-xs font-black text-white hover:bg-orange-500"
                  >
                    + Material
                  </button>
                </div>
              </div>

              <div className="mt-4 space-y-3">
                {form.materials.map((material, index) => {
                  const item = inventory.find(
                    (inventoryItem) =>
                      inventoryItem.id === material.inventory_id
                  );

                  return (
                    <div
                      key={`${material.inventory_id}-${index}`}
                      className="rounded-2xl border border-zinc-200 p-4"
                    >
                      <div className="grid gap-3 sm:grid-cols-[1fr_140px_auto] sm:items-center">
                        <select
                          value={material.inventory_id}
                          onChange={(event) =>
                            updateMaterial(
                              index,
                              "inventory_id",
                              event.target.value
                            )
                          }
                          className="rounded-xl border border-zinc-200 bg-white px-3 py-3 text-sm font-bold outline-none"
                        >
                          <option value="">Pilih material</option>
                          {materialInventory.map((inventoryItem) => (
                            <option
                              key={inventoryItem.id}
                              value={inventoryItem.id}
                            >
                              {inventoryItem.name} — {inventoryItem.stock} gram
                            </option>
                          ))}
                        </select>

                        <input
                          type="number"
                          min="0"
                          step="0.1"
                          value={material.quantity}
                          onChange={(event) =>
                            updateMaterial(
                              index,
                              "quantity",
                              event.target.value
                            )
                          }
                          className="rounded-xl border border-zinc-200 px-3 py-3 text-sm font-black outline-none"
                        />

                        <button
                          onClick={() => removeMaterial(index)}
                          className="rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50"
                        >
                          Hapus
                        </button>
                      </div>

                      <div className="mt-2 text-xs text-zinc-400">
                        Stok tersedia:{" "}
                        <b className="text-zinc-700">
                          {item?.stock ?? 0} gram
                        </b>
                      </div>
                    </div>
                  );
                })}

                {!form.materials.length && (
                  <div className="rounded-2xl border border-dashed border-zinc-200 p-6 text-center text-sm text-zinc-400">
                    Belum ada material. Gunakan resep atau tambah material
                    manual.
                  </div>
                )}
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-black">Produk Jadi</h3>
                <p className="mt-1 text-xs text-zinc-400">
                  Pilih inventory dengan unit pcs. Stok akan otomatis bertambah.
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_140px]">
                  <select
                    value={form.finished_inventory_id}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        finished_inventory_id: event.target.value,
                      }))
                    }
                    className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold outline-none"
                  >
                    <option value="">Pilih Produk Jadi</option>
                    {finishedInventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} — {item.stock} pcs
                      </option>
                    ))}
                  </select>

                  <input
                    type="number"
                    min="1"
                    value={form.finished_quantity}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        finished_quantity: Math.max(
                          Number(event.target.value) || 1,
                          1
                        ),
                      }))
                    }
                    className="rounded-xl border border-zinc-200 px-4 py-3 text-sm font-black outline-none"
                  />
                </div>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-black">Catatan</h3>
                <textarea
                  value={form.notes}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      notes: event.target.value,
                    }))
                  }
                  placeholder="Contoh: SUDAH SELESAI"
                  rows={3}
                  className="mt-3 w-full rounded-2xl border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-orange-400"
                />
              </div>

              {error && (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                  <div className="font-black">Gagal menyimpan produksi</div>
                  <pre className="mt-2 whitespace-pre-wrap break-words font-sans leading-6">
                    {error}
                  </pre>
                </div>
              )}

              {success && (
                <div className="mt-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-bold text-green-700">
                  ✓ {success}
                </div>
              )}

              <div className="mt-6 rounded-2xl bg-zinc-100 p-4 text-sm text-zinc-600">
                <div className="font-black text-zinc-900">
                  Yang akan terjadi:
                </div>
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>Filament yang dipilih berkurang sesuai gram pemakaian.</li>
                  <li>Produk jadi bertambah sesuai jumlah pcs.</li>
                  <li>Transaksi material tersimpan dengan order code.</li>
                  <li>Status pesanan otomatis menjadi Selesai.</li>
                  <li>Biaya material masuk ke riwayat dan laporan profit.</li>
                </ul>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t bg-white px-6 py-4">
              <button
                onClick={closeProduction}
                disabled={saving}
                className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-black hover:bg-zinc-50 disabled:opacity-50"
              >
                Batal
              </button>
              <button
                onClick={saveProduction}
                disabled={saving}
                className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Produksi"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
