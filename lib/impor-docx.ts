export type SoalImpor = { no: number; pertanyaan: string; opsi: string[]; kunci: string }

const HURUF = "abcdefghijklmnopqrstuvwxyz"

/** Baris "Kunci: C" / "Jawaban: c" / "Kunci Jawaban: 1.C 2.A" */
const RE_KUNCI = /^(?:kunci(?:\s+jawaban)?|jawaban)\s*[:\-]?\s*(.+)$/i

function hurufDariTeks(teks: string) {
  const t = teks.trim().toLowerCase()
  if (/^[a-z]$/.test(t)) return t
  const m = t.match(/^([a-z])\s*[.)]/)
  return m ? m[1] : ""
}

/**
 * Parse teks soal dari Word. Format yang dikenali:
 *   1. Pertanyaan ...
 *      a. opsi   b. opsi   ...   (satu baris atau baris terpisah)
 *      Kunci: C
 * Kunci juga boleh dikumpulkan di akhir: "Kunci Jawaban: 1.C 2.A 3.B"
 */
export function parseSoalTeks(teks: string): { soal: SoalImpor[]; peringatan: string[] } {
  const peringatan: string[] = []
  const soal: SoalImpor[] = []
  const kunciMassal = new Map<number, string>()
  let aktif: SoalImpor | null = null

  const tutup = () => {
    if (!aktif) return
    soal.push(aktif)
    aktif = null
  }

  for (const barisMentah of teks.split(/\r?\n/)) {
    const baris = barisMentah.replace(/\u00a0/g, " ").trim()
    if (!baris) continue

    // Kunci massal di akhir dokumen: "1.C 2.A"
    const km = baris.match(RE_KUNCI)
    if (km) {
      const pasangan = [...km[1].matchAll(/(\d{1,3})\s*[.):\-]?\s*([a-z])/gi)]
      if (pasangan.length > 1 || /kunci\s+jawaban/i.test(km[0])) {
        for (const [, no, huruf] of pasangan) kunciMassal.set(Number(no), huruf.toLowerCase())
        continue
      }
      if (aktif && pasangan.length === 1) {
        aktif.kunci = pasangan[0][2].toLowerCase()
        continue
      }
      const tunggal = hurufDariTeks(km[1])
      if (aktif && tunggal) {
        aktif.kunci = tunggal
        continue
      }
      peringatan.push(`Baris kunci tidak dikenali: "${baris}"`)
      continue
    }

    const mSoal = baris.match(/^(\d{1,3})\s*[.)]\s*(.+)$/)
    if (mSoal) {
      tutup()
      aktif = { no: Number(mSoal[1]), pertanyaan: mSoal[2].trim(), opsi: [], kunci: "" }
      const inline = aktif.pertanyaan.match(/[\s(]*(?:kunci|jawaban)\s*[:\-]\s*([a-z])\s*\)?$/i)
      if (inline) {
        aktif.kunci = inline[1].toLowerCase()
        aktif.pertanyaan = aktif.pertanyaan.slice(0, inline.index).trim()
      }
      continue
    }

    // Opsi bisa beberapa dalam satu baris: "a. 12  b. 18  c. 24"
    if (aktif) {
      const potong = baris.split(/(?=(?:^|\s)[a-z]\s*[.)]\s+)/i).filter(Boolean)
      let adaOpsi = false
      for (const bagian of potong) {
        const mo = bagian.trim().match(/^([a-z])\s*[.)]\s+(.+)$/i)
        if (!mo) continue
        adaOpsi = true
        const harap = HURUF[aktif.opsi.length]
        if (mo[1].toLowerCase() !== harap) {
          peringatan.push(`Soal ${aktif.no}: opsi "${mo[1]}" tidak berurutan (harusnya "${harap}").`)
        }
        let teksOpsi = mo[2].trim()
        if (/\s*\(kunci\)\s*$/i.test(teksOpsi)) {
          aktif.kunci = mo[1].toLowerCase()
          teksOpsi = teksOpsi.replace(/\s*\(kunci\)\s*$/i, "").trim()
        }
        aktif.opsi.push(teksOpsi)
      }
      if (adaOpsi) continue
      // Baris lanjutan pertanyaan
      if (aktif.opsi.length === 0) aktif.pertanyaan = `${aktif.pertanyaan} ${baris}`.trim()
    }
  }
  tutup()

  // Kunci massal diterapkan dulu, baru validasi (barisnya ada di akhir dokumen).
  for (const s of soal) {
    if (!s.kunci && kunciMassal.has(s.no)) s.kunci = kunciMassal.get(s.no) as string
    if (s.opsi.length < 2) peringatan.push(`Soal ${s.no}: opsi kurang dari 2.`)
    if (!s.kunci) peringatan.push(`Soal ${s.no}: kunci jawaban belum ada.`)
    if (!s.pertanyaan) peringatan.push(`Soal ${s.no}: pertanyaan kosong.`)
  }

  const nomor = soal.map((s) => s.no)
  const tidakUrut = nomor.some((n, i) => i > 0 && n <= nomor[i - 1])
  if (tidakUrut) peringatan.push("Nomor soal tidak berurutan.")

  return { soal, peringatan }
}

/** Baca .docx lalu parse butir soal. */
export async function parseSoalDocx(buffer: Buffer) {
  const mammoth = await import("mammoth")
  const { value } = await mammoth.extractRawText({ buffer })
  const hasil = parseSoalTeks(value)
  return { ...hasil, teks: value }
}
