import { NextRequest, NextResponse } from "next/server"

import { db } from "@/lib/db"
import { examEvents } from "@/lib/db/schema"
import { attemptAktif, jadwalSiswa, siswaAktif } from "@/lib/ujian-sesi"

export const dynamic = "force-dynamic"

// Detak berkala dari halaman ujian: penanda siswa masih terhubung di ruangan.
export async function POST(request: NextRequest) {
  const siswa = await siswaAktif()
  if (!siswa) return NextResponse.json({ error: "Sesi siswa tidak valid" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as { scheduleId?: string }
  if (!body.scheduleId) return NextResponse.json({ error: "scheduleId wajib" }, { status: 400 })

  const cek = await jadwalSiswa(body.scheduleId, siswa.id)
  if ("error" in cek) return NextResponse.json({ error: cek.error }, { status: 403 })

  const { attempt, baru } = await attemptAktif(body.scheduleId, siswa.id, cek.totalSoal)
  if (baru) {
    await db.insert(examEvents).values({
      scheduleId: body.scheduleId,
      studentId: siswa.id,
      roomId: siswa.roomId,
      jenis: "MULAI",
      pesan: `${siswa.name} masuk ruang ujian`,
    })
  }

  return NextResponse.json({ ok: true, attemptId: attempt.id, totalSoal: cek.totalSoal })
}
