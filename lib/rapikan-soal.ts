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

import { parseSoalTeks } from "@/lib/impor-docx"

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
      .replace(
        /^(kunci jawaban|kunci|jawaban benar|jawaban|answer|ans)\s*[:=]\s*/i,
        "Kunci: "
      )
      .replace(/^(answer key|key)\s*[:=]\s*/i, "Kunci: ")

    // kunci menempel di baris soal: "1. Ibu kota Jawa Barat? Jawaban: Bandung"
    const nempel = baris2.match(
      /^(.*?\?|.*?\.\.\.)\s*(?:jawaban|kunci|answer)\s*[:=]\s*(\S.*)$/i
    )
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

const PROMPT = `Kamu HANYA mengubah tata letak soal pilihan ganda. Kamu BUKAN penulis soal.

LARANGAN KERAS:
- JANGAN menulis ulang, meringkas, memotong, menyambung, membetulkan ejaan/tanda baca, atau menambah kata pada pertanyaan maupun opsi. Salin apa adanya, kata per kata.
- JANGAN membuat soal baru, opsi baru, atau menghapus soal/opsi yang ada. Jumlah soal dan jumlah opsi tiap soal harus sama persis dengan masukan.
- Kalau sebuah baris ragu, salin baris itu apa adanya.

Yang BOLEH kamu lakukan hanya: memindah baris, memberi nomor soal, memisahkan opsi jadi baris sendiri, membuang huruf opsi di depan opsi, dan menambah baris "Kunci:".

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
// `gemini-flash-latest` (model ramai) sengaja tidak dipakai: sering 503 dan bisa menggantung lama.
const KANDIDAT_MODEL = [
  ...new Set(
    [
      process.env.GEMINI_MODEL,
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
    ].filter(Boolean)
  ),
] as string[]

// 503/429 dari Gemini biasanya sesaat (model kebanjiran permintaan): tunggu lalu coba lagi.
const COBA_PER_MODEL = 2
const JEDA_COBA_MS = 800

/** Buang baris "PERKIRAAN: 3, 7" dari keluaran AI; kembalikan nomor soal yang kuncinya hasil tebakan. */
function pisahkanPerkiraan(teks: string): {
  teks: string
  perkiraan: number[]
} {
  const baris = teks.split("\n")
  const idx = baris.findIndex((b) => /^\s*perkiraan\s*:/i.test(b))
  if (idx < 0) return { teks: teks.trim(), perkiraan: [] }

  const isi = baris[idx].replace(/^\s*perkiraan\s*:\s*/i, "").trim()
  const perkiraan = [...isi.matchAll(/\d{1,3}/g)].map((m) => Number(m[0]))
  baris.splice(idx, 1)
  return { teks: baris.join("\n").trim(), perkiraan }
}

/**
 * Sidik kata teks soal, untuk memastikan AI tidak mengubah isi.
 * Yang dibuang sebelum membandingkan: nomor soal, huruf opsi, label kunci,
 * dan seluruh baris "Kunci:" (kunci boleh ditambah AI).
 */
function sidikKata(teks: string): Map<string, number> {
  const peta = new Map<string, number>()

  for (const b of teks.split("\n")) {
    const t = b
      .replace(/^\s*(soal|pertanyaan)?\s*\d{1,3}\s*[.):\-]\s*/i, "")
      .replace(/^\s*[a-eA-E]\s*[.)]\s+/, "")
      .trim()

    if (!t || /^kunci\s*:/i.test(t)) continue

    for (const kata of t.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? []) {
      peta.set(kata, (peta.get(kata) ?? 0) + 1)
    }
  }

  return peta
}

const seragam = (t: string) =>
  t
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()

/**
 * True bila AI hanya menata letak, tidak mengubah soal:
 * 1. kata (dan jumlah kemunculannya) sama persis;
 * 2. hasil baca ulang tiap soal sama: teks pertanyaan, jumlah & isi opsi, dan
 *    kunci yang sudah ada di masukan tidak boleh hilang.
 */
export function isiSoalSama(asli: string, hasil: string): boolean {
  const a = sidikKata(rapikanSoal(asli))
  const b = sidikKata(rapikanSoal(hasil))
  if (a.size !== b.size) return false
  for (const [kata, n] of a) if (b.get(kata) !== n) return false

  const asliSoal = parseSoalTeks(rapikanSoal(asli)).soal
  const hasilSoal = parseSoalTeks(rapikanSoal(hasil)).soal
  if (asliSoal.length !== hasilSoal.length) return false

  return asliSoal.every((s, i) => {
    const h = hasilSoal[i]
    if (seragam(s.pertanyaan) !== seragam(h.pertanyaan)) return false
    if (s.opsi.length !== h.opsi.length) return false
    if (!s.opsi.every((o, j) => seragam(o) === seragam(h.opsi[j]))) return false
    // kunci yang sudah ada di teks asli tidak boleh hilang
    return !s.kunci.trim() || Boolean(h.kunci.trim())
  })
}

/** Satu panggilan ke 9router (OpenAI-compatible). `stream:false` wajib: tanpa itu balasannya terpotong. */
async function panggilRouter(teks: string): Promise<string> {
  const base = String(process.env.RAPIKAN_AI_BASE_URL).replace(/\/+$/, "")
  const res = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.RAPIKAN_AI_KEY ?? ""}`,
    },
    body: JSON.stringify({
      model: process.env.RAPIKAN_AI_MODEL,
      stream: false,
      temperature: 0,
      max_tokens: 8192,
      messages: [{ role: "user", content: PROMPT + teks + "\n---" }],
    }),
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) {
    throw new Error(`9router ${res.status}: ${(await res.text()).slice(0, 120)}`)
  }
  const json = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return (json.choices?.[0]?.message?.content ?? "")
    .replace(/^```[a-z]*\n?|```$/g, "")
    .trim()
}

/** Satu panggilan Gemini; model dicoba berurutan sampai ada yang menjawab. */
async function panggilGemini(teks: string, apiKey: string): Promise<string> {
  let pesan = "Gemini tidak menjawab."

  for (const model of KANDIDAT_MODEL) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ parts: [{ text: PROMPT + teks + "\n---" }] }],
            generationConfig: { temperature: 0, maxOutputTokens: 8192 },
          }),
          signal: AbortSignal.timeout(30_000),
        }
      )
      if (!res.ok) {
        pesan = `Gemini ${res.status}: ${(await res.text()).slice(0, 160)}`
        continue
      }
      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const out = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .replace(/^```[a-z]*\n?|```$/g, "")
        .trim()
      if (out) return out
      pesan = "Gemini mengembalikan teks kosong."
    } catch (err) {
      pesan = err instanceof Error ? err.message : "Gagal menghubungi Gemini."
    }
  }

  throw new Error(pesan)
}

/** Galat sesaat (server sibuk/jaringan) dicoba ulang sekali sebelum menyerah. */
const SESAAT = /503|429|timeout|ETIMEDOUT|fetch failed|socket hang up|ECONNRESET/i

async function cobaUlang(fn: () => Promise<string>): Promise<string> {
  let pesan = "AI tidak menjawab."

  for (let percobaan = 1; percobaan <= COBA_PER_MODEL; percobaan += 1) {
    try {
      return await fn()
    } catch (err) {
      pesan = err instanceof Error ? err.message : "Gagal menghubungi AI."
      if (!SESAAT.test(pesan) || percobaan === COBA_PER_MODEL) break
      await new Promise((lanjut) => setTimeout(lanjut, JEDA_COBA_MS))
    }
  }

  throw new Error(pesan)
}

/**
 * Periksa keluaran AI: buang baris PERKIRAAN, lalu pastikan isi soal tidak berubah.
 * Mengembalikan pesan penolakan (string) bila tidak lolos.
 */
function periksaKeluaran(teks: string, out: string): { teks: string; perkiraan: number[] } | string {
  if (!out) return "balasan kosong."
  const rapi = pisahkanPerkiraan(out)
  // AI kerap mengarang/menulis ulang soal. Keluaran yang isinya berubah ditolak.
  if (isiSoalSama(teks, rapi.teks)) return rapi
  return "AI mengubah isi soal (ditolak)."
}

/**
 * Rapikan lewat AI: 9router dulu (bila RAPIKAN_AI_BASE_URL diisi), lalu Gemini.
 * Semua keluaran lewat `periksaKeluaran`; kalau keduanya ditolak, pemanggil
 * jatuh ke perapian aturan (Lapis 1).
 */
export async function rapikanSoalAI(
  teks: string,
  apiKey?: string
): Promise<{ teks: string; perkiraan: number[] }> {
  const pesan: string[] = []

  if (process.env.RAPIKAN_AI_BASE_URL && process.env.RAPIKAN_AI_MODEL) {
    try {
      const hasil = periksaKeluaran(teks, await cobaUlang(() => panggilRouter(teks)))
      if (typeof hasil !== "string") return hasil
      pesan.push(`9router: ${hasil}`)
    } catch (err) {
      pesan.push(`9router: ${err instanceof Error ? err.message : "gagal"}`)
    }
  }

  if (apiKey) {
    try {
      const hasil = periksaKeluaran(teks, await cobaUlang(() => panggilGemini(teks, apiKey)))
      if (typeof hasil !== "string") return hasil
      pesan.push(`Gemini: ${hasil}`)
    } catch (err) {
      pesan.push(`Gemini: ${err instanceof Error ? err.message : "gagal"}`)
    }
  }

  throw new Error(pesan.join(" · ") || "AI tidak tersedia.")
}
