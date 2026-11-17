import type { Soal } from "@/lib/google-forms"

/**
 * Analisis butir soal gaya kuis: kesukaran, daya beda, dan sebaran pengecoh
 * dihitung dari respons yang sudah tersimpan (exam_results.answers).
 */
export type AnalisisButir = {
  qid: string
  judul: string
  dikerjakan: number
  kosong: number
  benar: number
  benarPersen: number
  salah: number
  rataPoin: number
  poinTertinggi: number
  poinTerendah: number
  standarDeviasi: number
  kesukaran: number
  kesukaranLabel: "Mudah" | "Sedang" | "Sukar"
  dayaBeda: number
  dayaBedaLabel: "Baik sekali" | "Baik" | "Cukup" | "Jelek"
  distraksiMaks: number
  distraksiLabel: "Baik" | "Kurang"
}

export type ResponsDinilai = {
  answers: Record<string, { textAnswers?: { answers?: { value?: string }[] } }> | null
  skorTotal: number
}

type Jawaban = { nilai: string[]; poin: number }

function bacaJawaban(answers: ResponsDinilai["answers"], soal: Soal): Jawaban {
  const daftar = answers?.[soal.qid]?.textAnswers?.answers ?? []
  const nilai = daftar.map((a) => (a.value ?? "").trim().toLowerCase()).filter(Boolean)
  const benar = nilai.length > 0 && nilai.length === soal.kunci.length && nilai.every((n) => soal.kunci.includes(n))
  return { nilai, poin: benar ? soal.poin : 0 }
}

function kategoriKesukaran(p: number): AnalisisButir["kesukaranLabel"] {
  if (p > 0.7) return "Mudah"
  if (p >= 0.3) return "Sedang"
  return "Sukar"
}

function kategoriDayaBeda(d: number): AnalisisButir["dayaBedaLabel"] {
  if (d >= 0.4) return "Baik sekali"
  if (d >= 0.3) return "Baik"
  if (d >= 0.2) return "Cukup"
  return "Jelek"
}

function simpanganBaku(angka: number[]) {
  if (angka.length < 2) return 0
  const rata = angka.reduce((a, b) => a + b, 0) / angka.length
  return Math.sqrt(angka.reduce((sum, n) => sum + (n - rata) ** 2, 0) / angka.length)
}

export function analisisButir(soal: Soal[], respons: ResponsDinilai[]): AnalisisButir[] {
  const dinilai = soal.filter((s) => s.kunci.length > 0)
  if (!dinilai.length || !respons.length) return []

  const jawabanPerSoal = new Map(dinilai.map((s) => [s.qid, respons.map((r) => bacaJawaban(r.answers, s))]))

  // Kelompok atas/bawah 27% untuk daya beda.
  const urut = [...respons].sort((a, b) => b.skorTotal - a.skorTotal)
  const potong = Math.max(1, Math.round(respons.length * 0.27))

  return dinilai.map((s) => {
    const semua = jawabanPerSoal.get(s.qid) ?? []
    const poin = semua.map((j) => j.poin)
    const kosong = semua.filter((j) => j.nilai.length === 0).length
    const benar = semua.filter((j) => j.poin > 0).length
    const dikerjakan = semua.length
    const salah = dikerjakan - kosong - benar

    const kesukaran = dikerjakan ? benar / dikerjakan : 0

    const atas = urut.slice(0, potong).map((r) => bacaJawaban(r.answers, s))
    const bawah = urut.slice(-potong).map((r) => bacaJawaban(r.answers, s))
    const pAtas = atas.length ? atas.filter((j) => j.poin > 0).length / atas.length : 0
    const pBawah = bawah.length ? bawah.filter((j) => j.poin > 0).length / bawah.length : 0
    const dayaBeda = Math.round((pAtas - pBawah) * 100) / 100

    const pengecoh = new Map<string, number>()
    for (const j of semua) {
      if (!j.nilai.length) continue
      if (j.nilai.every((n) => s.kunci.includes(n))) continue
      const kunciOpsi = j.nilai.join(" | ")
      pengecoh.set(kunciOpsi, (pengecoh.get(kunciOpsi) ?? 0) + 1)
    }
    const distraksiMaks = pengecoh.size ? Math.max(...pengecoh.values()) : 0

    return {
      qid: s.qid,
      judul: s.judul,
      dikerjakan,
      kosong,
      benar,
      benarPersen: dikerjakan ? Math.round((benar / dikerjakan) * 10000) / 100 : 0,
      salah,
      rataPoin: Math.round((poin.reduce((a, b) => a + b, 0) / Math.max(dikerjakan, 1)) * 10000) / 10000,
      poinTertinggi: poin.length ? Math.max(...poin) : 0,
      poinTerendah: poin.length ? Math.min(...poin) : 0,
      standarDeviasi: Math.round(simpanganBaku(poin) * 1000000) / 1000000,
      kesukaran: Math.round(kesukaran * 10000) / 10000,
      kesukaranLabel: kategoriKesukaran(kesukaran),
      dayaBeda,
      dayaBedaLabel: kategoriDayaBeda(dayaBeda),
      distraksiMaks,
      distraksiLabel: distraksiMaks > 0 ? "Baik" : "Kurang",
    }
  })
}
