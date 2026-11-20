import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { examBrowserSettings } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code")?.trim()
  if (!code || code.length !== 4 || !/^\d{4}$/.test(code)) {
    return NextResponse.json({ error: "Kode harus 4 angka." }, { status: 400 })
  }

  const rows = await db.select().from(examBrowserSettings).where(eq(examBrowserSettings.configCode, code)).limit(1)
  const settings = rows[0]
  if (!settings) {
    return NextResponse.json({ error: "Kode tidak ditemukan. Minta kode dari guru." }, { status: 404 })
  }

  // Return config JSON that ExamBro app understands
  const config = {
    url: settings.downloadUrl ? new URL(settings.downloadUrl).origin : "https://asas.sman1bantarujeg.sch.id",
    pin: "1234",
    school: "SMAN 1 Bantarujeg",
    alarm: true,
  }

  // Use the actual site URL as exam URL
  config.url = "https://asas.sman1bantarujeg.sch.id"

  return NextResponse.json(config)
}
