import { revalidatePath } from "next/cache"

import { cocokkanDanAktifkan } from "@/lib/mutasi-server"

/**
 * Terima teks notifikasi pembayaran (mis. diteruskan aplikasi notifikasi di HP merchant),
 * cocokkan dengan tagihan guru, aktifkan aksesnya.
 *
 * POST /api/mutasi?token=...  body: { "teks": "..." } atau teks mentah
 */
export async function POST(request: Request) {
  const token = process.env.MUTASI_TOKEN ?? ""
  if (!token) return Response.json({ ok: false, message: "MUTASI_TOKEN belum diatur." }, { status: 501 })

  const dikirim = request.headers.get("x-token") ?? new URL(request.url).searchParams.get("token") ?? ""
  if (dikirim !== token) return Response.json({ ok: false, message: "Token salah." }, { status: 401 })

  let teks = ""
  const tipe = request.headers.get("content-type") ?? ""
  if (tipe.includes("application/json")) {
    const body = (await request.json().catch(() => null)) as { teks?: string; text?: string } | null
    teks = String(body?.teks ?? body?.text ?? "")
  } else {
    teks = await request.text()
  }
  if (!teks.trim()) return Response.json({ ok: false, message: "Teks mutasi kosong." }, { status: 400 })

  try {
    const hasil = await cocokkanDanAktifkan(teks)
    if (hasil.cocok.length > 0) {
      revalidatePath("/dashboard/akses-pdf")
      revalidatePath("/guru/dashboard")
    }
    return Response.json({ ok: true, ...hasil })
  } catch (error) {
    console.error("Gagal mencocokkan mutasi:", error)
    return Response.json({ ok: false, message: "Gagal mencocokkan mutasi." }, { status: 500 })
  }
}
