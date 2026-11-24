import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { and, desc, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { examAnswers, examEvents } from "@/lib/db/schema"
import { attemptAktif, jadwalSiswa, siswaAktif } from "@/lib/ujian-sesi"

export const dynamic = "force-dynamic"

type Body = { scheduleId?: string; qid?: string; noSoal?: number; jawaban?: string[] }

export async function POST(request: NextRequest) {
  const siswa = await siswaAktif()
  if (!siswa) return NextResponse.json({ error: "Sesi siswa tidak valid" }, { status: 401 })

  const body = (await request.json().catch(() => ({}))) as Body
  const { scheduleId, qid } = body
  if (!scheduleId || !qid) return NextResponse.json({ error: "scheduleId dan qid wajib" }, { status: 400 })

  const cek = await jadwalSiswa(scheduleId, siswa.id)
  if ("error" in cek) return NextResponse.json({ error: cek.error }, { status: 403 })

  const { attempt, baru } = await attemptAktif(scheduleId, siswa.id, cek.totalSoal)
  if (baru) {
    await db.insert(examEvents).values({
      scheduleId,
      studentId: siswa.id,
      roomId: siswa.roomId,
      jenis: "MULAI",
      pesan: `${siswa.name} mulai mengerjakan`,
    })
  }

  // durasi = jeda sejak jawaban soal sebelumnya (untuk log "selesai soal N dalam X detik").
  const sebelumnya = await db
    .select({ answeredAt: examAnswers.answeredAt })
    .from(examAnswers)
    .where(eq(examAnswers.attemptId, attempt.id))
    .orderBy(desc(examAnswers.answeredAt))
    .limit(1)

  const sekarang = new Date()
  const acuan = sebelumnya[0]?.answeredAt ?? attempt.startedAt ?? sekarang
  const durasiDetik = Math.max(0, Math.round((sekarang.getTime() - new Date(acuan).getTime()) / 1000))

  const jawaban = Array.isArray(body.jawaban) ? body.jawaban.map((j) => String(j)) : []
  const noSoal = Number(body.noSoal) || 0

  const sudah = await db
    .select({ id: examAnswers.id })
    .from(examAnswers)
    .where(and(eq(examAnswers.attemptId, attempt.id), eq(examAnswers.qid, qid)))
    .limit(1)

  if (sudah[0]) {
    await db
      .update(examAnswers)
      .set({ jawaban, noSoal, answeredAt: sekarang, durasiDetik })
      .where(eq(examAnswers.id, sudah[0].id))
  } else {
    await db.insert(examAnswers).values({ id: randomUUID(), attemptId: attempt.id, qid, noSoal, jawaban, durasiDetik, answeredAt: sekarang })
  }

  await db.insert(examEvents).values({
    scheduleId,
    studentId: siswa.id,
    roomId: siswa.roomId,
    jenis: "JAWAB",
    pesan: jawaban.length
      ? `${siswa.name} menjawab soal ${noSoal} dalam ${durasiDetik} detik`
      : `${siswa.name} mengosongkan jawaban soal ${noSoal}`,
    noSoal,
    durasiDetik,
  })

  return NextResponse.json({ ok: true, noSoal, durasiDetik })
}
