"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const menu = [
  {
    title: "Dashboard",
    href: "/admin/overview",
    icon: "📊",
  },
  {
    title: "Orders",
    href: "/admin",
    icon: "🛒",
  },
  {
    title: "Production",
    href: "/admin/production",
    icon: "🏭",
  },
  {
    title: "Inventory",
    href: "/admin/inventory",
    icon: "📦",
  },
  {
    title: "Finance",
    href: "/admin/finance",
    icon: "💰",
  },
  {
    title: "Product Master",
    href: "/admin/finance/product-master",
    icon: "🧩",
  },
  {
    title: "Biaya Operasional",
    href: "/admin/finance/costs",
    icon: "🧾",
  },
  {
    title: "Riwayat Produksi",
    href: "/admin/production/history",
    icon: "📜",
  },
];

export default function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r bg-white">
      <div className="border-b px-6 py-5">
        <div className="text-2xl font-black tracking-tight">
          KIWAY<span className="text-orange-500">.</span>
        </div>

        <div className="mt-1 text-xs font-medium text-gray-500">
          3D PRINTING ADMIN
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-4">
        <div className="mb-3 px-3 text-[11px] font-bold uppercase tracking-wider text-gray-400">
          Management
        </div>

        {menu.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname === item.href ||
                pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition ${
                active
                  ? "bg-black text-white shadow-sm"
                  : "text-gray-600 hover:bg-gray-100 hover:text-black"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              <span>{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t p-4">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-gray-600 hover:bg-gray-100 hover:text-black"
        >
          <span>🏠</span>
          <span>Kembali ke Website</span>
        </Link>

        <div className="mt-3 rounded-xl bg-gray-50 p-3">
          <div className="text-xs font-bold text-gray-800">
            KIWAY 3D
          </div>
          <div className="mt-1 text-[11px] text-gray-500">
            Admin Control Center
          </div>
        </div>
      </div>
    </aside>
  );
}
