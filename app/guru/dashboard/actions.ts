"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { pdfAccess, reportSettings, teachers } from "@/lib/db/schema"
import { ambilAnalisisButir, type AnalisisBank } from "@/lib/analisis-data"
import { NOMINAL_PDF, QRIS_SRC, WA_ADMIN, ambilAkses } from "@/lib/akses-pdf"

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
export async function getAksesPdfGuru(): Promise<{
  ok: true
  status: "belum" | "menunggu" | "aktif" | "ditolak"
  nominal: number
  waAdmin: string
  qris: string
}> {
  const guru = await guruDariCookie()
  const baris = guru ? await ambilAkses(guru.id) : null
  return {
    ok: true,
    status: (baris?.status as "belum" | "menunggu" | "aktif" | "ditolak") ?? "belum",
    nominal: baris?.nominal ?? NOMINAL_PDF,
    waAdmin: WA_ADMIN,
    qris: QRIS_SRC,
  }
}

/** Guru menandai sudah membayar; admin yang mengaktifkan. */
export async function konfirmasiSudahBayar(): Promise<{ ok: boolean; message: string }> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang." }
  try {
    const lama = await ambilAkses(guru.id)
    if (lama?.status === "aktif") return { ok: true, message: "Akses unduh PDF sudah aktif." }
    if (lama?.status === "menunggu") return { ok: true, message: "Konfirmasi sudah dikirim. Menunggu verifikasi admin." }
    const values = {
      id: lama?.id ?? randomUUID(),
      teacherId: guru.id,
      status: "menunggu",
      nominal: lama?.nominal ?? NOMINAL_PDF,
      updatedAt: new Date(),
    }
    await db.insert(pdfAccess).values(values).onConflictDoUpdate({
      target: pdfAccess.teacherId,
      set: { status: values.status, updatedAt: values.updatedAt },
    })
    revalidatePath("/guru/dashboard")
    revalidatePath("/dashboard/guru")
    return { ok: true, message: "Konfirmasi terkirim. Kirim bukti bayar ke WA admin, lalu tunggu verifikasi." }
  } catch (error) {
    console.error("Gagal konfirmasi bayar PDF:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

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
