import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { KODE_MAKS, KODE_MIN } from "@/lib/mutasi"

/** Sekali bayar, nominal statis. */
export const NOMINAL_PDF = 5000
/** Nomor WA admin penerima bukti bayar; kosongkan untuk menyembunyikan tombol WA. */
export const WA_ADMIN = process.env.ADMIN_WA ?? ""
/** Gambar QRIS statis di /public. */
export const QRIS_SRC = process.env.QRIS_SRC ?? "/qris.png"

export type StatusAkses = "belum" | "menunggu" | "aktif" | "ditolak"

/** Status akses unduh PDF disimpan di baris guru (kolom aksesPdf*), tanpa tabel terpisah. */
export async function ambilAkses(
  teacherId: string
): Promise<{ status: StatusAkses; diaktifkanPada: Date | null; kode: number } | null> {
  const [baris] = await db
    .select({ status: teachers.aksesPdf, diaktifkanPada: teachers.aksesPdfPada, kode: teachers.aksesPdfKode })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)
  if (!baris) return null
  return { status: baris.status as StatusAkses, diaktifkanPada: baris.diaktifkanPada, kode: baris.kode ?? 0 }
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

export async function bolehUnduhPdf(teacherId: string) {
  const akses = await ambilAkses(teacherId)
  return akses?.status === "aktif"
}
