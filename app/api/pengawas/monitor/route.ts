import { NextRequest, NextResponse } from "next/server"
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { classrooms, examAnswers, examAttempts, examEvents, examRooms, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { daftarSoalDariItems } from "@/lib/google-forms"
import { aktorPengawas, jendelaJadwal, tanggalWib } from "@/lib/pengawas-auth"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  const aktor = await aktorPengawas()
  if (!aktor) return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const roomId = new URL(request.url).searchParams.get("roomId")
  if (!roomId) return NextResponse.json({ error: "roomId wajib diisi" }, { status: 400 })

  const room = await db.select({ id: examRooms.id, name: examRooms.name }).from(examRooms).where(eq(examRooms.id, roomId)).limit(1)
  if (!room[0]) return NextResponse.json({ error: "Ruangan tidak ditemukan" }, { status: 404 })

  const peserta = await db
    .select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      classroomId: students.classroomId,
      session: students.session,
      className: classrooms.name,
    })
    .from(students)
    .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
    .where(and(eq(students.roomId, roomId), eq(students.active, true)))
    .orderBy(asc(students.name))

  const kelasIds = [...new Set(peserta.map((s) => s.classroomId))]
  const hariIni = tanggalWib()

  const jadwal =
    kelasIds.length === 0
      ? []
      : await db
          .select({
            id: examSchedules.id,
            classroomId: examSchedules.classroomId,
            session: examSchedules.session,
            startTime: examSchedules.startTime,
            durationMinutes: examSchedules.durationMinutes,
            examDate: examSchedules.examDate,
            title: questionBanks.title,
            formItems: questionBanks.formItems,
          })
          .from(examSchedules)
          .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
          .where(and(eq(examSchedules.examDate, hariIni), eq(examSchedules.active, true), inArray(examSchedules.classroomId, kelasIds)))

  const jadwalIds = jadwal.map((j) => j.id)
  const jumlahSoal = new Map(jadwal.map((j) => [j.id, daftarSoalDariItems((j.formItems as unknown[]) ?? []).length]))
  const jadwalPerKelasSesi = new Map(jadwal.map((j) => [`${j.classroomId}|${j.session}`, j]))

  const attempt =
    jadwalIds.length === 0
      ? []
      : await db
          .select({
            id: examAttempts.id,
            scheduleId: examAttempts.scheduleId,
            studentId: examAttempts.studentId,
            startedAt: examAttempts.startedAt,
            submittedAt: examAttempts.submittedAt,
            lastSeenAt: examAttempts.lastSeenAt,
          })
          .from(examAttempts)
          .where(inArray(examAttempts.scheduleId, jadwalIds))

  const attemptIds = attempt.map((a) => a.id)
  const terjawab =
    attemptIds.length === 0
      ? []
      : await db
          .select({ attemptId: examAnswers.attemptId, n: sql<number>`count(*)::int` })
          .from(examAnswers)
          .where(inArray(examAnswers.attemptId, attemptIds))
          .groupBy(examAnswers.attemptId)
  const petaTerjawab = new Map(terjawab.map((t) => [t.attemptId, t.n]))

  const attemptPerSiswa = new Map(attempt.map((a) => [`${a.scheduleId}|${a.studentId}`, a]))

  const kejadian =
    jadwalIds.length === 0
      ? []
      : await db
          .select({
            id: examEvents.id,
            jenis: examEvents.jenis,
            pesan: examEvents.pesan,
            createdAt: examEvents.createdAt,
            studentId: examEvents.studentId,
          })
          .from(examEvents)
          .where(inArray(examEvents.scheduleId, jadwalIds))
          .orderBy(desc(examEvents.createdAt))
          .limit(30)

  const sekarang = Date.now()
  const aktif = jadwal.map((j) => {
    const { start, end } = jendelaJadwal(j.examDate, j.startTime, j.durationMinutes)
    return {
      scheduleId: j.id,
      judul: j.title,
      mulai: start.toISOString(),
      selesai: end.toISOString(),
      sisaDetik: Math.max(0, Math.round((end.getTime() - sekarang) / 1000)),
      berjalan: sekarang >= start.getTime() && sekarang <= end.getTime(),
      totalSoal: jumlahSoal.get(j.id) ?? 0,
    }
  })

  const daftarSiswa = peserta.map((s) => {
    const jadwalSiswa = jadwalPerKelasSesi.get(`${s.classroomId}|${s.session}`)
    const a = jadwalSiswa ? attemptPerSiswa.get(`${jadwalSiswa.id}|${s.id}`) : undefined
    const total = jadwalSiswa ? jumlahSoal.get(jadwalSiswa.id) ?? 0 : 0
    const sudah = a ? petaTerjawab.get(a.id) ?? 0 : 0
    const status = a?.submittedAt ? "SELESAI" : a ? "MENGERJAKAN" : "BELUM"
    return {
      id: s.id,
      nama: s.name,
      nis: s.nis,
      kelas: s.className,
      totalSoal: total,
      terjawab: sudah,
      status,
      mulai: a?.startedAt ?? null,
      terakhir: a?.lastSeenAt ?? null,
      jadwalId: jadwalSiswa?.id ?? null,
    }
  })

  return NextResponse.json({
    ruangan: room[0],
    hariIni,
    jadwal: aktif,
    ringkas: {
      total: daftarSiswa.length,
      masuk: daftarSiswa.filter((s) => s.status !== "BELUM").length,
      mengerjakan: daftarSiswa.filter((s) => s.status === "MENGERJAKAN").length,
      selesai: daftarSiswa.filter((s) => s.status === "SELESAI").length,
    },
    siswa: daftarSiswa,
    kejadian: kejadian.map((k) => ({ id: k.id, jenis: k.jenis, pesan: k.pesan, waktu: k.createdAt, studentId: k.studentId })),
    diperbarui: new Date().toISOString(),
  })
}
