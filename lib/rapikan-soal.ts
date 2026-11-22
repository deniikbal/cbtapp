/**
 * Perapian teks soal sebelum diimpor.
 *
 * Lapis 1 (selalu jalan, tanpa jaringan): `rapikanSoal` — buang penanda markdown,
 * seragamkan penomoran, ubah label kunci ke "Kunci:", pisahkan kunci yang menempel
 * di baris soal, rapikan spasi/baris kosong.
 *
 * Lapis 2 (opsional): `rapikanSoalAI` — Gemini menata ulang jadi format baku:
 * satu baris pertanyaan, satu opsi per baris, lalu "Kunci: <huruf/teks opsi>".
 */

export function rapikanSoal(teks: string): string {
  const baris = teks
    .replace(/\r\n?/g, "\n")
    // penanda markdown yang sering terbawa dari Word/web
    .replace(/\*\*|__|`/g, "")
    .replace(/[ \t]+/g, " ")
    .split("\n")
    .map((b) => b.replace(/^[\s•·▪◦*-]+/, "").trim())

  const hasil: string[] = []

  for (const b of baris) {
    if (!b) {
      if (hasil.length && hasil[hasil.length - 1] !== "") hasil.push("")
      continue
    }

    // "1)" / "1 -" / "Soal 1." -> "1."
    let baris2 = b
      .replace(/^(soal|pertanyaan)\s*(\d{1,3})\s*[.)\-:]?\s*/i, "$2. ")
      .replace(/^(\d{1,3})\s*[)\-:]\s*/, "$1. ")

    // label kunci apa pun -> "Kunci:"
    baris2 = baris2
      .replace(/^(kunci jawaban|kunci|jawaban benar|jawaban|answer|ans)\s*[:=]\s*/i, "Kunci: ")
      .replace(/^(answer key|key)\s*[:=]\s*/i, "Kunci: ")

    // kunci menempel di baris soal: "1. Ibu kota Jawa Barat? Jawaban: Bandung"
    const nempel = baris2.match(/^(.*?\?|.*?\.\.\.)\s*(?:jawaban|kunci|answer)\s*[:=]\s*(\S.*)$/i)
    if (nempel && !/^kunci:/i.test(baris2)) {
      hasil.push(nempel[1].trim())
      hasil.push(`Kunci: ${nempel[2].trim()}`)
      continue
    }

    hasil.push(baris2)
  }

  // rapikan baris kosong berlebih
  return hasil
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

const PROMPT = `Kamu pengubah format soal pilihan ganda. Ubah teks berikut menjadi format baku, tanpa menambah atau mengurangi isi soal.

Aturan keluaran (WAJIB):
- Satu soal ditulis: baris nomor + pertanyaan, contoh "1. Hasil dari 12 x 2 adalah ..."
- Setiap opsi pada baris sendiri, tanpa huruf di depan (jangan tulis "a." / "A.").
- SETIAP soal WAJIB punya baris "Kunci: X". Tulis huruf opsi yang benar (contoh "Kunci: C"). Untuk jawaban berupa teks/nama/angka, tulis teksnya apa adanya (contoh "Kunci: Soekarno"). Jangan pernah membiarkan jawaban sebagai baris opsi tambahan.
- Sumber kunci, urutkan prioritasnya:
  1) Tanda jawaban yang sudah ada di teks (mis. "Jawaban: B", opsi bertanda * atau (kunci), daftar kunci di akhir seperti "Kunci Jawaban: 1.B 2.C").
  2) Bila tidak ada tanda jawaban sama sekali: tentukan sendiri jawaban yang paling benar berdasarkan pengetahuanmu, lalu tulis "Kunci: X".
- Pisahkan antar soal dengan satu baris kosong.
- Jangan menulis penjelasan, pembuka, penutup, atau markdown. Keluarkan teks soal saja.
- Bila opsi tidak berjumlah 5, biarkan apa adanya.
- Baris PALING AKHIR keluaran wajib berupa "PERKIRAAN: <nomor soal yang kuncinya kamu tentukan sendiri, dipisah koma>". Tulis "PERKIRAAN: -" bila semua kunci sudah ada di teks aslinya.

Teks soal:
---
`

// Nama model Gemini sering berubah; coba berurutan sampai ada yang menjawab.
const KANDIDAT_MODEL = [process.env.GEMINI_MODEL, "gemini-flash-lite-latest", "gemini-3.5-flash-lite", "gemini-flash-latest"].filter(
  Boolean,
) as string[]

/** Buang baris "PERKIRAAN: 3, 7" dari keluaran AI; kembalikan nomor soal yang kuncinya hasil tebakan. */
function pisahkanPerkiraan(teks: string): { teks: string; perkiraan: number[] } {
  const baris = teks.split("\n")
  const idx = baris.findIndex((b) => /^\s*perkiraan\s*:/i.test(b))
  if (idx < 0) return { teks: teks.trim(), perkiraan: [] }

  const isi = baris[idx].replace(/^\s*perkiraan\s*:\s*/i, "").trim()
  const perkiraan = [...isi.matchAll(/\d{1,3}/g)].map((m) => Number(m[0]))
  baris.splice(idx, 1)
  return { teks: baris.join("\n").trim(), perkiraan }
}

export async function rapikanSoalAI(teks: string, apiKey: string): Promise<{ teks: string; perkiraan: number[] }> {
  let pesanTerakhir = "AI tidak menjawab."
  for (const model of KANDIDAT_MODEL) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: PROMPT + teks + "\n---" }] }],
          generationConfig: { temperature: 0, maxOutputTokens: 8192 },
        }),
        signal: AbortSignal.timeout(60_000),
      })
      if (!res.ok) {
        pesanTerakhir = `Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`
        continue
      }
      const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] }
      const out = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .replace(/^```[a-z]*\n?|```$/g, "")
        .trim()
      if (out) return pisahkanPerkiraan(out)
      pesanTerakhir = "Gemini mengembalikan teks kosong."
    } catch (err) {
      pesanTerakhir = err instanceof Error ? err.message : "Gagal menghubungi Gemini."
    }
  }
  throw new Error(pesanTerakhir)
}
