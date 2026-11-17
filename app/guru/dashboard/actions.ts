"use server"

import { and, eq, inArray } from "drizzle-orm"
import { cookies } from "next/headers"

import { db } from "@/lib/db"
import { examResults, examSchedules, questionBanks, teachers } from "@/lib/db/schema"
import { analisisButir, type AnalisisButir } from "@/lib/analisis-butir"
import { soalDariItems } from "@/lib/google-forms"

async function guruDariCookie() {
  const cookieStore = await cookies()
  const teacherId = cookieStore.get("teacher_id")?.value
  if (!teacherId) return null

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) })
  return guru?.active ? guru : null
}

export type AnalisisGuruResult = { ok: true; butir: AnalisisButir[] } | { ok: false; message: string }

// Guru hanya boleh melihat analisis butir bank soalnya sendiri.
export async function getAnalisisButirGuru(bankId: string): Promise<AnalisisGuruResult> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang." }
  if (!bankId) return { ok: false, message: "Bank soal tidak valid." }

  try {
    const bank = await db
      .select({ items: questionBanks.formItems })
      .from(questionBanks)
      .where(and(eq(questionBanks.id, bankId), eq(questionBanks.teacherId, guru.id)))
      .limit(1)
    if (!bank[0]) return { ok: false, message: "Bank soal tidak ditemukan." }

    const jadwal = await db
      .select({ id: examSchedules.id })
      .from(examSchedules)
      .where(eq(examSchedules.questionBankId, bankId))
    if (!jadwal.length) return { ok: false, message: "Bank soal ini belum punya jadwal." }

    const baris = await db
      .select({ answers: examResults.answers, correct: examResults.correct })
      .from(examResults)
      .where(inArray(examResults.scheduleId, jadwal.map((j) => j.id)))
    if (!baris.length) {
      return { ok: false, message: "Belum ada respons untuk bank soal ini. Minta panitia sync di menu Hasil Ujian." }
    }

    const soal = soalDariItems((bank[0].items as unknown[] | null) ?? [])
    const butir = analisisButir(
      soal,
      baris.map((b) => ({ answers: b.answers as never, skorTotal: b.correct })),
    )
    if (!butir.length) {
      return { ok: false, message: "Form belum punya kunci jawaban. Aktifkan mode kuis lalu minta panitia sync ulang." }
    }

    return { ok: true, butir }
  } catch {
    return { ok: false, message: "Gagal menghitung analisis butir soal." }
  }
}
