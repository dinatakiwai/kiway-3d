"use client";

import { FormEvent, MouseEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Unit = "gram" | "pcs";
type Inventory = {
  id: string;
  name: string;
  category: string;
  color: string | null;
  stock: number;
  unit: Unit;
  low_stock: number;
  cost_per_unit: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type Modal = "add" | "stock" | "edit" | null;

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default function InventoryPage() {
  const [items, setItems] = useState<Inventory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [modal, setModal] = useState<Modal>(null);
  const [selected, setSelected] = useState<Inventory | null>(null);
  const [stockAction, setStockAction] = useState<"add" | "remove">("add");
  const [stockAmount, setStockAmount] = useState("");
  const [copySourceId, setCopySourceId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [actionMenuId, setActionMenuId] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState({ top: 0, left: 0 });
  const [sortConfig, setSortConfig] = useState<{ key: "name" | "category" | "stock" | "cost" | "low" | "status"; direction: "asc" | "desc" } | null>(null);
  const [form, setForm] = useState({
    name: "",
    category: "filament",
    color: "",
    stock: "0",
    unit: "gram" as Unit,
    low_stock: "200",
    cost_per_unit: "0",
    notes: "",
  });

  async function loadItems() {
    setLoading(true);
    setError("");

    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      window.location.href = "/admin/login";
      return;
    }

    const { data, error: queryError } = await supabase
      .from("inventory")
      .select(
        "id,name,category,color,stock,unit,low_stock,cost_per_unit,notes,created_at,updated_at"
      )
      .order("name");

    if (queryError) setError(queryError.message);
    else {
      setItems((data ?? []) as Inventory[]);
      setSelectedIds((current) =>
        current.filter((id) => (data ?? []).some((item) => item.id === id))
      );
    }

    setLoading(false);
  }

  useEffect(() => {
    loadItems();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    return items.filter((item) => {
      const matchesSearch =
        !q ||
        [item.name, item.category, item.color, item.notes]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));

      const matchesCategory =
        category === "all" || item.category === category;

      const stock = Number(item.stock || 0);
      const low = Number(item.low_stock || 0);
      const itemStatus =
        stock <= 0 ? "empty" : stock <= low ? "low" : "safe";

      const matchesStatus = status === "all" || status === itemStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, search, category, status]);

  const sortedFiltered = useMemo(() => {
    if (!sortConfig) return filtered;

    const result = [...filtered];
    const direction = sortConfig.direction === "asc" ? 1 : -1;

    result.sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";

      switch (sortConfig.key) {
        case "name":
          av = a.name.toLowerCase();
          bv = b.name.toLowerCase();
          break;
        case "category":
          av = a.category.toLowerCase();
          bv = b.category.toLowerCase();
          break;
        case "stock":
          av = Number(a.stock || 0);
          bv = Number(b.stock || 0);
          break;
        case "cost":
          av = Number(a.cost_per_unit || 0);
          bv = Number(b.cost_per_unit || 0);
          break;
        case "low":
          av = Number(a.low_stock || 0);
          bv = Number(b.low_stock || 0);
          break;
        case "status": {
          const statusRank = (item: Inventory) => {
            const stock = Number(item.stock || 0);
            const low = Number(item.low_stock || 0);
            return stock <= 0 ? 0 : stock <= low ? 1 : 2;
          };
          av = statusRank(a);
          bv = statusRank(b);
          break;
        }
      }

      if (av < bv) return -1 * direction;
      if (av > bv) return 1 * direction;
      return 0;
    });

    return result;
  }, [filtered, sortConfig]);

  function toggleSort(key: "name" | "category" | "stock" | "cost" | "low" | "status") {
    setSortConfig((current) => {
      if (!current || current.key !== key) {
        return { key, direction: "asc" };
      }
      if (current.direction === "asc") {
        return { key, direction: "desc" };
      }
      return null;
    });
  }

  function sortIcon(key: "name" | "category" | "stock" | "cost" | "low" | "status") {
    if (!sortConfig || sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  }

  const gramStock = items
    .filter((x) => x.unit === "gram")
    .reduce((s, x) => s + Number(x.stock || 0), 0);

  const pcsStock = items
    .filter((x) => x.unit === "pcs")
    .reduce((s, x) => s + Number(x.stock || 0), 0);

  const lowCount = items.filter(
    (x) => Number(x.stock || 0) > 0 && Number(x.stock || 0) <= Number(x.low_stock || 0)
  ).length;

  const emptyCount = items.filter((x) => Number(x.stock || 0) <= 0).length;

  const stockValue = items.reduce(
    (s, x) => s + Number(x.stock || 0) * Number(x.cost_per_unit || 0),
    0
  );

  function openAdd() {
    setError("");
    setCopySourceId("");
    setForm({
      name: "",
      category: "filament",
      color: "",
      stock: "0",
      unit: "gram",
      low_stock: "200",
      cost_per_unit: "0",
      notes: "",
    });
    setModal("add");
  }

  function copyItem(item: Inventory) {
    setError("");
    setSelected(null);
    setCopySourceId(item.id);
    setForm({
      name: item.name,
      category: item.category,
      color: item.color ?? "",
      stock: String(item.stock ?? 0),
      unit: item.unit,
      low_stock: String(item.low_stock ?? 0),
      cost_per_unit: String(item.cost_per_unit ?? 0),
      notes: item.notes ?? "",
    });
    setModal("add");
  }

  function openEdit(item: Inventory) {
    setError("");
    setCopySourceId("");
    setSelected(item);
    setForm({
      name: item.name,
      category: item.category,
      color: item.color ?? "",
      stock: String(item.stock ?? 0),
      unit: item.unit,
      low_stock: String(item.low_stock ?? 0),
      cost_per_unit: String(item.cost_per_unit ?? 0),
      notes: item.notes ?? "",
    });
    setModal("edit");
  }

  async function editItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    setSaving(true);
    setError("");

    const stock = Number(form.stock);
    const low = Number(form.low_stock);
    const rawCost = Number(form.cost_per_unit);
    const cost = form.unit === "gram" ? rawCost / 1000 : rawCost;

    if (stock < 0 || low < 0 || rawCost < 0) {
      setError("Nilai stok, minimum, dan modal tidak boleh negatif.");
      setSaving(false);
      return;
    }

    const { error: updateError } = await supabase
      .from("inventory")
      .update({
        name: form.name.trim(),
        category: form.category,
        color: form.color.trim() || null,
        stock,
        unit: form.unit,
        low_stock: low,
        cost_per_unit: cost,
        notes: form.notes.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", selected.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setModal(null);
      setSelected(null);
      await loadItems();
    }

    setSaving(false);
  }

  function openStock(item: Inventory, action: "add" | "remove") {
    setError("");
    setSelected(item);
    setStockAction(action);
    setStockAmount("");
    setModal("stock");
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");

    const stock = Number(form.stock);
    const low = Number(form.low_stock);
    const rawCost = Number(form.cost_per_unit);
    const cost = form.unit === "gram" ? rawCost / 1000 : rawCost;

    if (stock < 0 || low < 0 || rawCost < 0) {
      setError("Nilai stok, minimum, dan modal tidak boleh negatif.");
      setSaving(false);
      return;
    }

    const { error: insertError } = await supabase.from("inventory").insert({
      name: form.name.trim(),
      category: form.category,
      color: form.color.trim() || null,
      stock,
      unit: form.unit,
      low_stock: low,
      cost_per_unit: cost,
      notes: form.notes.trim() || null,
    });

    if (insertError) setError(insertError.message);
    else {
      setModal(null);
      await loadItems();
    }

    setSaving(false);
  }

  async function changeStock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;

    const amount = Number(stockAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Jumlah harus lebih dari 0.");
      return;
    }

    const current = Number(selected.stock || 0);
    const next = stockAction === "add" ? current + amount : current - amount;

    if (next < 0) {
      setError(`Stok tidak cukup. Stok sekarang ${current} ${selected.unit}.`);
      return;
    }

    setSaving(true);
    setError("");

    const { error: updateError } = await supabase
      .from("inventory")
      .update({ stock: next, updated_at: new Date().toISOString() })
      .eq("id", selected.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setModal(null);
      await loadItems();
    }

    setSaving(false);
  }

  function toggleActionMenu(event: MouseEvent<HTMLButtonElement>, id: string) {
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = id.startsWith("menu-") ? 150 : 170;
    const menuHeight = id.startsWith("menu-") ? 145 : 105;

    let left = rect.right - menuWidth;
    let top = rect.bottom + 8;

    // If there isn't enough room below the button, open upward.
    if (window.innerHeight - rect.bottom < menuHeight + 16) {
      top = rect.top - menuHeight - 8;
    }

    // Keep the floating menu inside the viewport.
    left = Math.max(8, Math.min(left, window.innerWidth - menuWidth - 8));
    top = Math.max(8, Math.min(top, window.innerHeight - menuHeight - 8));

    setActionMenuPos({ top, left });
    setActionMenuId(actionMenuId === id ? null : id);
  }

  function toggleSelected(id: string) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((x) => x !== id)
        : [...current, id]
    );
  }

  function toggleSelectAll() {
    const visibleIds = filtered.map((item) => item.id);
    const allVisibleSelected =
      visibleIds.length > 0 &&
      visibleIds.every((id) => selectedIds.includes(id));

    if (allVisibleSelected) {
      setSelectedIds((current) =>
        current.filter((id) => !visibleIds.includes(id))
      );
    } else {
      setSelectedIds((current) => [...new Set([...current, ...visibleIds])]);
    }
  }

  async function deleteSelected() {
    if (!selectedIds.length) return;

    const selectedItems = items.filter((item) => selectedIds.includes(item.id));
    if (
      !window.confirm(
        `Hapus ${selectedItems.length} item yang dipilih?\\n\\nItem yang masih dipakai Product Master akan dilewati.`
      )
    ) {
      return;
    }

    setSaving(true);
    setError("");

    const failed: string[] = [];
    const deleted: string[] = [];

    for (const item of selectedItems) {
      const { error: deleteError } = await supabase
        .from("inventory")
        .delete()
        .eq("id", item.id);

      if (deleteError) failed.push(item.name);
      else deleted.push(item.id);
    }

    setSelectedIds((current) =>
      current.filter((id) => !deleted.includes(id))
    );
    await loadItems();

    if (failed.length) {
      setError(
        `Berhasil menghapus ${deleted.length} item. Tidak bisa menghapus: ${failed.join(
          ", "
        )}. Item tersebut masih dipakai oleh resep Product Master.`
      );
    }

    setSaving(false);
  }

  async function deleteItem(item: Inventory) {
    if (!window.confirm(`Hapus "${item.name}" dari inventory?`)) return;

    setError("");
    const { error: deleteError } = await supabase
      .from("inventory")
      .delete()
      .eq("id", item.id);

    if (deleteError) setError(deleteError.message);
    else await loadItems();
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              KIWAY 3D
            </p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">
              Inventory
            </h1>
            <p className="mt-2 text-sm text-zinc-500">
              Kelola stok filament dalam gram dan produk dalam pcs.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadItems}
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold shadow-sm hover:bg-zinc-100"
            >
              ↻ Refresh
            </button>
            <button
              onClick={openAdd}
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-sm hover:bg-orange-600"
            >
              + Tambah Inventory
            </button>
          </div>
        </div>

        <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            ["Filament", `${gramStock.toLocaleString("id-ID")} g`],
            ["Produk", `${pcsStock.toLocaleString("id-ID")} pcs`],
            ["Menipis", String(lowCount)],
            ["Habis", String(emptyCount)],
            ["Nilai Stok", rupiah(stockValue)],
          ].map(([label, value]) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <p className="text-xs font-bold text-zinc-500">{label}</p>
              <p className="mt-1 text-xl font-black">{value}</p>
            </div>
          ))}
        </div>

        <div className="mb-6 grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama, warna, catatan..."
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold"
          >
            <option value="all">Semua kategori</option>
            <option value="filament">Filament</option>
            <option value="product">Produk</option>
            <option value="material">Material</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold"
          >
            <option value="all">Semua status</option>
            <option value="safe">Aman</option>
            <option value="low">Menipis</option>
            <option value="empty">Habis</option>
          </select>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {selectedIds.length > 0 && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-black text-red-700">
                {selectedIds.length} item dipilih
              </p>
              <p className="text-xs text-red-600">
                Item yang masih dipakai Product Master akan dilewati.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100"
              >
                Batal Pilih
              </button>
              <button
                type="button"
                onClick={deleteSelected}
                disabled={saving}
                className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white hover:bg-red-700 disabled:opacity-50"
              >
                🗑 Hapus {selectedIds.length} Item
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-zinc-200 bg-white p-10 text-center text-zinc-500">
            Memuat inventory...
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="min-w-[1050px] w-full text-left text-sm">
                <thead className="border-b border-zinc-200 bg-zinc-50">
                  <tr>
                    <th className="w-12 px-3 py-4 text-center">
                      <input
                        type="checkbox"
                        checked={
                          filtered.length > 0 &&
                          filtered.every((item) => selectedIds.includes(item.id))
                        }
                        onChange={toggleSelectAll}
                        className="h-4 w-4 cursor-pointer accent-orange-500"
                        title="Pilih semua"
                      />
                    </th>
                    <th className="px-5 py-4 font-black">
                      <button type="button" onClick={() => toggleSort("name")} className="flex items-center gap-1.5 hover:text-orange-600">
                        Item <span className="text-zinc-400">{sortIcon("name")}</span>
                      </button>
                    </th>
                    <th className="px-5 py-4 font-black">
                      <button type="button" onClick={() => toggleSort("category")} className="flex items-center gap-1.5 hover:text-orange-600">
                        Kategori <span className="text-zinc-400">{sortIcon("category")}</span>
                      </button>
                    </th>
                    <th className="px-5 py-4 font-black">
                      <button type="button" onClick={() => toggleSort("stock")} className="flex items-center gap-1.5 hover:text-orange-600">
                        Stok <span className="text-zinc-400">{sortIcon("stock")}</span>
                      </button>
                    </th>
                    <th className="px-5 py-4 font-black">
                      <button type="button" onClick={() => toggleSort("cost")} className="flex items-center gap-1.5 hover:text-orange-600">
                        Modal / Unit <span className="text-zinc-400">{sortIcon("cost")}</span>
                      </button>
                    </th>
                    <th className="px-5 py-4 font-black">
                      <button type="button" onClick={() => toggleSort("low")} className="flex items-center gap-1.5 hover:text-orange-600">
                        Minimum <span className="text-zinc-400">{sortIcon("low")}</span>
                      </button>
                    </th>
                    <th className="px-5 py-4 font-black">
                      <button type="button" onClick={() => toggleSort("status")} className="flex items-center gap-1.5 hover:text-orange-600">
                        Status <span className="text-zinc-400">{sortIcon("status")}</span>
                      </button>
                    </th>
                    <th className="px-5 py-4 font-black">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {sortedFiltered.map((item) => {
                    const stock = Number(item.stock || 0);
                    const low = Number(item.low_stock || 0);
                    const state =
                      stock <= 0 ? "Habis" : stock <= low ? "Menipis" : "Aman";

                    return (
                      <tr
                        key={item.id}
                        className={`hover:bg-zinc-50 ${
                          selectedIds.includes(item.id) ? "bg-orange-50/50" : ""
                        }`}
                      >
                        <td className="w-12 px-3 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(item.id)}
                            onChange={() => toggleSelected(item.id)}
                            className="h-4 w-4 cursor-pointer accent-orange-500"
                          />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span
                              title={item.color || "Warna belum diisi"}
                              className="h-9 w-9 shrink-0 rounded-full border-2 border-white shadow-md ring-1 ring-zinc-200"
                              style={{
                                backgroundColor: item.color || "#d4d4d8",
                                backgroundImage: item.color
                                  ? "none"
                                  : "linear-gradient(45deg, #e4e4e7 25%, transparent 25%, transparent 75%, #e4e4e7 75%), linear-gradient(45deg, #e4e4e7 25%, transparent 25%, transparent 75%, #e4e4e7 75%)",
                                backgroundPosition: item.color
                                  ? undefined
                                  : "0 0, 6px 6px",
                                backgroundSize: item.color
                                  ? undefined
                                  : "12px 12px",
                              }}
                            />
                            <div className="min-w-0">
                              <p className="font-black">{item.name}</p>
                              {item.color && (
                                <p className="text-xs text-zinc-500">{item.color}</p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 capitalize text-zinc-600">
                          {item.category}
                        </td>
                        <td className="px-5 py-4 font-black">
                          {stock.toLocaleString("id-ID")} {item.unit}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold">
                            {rupiah(Number(item.cost_per_unit || 0))}
                          </p>
                          <p className="text-xs text-zinc-400">
                            per {item.unit === "gram" ? "gram" : "pcs"}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-zinc-500">
                          {Number(item.low_stock || 0).toLocaleString("id-ID")}{" "}
                          {item.unit}
                        </td>
                        <td className="px-5 py-4">
                          <span className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold">
                            {state}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={(event) =>
                                  toggleActionMenu(event, item.id)
                                }
                                className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-black text-white hover:bg-zinc-700"
                              >
                                Stok ▾
                              </button>

                              {actionMenuId === item.id && (
                                <div
                                  className="fixed z-[200] w-[170px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl"
                                  style={{
                                    top: actionMenuPos.top,
                                    left: actionMenuPos.left,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      openStock(item, "add");
                                    }}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:bg-zinc-100"
                                  >
                                    ＋ Tambah Stok
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      openStock(item, "remove");
                                    }}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:bg-zinc-100"
                                  >
                                    − Kurangi Stok
                                  </button>
                                </div>
                              )}
                            </div>

                            <div className="relative">
                              <button
                                type="button"
                                onClick={(event) =>
                                  toggleActionMenu(event, `menu-${item.id}`)
                                }
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-200 bg-white text-lg font-black hover:bg-zinc-100"
                                title="Menu lainnya"
                              >
                                ⋮
                              </button>

                              {actionMenuId === `menu-${item.id}` && (
                                <div
                                  className="fixed z-[200] w-[150px] overflow-hidden rounded-xl border border-zinc-200 bg-white p-1.5 shadow-2xl"
                                  style={{
                                    top: actionMenuPos.top,
                                    left: actionMenuPos.left,
                                  }}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      copyItem(item);
                                    }}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:bg-zinc-100"
                                  >
                                    📋 Salin
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      openEdit(item);
                                    }}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold hover:bg-zinc-100"
                                  >
                                    ✏️ Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActionMenuId(null);
                                      deleteItem(item);
                                    }}
                                    className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-bold text-red-600 hover:bg-red-50"
                                  >
                                    🗑 Hapus
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {!filtered.length && (
              <div className="p-12 text-center text-sm text-zinc-400">
                Belum ada item yang cocok.
              </div>
            )}
          </div>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-orange-600">
                  KIWAY 3D
                </p>
                <h2 className="mt-1 text-xl font-black">
                  {modal === "add"
                    ? "Tambah Inventory"
                    : modal === "edit"
                    ? "Edit Inventory"
                    : `${stockAction === "add" ? "Tambah" : "Kurangi"} Stok`}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full bg-zinc-100 px-3 py-2 font-bold"
              >
                ✕
              </button>
            </div>

            {modal === "add" || modal === "edit" ? (
              <form onSubmit={modal === "add" ? addItem : editItem} className="mt-6 space-y-4">
                {modal === "add" && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <label className="mb-2 block text-xs font-black uppercase tracking-wide text-blue-700">
                      📋 Salin dari item yang sudah ada
                    </label>
                    <select
                      value={copySourceId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setCopySourceId(id);
                        if (!id) {
                          setForm({
                            name: "",
                            category: "filament",
                            color: "",
                            stock: "0",
                            unit: "gram",
                            low_stock: "200",
                            cost_per_unit: "0",
                            notes: "",
                          });
                          return;
                        }

                        const source = items.find((item) => item.id === id);
                        if (!source) return;

                        setForm({
                          name: source.name,
                          category: source.category,
                          color: source.color ?? "",
                          stock: String(source.stock ?? 0),
                          unit: source.unit,
                          low_stock: String(source.low_stock ?? 0),
                          cost_per_unit: String(source.cost_per_unit ?? 0),
                          notes: source.notes ?? "",
                        });
                      }}
                      className="w-full rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold outline-none focus:ring-2 focus:ring-blue-400"
                    >
                      <option value="">— Buat item baru dari kosong —</option>
                      {items.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.name} • {item.color || "Tanpa warna"} • {item.stock} {item.unit} • {rupiah(Number(item.cost_per_unit || 0))}/{item.unit}
                        </option>
                      ))}
                    </select>
                    <p className="mt-2 text-xs text-blue-600">
                      Semua data akan disalin. Kamu tinggal ubah nama atau warna jika perlu.
                    </p>
                  </div>
                )}

                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Nama item, contoh: PLA White"
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
                />

                <div className="grid gap-3 sm:grid-cols-2">
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="rounded-xl border border-zinc-200 px-4 py-3"
                  >
                    <option value="filament">Filament</option>
                    <option value="product">Produk</option>
                    <option value="material">Material</option>
                  </select>

                  <div className="rounded-xl border border-zinc-200 bg-white p-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={
                          /^#[0-9A-Fa-f]{6}$/.test(form.color)
                            ? form.color
                            : "#d4d4d8"
                        }
                        onChange={(e) =>
                          setForm({ ...form, color: e.target.value.toUpperCase() })
                        }
                        className="h-10 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
                        title="Pilih warna"
                      />
                      <input
                        value={form.color}
                        onChange={(e) =>
                          setForm({ ...form, color: e.target.value })
                        }
                        placeholder="#FFFFFF atau nama warna"
                        className="min-w-0 flex-1 px-2 py-2 text-sm outline-none"
                      />
                    </div>
                    <p className="mt-1 px-2 text-[11px] text-zinc-400">
                      Klik kotak warna untuk memilih secara visual.
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-500">
                      Stok awal
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.stock}
                      onChange={(e) => setForm({ ...form, stock: e.target.value })}
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-500">
                      Unit
                    </label>
                    <select
                      value={form.unit}
                      onChange={(e) =>
                        setForm({ ...form, unit: e.target.value as Unit })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3"
                    >
                      <option value="gram">Gram</option>
                      <option value="pcs">Pcs</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-500">
                      {form.unit === "gram" ? "Harga beli / kg" : "Modal / pcs"}
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={form.cost_per_unit}
                        onChange={(e) =>
                          setForm({ ...form, cost_per_unit: e.target.value })
                        }
                        placeholder={form.unit === "gram" ? "190000" : "500"}
                        className="w-full rounded-xl border border-zinc-200 px-4 py-3 pr-16"
                      />
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                        {form.unit === "gram" ? "/ kg" : "/ pcs"}
                      </span>
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-bold text-zinc-500">
                      Batas minimum
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.low_stock}
                      onChange={(e) =>
                        setForm({ ...form, low_stock: e.target.value })
                      }
                      className="w-full rounded-xl border border-zinc-200 px-4 py-3"
                    />
                  </div>
                </div>

                <div className="rounded-xl bg-orange-50 px-4 py-3 text-xs text-orange-800">
                  Filament: isi modal per gram. Contoh Rp180.000/kg =
                  Rp180/gram. Produk: isi modal per pcs.
                </div>

                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Catatan (opsional)"
                  rows={3}
                  className="w-full rounded-xl border border-zinc-200 px-4 py-3"
                />

                <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={changeStock} className="mt-6 space-y-5">
                <div>
                  <p className="font-black">{selected?.name}</p>
                  <p className="mt-1 text-sm text-zinc-500">
                    Stok sekarang:{" "}
                    {Number(selected?.stock || 0).toLocaleString("id-ID")}{" "}
                    {selected?.unit}
                  </p>
                  <p className="mt-1 text-xs text-zinc-400">
                    Modal / unit: {rupiah(Number(selected?.cost_per_unit || 0))}
                  </p>
                </div>

                <input
                  autoFocus
                  required
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={stockAmount}
                  onChange={(e) => setStockAmount(e.target.value)}
                  placeholder={
                    selected?.unit === "pcs" ? "Jumlah pcs" : "Jumlah gram"
                  }
                  className="w-full rounded-xl border border-zinc-200 px-4 py-4 text-lg font-bold outline-none focus:ring-2 focus:ring-orange-500"
                />

                {error && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div className="flex justify-end gap-3 border-t border-zinc-200 pt-5">
                  <button
                    type="button"
                    onClick={() => setModal(null)}
                    className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
                  >
                    {saving ? "Menyimpan..." : "Simpan"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
