export type SoalImpor = { no: number; pertanyaan: string; opsi: string[]; kunci: string }

const HURUF = "abcdefghijklmnopqrstuvwxyz"

/** Baris "Kunci: C" / "Jawaban: c" / "Kunci Jawaban: 1.C 2.A" */
const RE_KUNCI = /^(?:kunci(?:\s+jawaban)?|jawaban)\s*[:\-]?\s*(.+)$/i

/**
 * Google Form menolak soal yang punya dua opsi berisi teks sama
 * ("ChoiceQuestion.options cannot contain duplicate values").
 * Opsi ganda digabung (yang pertama dipertahankan) dan kuncinya ikut digeser.
 */
export function satukanOpsiGanda(soal: SoalImpor[], peringatan: string[]) {
  for (const s of soal) {
    const idxKunci = HURUF.indexOf((s.kunci || "").toLowerCase())
    const unik: string[] = []
    const peta: number[] = [] // indeks lama -> indeks baru
    const ganda: string[] = []
    s.opsi.forEach((o, i) => {
      const teks = o.trim()
      const ada = unik.findIndex((u) => u.toLowerCase() === teks.toLowerCase())
      if (ada >= 0) {
        peta[i] = ada
        ganda.push(`${HURUF[i]} = ${HURUF[ada]} ("${teks}")`)
        return
      }
      peta[i] = unik.length
      unik.push(teks)
    })
    if (!ganda.length) continue
    s.opsi = unik
    if (idxKunci >= 0) s.kunci = HURUF[peta[idxKunci]] ?? ""
    peringatan.push(`Soal ${s.no}: opsi kembar digabung (${ganda.join(", ")}).`)
  }
}

function hurufDariTeks(teks: string) {
  const t = teks.trim().toLowerCase()
  if (/^[a-z]$/.test(t)) return t
  // "Kunci: 3" = opsi ketiga
  if (/^[1-9]$/.test(t)) return HURUF[Number(t) - 1]
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
  // Nomor pernyataan terakhir (1), 2), ...) yang sudah digabung ke pertanyaan aktif.
  let pernyataanTerakhir = 0
  let modePernyataan = false

  const tutup = () => {
    if (!aktif) return
    soal.push(aktif)
    aktif = null
    pernyataanTerakhir = 0
    modePernyataan = false
  }

  for (const barisMentah of teks.split(/\r?\n/)) {
    const baris = barisMentah.replace(/\u00a0/g, " ").trim()
    if (!baris) continue

    // Kunci massal di akhir dokumen: "1.C 2.A"
    const km = baris.match(RE_KUNCI)
    if (km) {
      // Kunci boleh ditulis sebagai teks opsi apa adanya
      // ("Kunci: 4 CO2, 6 NADH, 2 FADH2 dan 2 ATP") — cocokkan dulu ke opsi.
      const rapat = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "")
      if (aktif) {
        const idxPersis = aktif.opsi.findIndex((o) => rapat(o) === rapat(km[1]))
        if (idxPersis >= 0) {
          aktif.kunci = HURUF[idxPersis]
          continue
        }
      }

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
      // Kunci boleh ditulis pakai teks opsinya: "Kunci: bagus" = opsi yang isinya "bagus".
      if (aktif) {
        const cari = km[1].trim().toLowerCase()
        const idx = aktif.opsi.findIndex((o) => o.trim().toLowerCase() === cari)
        if (idx >= 0) {
          aktif.kunci = HURUF[idx]
          continue
        }
      }
      peringatan.push(`Baris kunci tidak dikenali: "${baris}"`)
      continue
    }

    // Pernyataan pendukung ("1) ...", "(1) ...", "• ...") digabung ke pertanyaan,
    // bukan dianggap soal baru atau opsi.
    const kalimatTanya = /(\?|…|\.{3,})[\s.]*$/
    const pertanyaanTerbuka = !!aktif && aktif.opsi.length === 0 && !kalimatTanya.test(aktif.pertanyaan)
    const berParen = baris.match(/^\((\d{1,3})\)\s*(.+)$/)
    const berBullet = baris.match(/^[•·▪◦\-–—]\s*(.+)$/)
    const berAngka = baris.match(/^(\d{1,3})\s*[.)]\s*(.+)$/)

    if (aktif && pertanyaanTerbuka && berParen) {
      aktif.pertanyaan = `${aktif.pertanyaan} (${berParen[1]}) ${berParen[2].trim()}`
      pernyataanTerakhir = Number(berParen[1])
      modePernyataan = true
      continue
    }
    if (aktif && pertanyaanTerbuka && berBullet && (pernyataanTerakhir > 0 || modePernyataan || /!\s*$/.test(aktif.pertanyaan))) {
      aktif.pertanyaan = `${aktif.pertanyaan} ${baris}`
      modePernyataan = true
      continue
    }
    if (
      aktif &&
      pertanyaanTerbuka &&
      berAngka &&
      Number(berAngka[1]) === pernyataanTerakhir + 1 &&
      !kalimatTanya.test(berAngka[2])
    ) {
      aktif.pertanyaan = `${aktif.pertanyaan} ${berAngka[1]}) ${berAngka[2].trim()}`
      pernyataanTerakhir = Number(berAngka[1])
      modePernyataan = true
      continue
    }
    // Kalimat penutup pertanyaan setelah daftar pernyataan ("... ditunjukkan oleh nomor ….").
    if (
      aktif &&
      pertanyaanTerbuka &&
      !/^[a-z]\s*[.)]\s+/i.test(baris) &&
      !/^\d{1,3}\s*[.)]\s+/.test(baris) &&
      kalimatTanya.test(baris) &&
      baris.split(/\s+/).length >= 3
    ) {
      aktif.pertanyaan = `${aktif.pertanyaan} ${baris.trim()}`
      continue
    }

    const mSoal = baris.match(/^(\d{1,3})\s*[.)]\s*(.+)$/)
    if (mSoal) {
      tutup()
      pernyataanTerakhir = 0
      modePernyataan = false
      aktif = { no: Number(mSoal[1]), pertanyaan: mSoal[2].trim(), opsi: [], kunci: "" }
      const inline = aktif.pertanyaan.match(/[\s(]*(?:kunci|jawaban)\s*[:\-]\s*([a-z1-9])\s*\)?$/i)
      if (inline) {
        aktif.kunci = hurufDariTeks(inline[1])
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
      // Opsi tanpa huruf (Google Form menomori sendiri): satu baris satu opsi,
      // atau beberapa opsi dipisah 2+ spasi / tab / "|" / ";".
      for (const bagian of baris.split(/\s{2,}|\t|\||;/)) {
        let teksOpsi = bagian.trim()
        if (!teksOpsi) continue
        if (/\s*\(kunci\)\s*$/i.test(teksOpsi)) {
          aktif.kunci = HURUF[aktif.opsi.length] ?? ""
          teksOpsi = teksOpsi.replace(/\s*\(kunci\)\s*$/i, "").trim()
        }
        aktif.opsi.push(teksOpsi)
      }
    }
  }
  tutup()

  // Google Form menolak opsi kembar dalam satu soal — digabung dulu, lalu diberi info.
  satukanOpsiGanda(soal, peringatan)

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
