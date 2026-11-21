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

  // Konfigurasi yang diambil app ExamBro lewat access code (sesuai form pengaturan admin).
  const config = {
    url: settings.configExamUrl || "https://asas.sman1bantarujeg.sch.id",
    pin: settings.configExitPin || "1234",
    school: settings.configSchoolName || "SMAN 1 Bantarujeg",
    ua: settings.configUserAgent || "smansaba",
    alarm: true,
  }

  return NextResponse.json(config)
}
