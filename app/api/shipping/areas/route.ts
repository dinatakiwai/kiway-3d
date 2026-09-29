import { NextRequest, NextResponse } from "next/server";

const BITESHIP_API = "https://api.biteship.com/v1";

export async function GET(request: NextRequest) {
  const apiKey = process.env.BITESHIP_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { success: false, message: "BITESHIP_API_KEY belum diatur di environment." },
      { status: 503 }
    );
  }

  const input = request.nextUrl.searchParams.get("input")?.trim() || "";
  if (input.length < 3) {
    return NextResponse.json({ success: true, areas: [] });
  }

  const url = new URL(`${BITESHIP_API}/maps/areas`);
  url.searchParams.set("countries", "ID");
  url.searchParams.set("input", input);
  url.searchParams.set("type", "single");

  try {
    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        authorization: apiKey,
        "content-type": "application/json",
      },
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data?.error || data?.message || "Gagal mencari area." },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      areas: Array.isArray(data?.areas) ? data.areas.slice(0, 8) : [],
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Tidak dapat terhubung ke layanan lokasi Biteship." },
      { status: 502 }
    );
  }
}
