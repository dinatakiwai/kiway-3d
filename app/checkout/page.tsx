"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  clearCart,
  getCart,
  type CartItem,
} from "@/lib/cart";
import { supabase } from "@/lib/supabase";
import { useStoreSettings } from "@/lib/useStoreSettings";

type Area = {
  id: string;
  name: string;
  postal_code?: number | string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
};

type ShippingRate = {
  company: string;
  courierCode: string;
  courierName: string;
  serviceCode: string;
  serviceName: string;
  description: string;
  duration: string;
  price: number;
  currency: string;
};

type CreatedOrder = {
  order_code: string;
  custom_name: string;
  quantity: number;
  total: number;
  shipping_cost: number;
  grand_total: number;
};

function formatRupiah(value: number) {
  return `Rp${value.toLocaleString("id-ID")}`;
}

function normalizePhone(phone: string) {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  return digits;
}

function packageItem(item: CartItem) {
  return {
    name: item.name,
    value: Number(item.price) || 0,
    weight: Math.max(1, Number(item.shippingWeightGram || 500)),
    quantity: Math.max(1, Number(item.quantity) || 1),
    length: Math.max(1, Number(item.shippingLengthCm || 20)),
    width: Math.max(1, Number(item.shippingWidthCm || 20)),
    height: Math.max(1, Number(item.shippingHeightCm || 10)),
  };
}

export default function CheckoutPage() {
  const storeSettings = useStoreSettings();
  const [items, setItems] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [notes, setNotes] = useState("");

  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingProvince, setShippingProvince] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingDistrict, setShippingDistrict] = useState("");
  const [shippingPostalCode, setShippingPostalCode] = useState("");
  const [shippingAreaId, setShippingAreaId] = useState("");

  const [areaQuery, setAreaQuery] = useState("");
  const [areas, setAreas] = useState<Area[]>([]);
  const [areaLoading, setAreaLoading] = useState(false);
  const [areaOpen, setAreaOpen] = useState(false);

  const [rates, setRates] = useState<ShippingRate[]>([]);
  const [selectedRate, setSelectedRate] = useState<ShippingRate | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [createdOrders, setCreatedOrders] = useState<CreatedOrder[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [items]
  );

  const shippingCost = selectedRate?.price || 0;
  const grandTotal = subtotal + shippingCost;

  async function searchArea(query = areaQuery) {
    const normalized = query.trim();

    if (normalized.length < 2) {
      setAreas([]);
      setAreaOpen(false);
      return;
    }

    setAreaLoading(true);

    try {
      const response = await fetch(
        `/api/shipping/areas?input=${encodeURIComponent(normalized)}`,
        { cache: "no-store" }
      );
      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Gagal mencari area.");
      }

      const nextAreas = Array.isArray(data.areas) ? data.areas : [];
      setAreas(nextAreas);
      setAreaOpen(true);

      if (!nextAreas.length) {
        setError("Area tidak ditemukan. Coba ketik nama kecamatan, kota, atau kode pos.");
      } else {
        setError("");
      }
    } catch (err) {
      setAreas([]);
      setAreaOpen(false);
      setError(err instanceof Error ? err.message : "Gagal mencari area.");
    } finally {
      setAreaLoading(false);
    }
  }

  useEffect(() => {
    const query = areaQuery.trim();

    if (shippingAreaId || query.length < 2) {
      if (query.length < 2) setAreas([]);
      return;
    }

    const timer = window.setTimeout(() => {
      void searchArea(query);
    }, 450);

    return () => window.clearTimeout(timer);
  }, [areaQuery, shippingAreaId]);

  function selectArea(area: Area) {
    setShippingAreaId(area.id);
    setShippingProvince(area.administrative_division_level_1_name || "");
    setShippingCity(area.administrative_division_level_2_name || "");
    setShippingDistrict(area.administrative_division_level_3_name || "");
    setShippingPostalCode(String(area.postal_code || ""));
    setAreaQuery(area.name);
    setAreas([]);
    setAreaOpen(false);
    setRates([]);
    setSelectedRate(null);
  }

  async function loadRates() {
    setError("");

    if (!shippingAreaId) {
      setError("Pilih area/kecamatan tujuan terlebih dahulu.");
      return;
    }

    if (!shippingAddress.trim()) {
      setError("Alamat lengkap wajib diisi.");
      return;
    }

    if (!items.length) {
      setError("Keranjang masih kosong.");
      return;
    }

    setRatesLoading(true);
    setSelectedRate(null);

    try {
      const response = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinationAreaId: shippingAreaId,
          items: items.map(packageItem),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.success) {
        throw new Error(data?.message || "Gagal mengambil ongkir.");
      }

      const nextRates = Array.isArray(data.pricing) ? data.pricing : [];
      setRates(nextRates);

      if (!nextRates.length) {
        setError("Tidak ada layanan kurir yang tersedia untuk alamat tersebut.");
      }
    } catch (err) {
      setRates([]);
      setError(err instanceof Error ? err.message : "Gagal mengambil ongkir.");
    } finally {
      setRatesLoading(false);
    }
  }

  async function submitOrder() {
    setError("");

    if (!items.length) {
      setError("Keranjang masih kosong.");
      return;
    }

    if (!customerName.trim()) {
      setError("Nama wajib diisi.");
      return;
    }

    const phone = normalizePhone(customerPhone);
    if (phone.length < 10) {
      setError("Nomor WhatsApp belum valid.");
      return;
    }

    if (!shippingAddress.trim()) {
      setError("Alamat lengkap wajib diisi.");
      return;
    }

    if (!shippingAreaId) {
      setError("Pilih area pengiriman terlebih dahulu.");
      return;
    }

    if (!selectedRate) {
      setError("Pilih layanan pengiriman terlebih dahulu.");
      return;
    }

    setLoading(true);

    try {
      const results: CreatedOrder[] = [];

      for (let index = 0; index < items.length; index += 1) {
        const item = items[index];
        const productType =
          item.product === "catalog" ? "catalog" : "clicker";

        const letters =
          item.product === "clicker" ? item.letters.join("") : "";

        const quantity = Number(item.quantity);
        const price = Number(item.price);
        const itemTotal = price * quantity;

        // Struktur order KEILAB saat ini membuat satu order untuk setiap
        // item keranjang. Ongkir checkout dibebankan sekali, ke order pertama.
        const orderShippingCost = index === 0 ? shippingCost : 0;

        const { data, error: orderError } = await supabase.rpc(
          "create_order",
          {
            p_customer_name: customerName.trim(),
            p_customer_phone: customerPhone.trim(),
            p_notes: [
              notes.trim(),
              item.product === "clicker" && item.keychain
                ? `Gantungan kunci: ${item.keychain.name} (+Rp${item.keychain.price.toLocaleString("id-ID")})`
                : "",
            ].filter(Boolean).join("\n") || null,
            p_product: productType,
            p_custom_name: item.name,
            p_letters: letters,
            p_base_color:
              item.product === "clicker" ? item.baseColor : "",
            p_letter_colors:
              item.product === "clicker"
                ? { capColors: item.capColors ?? {}, fontColors: item.fontColors ?? {} }
                : {},
            p_quantity: quantity,
            p_price: price,
            p_total: itemTotal,

            p_shipping_recipient_name: customerName.trim(),
            p_shipping_phone: customerPhone.trim(),
            p_shipping_address: shippingAddress.trim(),
            p_shipping_province: shippingProvince.trim(),
            p_shipping_city: shippingCity.trim(),
            p_shipping_district: shippingDistrict.trim(),
            p_shipping_postal_code: shippingPostalCode.trim(),
            p_shipping_area_id: shippingAreaId,
            p_shipping_courier: selectedRate.courierCode,
            p_shipping_service: selectedRate.serviceName,
            p_shipping_service_code: selectedRate.serviceCode,
            p_shipping_cost: orderShippingCost,
            p_shipping_etd: selectedRate.duration || null,
          }
        );

        if (orderError) {
          throw new Error(orderError.message);
        }

        const row = Array.isArray(data) ? data[0] : data;

        if (!row?.order_code) {
          throw new Error(
            `Order ${item.name} berhasil diproses tetapi nomor order tidak tersedia.`
          );
        }

        results.push({
          order_code: row.order_code,
          custom_name: row.custom_name ?? item.name,
          quantity: Number(row.quantity ?? quantity),
          total: Number(row.total ?? itemTotal),
          shipping_cost: Number(row.shipping_cost ?? orderShippingCost),
          grand_total: Number(
            row.grand_total ?? itemTotal + orderShippingCost
          ),
        });
      }

      setCreatedOrders(results);
      clearCart();

      const orderLines = results
        .map(
          (order) =>
            `• ${order.order_code} — ${order.custom_name} × ${order.quantity} (${formatRupiah(
              order.grand_total
            )})`
        )
        .join("\n");

      const message = [
        storeSettings.whatsappGreeting,
        "",
        `Saya ${customerName.trim()} sudah membuat order:`,
        "",
        orderLines,
        "",
        `Subtotal produk: ${formatRupiah(subtotal)}`,
        `Ongkir: ${formatRupiah(shippingCost)}`,
        `Total pembayaran: ${formatRupiah(grandTotal)}`,
        "",
        `Kurir: ${selectedRate.courierName}`,
        `Layanan: ${selectedRate.serviceName}`,
        "",
        "Mohon info proses pembayaran selanjutnya. Terima kasih 🙏",
      ]
        .filter(Boolean)
        .join("\n");

      window.open(
        `https://wa.me/${normalizePhone(storeSettings.whatsapp)}?text=${encodeURIComponent(message)}`,
        "_blank",
        "noopener,noreferrer"
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? `Pesanan gagal dibuat. ${err.message}`
          : "Pesanan gagal dibuat."
      );
    } finally {
      setLoading(false);
    }
  }

  if (createdOrders.length > 0) {
    const trackingCode = createdOrders[0].order_code;

    const trackingUrl =
      typeof window !== "undefined"
        ? `${window.location.origin}/tracking?order=${encodeURIComponent(
            trackingCode
          )}`
        : `/tracking?order=${encodeURIComponent(trackingCode)}`;

    const whatsappText = [
      storeSettings.whatsappGreeting,
      "",
      `Saya ${customerName.trim()} sudah membuat pesanan.`,
      "",
      ...createdOrders.map(
        (order) =>
          `• ${order.order_code} — ${order.custom_name} × ${order.quantity} (${formatRupiah(
            order.grand_total
          )})`
      ),
      "",
      `Subtotal produk: ${formatRupiah(subtotal)}`,
      `Ongkir: ${formatRupiah(shippingCost)}`,
      `Total: ${formatRupiah(grandTotal)}`,
      "",
      `Kurir: ${selectedRate?.courierName || "-"}`,
      `Layanan: ${selectedRate?.serviceName || "-"}`,
      "",
      `Tracking: ${trackingUrl}`,
    ].join("\n");

    return (
      <main className="min-h-screen bg-[#faf9f7] px-6 py-16 text-zinc-900">
        <div className="mx-auto max-w-xl text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">
            ✓
          </div>

          <p className="mt-6 text-sm font-black uppercase tracking-[0.25em] text-orange-500">
            KEILAB.ID
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight">
            Pesanan Berhasil!
          </h1>

          <p className="mt-3 text-zinc-500">
            Pesanan kamu sudah masuk ke sistem KEILAB. Simpan nomor order untuk
            mengecek status pesanan.
          </p>

          <div className="mt-8 rounded-[2rem] border border-zinc-200 bg-white p-7 text-left shadow-sm">
            <p className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Nomor Order
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-3xl font-black text-orange-500">
                {trackingCode}
              </p>

              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(trackingCode);
                    setCopied(true);
                    window.setTimeout(() => setCopied(false), 2200);
                  } catch {
                    setCopied(false);
                  }
                }}
                className={`rounded-full border px-3 py-2 text-xs font-bold transition ${
                  copied
                    ? "border-green-200 bg-green-50 text-green-600"
                    : "border-zinc-200 text-zinc-600 hover:bg-zinc-100"
                }`}
              >
                {copied ? "✓ Tersalin" : "Salin"}
              </button>
            </div>

            <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-zinc-500">Kurir</span>
                <span className="font-bold">{selectedRate?.courierName}</span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-zinc-500">Layanan</span>
                <span className="font-bold text-right">
                  {selectedRate?.serviceName}
                </span>
              </div>
              <div className="mt-2 flex justify-between gap-4">
                <span className="text-zinc-500">Ongkir</span>
                <span className="font-bold">{formatRupiah(shippingCost)}</span>
              </div>
              <div className="mt-3 border-t border-zinc-200 pt-3 flex justify-between gap-4">
                <span className="font-black">Total</span>
                <span className="font-black text-orange-500">
                  {formatRupiah(grandTotal)}
                </span>
              </div>
            </div>

            {createdOrders.length > 1 && (
              <div className="mt-5 space-y-2">
                {createdOrders.slice(1).map((order) => (
                  <div
                    key={order.order_code}
                    className="rounded-xl bg-zinc-50 p-3 text-sm"
                  >
                    <span className="font-bold text-orange-500">
                      {order.order_code}
                    </span>{" "}
                    · {order.custom_name} · {order.quantity} pcs
                  </div>
                ))}
              </div>
            )}

            <div className="mt-6 grid gap-3">
              <a
                href={trackingUrl}
                className="rounded-2xl bg-zinc-900 px-6 py-4 text-center font-black text-white hover:bg-orange-500"
              >
                🔎 Lacak Pesanan
              </a>

              <a
                href={`https://wa.me/${normalizePhone(
                  storeSettings.whatsapp
                )}?text=${encodeURIComponent(whatsappText)}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-2xl bg-green-500 px-6 py-4 text-center font-black text-white hover:bg-green-600"
              >
                💬 Hubungi KEILAB untuk Pembayaran
              </a>

              <Link
                href="/"
                className="rounded-2xl border border-zinc-200 px-6 py-4 text-center font-bold text-zinc-700 hover:bg-zinc-50"
              >
                Kembali ke Beranda
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#faf9f7] px-6 py-12 text-zinc-900">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/cart"
          className="text-sm font-semibold text-zinc-500 hover:text-orange-500"
        >
          ← Kembali ke Keranjang
        </Link>

        <div className="mt-8">
          <div className="flex h-9 w-[145px] items-center">
            <img
              src="/keilab-logo.svg"
              alt="KEILAB.ID"
              className="h-full w-full object-contain object-left"
            />
          </div>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Checkout
          </h1>
          <p className="mt-3 text-zinc-500">
            Isi alamat pengiriman. Ongkir akan dihitung realtime dari Biteship.
          </p>
        </div>

        {!items.length ? (
          <div className="mt-10 rounded-[2rem] border border-zinc-200 bg-white p-10 text-center shadow-sm">
            <div className="text-5xl">🛒</div>
            <h2 className="mt-4 text-2xl font-black">Keranjang kosong</h2>
            <Link
              href="/catalog"
              className="mt-6 inline-flex rounded-full bg-zinc-900 px-6 py-3 font-bold text-white hover:bg-orange-500"
            >
              Lihat Katalog
            </Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_380px]">
            <section className="space-y-6">
              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Data Penerima</h2>

                <div className="mt-6 grid gap-5 md:grid-cols-2">
                  <label className="block">
                    <span className="text-sm font-bold">Nama penerima</span>
                    <input
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama lengkap"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                    />
                  </label>

                  <label className="block">
                    <span className="text-sm font-bold">WhatsApp</span>
                    <input
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      inputMode="tel"
                      className="mt-2 w-full rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Alamat Pengiriman</h2>

                <div className="mt-6">
                  <label className="block">
                    <span className="text-sm font-bold">
                      Cari kecamatan / kota / kode pos
                    </span>
                    <div className="relative mt-2">
                      <input
                        value={areaQuery}
                        onChange={(e) => {
                          setAreaQuery(e.target.value);
                          setShippingAreaId("");
                          setShippingProvince("");
                          setShippingCity("");
                          setShippingDistrict("");
                          setShippingPostalCode("");
                          setRates([]);
                          setSelectedRate(null);
                          setError("");
                          setAreaOpen(true);
                        }}
                        onFocus={() => {
                          if (areas.length) setAreaOpen(true);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Escape") {
                            setAreaOpen(false);
                          }
                        }}
                        placeholder="Ketik contoh: Ban, Bandung, Kembangan, 401..."
                        autoComplete="off"
                        className="w-full rounded-2xl border border-zinc-200 px-4 py-3 pr-12 outline-none focus:border-orange-400"
                      />

                      {areaLoading && (
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                          ...
                        </span>
                      )}

                      {areaOpen && areas.length > 0 && (
                        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-30 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-xl">
                          {areas.map((area) => (
                            <button
                              key={area.id}
                              type="button"
                              onMouseDown={(event) => event.preventDefault()}
                              onClick={() => selectArea(area)}
                              className="block w-full border-b border-zinc-100 px-4 py-3 text-left last:border-b-0 hover:bg-orange-50"
                            >
                              <span className="block text-sm font-black text-zinc-900">
                                {area.administrative_division_level_3_name ||
                                  area.name}
                              </span>
                              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                                {area.administrative_division_level_2_name ||
                                  ""}
                                {area.administrative_division_level_1_name
                                  ? `, ${area.administrative_division_level_1_name}`
                                  : ""}
                                {area.postal_code
                                  ? ` · ${area.postal_code}`
                                  : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="mt-2 text-xs text-zinc-400">
                      Ketik minimal 2 huruf. Pilih hasil yang sesuai dengan alamat customer.
                    </p>
                  </label>
                </div>

                <label className="mt-5 block">
                  <span className="text-sm font-bold">Alamat lengkap</span>
                  <textarea
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    placeholder="Nama jalan, nomor rumah, RT/RW, patokan, dll."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                  />
                </label>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div>
                    <span className="text-sm font-bold">Provinsi</span>
                    <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
                      {shippingProvince || "Pilih hasil pencarian"}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-bold">Kota / Kabupaten</span>
                    <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
                      {shippingCity || "Pilih hasil pencarian"}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-bold">Kecamatan</span>
                    <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
                      {shippingDistrict || "Pilih hasil pencarian"}
                    </div>
                  </div>

                  <div>
                    <span className="text-sm font-bold">Kode Pos</span>
                    <div className="mt-2 rounded-2xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-semibold text-zinc-600">
                      {shippingPostalCode || "Pilih hasil pencarian"}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={loadRates}
                  disabled={ratesLoading || !shippingAreaId || !shippingAddress.trim()}
                  className="mt-6 w-full rounded-2xl bg-orange-500 px-5 py-4 font-black text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {ratesLoading
                    ? "Menghitung ongkir..."
                    : !shippingAreaId
                      ? "Pilih Kecamatan / Kota Dahulu"
                      : "🚚 Cek Ongkir & Pilih Kurir"}
                </button>
              </div>

              {rates.length > 0 && (
                <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black">Pilih Pengiriman</h2>
                  <p className="mt-2 text-sm text-zinc-500">
                    Tarif realtime berdasarkan area tujuan dan berat paket.
                  </p>

                  <div className="mt-5 space-y-3">
                    {rates.map((rate, index) => {
                      const selected =
                        selectedRate?.courierCode === rate.courierCode &&
                        selectedRate?.serviceCode === rate.serviceCode &&
                        selectedRate?.price === rate.price;

                      return (
                        <button
                          key={`${rate.courierCode}-${rate.serviceCode}-${rate.price}-${index}`}
                          type="button"
                          onClick={() => setSelectedRate(rate)}
                          className={`w-full rounded-2xl border p-4 text-left transition ${
                            selected
                              ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100"
                              : "border-zinc-200 hover:border-orange-300"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-black">{rate.courierName}</p>
                              <p className="mt-1 text-sm font-bold text-zinc-700">
                                {rate.serviceName}
                              </p>
                              <p className="mt-1 text-xs text-zinc-400">
                                {rate.duration || "Estimasi sesuai kurir"}
                              </p>
                            </div>
                            <p className="text-lg font-black text-orange-500">
                              {formatRupiah(rate.price)}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
                <label className="block">
                  <span className="text-sm font-bold">
                    Catatan{" "}
                    <span className="font-normal text-zinc-400">
                      (opsional)
                    </span>
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Contoh: request khusus, warna packaging, dll."
                    rows={4}
                    className="mt-2 w-full resize-none rounded-2xl border border-zinc-200 px-4 py-3 outline-none focus:border-orange-400"
                  />
                </label>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600">
                  {error}
                </div>
              )}
            </section>

            <aside className="h-fit rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm lg:sticky lg:top-6">
              <p className="text-sm font-semibold text-zinc-400">
                Ringkasan Pesanan
              </p>

              <div className="mt-5 space-y-4">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-3 border-b border-zinc-100 pb-4"
                  >
                    {"imageUrl" in item && item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-14 w-14 rounded-xl object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-zinc-100">
                        {item.product === "clicker" ? "⌨️" : "📦"}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{item.name}</p>
                      <p className="text-sm text-zinc-400">
                        {item.quantity} × {formatRupiah(item.price)}
                      </p>
                    </div>

                    <p className="font-bold">
                      {formatRupiah(item.price * item.quantity)}
                    </p>
                  </div>
                ))}
              </div>

              <div className="mt-5 border-t border-zinc-100 pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Subtotal</span>
                  <span className="font-bold">{formatRupiah(subtotal)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Ongkir</span>
                  <span className="font-bold">
                    {selectedRate ? formatRupiah(shippingCost) : "Pilih kurir"}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-zinc-100 pt-3">
                  <span className="font-black">Total</span>
                  <span className="text-2xl font-black text-orange-500">
                    {formatRupiah(grandTotal)}
                  </span>
                </div>
              </div>

              {selectedRate && (
                <div className="mt-5 rounded-2xl bg-green-50 p-4 text-xs leading-5 text-green-700">
                  <b>{selectedRate.courierName}</b> ·{" "}
                  {selectedRate.serviceName}
                  <br />
                  Estimasi {selectedRate.duration || "sesuai kurir"}.
                </div>
              )}

              <button
                type="button"
                onClick={submitOrder}
                disabled={loading || !selectedRate}
                className="mt-6 w-full rounded-2xl bg-zinc-900 px-5 py-4 font-black text-white hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? "Membuat Pesanan..."
                  : "Buat Pesanan & WhatsApp →"}
              </button>

              <p className="mt-3 text-center text-[11px] leading-5 text-zinc-400">
                Pembayaran diproses manual melalui WhatsApp setelah pesanan dibuat.
              </p>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
