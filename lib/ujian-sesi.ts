import { randomUUID } from "node:crypto"
import { cookies } from "next/headers"
import { and, eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { examAttempts, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { daftarSoalDariItems } from "@/lib/google-forms"
import { jendelaJadwal } from "@/lib/pengawas-auth"

// Siswa yang sedang login (cookie student_id) dan masih aktif.
export async function siswaAktif() {
  const cookieStore = await cookies()
  const studentId = cookieStore.get("student_id")?.value
  if (!studentId) return null
  const row = await db.select().from(students).where(and(eq(students.id, studentId), eq(students.active, true))).limit(1)
  return row[0] ?? null
}

// Jadwal yang boleh dikerjakan siswa ini sekarang (sesi cocok + dalam jam ujian).
export async function jadwalSiswa(scheduleId: string, studentId: string) {
  const rows = await db
    .select({
      id: examSchedules.id,
      examDate: examSchedules.examDate,
      startTime: examSchedules.startTime,
      durationMinutes: examSchedules.durationMinutes,
      formItems: questionBanks.formItems,
      scheduleActive: examSchedules.active,
      bankActive: questionBanks.active,
      roomId: students.roomId,
    })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(students, and(eq(students.id, studentId), eq(students.session, examSchedules.session)))
    .where(eq(examSchedules.id, scheduleId))
    .limit(1)

  const j = rows[0]
  if (!j) return { error: "Jadwal bukan untuk sesi siswa ini." as const }
  if (!j.scheduleActive || !j.bankActive) return { error: "Jadwal ujian tidak aktif." as const }

  const { start, end } = jendelaJadwal(j.examDate, j.startTime, j.durationMinutes)
  if (Date.now() < start.getTime()) return { error: "Ujian belum dimulai." as const }
  if (Date.now() > end.getTime()) return { error: "Waktu ujian sudah berakhir." as const }

  return { jadwal: j, totalSoal: daftarSoalDariItems((j.formItems as unknown[]) ?? []).length }
}

// Ambil/buat attempt (satu baris per siswa per jadwal) + catat detak terakhir.
export async function attemptAktif(scheduleId: string, studentId: string, totalSoal: number) {
  const ada = await db
    .select()
    .from(examAttempts)
    .where(and(eq(examAttempts.scheduleId, scheduleId), eq(examAttempts.studentId, studentId)))
    .limit(1)

  if (ada[0]) {
    await db
      .update(examAttempts)
      .set({ lastSeenAt: new Date(), updatedAt: new Date(), totalSoal })
      .where(eq(examAttempts.id, ada[0].id))
    return { attempt: ada[0], baru: false }
  }

  const now = new Date()
  const id = randomUUID()
  await db.insert(examAttempts).values({ id, scheduleId, studentId, startedAt: now, lastSeenAt: now, totalSoal })
  return { attempt: { id, scheduleId, studentId, startedAt: now, submittedAt: null, lastSeenAt: now, totalSoal }, baru: true }
}
