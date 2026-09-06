"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Profile = {
  full_name: string | null;
  phone: string | null;
  role: string;
};

type CustomerOrder = {
  id: string;
  order_code: string | null;
  product: string | null;
  custom_name: string | null;
  quantity: number;
  total: number;
  payment_status: string | null;
  production_status: string | null;
  created_at: string;
};

function rupiah(value: number) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

function dateFormat(value: string) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function productionLabel(status: string | null) {
  if (status === "processing") return "Sedang Diproses";
  if (status === "finished") return "Selesai";
  if (status === "shipped") return "Dikirim";
  return "Pesanan Baru";
}

function paymentLabel(status: string | null) {
  if (status === "paid") return "Sudah Dibayar";
  if (status === "refunded") return "Refund";
  return "Menunggu Pembayaran";
}

function badgeClass(status: string | null) {
  if (status === "paid" || status === "finished" || status === "shipped") {
    return "border-green-200 bg-green-50 text-green-700";
  }
  if (status === "processing") {
    return "border-blue-200 bg-blue-50 text-blue-700";
  }
  if (status === "refunded") {
    return "border-red-200 bg-red-50 text-red-700";
  }
  return "border-orange-200 bg-orange-50 text-orange-700";
}

export default function AccountPage() {
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.replace("/login");
        return;
      }

      const [profileResult, ordersResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, phone, role")
          .eq("id", user.id)
          .maybeSingle(),

        supabase.rpc("get_customer_orders"),
      ]);

      if (!active) return;

      if (profileResult.error) {
        setError("Profil akun belum dapat dimuat.");
        setLoading(false);
        return;
      }

      if (ordersResult.error) {
        setError("Riwayat pesanan belum dapat dimuat.");
        setLoading(false);
        return;
      }

      setProfile(profileResult.data);
      setOrders((ordersResult.data || []) as CustomerOrder[]);
      setLoading(false);
    }

    loadAccount();

    return () => {
      active = false;
    };
  }, [router]);

  async function logout() {
    setLoggingOut(true);
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#faf9f7] px-5 py-12">
        <div className="mx-auto max-w-5xl animate-pulse">
          <div className="h-44 rounded-[2rem] bg-zinc-200" />
          <div className="mt-6 h-24 rounded-[2rem] bg-zinc-200" />
          <div className="mt-6 h-64 rounded-[2rem] bg-zinc-200" />
        </div>
      </main>
    );
  }

  const name = profile?.full_name?.trim() || "Customer KIWAY";
  const totalSpent = orders.reduce(
    (sum, order) => sum + Number(order.total || 0),
    0
  );

  return (
    <main className="min-h-screen bg-[#faf9f7] px-5 py-10 text-zinc-900">
      <div className="mx-auto max-w-5xl">
        <section className="rounded-[2rem] bg-zinc-950 p-7 text-white md:p-9">
          <p className="text-xs font-black uppercase tracking-[0.25em] text-orange-400">
            KIWAY ACCOUNT
          </p>

          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end">
            <div>
              <h1 className="text-3xl font-black tracking-tight md:text-4xl">
                Halo, {name} 👋
              </h1>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                Kelola akun dan lihat perkembangan pesanan KIWAY kamu.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Link
                href="/catalog"
                className="rounded-full border border-white/20 px-5 py-3 text-sm font-black hover:bg-white/10"
              >
                Belanja
              </Link>
              <button
                onClick={logout}
                disabled={loggingOut}
                className="rounded-full bg-orange-500 px-5 py-3 text-sm font-black text-white hover:bg-orange-400 disabled:opacity-50"
              >
                {loggingOut ? "Keluar..." : "Logout"}
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
            {error}
          </div>
        )}

        <section className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Total Pesanan
            </p>
            <p className="mt-2 text-3xl font-black">{orders.length}</p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Total Belanja
            </p>
            <p className="mt-2 text-xl font-black">{rupiah(totalSpent)}</p>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              WhatsApp
            </p>
            <p className="mt-2 text-lg font-black">
              {profile?.phone || "Belum diisi"}
            </p>
          </div>
        </section>

        <section className="mt-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
                RIWAYAT
              </p>
              <h2 className="mt-1 text-2xl font-black">Pesanan Saya</h2>
            </div>
            <span className="text-sm font-semibold text-zinc-400">
              {orders.length} pesanan
            </span>
          </div>

          {orders.length === 0 ? (
            <div className="mt-5 rounded-[2rem] border border-dashed border-zinc-300 bg-white p-10 text-center">
              <div className="text-4xl">📦</div>
              <h3 className="mt-4 text-xl font-black">Belum ada pesanan</h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-500">
                Buat custom clicker pertamamu dan pesananmu akan muncul di sini.
              </p>
              <Link
                href="/catalog/clicker"
                className="mt-6 inline-flex rounded-full bg-zinc-950 px-6 py-3 text-sm font-black text-white hover:bg-orange-500"
              >
                Mulai Custom →
              </Link>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {orders.map((order) => (
                <article
                  key={order.id}
                  className="rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6"
                >
                  <div className="flex flex-col justify-between gap-5 md:flex-row">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black">
                          {order.order_code || "Order KIWAY"}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(
                            order.production_status
                          )}`}
                        >
                          {productionLabel(order.production_status)}
                        </span>
                      </div>

                      <h3 className="mt-4 text-xl font-black">
                        {order.custom_name || order.product || "Pesanan KIWAY"}
                      </h3>

                      <p className="mt-1 text-sm text-zinc-500">
                        {order.product || "Custom Product"} · Qty{" "}
                        {Number(order.quantity || 0)}
                      </p>

                      <p className="mt-2 text-xs text-zinc-400">
                        {dateFormat(order.created_at)}
                      </p>
                    </div>

                    <div className="md:text-right">
                      <p className="text-xl font-black">
                        {rupiah(Number(order.total || 0))}
                      </p>
                      <span
                        className={`mt-2 inline-block rounded-full border px-3 py-1 text-xs font-bold ${badgeClass(
                          order.payment_status
                        )}`}
                      >
                        {paymentLabel(order.payment_status)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-zinc-100 pt-4">
                    <Link
                      href={`/tracking?code=${encodeURIComponent(
                        order.order_code || ""
                      )}`}
                      className="inline-flex rounded-full border border-zinc-200 px-4 py-2 text-xs font-bold hover:border-orange-300 hover:text-orange-500"
                    >
                      Lihat Tracking →
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-6 md:p-7">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-orange-500">
            PROFIL
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-bold text-zinc-400">Nama lengkap</p>
              <p className="mt-1 font-bold">{name}</p>
            </div>
            <div>
              <p className="text-xs font-bold text-zinc-400">WhatsApp</p>
              <p className="mt-1 font-bold">
                {profile?.phone || "Belum diisi"}
              </p>
            </div>
          </div>
        </section>

        <footer className="py-10 text-center text-xs font-semibold text-zinc-400">
          KIWAY 3D · Custom made for you.
        </footer>
      </div>
    </main>
  );
}
