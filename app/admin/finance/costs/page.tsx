"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Cost = {
  id: string;
  name: string;
  category: string;
  amount: number;
  cost_date: string;
  notes: string | null;
  created_at: string;
};

const CATEGORIES = [
  ["electricity", "Listrik"],
  ["packaging", "Packaging"],
  ["maintenance", "Maintenance"],
  ["component", "Komponen"],
  ["labor", "Tenaga Kerja"],
  ["shipping", "Ongkir"],
  ["other", "Lainnya"],
];

const rupiah = (n: number) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(n);

export default function OperatingCostsPage() {
  const [items, setItems] = useState<Cost[]>([]);
  const [period, setPeriod] = useState<"today" | "7" | "30" | "all">("30");
  const [modal, setModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    category: "electricity",
    amount: "",
    cost_date: new Date().toISOString().slice(0, 10),
    notes: "",
  });

  async function load() {
    setError("");
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      window.location.href = "/admin/login";
      return;
    }

    const { data, error: queryError } = await supabase
      .from("operating_costs")
      .select("*")
      .order("cost_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (queryError) setError(queryError.message);
    else setItems((data ?? []) as Cost[]);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    const now = new Date();
    now.setHours(23, 59, 59, 999);

    return items.filter((item) => {
      if (period === "all") return true;

      const date = new Date(`${item.cost_date}T23:59:59`);

      if (period === "today") {
        return item.cost_date === new Date().toISOString().slice(0, 10);
      }

      const days = period === "7" ? 7 : 30;
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - (days - 1));
      return date >= start && date <= now;
    });
  }, [items, period]);

  const total = filtered.reduce((s, x) => s + Number(x.amount || 0), 0);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    filtered.forEach((item) => {
      map.set(
        item.category,
        (map.get(item.category) ?? 0) + Number(item.amount || 0)
      );
    });
    return CATEGORIES.map(([key, label]) => ({
      key,
      label,
      amount: map.get(key) ?? 0,
    })).filter((x) => x.amount > 0);
  }, [filtered]);

  function resetForm() {
    setForm({
      name: "",
      category: "electricity",
      amount: "",
      cost_date: new Date().toISOString().slice(0, 10),
      notes: "",
    });
  }

  async function addCost(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const amount = Number(form.amount);

    if (!form.name.trim() || !Number.isFinite(amount) || amount <= 0) {
      setError("Nama biaya dan nominal wajib diisi.");
      return;
    }

    setSaving(true);
    setError("");

    const { error: insertError } = await supabase.from("operating_costs").insert({
      name: form.name.trim(),
      category: form.category,
      amount,
      cost_date: form.cost_date,
      notes: form.notes.trim() || null,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setModal(false);
      resetForm();
      await load();
    }

    setSaving(false);
  }

  async function deleteCost(item: Cost) {
    if (!window.confirm(`Hapus biaya "${item.name}" sebesar ${rupiah(item.amount)}?`))
      return;

    const { error: deleteError } = await supabase
      .from("operating_costs")
      .delete()
      .eq("id", item.id);

    if (deleteError) setError(deleteError.message);
    else await load();
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              KIWAY 3D
            </p>
            <h1 className="mt-1 text-3xl font-black">Biaya Operasional</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Catat listrik, packaging, maintenance, komponen, tenaga kerja, dan biaya lain.
            </p>
          </div>
          <button
            onClick={() => {
              setError("");
              resetForm();
              setModal(true);
            }}
            className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-600"
          >
            + Tambah Biaya
          </button>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["today", "Hari Ini"],
            ["7", "7 Hari"],
            ["30", "30 Hari"],
            ["all", "Semua"],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setPeriod(value as typeof period)}
              className={`rounded-xl px-4 py-2 text-sm font-bold ${
                period === value
                  ? "bg-zinc-900 text-white"
                  : "border border-zinc-200 bg-white hover:bg-zinc-100"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="mb-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Total Biaya</p>
            <p className="mt-1 text-2xl font-black">{rupiah(total)}</p>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-bold text-zinc-500">Jumlah Transaksi</p>
            <p className="mt-1 text-2xl font-black">{filtered.length}</p>
          </div>
        </div>

        <div className="mb-6 grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
          <section className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="font-black">Biaya per Kategori</h2>
            <div className="mt-5 space-y-4">
              {byCategory.length ? (
                byCategory.map((item) => (
                  <div key={item.key}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-bold">{item.label}</span>
                      <span className="font-black">{rupiah(item.amount)}</span>
                    </div>
                    <div className="h-3 rounded-full bg-zinc-100">
                      <div
                        className="h-3 rounded-full bg-orange-500"
                        style={{ width: `${Math.max(4, (item.amount / Math.max(total, 1)) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <p className="py-8 text-center text-sm text-zinc-400">
                  Belum ada biaya pada periode ini.
                </p>
              )}
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="font-black">Riwayat Biaya</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-[760px] w-full text-left text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <th className="px-5 py-4 font-black">Tanggal</th>
                    <th className="px-5 py-4 font-black">Nama</th>
                    <th className="px-5 py-4 font-black">Kategori</th>
                    <th className="px-5 py-4 font-black">Nominal</th>
                    <th className="px-5 py-4 font-black">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4 text-zinc-500">{item.cost_date}</td>
                      <td className="px-5 py-4">
                        <p className="font-bold">{item.name}</p>
                        {item.notes && <p className="text-xs text-zinc-400">{item.notes}</p>}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {CATEGORIES.find(([key]) => key === item.category)?.[1] ?? item.category}
                      </td>
                      <td className="px-5 py-4 font-black">{rupiah(Number(item.amount))}</td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => deleteCost(item)}
                          className="rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!filtered.length && (
              <div className="p-10 text-center text-sm text-zinc-400">
                Belum ada transaksi biaya.
              </div>
            )}
          </section>
        </div>
      </div>

      {modal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
          <form
            onSubmit={addCost}
            className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">Tambah Biaya</h2>
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-full bg-zinc-100 px-3 py-2 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Contoh: Listrik printer bulan September"
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />

              <div className="grid gap-3 sm:grid-cols-2">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="rounded-xl border border-zinc-200 px-4 py-3"
                >
                  {CATEGORIES.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
                <input
                  required
                  type="number"
                  min="1"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                  placeholder="Nominal Rp"
                  className="rounded-xl border border-zinc-200 px-4 py-3"
                />
              </div>

              <input
                required
                type="date"
                value={form.cost_date}
                onChange={(e) => setForm({ ...form, cost_date: e.target.value })}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />

              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Catatan (opsional)"
                rows={3}
                className="w-full rounded-xl border border-zinc-200 px-4 py-3"
              />

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t border-zinc-200 pt-5">
              <button
                type="button"
                onClick={() => setModal(false)}
                className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-bold"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-6 py-3 text-sm font-black text-white disabled:opacity-50"
              >
                {saving ? "Menyimpan..." : "Simpan Biaya"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
