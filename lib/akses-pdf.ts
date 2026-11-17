import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"

/** Sekali bayar, nominal statis. */
export const NOMINAL_PDF = 5000
/** Nomor WA admin penerima bukti bayar; kosongkan untuk menyembunyikan tombol WA. */
export const WA_ADMIN = process.env.ADMIN_WA ?? ""
/** Gambar QRIS statis di /public. */
export const QRIS_SRC = process.env.QRIS_SRC ?? "/qris.png"

export type StatusAkses = "belum" | "menunggu" | "aktif" | "ditolak"

/** Status akses unduh PDF disimpan di baris guru (kolom aksesPdf*), tanpa tabel terpisah. */
export async function ambilAkses(teacherId: string): Promise<{ status: StatusAkses; diaktifkanPada: Date | null } | null> {
  const [baris] = await db
    .select({ status: teachers.aksesPdf, diaktifkanPada: teachers.aksesPdfPada })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)
  if (!baris) return null
  return { status: baris.status as StatusAkses, diaktifkanPada: baris.diaktifkanPada }
}

export async function bolehUnduhPdf(teacherId: string) {
  const akses = await ambilAkses(teacherId)
  return akses?.status === "aktif"
}
