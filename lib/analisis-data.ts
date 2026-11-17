import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, subjects } from "@/lib/db/schema"
import { analisisButir, type AnalisisButir } from "@/lib/analisis-butir"
import { soalDariItems } from "@/lib/google-forms"

export type AnalisisBank = {
  bank: {
    id: string
    code: string
    title: string
    grade: string
    teacherName: string
    subjectName: string
  }
  ringkasan: {
    respons: number
    butirDinilai: number
    rataKesukaran: number
    rataDayaBeda: number
    jumlahJadwal: number
    kelas: string[]
  }
  butir: AnalisisButir[]
}

export type AnalisisBankResult = { ok: true; data: AnalisisBank } | { ok: false; message: string }

// Dipakai halaman analisis (admin & guru) dan unduhan PDF, supaya angkanya selalu sama.
export async function ambilAnalisisButir(
  bankId: string,
  opsi: { teacherId?: string } = {},
): Promise<AnalisisBankResult> {
  if (!bankId) return { ok: false, message: "Bank soal tidak valid." }

  const filter = opsi.teacherId
    ? and(eq(questionBanks.id, bankId), eq(questionBanks.teacherId, opsi.teacherId))
    : eq(questionBanks.id, bankId)

  const bank = await db
    .select({
      id: questionBanks.id,
      code: questionBanks.code,
      title: questionBanks.title,
      grade: questionBanks.grade,
      teacherName: questionBanks.teacherName,
      formItems: questionBanks.formItems,
      subjectName: subjects.name,
    })
    .from(questionBanks)
    .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(filter)
    .limit(1)
  if (!bank[0]) return { ok: false, message: "Bank soal tidak ditemukan." }

  const jadwal = await db
    .select({ id: examSchedules.id, kelas: classrooms.name })
    .from(examSchedules)
    .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
    .where(eq(examSchedules.questionBankId, bankId))
  if (!jadwal.length) return { ok: false, message: "Bank soal ini belum punya jadwal." }

  const baris = await db
    .select({ answers: examResults.answers, correct: examResults.correct })
    .from(examResults)
    .where(inArray(examResults.scheduleId, jadwal.map((j) => j.id)))
  if (!baris.length) return { ok: false, message: "Belum ada respons untuk bank soal ini. Sync dulu di menu Hasil Ujian." }

  const soal = soalDariItems((bank[0].formItems as unknown[] | null) ?? [])
  const butir = analisisButir(
    soal,
    baris.map((b) => ({ answers: b.answers as never, skorTotal: b.correct })),
  )
  if (!butir.length) return { ok: false, message: "Form belum punya kunci jawaban. Aktifkan mode kuis lalu sync ulang." }

  const rata = (angka: number[]) => (angka.length ? angka.reduce((a, b) => a + b, 0) / angka.length : 0)

  return {
    ok: true,
    data: {
      bank: {
        id: bank[0].id,
        code: bank[0].code,
        title: bank[0].title,
        grade: bank[0].grade,
        teacherName: bank[0].teacherName,
        subjectName: bank[0].subjectName ?? "-",
      },
      ringkasan: {
        respons: baris.length,
        butirDinilai: butir.length,
        rataKesukaran: Math.round(rata(butir.map((b) => b.kesukaran)) * 10000) / 10000,
        rataDayaBeda: Math.round(rata(butir.map((b) => b.dayaBeda)) * 10000) / 10000,
        jumlahJadwal: jadwal.length,
        kelas: [...new Set(jadwal.map((j) => j.kelas))],
      },
      butir,
    },
  }
}
