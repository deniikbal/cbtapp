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
  opsi: { kuis?: boolean; identitas?: boolean; kelas?: string[] } = {}
) {
  const { kuis = true, identitas = true, kelas = [] } = opsi

  // documentTitle = nama file di Drive; title = judul yang dilihat pengisi.
  const form = await gpost("https://forms.googleapis.com/v1/forms", { info: { title: judul, documentTitle: judul } })
  const formId = String(form.formId ?? "")
  if (!formId) throw new Error("Google tidak mengembalikan formId.")

  const requests: Record<string, unknown>[] = []
  let index = 0

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

  // Bagian kosong tempat guru menaruh soal, dipisah dari butir identitas.
  requests.push({
    createItem: { item: { title: "Soal", description: "Isi soal di bagian ini.", pageBreakItem: {} }, location: { index: index++ } },
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
export async function tambahSoalKeForm(
  formId: string,
  soal: { pertanyaan: string; opsi: string[]; kunci: string }[]
) {
  const { items } = await ambilForm(formId)
  const mulai = items.length

  const requests = soal.map((s, i) => {
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
