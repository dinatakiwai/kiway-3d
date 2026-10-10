"use client";

import { useStoreSettings } from "@/lib/useStoreSettings";

export default function ShopAssistant() {
  const storeSettings = useStoreSettings();
  const whatsappUrl = `https://wa.me/${storeSettings.whatsapp}?text=${encodeURIComponent(storeSettings.whatsappGreeting)}`;

  return (
    <a
      href={whatsappUrl}
      target="_blank"
      rel="noreferrer"
      aria-label="Chat KEILAB melalui WhatsApp"
      title="Chat via WhatsApp"
      className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-3xl text-white shadow-lg transition hover:bg-green-600 sm:right-7"
    >
      <span aria-hidden="true">☏</span>
    </a>
  );
}
