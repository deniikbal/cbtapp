import { eq, ne } from "drizzle-orm"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { cocokkanNominal, nominalTagihan } from "@/lib/mutasi"

export type HasilCocok = {
  cocok: { id: string; nama: string; nominal: number }[]
  tidakDikenal: number[]
}

/**
 * Cocokkan teks notifikasi mutasi dengan tagihan guru berstatus "menunggu",
 * lalu aktifkan aksesnya. Dipakai halaman admin dan endpoint notifikasi HP.
 */
export async function cocokkanDanAktifkan(teks: string): Promise<HasilCocok> {
  // Hanya guru yang sudah memilih nominal dukungan (dasar > 0) yang bisa dicocokkan.
  const tagihan = await db
    .select({ id: teachers.id, name: teachers.name, kode: teachers.aksesPdfKode, dasar: teachers.aksesPdfDasar })
    .from(teachers)
    .where(ne(teachers.aksesPdf, "aktif"))

  const { cocok, nominalTidakDikenal } = cocokkanNominal(teks, tagihan)
  if (cocok.length > 0) {
    const pada = new Date()
    for (const baris of cocok) {
      await db
        .update(teachers)
        .set({ aksesPdf: "aktif", aksesPdfPada: pada, updatedAt: pada })
        .where(eq(teachers.id, baris.id))
    }
  }

  return {
    cocok: cocok.map((baris) => ({ id: baris.id, nama: baris.name, nominal: nominalTagihan(baris.dasar, baris.kode) })),
    tidakDikenal: nominalTidakDikenal,
  }
}
