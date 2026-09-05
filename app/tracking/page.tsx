'use client';

import { FormEvent, Suspense, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type TrackingOrder = {
  order_code?: string | null;
  customer_name?: string | null;
  product?: string | null;
  custom_name?: string | null;
  quantity?: number | null;
  total?: number | null;
  payment_status?: string | null;
  production_status?: string | null;
  created_at?: string | null;
};

const steps = [
  { title: 'Pesanan diterima', icon: '✓' },
  { title: 'Sedang diproses', icon: '⚙' },
  { title: 'Selesai diproduksi', icon: '★' },
  { title: 'Dikirim', icon: '➜' },
];

function rupiah(value: number | null | undefined) {
  return `Rp${Number(value || 0).toLocaleString('id-ID')}`;
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
}

function paymentLabel(value: string | null | undefined) {
  if (value === 'paid') return 'Sudah dibayar';
  if (value === 'refunded') return 'Dikembalikan';
  return 'Menunggu pembayaran';
}

function productionLabel(value: string | null | undefined) {
  if (value === 'processing') return 'Sedang diproses';
  if (value === 'finished') return 'Selesai diproduksi';
  if (value === 'shipped') return 'Dikirim';
  return 'Pesanan diterima';
}

function statusIndex(value: string | null | undefined) {
  if (value === 'shipped') return 3;
  if (value === 'finished') return 2;
  if (value === 'processing') return 1;
  return 0;
}

function formatError(error: unknown) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  if (error && typeof error === 'object') {
    const value = error as Record<string, unknown>;
    return String(value.message || value.details || value.hint || 'Pesanan tidak ditemukan.');
  }
  return 'Pesanan tidak ditemukan.';
}

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get('order') || '';
  const [code, setCode] = useState(initialCode.toUpperCase());
  const [order, setOrder] = useState<TrackingOrder | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const currentStep = useMemo(() => statusIndex(order?.production_status), [order?.production_status]);

  async function findOrder(value = code) {
    const cleanCode = value.trim().toUpperCase();
    if (!cleanCode) {
      setError('Masukkan kode pesanan terlebih dahulu.');
      setOrder(null);
      return;
    }
    setLoading(true); setError(''); setOrder(null);
    const { data, error: rpcError } = await supabase.rpc('get_order_tracking', { p_order_code: cleanCode });
    setLoading(false);
    if (rpcError) { setError(formatError(rpcError)); return; }
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) { setError('Kode pesanan tidak ditemukan. Cek kembali kode KW- kamu.'); return; }
    setOrder(row as TrackingOrder);
  }

  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); findOrder(); }

  async function copyCode() {
    if (!order?.order_code) return;
    await navigator.clipboard.writeText(order.order_code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  useEffect(() => { if (initialCode) findOrder(initialCode); }, [initialCode]);

  return (
    <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
      <nav className="sticky top-0 z-50 border-b border-zinc-200/70 bg-[#faf9f7]/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="text-2xl font-black tracking-tight">KIWAY<span className="text-orange-500">.</span></Link>
          <Link href="/customizer" className="rounded-full bg-zinc-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500">Custom Sekarang</Link>
        </div>
      </nav>

      <section className="mx-auto max-w-3xl px-6 pb-20 pt-14">
        <div className="text-center">
          <p className="text-sm font-black uppercase tracking-[0.2em] text-orange-500">Order Tracking</p>
          <h1 className="mt-3 text-4xl font-black tracking-tight md:text-5xl">Lacak Pesanan Kamu</h1>
          <p className="mx-auto mt-4 max-w-xl text-zinc-500">Masukkan kode pesanan KIWAY untuk melihat status pesanan dan produksinya.</p>
        </div>

        <form onSubmit={submit} className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-5 shadow-sm md:p-6">
          <label className="text-sm font-black">Kode Pesanan</label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="Contoh: KW-20260905-0001" className="min-w-0 flex-1 rounded-2xl border border-zinc-200 bg-zinc-50 px-5 py-4 font-bold uppercase outline-none focus:border-orange-400 focus:bg-white" />
            <button type="submit" disabled={loading} className="rounded-2xl bg-zinc-900 px-7 py-4 font-black text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60">{loading ? 'Mencari...' : 'Lacak Pesanan'}</button>
          </div>
          <p className="mt-3 text-xs text-zinc-400">Kode pesanan biasanya berbentuk <b>KW-YYYYMMDD-0001</b>.</p>
        </form>

        {error && <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><b>⚠️ {error}</b></div>}

        {order && (
          <div className="mt-6 space-y-5">
            <section className="rounded-[2rem] bg-zinc-950 p-6 text-white shadow-xl md:p-8">
              <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-start">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Kode Pesanan</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <h2 className="text-2xl font-black tracking-tight md:text-3xl">{order.order_code}</h2>
                    <button type="button" onClick={copyCode} className="rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-bold hover:bg-white/15">{copied ? 'Tersalin ✓' : 'Salin'}</button>
                  </div>
                </div>
                <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm"><p className="text-xs text-zinc-400">Status</p><p className="mt-1 font-black text-orange-300">{productionLabel(order.production_status)}</p></div>
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-black">Progress Pesanan</h2>
              <div className="mt-7">
                {steps.map((step, index) => {
                  const active = index <= currentStep;
                  const isCurrent = index === currentStep;
                  return <div key={step.title} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-black ${active ? 'bg-orange-500 text-white' : 'bg-zinc-100 text-zinc-400'} ${isCurrent ? 'ring-4 ring-orange-100' : ''}`}>{step.icon}</div>
                      {index < steps.length - 1 && <div className={`my-1 h-10 w-0.5 ${index < currentStep ? 'bg-orange-500' : 'bg-zinc-200'}`} />}
                    </div>
                    <div className="pb-7 pt-2"><p className={`font-black ${active ? 'text-zinc-900' : 'text-zinc-400'}`}>{step.title}</p>{isCurrent && <p className="mt-1 text-sm text-orange-500">Status saat ini</p>}</div>
                  </div>;
                })}
              </div>
            </section>

            <section className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
              <h2 className="text-xl font-black">Detail Pesanan</h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Customer</p><p className="mt-1 font-black">{order.customer_name || '-'}</p></div>
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Produk</p><p className="mt-1 font-black">{order.product || '-'}</p></div>
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Custom Name</p><p className="mt-1 font-black">{order.custom_name || '-'}</p></div>
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Jumlah</p><p className="mt-1 font-black">{Number(order.quantity || 0)} pcs</p></div>
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Total</p><p className="mt-1 font-black">{rupiah(order.total)}</p></div>
                <div className="rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Pembayaran</p><p className="mt-1 font-black">{paymentLabel(order.payment_status)}</p></div>
              </div>
              <div className="mt-3 rounded-2xl bg-zinc-50 p-4"><p className="text-xs text-zinc-400">Tanggal Pesanan</p><p className="mt-1 font-black">{formatDate(order.created_at)}</p></div>
            </section>

            <div className="text-center"><Link href="/" className="text-sm font-bold text-zinc-500 hover:text-orange-500">← Kembali ke website KIWAY</Link></div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function TrackingPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#faf9f7] text-zinc-900">
          <div className="flex min-h-screen items-center justify-center px-6">
            <div className="rounded-2xl border border-zinc-200 bg-white px-6 py-4 text-sm font-bold text-zinc-500 shadow-sm">
              Memuat pelacakan pesanan...
            </div>
          </div>
        </main>
      }
    >
      <TrackingContent />
    </Suspense>
  );
}
