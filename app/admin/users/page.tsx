"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const modules = [
  ["orders", "Pesanan"], ["inventory", "Inventory"], ["production", "Produksi"],
  ["products", "Product Master"], ["finance", "Finance"],
] as const;
type Key = (typeof modules)[number][0];
type Permissions = Record<Key, { read: boolean; write: boolean }>;
type Staff = {
  id: string; email: string; full_name: string; phone: string | null;
  role: "manager" | "staff"; is_active: boolean; permissions: Permissions;
};
const blankPermissions = (): Permissions => Object.fromEntries(
  modules.map(([key]) => [key, { read: false, write: false }]),
) as Permissions;

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<Staff[]>([]);
  const [selected, setSelected] = useState<Staff | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"manager" | "staff">("staff");
  const [permissions, setPermissions] = useState<Permissions>(blankPermissions);
  const [active, setActive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/admin/login"); return; }
    const response = await fetch("/api/admin/users", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const body = await response.json();
    if (response.ok) setUsers(body.users);
    else setNotice(body.error ?? "Gagal memuat akun.");
    setLoading(false);
  }, [router]);
  useEffect(() => { void load(); }, [load]);

  function createForm() {
    setSelected(null); setEmail(""); setPassword(""); setName(""); setPhone("");
    setRole("staff"); setPermissions(blankPermissions()); setActive(true);
    setNotice(""); setShowForm(true);
  }
  function editForm(user: Staff) {
    setSelected(user); setEmail(user.email); setPassword(""); setName(user.full_name);
    setPhone(user.phone ?? ""); setRole(user.role);
    setPermissions(user.permissions ?? blankPermissions()); setActive(user.is_active);
    setNotice(""); setShowForm(true);
  }
  function changePermission(module: Key, field: "read" | "write", value: boolean) {
    setPermissions((old) => ({ ...old, [module]: {
      read: field === "read" ? value : old[module].read || value,
      write: field === "write" ? value : old[module].write && value,
    } }));
  }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice("");
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/admin/login"); return; }
    const response = await fetch("/api/admin/users", {
      method: selected ? "PATCH" : "POST",
      headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ id: selected?.id, email, password, full_name: name, phone, role, permissions, is_active: active }),
    });
    const body = await response.json(); setSaving(false);
    if (!response.ok) { setNotice(body.error ?? "Gagal menyimpan."); return; }
    setShowForm(false); setNotice(selected ? "Akun diperbarui." : "Akun karyawan dibuat.");
    await load();
  }

  return <main className="min-h-screen bg-[#faf9f7] px-6 py-10 text-zinc-900">
    <div className="mx-auto max-w-6xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-bold uppercase tracking-widest text-orange-500">Akses & Tim</p>
          <h1 className="mt-2 text-3xl font-black">Manajemen Karyawan</h1>
          <p className="mt-2 text-sm text-zinc-500">Atur akun, role, dan izin akses setiap bagian.</p></div>
        <button onClick={createForm} className="rounded-xl bg-zinc-900 px-5 py-3 text-sm font-bold text-white hover:bg-orange-500">+ Tambah Karyawan</button>
      </div>
      {notice && <p role="status" className="mt-5 rounded-xl bg-orange-50 px-4 py-3 text-sm">{notice}</p>}
      <section className="mt-7 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {loading ? <p className="p-6 text-sm text-zinc-500">Memuat akun...</p> : users.length === 0 ?
          <p className="p-6 text-sm text-zinc-500">Belum ada akun karyawan.</p> :
          <div className="overflow-x-auto"><table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 text-xs uppercase text-zinc-500"><tr><th className="px-5 py-4">Nama</th><th className="px-5 py-4">Email</th><th className="px-5 py-4">Role</th><th className="px-5 py-4">Status</th><th /></tr></thead>
            <tbody>{users.map((user) => <tr key={user.id} className="border-t border-zinc-100">
              <td className="px-5 py-4 font-semibold">{user.full_name}</td><td className="px-5 py-4">{user.email}</td>
              <td className="px-5 py-4 capitalize">{user.role}</td><td className="px-5 py-4">{user.is_active ? "Aktif" : "Nonaktif"}</td>
              <td className="px-5 py-4 text-right"><button onClick={() => editForm(user)} className="font-semibold text-orange-600 hover:underline">Edit</button></td>
            </tr>)}</tbody></table></div>}
      </section>

      {showForm && <section className="mt-7 rounded-2xl border border-zinc-200 bg-white p-6">
        <h2 className="text-xl font-black">{selected ? "Edit akun karyawan" : "Tambah akun karyawan"}</h2>
        <form onSubmit={save} className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="text-sm font-semibold">Nama lengkap<input required value={name} onChange={(e) => setName(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Email login<input required type="email" disabled={!!selected} value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 font-normal disabled:bg-zinc-100" /></label>
          {!selected && <label className="text-sm font-semibold">Password awal<input required minLength={8} type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 font-normal" /></label>}
          <label className="text-sm font-semibold">Nomor telepon<input value={phone} onChange={(e) => setPhone(e.target.value)} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 font-normal" /></label>
          <label className="text-sm font-semibold">Role<select value={role} onChange={(e) => setRole(e.target.value as "manager" | "staff")} className="mt-2 w-full rounded-xl border border-zinc-200 px-4 py-3 font-normal"><option value="staff">Staff</option><option value="manager">Manager</option></select></label>
          {selected && <label className="flex items-center gap-3 self-end pb-3 text-sm font-semibold"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Akun aktif</label>}
          <fieldset className="md:col-span-2"><legend className="text-sm font-bold">Izin akses per bagian</legend>
            <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200"><table className="w-full text-sm">
              <thead className="bg-zinc-50"><tr><th className="px-4 py-3 text-left">Bagian</th><th>Lihat</th><th>Ubah</th></tr></thead>
              <tbody>{modules.map(([key, label]) => <tr key={key} className="border-t border-zinc-100">
                <td className="px-4 py-3">{label}</td>
                <td className="text-center"><input aria-label={`${label}: lihat`} type="checkbox" checked={permissions[key].read} onChange={(e) => changePermission(key, "read", e.target.checked)} /></td>
                <td className="text-center"><input aria-label={`${label}: ubah`} type="checkbox" checked={permissions[key].write} onChange={(e) => changePermission(key, "write", e.target.checked)} /></td>
              </tr>)}</tbody>
            </table></div>
          </fieldset>
          <div className="flex gap-3 md:col-span-2"><button disabled={saving} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{saving ? "Menyimpan..." : "Simpan akun"}</button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-zinc-200 px-5 py-3 text-sm font-semibold">Batal</button></div>
        </form>
      </section>}
      <p className="mt-4 text-xs text-zinc-500">Akun yang dinonaktifkan tidak dapat login; catatan lama tetap tersimpan.</p>
    </div>
  </main>;
}
