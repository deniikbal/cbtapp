import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { KODE_MAKS, KODE_MIN } from "@/lib/mutasi"

/** Nominal saran default untuk dukungan sukarela (bukan kewajiban). */
export const NOMINAL_PDF = 5000
/** Nomor WA admin penerima bukti bayar; kosongkan untuk menyembunyikan tombol WA. */
export const WA_ADMIN = process.env.ADMIN_WA ?? ""
/** Gambar QRIS statis di /public. */
export const QRIS_SRC = process.env.QRIS_SRC ?? "/qris.png"

export type StatusAkses = "belum" | "menunggu" | "aktif" | "ditolak"

/** Status akses unduh PDF disimpan di baris guru (kolom aksesPdf*), tanpa tabel terpisah. */
export async function ambilAkses(
  teacherId: string
): Promise<{ status: StatusAkses; diaktifkanPada: Date | null; kode: number; dasar: number } | null> {
  const [baris] = await db
    .select({
      status: teachers.aksesPdf,
      diaktifkanPada: teachers.aksesPdfPada,
      kode: teachers.aksesPdfKode,
      dasar: teachers.aksesPdfDasar,
    })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)
  if (!baris) return null
  return {
    status: baris.status as StatusAkses,
    diaktifkanPada: baris.diaktifkanPada,
    kode: baris.kode ?? 0,
    dasar: baris.dasar ?? 0,
  }
}

/**
 * Kode unik per guru untuk mencocokkan mutasi QRIS statis.
 * Dibuat sekali lalu dipakai terus; 1..999 dipilih acak dari kode yang belum dipakai guru lain.
 */
export async function ambilAtauBuatKode(teacherId: string): Promise<number> {
  const [baris] = await db
    .select({ kode: teachers.aksesPdfKode })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)
  if (!baris) return 0
  if (baris.kode > 0) return baris.kode

  const dipakai = new Set(
    (await db.select({ kode: teachers.aksesPdfKode }).from(teachers)).map((row) => row.kode).filter((kode) => kode > 0)
  )
  const bebas: number[] = []
  for (let kode = KODE_MIN; kode <= KODE_MAKS; kode++) if (!dipakai.has(kode)) bebas.push(kode)
  if (bebas.length === 0) return 0

  const kode = bebas[Math.floor(Math.random() * bebas.length)]
  await db.update(teachers).set({ aksesPdfKode: kode, updatedAt: new Date() }).where(eq(teachers.id, teacherId))
  return kode
}

/**
 * Guru memilih nominal dukungan sukarela. Simpan nominal pilihan (dasar) dan
 * tandai "menunggu"; nominal yang harus dibayar = dasar + kode unik.
 * Mengembalikan total nominal, atau 0 bila kode unik habis / nominal tidak valid.
 */
export async function simpanDukungan(teacherId: string, dasar: number): Promise<number> {
  if (!Number.isInteger(dasar) || dasar < 1) return 0
  const kode = await ambilAtauBuatKode(teacherId)
  if (kode <= 0) return 0
  await db
    .update(teachers)
    .set({ aksesPdf: "menunggu", aksesPdfDasar: dasar, updatedAt: new Date() })
    .where(eq(teachers.id, teacherId))
  return dasar + kode
}

/** Akses gratis: aktifkan langsung tanpa pembayaran, tandai dasar 0. */
export async function aktifkanGratis(teacherId: string): Promise<boolean> {
  const [baris] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, teacherId)).limit(1)
  if (!baris) return false
  const pada = new Date()
  await db
    .update(teachers)
    .set({ aksesPdf: "aktif", aksesPdfPada: pada, aksesPdfDasar: 0, aksesPdfCatatan: "Akses gratis", updatedAt: pada })
    .where(eq(teachers.id, teacherId))
  return true
}

/**
 * Dukungan sukarela dari guru yang SUDAH aktif (mis. setelah akses gratis).
 * Status akses tetap aktif (tidak dicabut); nominal dicatat dan menunggu verifikasi
 * admin lewat mutasi. Mengembalikan total nominal, atau 0 bila tidak valid.
 */
export async function simpanDukunganSukarela(teacherId: string, dasar: number): Promise<number> {
  if (!Number.isInteger(dasar) || dasar < 1) return 0
  const kode = await ambilAtauBuatKode(teacherId)
  if (kode <= 0) return 0
  await db
    .update(teachers)
    .set({ aksesPdfDasar: dasar, aksesPdfCatatan: "Dukungan menunggu verifikasi", updatedAt: new Date() })
    .where(eq(teachers.id, teacherId))
  return dasar + kode
}

export async function bolehUnduhPdf(teacherId: string) {
  const akses = await ambilAkses(teacherId)
  return akses?.status === "aktif"
}
