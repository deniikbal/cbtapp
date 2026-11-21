// Google Forms: token, struktur form, dan respons. Hanya baca.
export type Soal = {
  qid: string
  judul: string
  kunci: string[]
  tipe: "text" | "choice" | "lain"
  poin: number
  /** Daftar opsi pilihan ganda sesuai urutan form (A, B, C, …); kosong untuk butir teks. */
  opsi: string[]
}
export type Respons = {
  responseId: string
  createTime?: string
  lastSubmittedTime?: string
  respondentEmail?: string
  answers: Record<string, { textAnswers?: { answers?: { value?: string }[] } }>
}

let cacheToken: { access: string; exp: number } | null = null

async function accessToken(): Promise<string> {
  if (cacheToken && cacheToken.exp > Date.now() + 60_000) return cacheToken.access

  const id = process.env.GOOGLE_CLIENT_ID
  const secret = process.env.GOOGLE_CLIENT_SECRET
  const refresh = process.env.GOOGLE_REFRESH_TOKEN
  if (!id || !secret || !refresh) {
    throw new Error("GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET / GOOGLE_REFRESH_TOKEN belum diisi di .env")
  }

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: id, client_secret: secret, refresh_token: refresh, grant_type: "refresh_token" }),
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data.access_token) {
    const pesan = data?.error === "invalid_grant" ? "refresh token dicabut/kedaluwarsa" : (data?.error ?? res.status)
    throw new Error(`Gagal ambil token Google: ${pesan}`)
  }
  cacheToken = { access: data.access_token, exp: Date.now() + (data.expires_in ?? 3600) * 1000 }
  return cacheToken.access
}

async function gpost(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const pesan =
      res.status === 403
        ? "akun Google pemilik token tidak punya izin tulis (scope forms.body ditolak)"
        : res.status === 401
          ? "token Google ditolak"
          : (data?.error?.message ?? res.status)
    throw new Error(`Google ${res.status}: ${pesan}`)
  }
  return data
}

// Buat form kosong di akun pemilik token. Judul saja; soal diisi guru di Google Forms.
// Butir identitas default: tidak dinilai (tanpa correctAnswers), hanya wajib diisi.
const BUTIR_IDENTITAS = ["NIS", "Nama Lengkap", "Kelas"]

export async function buatFormKosong(
  judul: string,
  opsi: { kuis?: boolean; identitas?: boolean; kelas?: string[]; deskripsi?: string } = {}
) {
  const { kuis = true, identitas = true, kelas = [], deskripsi = "" } = opsi

  // documentTitle = nama file di Drive; title = judul yang dilihat pengisi.
  // Google hanya menerima info.title saat create; deskripsi lewat batchUpdate di bawah.
  const form = await gpost("https://forms.googleapis.com/v1/forms", { info: { title: judul, documentTitle: judul } })
  const formId = String(form.formId ?? "")
  if (!formId) throw new Error("Google tidak mengembalikan formId.")

  const requests: Record<string, unknown>[] = []
  let index = 0

  // Pastikan deskripsi terpasang (fallback bila create tidak menerimanya).
  if (deskripsi) {
    requests.push({ updateFormInfo: { info: { description: deskripsi }, updateMask: "description" } })
  }

  if (kuis) {
    requests.push({ updateSettings: { settings: { quizSettings: { isQuiz: true } }, updateMask: "quizSettings.isQuiz" } })
  }

  if (identitas) {
    for (const judulButir of BUTIR_IDENTITAS) {
      // Butir Kelas jadi dropdown berisi nama kelas sesuai angkatan bank soal.
      const pakaiDropdown = judulButir === "Kelas" && kelas.length > 0
      requests.push({
        createItem: {
          item: {
            title: judulButir,
            questionItem: {
              question: pakaiDropdown
                ? { required: true, choiceQuestion: { type: "DROP_DOWN", options: kelas.map((nama) => ({ value: nama })) } }
                : { required: true, textQuestion: { paragraph: false } },
            },
          },
          location: { index: index++ },
        },
      })
    }
  }

  // Bagian soal pilihan ganda: cukup halaman terpisah, soal diisi lewat Impor Word/tempel teks.
  requests.push({
    createItem: { item: { title: "SOAL PILIHAN GANDA", description: "Isi soal di bagian ini.", pageBreakItem: {} }, location: { index: index++ } },
  })

  await gpost(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`, { requests })

  return { formId, editUrl: `https://docs.google.com/forms/d/${formId}/edit`, responderUri: String(form.responderUri ?? "") }
}

async function gget(url: string) {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${await accessToken()}` }, cache: "no-store" })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const pesan =
      res.status === 404
        ? "form tidak ditemukan atau akun Google pemilik token bukan pemilik/editor form"
        : res.status === 401
          ? "token Google ditolak"
          : (data?.error?.message ?? res.status)
    throw new Error(`Google ${res.status}: ${pesan}`)
  }
  return data
}

// Terima fileId mentah atau link /edit atau /viewform. /d/e/ (published ID) ditolak.
export function formIdDari(input: string) {
  const teks = (input ?? "").trim()
  if (!teks) return ""
  if (/\/d\/e\//.test(teks) || /^1FAIpQLS/.test(teks)) {
    throw new Error("Itu link viewform/published. Ambil dari tombol Edit: /d/<ID>/edit")
  }
  const cocok = teks.match(/\/d\/([A-Za-z0-9_-]{20,})/)
  const id = cocok ? cocok[1] : teks
  if (!/^[A-Za-z0-9_-]{20,}$/.test(id)) throw new Error("Form ID tidak valid")
  return id
}

const HURUF_OPSI = "abcdefghijklmnopqrstuvwxyz"

/**
 * Tambahkan butir soal pilihan ganda (mode kuis) ke form yang sudah ada,
 * lalu kembalikan `items` terbaru untuk disimpan di `question_banks.formItems`.
 */
// Butir placeholder kosong hasil "Buat form kosong": judul angka 1-30, opsi persis A-E, tanpa kunci.
function adalahPlaceholder(item: ButirForm): boolean {
  const q = item.questionItem?.question
  if (!q || !item.title || !/^\d{1,2}$/.test(item.title)) return false
  const nilai = (q.choiceQuestion?.options ?? []).map((o) => o.value ?? "")
  if (nilai.length !== 5 || nilai.join("") !== "ABCDE") return false
  return !q.grading?.correctAnswers?.answers?.length
}

export async function tambahSoalKeForm(
  formId: string,
  soal: { pertanyaan: string; opsi: string[]; kunci: string }[]
) {
  const { items } = await ambilForm(formId)

  // Bersihkan placeholder kosong dulu (batchUpdate terpisah agar indeks tidak bergeser).
  const placeholder = items
    .map((item, index) => ({ item: item as ButirForm, index }))
    .filter(({ item }) => adalahPlaceholder(item))
  if (placeholder.length) {
    // Hapus dari indeks terbesar ke terkecil: menghapus dari depan menggeser indeks sisanya.
    const urutMundur = [...placeholder].sort((a, b) => b.index - a.index)
    await gpost(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`, {
      requests: urutMundur.map(({ index }) => ({ deleteItem: { location: { index } } })),
    })
  }

  const sesudahHapus = placeholder.length ? (await ambilForm(formId)).items : items
  const mulai = sesudahHapus.length

  const requests = soal.map((s, i) => {
    // Google menolak opsi kembar; ambil yang pertama saja (pengaman terakhir).
    const opsiUnik = s.opsi.filter((v, j) => s.opsi.findIndex((w) => w.trim().toLowerCase() === v.trim().toLowerCase()) === j)
    s = { ...s, opsi: opsiUnik }
    const kunciTeks = s.opsi[HURUF_OPSI.indexOf(s.kunci.toLowerCase())] ?? s.opsi[0]
    return {
      createItem: {
        item: {
          title: s.pertanyaan,
          questionItem: {
            question: {
              required: true,
              choiceQuestion: { type: "RADIO", options: s.opsi.map((v) => ({ value: v })) },
              grading: { pointValue: 1, correctAnswers: { answers: [{ value: kunciTeks }] } },
            },
          },
        },
        location: { index: mulai + i },
      },
    }
  })

  await gpost(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`, { requests })
  const sesudah = await ambilForm(formId)
  return sesudah.items
}

/** Cari indeks butir berdasarkan questionId. */
async function indexButir(formId: string, qid: string): Promise<number> {
  const { items } = await ambilForm(formId)
  const idx = (items as ButirForm[]).findIndex((it) => it?.questionItem?.question?.questionId === qid)
  if (idx < 0) throw new Error("Soal tidak ditemukan di form (mungkin sudah diubah dari Google Form).")
  return idx
}

/** Ubah satu soal di form (isi pertanyaan, opsi, kunci). */
export async function ubahSoalForm(
  formId: string,
  qid: string,
  data: { pertanyaan: string; opsi: string[]; hurufKunci: string },
): Promise<unknown[]> {
  const index = await indexButir(formId, qid)
  const opsi = data.opsi.map((o) => o.trim()).filter(Boolean)
  if (opsi.length < 2) throw new Error("Minimal 2 opsi.")
  const idxKunci = "ABCDE".indexOf((data.hurufKunci || "").toUpperCase())
  const benar = idxKunci >= 0 && idxKunci < opsi.length ? opsi[idxKunci] : ""

  await gpost(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`, {
    requests: [
      {
        updateItem: {
          location: { index },
          item: {
            title: data.pertanyaan.trim(),
            questionItem: {
              question: {
                required: true,
                grading: benar ? { pointValue: 1, correctAnswers: { answers: [{ value: benar }] } } : { pointValue: 1 },
                choiceQuestion: { type: "RADIO", options: opsi.map((v) => ({ value: v })) },
              },
            },
          },
          updateMask: "title,questionItem.question",
        },
      },
    ],
  })
  const { items } = await ambilForm(formId)
  return items
}

/** Hapus satu soal dari form. */
export async function hapusSoalForm(formId: string, qid: string): Promise<unknown[]> {
  const index = await indexButir(formId, qid)
  await gpost(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}:batchUpdate`, {
    requests: [{ deleteItem: { location: { index } } }],
  })
  const { items } = await ambilForm(formId)
  return items
}

export async function ambilForm(formId: string): Promise<{ title: string; items: unknown[] }> {
  const data = await gget(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}`)
  return { title: data.info?.title ?? data.title ?? "", items: data.items ?? [] }
}

export async function ambilRespons(formId: string): Promise<Respons[]> {
  const semua: Respons[] = []
  let pageToken: string | undefined
  do {
    const qs = new URLSearchParams({ pageSize: "100" })
    if (pageToken) qs.set("pageToken", pageToken)
    const data = await gget(`https://forms.googleapis.com/v1/forms/${encodeURIComponent(formId)}/responses?${qs}`)
    semua.push(...(data.responses ?? []))
    pageToken = data.nextPageToken
  } while (pageToken)
  return semua
}

type ButirForm = {
  title?: string
  questionItem?: {
    question?: {
      questionId?: string
      textQuestion?: unknown
      choiceQuestion?: { options?: { value?: string }[] }
      grading?: { pointValue?: number; correctAnswers?: { answers?: { value?: string }[] } }
    }
  }
}

/** Ringkasan soal yang sudah ada di form, untuk ditampilkan di halaman impor. */
export function daftarSoalDariItems(
  items: unknown[],
): { no: number; qid: string; pertanyaan: string; opsi: string[]; kunci: string }[] {
  const hasil: { no: number; qid: string; pertanyaan: string; opsi: string[]; kunci: string }[] = []
  for (const butir of items as ButirForm[]) {
    const q = butir?.questionItem?.question
    if (!q?.questionId) continue
    const poin = q.grading?.pointValue ?? 0
    const opsi = (q.choiceQuestion?.options ?? []).map((o) => (o.value ?? "").trim()).filter(Boolean)
    // Butir identitas (NIS/nama/kelas) tidak punya bobot -> lewati.
    if (poin <= 0 || opsi.length < 2) continue
    const kunciTeks = (q.grading?.correctAnswers?.answers ?? []).map((a) => (a.value ?? "").trim()).filter(Boolean)[0] ?? ""
    const idx = kunciTeks ? opsi.findIndex((o) => o.toLowerCase() === kunciTeks.toLowerCase()) : -1
    hasil.push({
      no: hasil.length + 1,
      qid: q.questionId,
      pertanyaan: (butir.title ?? "").trim() || "(tanpa judul)",
      opsi,
      kunci: idx >= 0 ? "ABCDE"[idx] : kunciTeks,
    })
  }
  return hasil
}

export function soalDariItems(items: unknown[]): Soal[] {
  const hasil: Soal[] = []
  for (const butir of items as ButirForm[]) {
    const q = butir?.questionItem?.question
    if (!q?.questionId) continue
    hasil.push({
      qid: q.questionId,
      judul: (butir.title ?? "").trim(),
      kunci: (q.grading?.correctAnswers?.answers ?? []).map((a) => (a.value ?? "").trim().toLowerCase()).filter(Boolean),
      tipe: q.textQuestion ? "text" : q.choiceQuestion ? "choice" : "lain",
      poin: q.grading?.pointValue && q.grading.pointValue > 0 ? q.grading.pointValue : 1,
      opsi: (q.choiceQuestion?.options ?? []).map((o: { value?: string }) => (o.value ?? "").trim()).filter(Boolean),
    })
  }
  return hasil
}

function nilaiDariJawaban(answers: Respons["answers"], qid: string) {
  const daftar = answers?.[qid]?.textAnswers?.answers ?? []
  return daftar.map((a) => (a.value ?? "").trim().toLowerCase()).filter(Boolean)
}

export function cariNis(soal: Soal[], respons: Respons) {
  const kandidat = soal.filter((s) => /(^|\W)NIS(\W|$)|NOMOR INDUK/i.test(s.judul))
  for (const s of [...kandidat, ...soal]) {
    const nilai = nilaiDariJawaban(respons.answers, s.qid)
    if (!nilai.length) continue
    const mentah = nilai[0].replace(/\s+/g, "")
    if (/^\d{4,}$/.test(mentah)) return mentah
  }
  return ""
}

export function cariNama(soal: Soal[], respons: Respons) {
  const s = soal.find((x) => /NAMA/i.test(x.judul))
  if (!s) return ""
  return (nilaiDariJawaban(respons.answers, s.qid)[0] ?? "").toUpperCase()
}

export function hitungNilai(soal: Soal[], respons: Respons) {
  const dinilai = soal.filter((s) => s.kunci.length > 0)
  const rincian: Record<string, "benar" | "salah" | "kosong"> = {}
  let benar = 0
  let salah = 0
  for (const s of dinilai) {
    const jawab = nilaiDariJawaban(respons.answers, s.qid)
    if (!jawab.length) {
      rincian[s.qid] = "kosong"
      continue
    }
    const cocok = jawab.length === s.kunci.length && jawab.every((j) => s.kunci.includes(j))
    rincian[s.qid] = cocok ? "benar" : "salah"
    if (cocok) benar++
    else salah++
  }
  const total = dinilai.length
  return { total, benar, salah, rincian, skor: total ? Math.round((benar / total) * 10000) / 100 : 0 }
}

export function normNis(nis: string) {
  return (nis ?? "").replace(/\D/g, "").replace(/^0+/, "")
}

// Beri akses editor (writer) ke email lain untuk sebuah form, lewat Drive API.
// Berlaku untuk form yang dibuat sistem (scope drive.file).
export async function shareFormEditor(formId: string, emails: string[]): Promise<{ ok: string[]; gagal: string[] }> {
  const token = await accessToken()
  const ok: string[] = []
  const gagal: string[] = []
  for (const email of emails) {
    try {
      const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(formId)}/permissions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ role: "writer", type: "user", emailAddress: email }),
        cache: "no-store",
      })
      if (res.ok) ok.push(email)
      else gagal.push(email)
    } catch {
      gagal.push(email)
    }
  }
  return { ok, gagal }
}

export function daftarEmailEditor(raw: string | undefined | null): string[] {
  return (raw ?? "")
    .split(/[\n,;]+/)
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.includes("@"))
}

// Set form agar "siapa saja dengan link bisa edit" (Drive permission anyone/writer).
export async function setFormAnyoneEditor(formId: string): Promise<boolean> {
  try {
    const token = await accessToken()
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(formId)}/permissions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ role: "writer", type: "anyone", withLink: true }),
      cache: "no-store",
    })
    return res.ok
  } catch {
    return false
  }
}
