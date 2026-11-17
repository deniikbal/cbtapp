import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { pdfAccess } from "@/lib/db/schema"

/** Sekali bayar, nominal statis. */
export const NOMINAL_PDF = 5000
/** Nomor WA admin penerima bukti bayar; kosongkan untuk menyembunyikan tombol WA. */
export const WA_ADMIN = process.env.ADMIN_WA ?? ""
/** Gambar QRIS statis di /public. */
export const QRIS_SRC = process.env.QRIS_SRC ?? "/qris.png"

export type StatusAkses = "belum" | "menunggu" | "aktif" | "ditolak"

export async function ambilAkses(teacherId: string) {
  const [baris] = await db.select().from(pdfAccess).where(eq(pdfAccess.teacherId, teacherId)).limit(1)
  return baris ?? null
}

export async function bolehUnduhPdf(teacherId: string) {
  const baris = await ambilAkses(teacherId)
  return baris?.status === "aktif"
}
