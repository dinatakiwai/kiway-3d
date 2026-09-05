"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getCartCount } from "@/lib/cart";

export default function CartBadge() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const refresh = () => {
      setCount(getCartCount());
    };

    refresh();

    window.addEventListener("kiway-cart-updated", refresh);

    return () => {
      window.removeEventListener("kiway-cart-updated", refresh);
    };
  }, []);

  return (
    <Link
      href="/cart"
      aria-label={`Keranjang, ${count} produk`}
      className="relative flex h-10 items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 text-sm font-bold text-zinc-700 transition hover:border-orange-300 hover:text-orange-500"
    >
      <span className="text-base">🛒</span>
      <span>Keranjang</span>

      {count > 0 && (
        <span className="flex min-w-5 items-center justify-center rounded-full bg-orange-500 px-1.5 py-0.5 text-[10px] font-black text-white">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}