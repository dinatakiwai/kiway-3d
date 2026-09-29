import { NextRequest, NextResponse } from "next/server";

const BITESHIP_API = "https://api.biteship.com/v1";

type ShippingItem = {
  name: string;
  value: number;
  weight: number;
  quantity: number;
  length?: number;
  width?: number;
  height?: number;
};

type BiteshipArea = {
  id?: string;
  name?: string;
  postal_code?: number | string;
  administrative_division_level_1_name?: string;
  administrative_division_level_2_name?: string;
  administrative_division_level_3_name?: string;
};

async function resolveOrigin(apiKey: string) {
  const configuredAreaId = process.env.BITESHIP_ORIGIN_AREA_ID?.trim();
  if (configuredAreaId) {
    return { mode: "area_id" as const, value: configuredAreaId };
  }

  const postalCode =
    process.env.BITESHIP_ORIGIN_POSTAL_CODE?.trim() || "15322";
  const searchText =
    process.env.BITESHIP_ORIGIN_SEARCH?.trim() ||
    `Serpong, Tangerang Selatan, Banten ${postalCode}`;

  // Preferred: high-accuracy district Area ID from Biteship Maps API.
  try {
    const url = new URL(`${BITESHIP_API}/maps/areas`);
    url.searchParams.set("countries", "ID");
    url.searchParams.set("input", searchText);
    url.searchParams.set("type", "single");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (response.ok && data?.success !== false) {
      const areas = Array.isArray(data?.areas)
        ? (data.areas as BiteshipArea[])
        : [];

      const exactPostal = areas.find(
        (area) => String(area.postal_code || "") === postalCode
      );

      const preferred = exactPostal || areas[0];

      if (preferred?.id) {
        return {
          mode: "area_id" as const,
          value: String(preferred.id),
        };
      }
    }
  } catch {
    // Continue to the postal-code fallback below.
  }

  // Reliable fallback supported directly by Biteship Rates API.
  return {
    mode: "postal_code" as const,
    value: postalCode,
  };
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.BITESHIP_API_KEY;
  const couriers =
    process.env.BITESHIP_COURIERS || "jne,sicepat,jnt,wahana,anteraja";

  if (!apiKey) {
    return NextResponse.json(
      {
        success: false,
        message: "Shipping belum aktif. Atur BITESHIP_API_KEY di environment.",
      },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const destinationAreaId = String(body?.destinationAreaId || "").trim();
    const items = Array.isArray(body?.items)
      ? (body.items as ShippingItem[])
      : [];

    if (!destinationAreaId) {
      return NextResponse.json(
        { success: false, message: "Area tujuan belum dipilih." },
        { status: 400 }
      );
    }

    if (!items.length) {
      return NextResponse.json(
        { success: false, message: "Item pengiriman kosong." },
        { status: 400 }
      );
    }

    const safeItems = items.map((item) => ({
      name: String(item.name || "Produk KEILAB").slice(0, 120),
      description: "Produk 3D printing KEILAB",
      category: "hobby",
      value: Math.max(0, Number(item.value) || 0),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      weight: Math.max(1, Math.floor(Number(item.weight) || 500)),
      length: Math.max(1, Number(item.length) || 20),
      width: Math.max(1, Number(item.width) || 20),
      height: Math.max(1, Number(item.height) || 10),
    }));

    // No need to manually find the Origin Area ID in the dashboard.
    // KEILAB's origin is resolved automatically from the pickup postal code.
    const origin = await resolveOrigin(apiKey);

    const rateOrigin =
      origin.mode === "area_id"
        ? { origin_area_id: origin.value }
        : { origin_postal_code: Number(origin.value) };

    const response = await fetch(`${BITESHIP_API}/rates/couriers`, {
      method: "POST",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        ...rateOrigin,
        destination_area_id: destinationAreaId,
        couriers,
        items: safeItems,
      }),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || data?.success === false) {
      return NextResponse.json(
        {
          success: false,
          message:
            data?.error ||
            data?.message ||
            "Biteship tidak menemukan layanan pengiriman untuk alamat tersebut.",
        },
        { status: response.status || 502 }
      );
    }

    const pricing = Array.isArray(data?.pricing) ? data.pricing : [];

    return NextResponse.json({
      success: true,
      origin: {
        mode: origin.mode,
        areaId: origin.mode === "area_id" ? origin.value : null,
        postalCode:
          process.env.BITESHIP_ORIGIN_POSTAL_CODE?.trim() || "15322",
      },
      pricing: pricing.map((rate: Record<string, unknown>) => ({
        company: String(rate.company || rate.courier_code || ""),
        courierCode: String(rate.courier_code || rate.company || ""),
        courierName: String(rate.courier_name || rate.company || ""),
        serviceCode: String(
          rate.courier_service_code || rate.type || ""
        ),
        serviceName: String(
          rate.courier_service_name || rate.description || rate.type || ""
        ),
        description: String(rate.description || ""),
        duration: String(rate.duration || ""),
        price: Number(rate.price || 0),
        currency: String(rate.currency || "IDR"),
        collectionMethod: Array.isArray(
          rate.available_collection_method
        )
          ? rate.available_collection_method
          : [],
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Gagal mengambil ongkir dari Biteship.",
      },
      { status: 502 }
    );
  }
}
