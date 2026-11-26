import { headers } from "next/headers"
import type { NextRequest } from "next/server"

import { auth } from "@/lib/auth"
import { ambilBelumMengerjakan } from "@/lib/belum-mengerjakan"
import { buatPdfBelumMengerjakan } from "@/lib/pdf-belum"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const bankId = request.nextUrl.searchParams.get("bankId") ?? ""
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return new Response("Sesi habis. Silakan login ulang.", { status: 401 })
  if (!bankId) return new Response("bankId wajib diisi.", { status: 400 })

  const data = await ambilBelumMengerjakan(bankId)
  const pdf = await buatPdfBelumMengerjakan(data)

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="belum-mengerjakan-${data.bank.code}.pdf"`,
      "Cache-Control": "no-store",
    },
  })
}
