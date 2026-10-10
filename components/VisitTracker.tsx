"use client";

import { useEffect } from "react";

export default function VisitTracker() {
  useEffect(() => {
    const key = "keilab-visit-day";
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
    try {
      if (localStorage.getItem(key) === today) return;
      localStorage.setItem(key, today);
      void fetch("/api/visitor", { method: "POST", keepalive: true }).catch(() => {
        localStorage.removeItem(key);
      });
    } catch {
      // Do not prevent browsing when storage is unavailable.
    }
  }, []);
  return null;
}
