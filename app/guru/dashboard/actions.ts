"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { reportSettings, teachers } from "@/lib/db/schema"
import { ambilAnalisisButir, type AnalisisBank } from "@/lib/analisis-data"
import { existsSync } from "node:fs"
import path from "node:path"

import { QRIS_SRC, WA_ADMIN, aktifkanGratis, ambilAkses, simpanDukungan } from "@/lib/akses-pdf"
import { nominalTagihan } from "@/lib/mutasi"

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
export type AksesPdfGuru = {
  ok: true
  status: "belum" | "menunggu" | "aktif" | "ditolak"
  waAdmin: string
  punyaQris: boolean
  nominal: number
  qris: string
}

function urlQris(nominal: number): string {
  if (process.env.QRIS_STATIS) return `/api/qris?nominal=${nominal}`
  return existsSync(path.join(process.cwd(), "public", QRIS_SRC.replace(/^\//, ""))) ? QRIS_SRC : ""
}

export async function getAksesPdfGuru(): Promise<AksesPdfGuru> {
  const guru = await guruDariCookie()
  const baris = guru ? await ambilAkses(guru.id) : null
  const status = (baris?.status as AksesPdfGuru["status"]) ?? "belum"
  const dasar = baris?.dasar ?? 0
  const kode = baris?.kode ?? 0
  const nominal = status === "menunggu" && dasar > 0 ? nominalTagihan(dasar, kode) : 0
  return {
    ok: true,
    status,
    waAdmin: WA_ADMIN,
    punyaQris: Boolean(process.env.QRIS_STATIS) || existsSync(path.join(process.cwd(), "public", QRIS_SRC.replace(/^\//, ""))),
    nominal,
    qris: nominal > 0 ? urlQris(nominal) : "",
  }
}

/** Guru memilih nominal dukungan sukarela; sistem membuat QR sesuai nominal + kode unik. */
export async function mintaDukunganPdf(
  dasar: number
): Promise<{ ok: boolean; message: string; nominal: number; qris: string }> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang.", nominal: 0, qris: "" }
  if (!Number.isInteger(dasar) || dasar < 1 || dasar > 100_000_000) {
    return { ok: false, message: "Nominal dukungan minimal Rp1.", nominal: 0, qris: "" }
  }
  try {
    const lama = await ambilAkses(guru.id)
    if (lama?.status === "aktif") {
      return { ok: true, message: "Akses unduh PDF sudah aktif.", nominal: 0, qris: "" }
    }
    const total = await simpanDukungan(guru.id, dasar)
    if (total <= 0) {
      return { ok: false, message: "Kode unik sedang habis. Hubungi admin.", nominal: 0, qris: "" }
    }
    revalidatePath("/dashboard/akses-pdf")
    revalidatePath("/guru/dashboard")
    revalidatePath("/dashboard/guru")
    return {
      ok: true,
      message: `Terima kasih. Bayar tepat Rp ${total.toLocaleString("id-ID")} lewat QRIS, lalu tunggu verifikasi admin.`,
      nominal: total,
      qris: urlQris(total),
    }
  } catch (error) {
    console.error("Gagal menyimpan dukungan PDF:", error)
    return { ok: false, message: getDatabaseErrorMessage(error), nominal: 0, qris: "" }
  }
}

/** Guru memilih akses gratis; langsung aktif tanpa pembayaran. */
export async function aksesGratisPdf(): Promise<{ ok: boolean; message: string }> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang." }
  try {
    const berhasil = await aktifkanGratis(guru.id)
    if (!berhasil) return { ok: false, message: "Guru tidak ditemukan." }
    revalidatePath("/dashboard/akses-pdf")
    revalidatePath("/guru/dashboard")
    revalidatePath("/dashboard/guru")
    return { ok: true, message: "Akses gratis diaktifkan. Silakan unduh PDF." }
  } catch (error) {
    console.error("Gagal mengaktifkan akses gratis:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

/** Guru menandai sudah membayar; hanya berlaku bila sudah memilih nominal (status menunggu). */
export async function konfirmasiSudahBayar(): Promise<{ ok: boolean; message: string }> {
  const guru = await guruDariCookie()
  if (!guru) return { ok: false, message: "Sesi habis. Silakan login ulang." }
  try {
    const lama = await ambilAkses(guru.id)
    if (lama?.status === "aktif") return { ok: true, message: "Akses unduh PDF sudah aktif." }
    if (lama?.status === "menunggu") return { ok: true, message: "Konfirmasi sudah dikirim. Menunggu verifikasi admin." }
    return { ok: false, message: "Pilih nominal dukungan dulu, atau gunakan akses gratis." }
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
