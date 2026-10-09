"use client";
import { FormEvent, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export default function ShopAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ role: "assistant", content: "Halo! Saya asisten KEILAB. Mau tanya stok, harga, atau varian produk?" }]);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);

  async function send(event: FormEvent) {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading) return;
    setMessages((current) => [...current, { role: "user", content: text }]);
    setQuestion("");
    setLoading(true);
    try {
      const response = await fetch("/api/shop-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history: messages.slice(-8) }),
      });
      const result = await response.json();
      setMessages((current) => [...current, { role: "assistant", content: response.ok ? result.answer : result.error || "Maaf, asisten belum bisa menjawab." }]);
    } catch {
      setMessages((current) => [...current, { role: "assistant", content: "Koneksi terputus. Coba lagi sebentar." }]);
    } finally {
      setLoading(false);
    }
  }

  return <div className="fixed bottom-24 right-5 z-40 sm:right-7">
    {open && <section aria-label="Chat asisten KEILAB" className="mb-3 flex h-[min(70vh,480px)] w-[min(92vw,360px)] flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl">
      <header className="flex items-center justify-between bg-zinc-950 px-4 py-3 text-white">
        <div><strong className="block text-sm">Asisten KEILAB</strong><span className="text-xs text-zinc-300">Tanya stok & produk</span></div>
        <button type="button" onClick={() => setOpen(false)} aria-label="Tutup chat" className="rounded-lg px-2 py-1 text-xl hover:bg-white/10">×</button>
      </header>
      <div aria-live="polite" className="flex-1 space-y-3 overflow-y-auto bg-zinc-50 p-3">
        {messages.map((message, index) => <div key={index} className={message.role === "user" ? "ml-auto max-w-[88%] whitespace-pre-wrap rounded-2xl bg-orange-500 px-3 py-2 text-sm leading-5 text-white" : "mr-auto max-w-[88%] whitespace-pre-wrap rounded-2xl border border-zinc-200 bg-white px-3 py-2 text-sm leading-5 text-zinc-800"}>{message.content}</div>)}
        {loading && <p className="text-xs text-zinc-500">Asisten sedang mengetik…</p>}
      </div>
      <form onSubmit={send} className="flex gap-2 border-t border-zinc-200 p-3">
        <input value={question} onChange={(event) => setQuestion(event.target.value)} maxLength={800} placeholder="Contoh: stok gantungan warna biru?" aria-label="Pesan untuk asisten" className="min-w-0 flex-1 rounded-xl border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-orange-500" />
        <button disabled={loading || !question.trim()} className="rounded-xl bg-orange-500 px-4 text-sm font-bold text-white disabled:opacity-50">Kirim</button>
      </form>
    </section>}
    <button type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-2xl text-white shadow-lg transition hover:bg-orange-600" aria-label={open ? "Tutup chat" : "Buka chat asisten"}>{open ? "×" : "💬"}</button>
  </div>;
}
