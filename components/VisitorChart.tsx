"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type Visit = { visit_date: string; visitor_count: number };

export default function VisitorChart() {
  const [visits, setVisits] = useState<Visit[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch("/api/admin/visitor-stats", { headers: { Authorization: `Bearer ${session.access_token}` }, cache: "no-store" });
      const result = await response.json();
      if (response.ok) setVisits(result.visits ?? []);
      else setError(result.error ?? "Grafik belum dapat dimuat.");
    }
    void load();
  }, []);

  const values = Array.from({ length: 14 }, (_, index) => {
    const day = new Date();
    day.setDate(day.getDate() - (13 - index));
    const key = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(day);
    return { date: key, count: Number(visits.find((visit) => visit.visit_date === key)?.visitor_count ?? 0) };
  });
  const max = Math.max(1, ...values.map((value) => value.count));
  const points = values.map((value, index) => `${24 + index * 52},${120 - (value.count / max) * 92}`).join(" ");
  const total = values.reduce((sum, value) => sum + value.count, 0);

  return <section className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h2 className="text-xl font-black">Pengunjung Harian</h2><p className="mt-1 text-sm text-zinc-500">14 hari terakhir · {total.toLocaleString("id-ID")} kunjungan</p></div><span className="rounded-full bg-orange-50 px-3 py-1 text-xs font-bold text-orange-700">Per hari</span></div>
    {error ? <p role="status" className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">{error}</p> : <div className="mt-5 overflow-x-auto"><svg viewBox="0 0 720 160" role="img" aria-label="Grafik jumlah pengunjung dalam 14 hari terakhir" className="h-44 min-w-[640px] w-full">
      {[28, 74, 120].map((y) => <line key={y} x1="24" x2="696" y1={y} y2={y} stroke="#e4e4e7" strokeDasharray="4 5" />)}
      <polyline points={points} fill="none" stroke="#f97316" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {values.map((value, index) => <g key={value.date}><circle cx={24 + index * 52} cy={120 - (value.count / max) * 92} r="4" fill="#f97316" /><text x={24 + index * 52} y="148" textAnchor="middle" fontSize="9" fill="#71717a">{value.date.slice(5)}</text></g>)}
    </svg></div>}
  </section>;
}
