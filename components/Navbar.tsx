"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import CartBadge from "./CartBadge";
import { supabase } from "@/lib/supabase";
import { STORE } from "@/lib/store";

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

  const whatsappUrl = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
    "Halo KIWAY 👋 Saya ingin bertanya tentang produk dan custom 3D."
  )}`;

  return (
    <>
      <header className="relative z-50 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5">
          <Link
            href="/"
            className="text-2xl font-black tracking-tight text-zinc-950"
          >
            KIWAY<span className="text-orange-500">.</span>
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

      <a
        href={whatsappUrl}
        target="_blank"
        rel="noreferrer"
        aria-label="WhatsApp KIWAY"
        title="Chat WhatsApp KIWAY"
        className="fixed bottom-6 right-6 z-[60] flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-105"
      >
        <svg
          viewBox="0 0 24 24"
          className="h-7 w-7 fill-current"
          aria-hidden="true"
        >
          <path d="M20.52 3.48A11.86 11.86 0 0 0 12.05 0C5.48 0 .14 5.34.14 11.91c0 2.1.55 4.15 1.6 5.96L.04 24l6.27-1.65a11.9 11.9 0 0 0 5.74 1.47h.01c6.56 0 11.9-5.34 11.9-11.91 0-3.18-1.24-6.17-3.44-8.43Zm-8.47 18.3h-.01a9.88 9.88 0 0 1-5.03-1.38l-.36-.21-3.72.98.99-3.63-.23-.37a9.87 9.87 0 0 1-1.51-5.26C2.18 6.45 6.61 2.02 12.05 2.02c2.64 0 5.12 1.03 6.99 2.9a9.84 9.84 0 0 1 2.89 7c0 5.44-4.43 9.86-9.88 9.86Zm5.41-7.39c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.74-1.64-2.03-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.49.71.31 1.27.49 1.7.63.72.23 1.38.2 1.9.12.58-.09 1.77-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.07-.12-.27-.2-.57-.35Z" />
        </svg>
      </a>
    </>
  );
}
