import { and, eq, isNotNull, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { examSchedules, questionBanks } from "@/lib/db/schema"
import { jalankanSync } from "@/lib/sync-hasil"

/**
 * Sync otomatis hasil Google Form selama jadwal ujian berjalan.
 * Dipanggil cron tiap 5 menit:
 *   curl -s -X POST -H "x-token: $MUTASI_TOKEN" http://127.0.0.1:3006/api/sync-otomatis
 * Bank yang jadwalnya belum mulai / sudah lewat durasi tidak disentuh.
 */
export async function POST(request: Request) {
  const token = process.env.MUTASI_TOKEN ?? ""
  if (!token) return Response.json({ ok: false, message: "MUTASI_TOKEN belum diatur." }, { status: 501 })

  const dikirim = request.headers.get("x-token") ?? new URL(request.url).searchParams.get("token") ?? ""
  if (dikirim !== token) return Response.json({ ok: false, message: "Token salah." }, { status: 401 })

  const sekarang = sql`(now() at time zone 'Asia/Jakarta')`
  const mulai = sql`(${examSchedules.examDate} + ${examSchedules.startTime})`
  // Toleransi 10 menit setelah durasi habis: jawaban terakhir sering masuk tepat di menit akhir.
  const selesai = sql`(${examSchedules.examDate} + ${examSchedules.startTime} + make_interval(mins => ${examSchedules.durationMinutes} + 10))`

  const bank = await db
    .selectDistinct({ id: questionBanks.id })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .where(and(isNotNull(questionBanks.formId), eq(examSchedules.active, true), sql`${mulai} <= ${sekarang}`, sql`${selesai} > ${sekarang}`))

  const hasil: { bankId: string; ok: boolean; info?: unknown; message?: string }[] = []
  for (const b of bank) {
    const jadwal = await db.select({ id: examSchedules.id }).from(examSchedules).where(eq(examSchedules.questionBankId, b.id)).limit(1)
    if (!jadwal[0]) continue
    try {
      const r = await jalankanSync(jadwal[0].id)
      hasil.push({ bankId: b.id, ...r })
    } catch (error) {
      hasil.push({ bankId: b.id, ok: false, message: error instanceof Error ? error.message : "gagal" })
    }
  }

  if (hasil.length) console.log("[sync-otomatis]", JSON.stringify(hasil))
  return Response.json({ ok: true, jumlahBank: hasil.length, hasil })
}
