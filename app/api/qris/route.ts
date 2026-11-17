import QRCode from "qrcode"

import { buatQrisDinamis } from "@/lib/qris"

/** PNG QRIS dinamis dengan nominal terkunci, dari payload QRIS statis merchant. */
export async function GET(request: Request) {
  const statis = process.env.QRIS_STATIS ?? ""
  if (!statis) return new Response("QRIS statis belum diatur admin.", { status: 501 })

  const nominal = Number(new URL(request.url).searchParams.get("nominal"))
  if (!Number.isInteger(nominal) || nominal <= 0 || nominal > 100_000_000) {
    return new Response("Nominal tidak valid.", { status: 400 })
  }

  try {
    const png = await QRCode.toBuffer(buatQrisDinamis(statis, nominal), {
      width: 512,
      margin: 1,
      errorCorrectionLevel: "M",
    })
    return new Response(new Uint8Array(png), {
      headers: { "content-type": "image/png", "cache-control": "public, max-age=86400" },
    })
  } catch (error) {
    console.error("Gagal membuat QRIS dinamis:", error)
    return new Response("Gagal membuat QRIS.", { status: 500 })
  }
}
