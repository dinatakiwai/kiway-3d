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
      className="fixed bottom-6 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-green-500 text-white shadow-lg transition hover:bg-green-600 sm:right-7"
    >
      <svg viewBox="0 0 32 32" className="h-8 w-8 fill-current" aria-hidden="true">
        <path d="M16.04 3C9.43 3 4.05 8.37 4.05 14.98c0 2.12.56 4.19 1.62 6.02L4 27.1l6.26-1.64a11.94 11.94 0 0 0 5.77 1.48h.01c6.61 0 11.99-5.38 11.99-11.99 0-3.2-1.25-6.21-3.52-8.47A11.9 11.9 0 0 0 16.04 3Zm0 21.91h-.01a9.92 9.92 0 0 1-5.05-1.38l-.36-.21-3.72.98.99-3.63-.24-.37a9.91 9.91 0 0 1-1.52-5.32c0-5.47 4.45-9.92 9.92-9.92 2.65 0 5.14 1.03 7.01 2.91a9.86 9.86 0 0 1 2.91 7.02c0 5.47-4.45 9.92-9.93 9.92Zm5.45-7.43c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.23-.64.08-.3-.15-1.26-.47-2.4-1.48-.89-.79-1.49-1.76-1.66-2.06-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.61-.91-2.21-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.09 3.2 5.07 4.49.71.31 1.26.49 1.69.63.71.23 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35Z" />
      </svg>
    </a>
  );
}
