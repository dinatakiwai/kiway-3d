"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CartBadge from "./CartBadge";
import { supabase } from "@/lib/supabase";

type UserProfile = {
  full_name: string | null;
  role: "admin" | "employee" | "customer";
};

export default function Navbar() {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      setUser(currentUser);

      if (currentUser) {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, role")
          .eq("id", currentUser.id)
          .maybeSingle();

        if (mounted) {
          setProfile(data as UserProfile | null);
        }
      } else {
        setProfile(null);
      }

      setLoading(false);
    }

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const displayName =
    profile?.full_name?.trim() ||
    user?.email?.split("@")[0] ||
    "Akun Saya";

  const accountHref =
    profile?.role === "admin" || profile?.role === "employee"
      ? "/admin"
      : "/account";

  const accountLabel =
    profile?.role === "admin"
      ? "admin"
      : profile?.role === "employee"
        ? "employee"
        : displayName;

  return (
    <>
      <header className="relative z-50 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link
            href="/"
            aria-label="KEILAB.ID"
            className="flex h-10 w-[148px] items-center"
          >
            <img
              src="/keilab-logo.svg"
              alt="KEILAB.ID"
              className="h-full w-full object-contain object-left"
            />
          </Link>

          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/catalog"
              className="text-sm font-semibold text-zinc-700 hover:text-orange-500"
            >
              Produk
            </Link>

            <Link
              href="/#cara-kerja"
              className="text-sm font-semibold text-zinc-700 hover:text-orange-500"
            >
              Cara Kerja
            </Link>

            <Link
              href="/#tentang"
              className="text-sm font-semibold text-zinc-700 hover:text-orange-500"
            >
              Tentang
            </Link>

            <Link
              href="/tracking"
              className="text-sm font-bold text-zinc-900 hover:text-orange-500"
            >
              Lacak Pesanan
            </Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <CartBadge />

            {!loading && user ? (
              <Link
                href={accountHref}
                className="flex max-w-[150px] items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-black text-zinc-900 hover:border-orange-300 hover:text-orange-500"
                title={
                  profile?.role === "admin" || profile?.role === "employee"
                    ? "Buka dashboard"
                    : "Buka akun"
                }
              >
                <span className="text-base">
                  {profile?.role === "admin" || profile?.role === "employee"
                    ? "🛠️"
                    : "👤"}
                </span>
                <span className="truncate">{accountLabel}</span>
              </Link>
            ) : (
              <Link
                href="/login"
                className="rounded-full bg-zinc-950 px-5 py-2.5 text-sm font-black text-white hover:bg-orange-500"
              >
                Masuk
              </Link>
            )}
          </div>
        </div>
      </header>

    </>
  );
}
