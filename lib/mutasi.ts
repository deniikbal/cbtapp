/**
 * Pencocokan mutasi QRIS statis tanpa gateway.
 * QRIS statis GoPay tidak punya webhook: bukti pembayaran datang dari teks notifikasi
 * (email/app mutasi) yang ditempel admin, lalu dicocokkan lewat nominal unik.
 */
export const KODE_MIN = 1
export const KODE_MAKS = 999

/** Nominal yang harus dibayar guru = nominal dasar + kode unik. */
export function nominalTagihan(dasar: number, kode: number) {
  return dasar + kode
}

/**
 * Ambil semua nominal rupiah dari teks notifikasi mutasi.
 * Menerima "Rp5.007", "Rp 5.007", "IDR 5.007", "Rp5007", "5.007,00".
 */
export function parseNominal(teks: string): number[] {
  const hasil = new Set<number>()
  const pola = /(?:rp|idr)\.?\s*([\d.,]+)/gi
  for (const cocok of teks.matchAll(pola)) {
    const angka = Number(cocok[1].replace(/\.(?=\d{3}\b)/g, "").replace(",", ".").replace(/[^\d.]/g, ""))
    if (Number.isFinite(angka) && angka > 0) hasil.add(Math.round(angka))
  }
  return [...hasil]
}

/**
 * Cocokkan nominal pada teks mutasi dengan daftar tagihan guru.
 * Tiap guru menyimpan nominal pilihannya sendiri (dasar), sehingga
 * kode unik = nominal mutasi - dasar. Mendukung nominal berapapun (>= 1).
 * Baris dengan dasar 0 (belum memilih / akses gratis) dilewati.
 */
export function cocokkanNominal<T extends { id: string; kode: number; dasar: number }>(
  teks: string,
  tagihan: T[]
): { cocok: T[]; nominalTidakDikenal: number[] } {
  const nominal = parseNominal(teks)
  const berlaku = tagihan.filter((t) => t.kode > 0 && t.dasar > 0)
  const cocok: T[] = []
  const nominalTidakDikenal: number[] = []

  for (const nilai of nominal) {
    const target = berlaku.find((t) => nilai - t.dasar === t.kode)
    if (target) {
      if (!cocok.some((item) => item.id === target.id)) cocok.push(target)
    } else {
      nominalTidakDikenal.push(nilai)
    }
  }

  return { cocok, nominalTidakDikenal }
}
