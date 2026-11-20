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

const PROMPT = `Kamu pengubah format soal pilihan ganda. Ubah teks berikut menjadi format baku, TANPA menambah, mengurangi, atau mengubah isi soal.

Aturan keluaran (WAJIB):
- Satu soal ditulis: baris nomor + pertanyaan, contoh "1. Hasil dari 12 x 2 adalah ..."
- Setiap opsi pada baris sendiri, tanpa huruf di depan (jangan tulis "a." / "A.").
- Setelah opsi terakhir tiap soal, baris "Kunci: X" — X boleh huruf opsi (A-E) atau teks opsi apa adanya bila huruf tidak jelas.
- Pisahkan antar soal dengan satu baris kosong.
- Jangan menulis penjelasan, pembuka, penutup, atau markdown. Keluarkan teks soal saja.
- Bila opsi tidak berjumlah 5, biarkan apa adanya. Bila ada soal tanpa kunci, tetap keluarkan soalnya tanpa baris Kunci.

Teks soal:
---
`

export async function rapikanSoalAI(teks: string, apiKey: string): Promise<string> {
  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: PROMPT + teks + "\n---" }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 8192 },
      }),
      signal: AbortSignal.timeout(60_000),
    },
  )
  if (!res.ok) {
    const pesan = await res.text()
    throw new Error(`Gemini ${res.status}: ${pesan.slice(0, 200)}`)
  }
  const json = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[]
  }
  const out = (json.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .replace(/^```[a-z]*\n?|```$/g, "")
    .trim()
  if (!out) throw new Error("Gemini mengembalikan teks kosong.")
  return out
}
