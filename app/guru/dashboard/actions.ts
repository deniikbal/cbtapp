"use server"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { type AnalisisButir } from "@/lib/analisis-butir"
import { ambilAnalisisButir } from "@/lib/analisis-data"

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

  try {
    const hasil = await ambilAnalisisButir(bankId, { teacherId: guru.id })
    return hasil.ok ? { ok: true, butir: hasil.data.butir } : hasil
  } catch {
    return { ok: false, message: "Gagal menghitung analisis butir soal." }
  }
}
