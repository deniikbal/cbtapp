"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { reportSettings, teachers } from "@/lib/db/schema"
import { ambilAnalisisButir, type AnalisisBank } from "@/lib/analisis-data"

async function guruDariCookie() {
  const cookieStore = await cookies()
  const teacherId = cookieStore.get("teacher_id")?.value
  if (!teacherId) return null

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) })
  return guru?.active ? guru : null
}

export type IdentitasLaporan = {
  namaTes: string
  tahunPelajaran: string
  semester: string
  kkm: number
  kepalaSekolah: string
  nipKepalaSekolah: string
}

const IDENTITAS_KOSONG: IdentitasLaporan = {
  namaTes: "",
  tahunPelajaran: "",
  semester: "",
  kkm: 75,
  kepalaSekolah: "",
  nipKepalaSekolah: "",
}

// Satu baris identitas per guru; dipakai header PDF analisis butir.
export async function getIdentitasLaporan(): Promise<IdentitasLaporan> {
  const guru = await guruDariCookie()
  if (!guru) return IDENTITAS_KOSONG

  const baris = await db.query.reportSettings.findFirst({ where: eq(reportSettings.teacherId, guru.id) })
  if (!baris) return IDENTITAS_KOSONG

  return {
    namaTes: baris.namaTes,
    tahunPelajaran: baris.tahunPelajaran,
    semester: baris.semester,
    kkm: baris.kkm,
    kepalaSekolah: baris.kepalaSekolah,
    nipKepalaSekolah: baris.nipKepalaSekolah,
  }
}

export type IdentitasResult = { ok: boolean; message: string; values?: IdentitasLaporan }

export async function simpanIdentitasLaporan(_prev: IdentitasResult, formData: FormData): Promise<IdentitasResult> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang." }

  const ambil = (kunci: string) => String(formData.get(kunci) ?? "").trim()
  const kkm = Number(ambil("kkm") || 0)

  if (kkm < 0 || kkm > 100) return { ok: false, message: "KKM harus angka 0–100." }

  const values: IdentitasLaporan = {
    namaTes: ambil("namaTes"),
    tahunPelajaran: ambil("tahunPelajaran"),
    semester: ambil("semester"),
    kkm,
    kepalaSekolah: ambil("kepalaSekolah"),
    nipKepalaSekolah: ambil("nipKepalaSekolah"),
  }

  try {
    await db
      .insert(reportSettings)
      .values({ id: randomUUID(), teacherId: guru.id, ...values, updatedAt: new Date() })
      .onConflictDoUpdate({ target: reportSettings.teacherId, set: { ...values, updatedAt: new Date() } })

    revalidatePath("/guru/dashboard")
    return { ok: true, message: "Identitas laporan disimpan.", values }
  } catch {
    return { ok: false, message: "Gagal menyimpan identitas laporan." }
  }
}

export type AnalisisGuruResult = { ok: true; data: AnalisisBank } | { ok: false; message: string }

// Guru hanya boleh melihat analisis butir bank soalnya sendiri.
export async function getAnalisisButirGuru(bankId: string): Promise<AnalisisGuruResult> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang." }

  try {
    const hasil = await ambilAnalisisButir(bankId, { teacherId: guru.id })
    return hasil.ok ? { ok: true, data: hasil.data } : hasil
  } catch {
    return { ok: false, message: "Gagal menghitung analisis butir soal." }
  }
}
