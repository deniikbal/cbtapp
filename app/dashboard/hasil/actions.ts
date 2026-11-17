"use server"

import { randomUUID } from "node:crypto"

import { asc, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { ambilForm, ambilRespons, cariNama, cariNis, hitungNilai, normNis, soalDariItems } from "@/lib/google-forms"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { analisisButir, type AnalisisButir } from "@/lib/analisis-butir"

// Server action mengembalikan {ok,message}: error yang dilempar tidak sampai ke
// pengguna di build produksi (diganti digest generik).
type Gagal = { ok: false; message: string }

async function wajibAdmin(): Promise<Gagal | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session ? null : { ok: false, message: "Sesi habis. Silakan login ulang." }
}

export type HasilSyncInfo = { respons: number; cocok: number; tidakCocok: number; totalSoal: number }
export type HasilSyncResult = { ok: true; info: HasilSyncInfo } | Gagal

export async function syncHasil(scheduleId: string): Promise<HasilSyncResult> {
  const sesi = await wajibAdmin()
  if (sesi) return sesi
  if (!scheduleId) return { ok: false, message: "Jadwal tidak valid." }

  try {
    return await jalankanSync(scheduleId)
  } catch (error) {
    return { ok: false, message: pesanError(error, "Gagal sync hasil dari Google Form.") }
  }
}

async function jalankanSync(scheduleId: string): Promise<HasilSyncResult> {
  const jadwal = await db
    .select({ classroomId: examSchedules.classroomId, bankId: questionBanks.id, formId: questionBanks.formId, title: questionBanks.title })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .where(eq(examSchedules.id, scheduleId))
    .limit(1)

  if (!jadwal[0]) return { ok: false, message: "Jadwal tidak ditemukan." }
  if (!jadwal[0].formId) return { ok: false, message: "Bank soal ini belum punya Form ID. Isi dulu di menu Bank Soal (link /edit)." }

  const form = await ambilForm(jadwal[0].formId)
  const soal = soalDariItems(form.items)
  if (!soal.length) return { ok: false, message: "Form tidak punya butir soal yang bisa dibaca." }

  await db.update(questionBanks).set({ formItems: form.items, updatedAt: new Date() }).where(eq(questionBanks.id, jadwal[0].bankId))

  const respons = await ambilRespons(jadwal[0].formId)

  // Satu form dipakai semua kelas yang dijadwalkan untuk bank ini: peserta dicocokkan
  // lintas kelas, lalu hasilnya ditempel ke jadwal kelas siswa masing-masing.
  const jadwalBank = await db
    .select({ id: examSchedules.id, classroomId: examSchedules.classroomId })
    .from(examSchedules)
    .where(eq(examSchedules.questionBankId, jadwal[0].bankId))
  const jadwalPerKelas = new Map(jadwalBank.map((j) => [j.classroomId, j.id]))

  const peserta = await db
    .select({ id: students.id, nis: students.nis, name: students.name, classroomId: students.classroomId })
    .from(students)
    .where(inArray(students.classroomId, jadwalBank.map((j) => j.classroomId)))
  const peta = new Map(peserta.map((s) => [normNis(s.nis), s]))

  let cocok = 0
  let tidakCocok = 0

  for (const r of respons) {
    const siswa = peta.get(normNis(cariNis(soal, r)))
    if (!siswa) {
      tidakCocok++
      continue
    }
    const n = hitungNilai(soal, r)
    const nilai = {
      scheduleId: jadwalPerKelas.get(siswa.classroomId) ?? scheduleId,
      studentId: siswa.id,
      nis: siswa.nis,
      nama: siswa.name,
      respondentEmail: r.respondentEmail ?? "",
      startedAt: r.createTime ? new Date(r.createTime) : null,
      submittedAt: r.lastSubmittedTime ? new Date(r.lastSubmittedTime) : null,
      answers: r.answers as Record<string, unknown>,
      total: n.total,
      correct: n.benar,
      wrong: n.salah,
      score: String(n.skor),
      syncedAt: new Date(),
    }

    await db
      .insert(examResults)
      .values({ id: randomUUID(), responseId: r.responseId, ...nilai })
      .onConflictDoUpdate({ target: examResults.responseId, set: nilai })
    cocok++
  }

  revalidatePath("/dashboard/hasil")
  return { ok: true, info: { respons: respons.length, cocok, tidakCocok, totalSoal: soal.filter((s) => s.kunci.length > 0).length } }
}

function pesanError(error: unknown, fallback: string) {
  const mentah = error instanceof Error ? error.message : ""
  if (!mentah) return fallback
  if (/google|credential|token|unauthor|permission|failed to fetch|fetch failed/i.test(mentah)) {
    return `${fallback} (${mentah})`
  }
  return getDatabaseErrorMessage(error, fallback)
}

export type HasilDetail = {
  judul: string
  kelas: string
  adaSoal: boolean
  soal: { qid: string; judul: string; dinilai: boolean }[]
  siswa: {
    nama: string
    nis: string
    mulai: string
    submit: string
    skor: number
    benar: number
    salah: number
    total: number
    sel: Record<string, "benar" | "salah" | "kosong">
  }[]
}

export type HasilDetailResult = { ok: true; detail: HasilDetail } | Gagal

// Rincian dikelompokkan per bank soal: satu form dipakai semua kelas yang dijadwalkan.
export async function getHasilDetail(bankId: string): Promise<HasilDetailResult> {
  const sesi = await wajibAdmin()
  if (sesi) return sesi

  try {
    return { ok: true, detail: await bacaHasilDetail(bankId) }
  } catch (error) {
    return { ok: false, message: pesanError(error, "Gagal mengambil rincian hasil.") }
  }
}

export type AnalisisButirResult = { ok: true; butir: AnalisisButir[] } | Gagal

export async function getAnalisisButir(bankId: string): Promise<AnalisisButirResult> {
  const sesi = await wajibAdmin()
  if (sesi) return sesi
  if (!bankId) return { ok: false, message: "Bank soal tidak valid." }

  try {
    const bank = await db
      .select({ items: questionBanks.formItems })
      .from(questionBanks)
      .where(eq(questionBanks.id, bankId))
      .limit(1)
    if (!bank[0]) return { ok: false, message: "Bank soal tidak ditemukan." }

    const jadwal = await db
      .select({ id: examSchedules.id })
      .from(examSchedules)
      .where(eq(examSchedules.questionBankId, bankId))
    if (!jadwal.length) return { ok: false, message: "Bank soal ini belum punya jadwal." }

    const baris = await db
      .select({ answers: examResults.answers, correct: examResults.correct })
      .from(examResults)
      .where(inArray(examResults.scheduleId, jadwal.map((j) => j.id)))
    if (!baris.length) return { ok: false, message: "Belum ada respons untuk bank soal ini. Sync dulu di menu Hasil Ujian." }

    const soal = soalDariItems((bank[0].items as unknown[] | null) ?? [])
    const butir = analisisButir(
      soal,
      baris.map((b) => ({ answers: b.answers as never, skorTotal: b.correct })),
    )
    if (!butir.length) return { ok: false, message: "Form belum punya kunci jawaban. Aktifkan mode kuis lalu sync ulang." }

    return { ok: true, butir }
  } catch (error) {
    return { ok: false, message: pesanError(error, "Gagal menghitung analisis butir soal.") }
  }
}

async function bacaHasilDetail(bankId: string): Promise<HasilDetail> {
  const jadwal = await db
    .select({ id: examSchedules.id, judul: questionBanks.title, items: questionBanks.formItems, kelas: classrooms.name })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
    .where(eq(examSchedules.questionBankId, bankId))

  if (!jadwal[0]) throw new Error("Bank soal ini belum punya jadwal.")

  const soal = soalDariItems((jadwal[0].items as unknown[] | null) ?? [])
  const dinilai = soal.filter((s) => s.kunci.length > 0)

  const rows = await db
    .select()
    .from(examResults)
    .where(inArray(examResults.scheduleId, jadwal.map((j) => j.id)))
    .orderBy(asc(examResults.nama))

  return {
    judul: jadwal[0].judul,
    kelas: [...new Set(jadwal.map((j) => j.kelas))].sort().join(", "),
    adaSoal: dinilai.length > 0,
    soal: dinilai.map((s) => ({ qid: s.qid, judul: s.judul, dinilai: true })),
    siswa: rows.map((r) => {
      const n = hitungNilai(soal, { responseId: r.responseId, answers: r.answers as never })
      return {
        nama: r.nama,
        nis: r.nis,
        mulai: r.startedAt ? new Date(r.startedAt).toLocaleString("id-ID") : "",
        submit: r.submittedAt ? new Date(r.submittedAt).toLocaleString("id-ID") : "",
        skor: Number(r.score),
        benar: n.benar,
        salah: n.salah,
        total: n.total,
        sel: n.rincian,
      }
    }),
  }
}
