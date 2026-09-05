"use client";

import Link from "next/link";
import CartBadge from "./CartBadge";
import { STORE } from "@/lib/store";

const WHATSAPP_MESSAGE =
  "Halo KIWAY 👋 Saya ingin bertanya tentang produk dan custom 3D.";

export default function Navbar() {
  const whatsappUrl = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(
    WHATSAPP_MESSAGE
  )}`;

  return (
    <>
      <nav
        className="sticky top-0 z-50 border-b border-zinc-200 bg-white/95 backdrop-blur"
        aria-label="Navigasi utama"
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link
            href="/"
            aria-label="KIWAY - Beranda"
            className="text-2xl font-black tracking-tight"
          >
            KIWAY<span className="text-orange-500">.</span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link
              href="/catalog"
              className="transition hover:text-orange-500"
            >
              Produk
            </Link>

            <a
              href="/#cara-kerja"
              className="transition hover:text-orange-500"
            >
              Cara Kerja
            </a>

            <a href="/#tentang" className="transition hover:text-orange-500">
              Tentang
            </a>

            {/* Tracking customer harus menuju halaman publik /tracking */}
            <Link
              href="/tracking"
              className="font-semibold transition hover:text-orange-500"
            >
              Lacak Pesanan
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <CartBadge />

            <Link
              href="/customizer"
              className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-orange-500"
            >
              Custom Sekarang
            </Link>
          </div>
        </div>
      </nav>

      {/* Floating WhatsApp — icon only */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat WhatsApp KIWAY"
        title="Chat WhatsApp"
        className="fixed bottom-5 right-5 z-[100] flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:scale-105 hover:bg-green-600"
      >
        <svg
          viewBox="0 0 32 32"
          aria-hidden="true"
          className="h-7 w-7 fill-white"
        >
          <path d="M16 3C8.82 3 3 8.82 3 16c0 2.3.6 4.46 1.73 6.38L3.4 28.7l6.48-1.7A12.93 12.93 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3Zm0 23.65c-2.02 0-3.9-.59-5.48-1.61l-.39-.24-3.85 1.01 1.03-3.75-.25-.4A10.66 10.66 0 1 1 16 26.65Zm5.84-7.99c-.32-.16-1.9-.94-2.2-1.05-.3-.11-.52-.16-.74.16-.22.33-.85 1.05-1.04 1.27-.19.22-.38.24-.7.08-.32-.16-1.36-.5-2.59-1.6-.96-.85-1.61-1.9-1.8-2.22-.19-.33-.02-.5.14-.66.15-.15.33-.38.49-.57.16-.19.22-.33.33-.55.11-.22.05-.41-.03-.57-.08-.16-.74-1.78-1.01-2.44-.27-.64-.54-.55-.74-.56h-.63c-.22 0-.57.08-.87.41-.3.33-1.14 1.11-1.14 2.7s1.17 3.13 1.33 3.35c.16.22 2.3 3.51 5.58 4.92.78.34 1.39.55 1.86.7.78.25 1.49.21 2.05.13.63-.09 1.9-.78 2.17-1.53.27-.76.27-1.4.19-1.53-.08-.14-.3-.22-.63-.38Z" />
        </svg>
      </a>
    </>
  );
}
