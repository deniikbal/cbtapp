import { eq } from "drizzle-orm"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { cocokkanNominal, nominalTagihan } from "@/lib/mutasi"

export type HasilCocok = {
  cocok: { id: string; nama: string; nominal: number }[]
  tidakDikenal: number[]
}

/**
 * Cocokkan teks notifikasi mutasi dengan nominal dukungan guru, lalu:
 * - guru belum aktif -> aktifkan aksesnya;
 * - guru sudah aktif yang mendukung sukarela -> tandai dukungannya diterima (akses tetap aktif).
 * Dipakai endpoint notifikasi HP.
 */
export async function cocokkanDanAktifkan(teks: string): Promise<HasilCocok> {
  const semua = await db
    .select({
      id: teachers.id,
      name: teachers.name,
      kode: teachers.aksesPdfKode,
      dasar: teachers.aksesPdfDasar,
      status: teachers.aksesPdf,
      catatan: teachers.aksesPdfCatatan,
    })
    .from(teachers)

  // Yang bisa dicocokkan: punya nominal (dasar>0) dan belum aktif, ATAU sudah aktif
  // dengan dukungan sukarela yang masih menunggu verifikasi.
  const tagihan = semua.filter(
    (r) => r.dasar > 0 && r.kode > 0 && (r.status !== "aktif" || r.catatan === "Dukungan menunggu verifikasi")
  )

  const { cocok, nominalTidakDikenal } = cocokkanNominal(teks, tagihan)
  if (cocok.length > 0) {
    const pada = new Date()
    for (const baris of cocok) {
      if (baris.status === "aktif") {
        await db
          .update(teachers)
          .set({ aksesPdfCatatan: "Dukungan diterima", updatedAt: pada })
          .where(eq(teachers.id, baris.id))
      } else {
        await db
          .update(teachers)
          .set({ aksesPdf: "aktif", aksesPdfPada: pada, updatedAt: pada })
          .where(eq(teachers.id, baris.id))
      }
    }
  }

  return {
    cocok: cocok.map((baris) => ({ id: baris.id, nama: baris.name, nominal: nominalTagihan(baris.dasar, baris.kode) })),
    tidakDikenal: nominalTidakDikenal,
  }
}
