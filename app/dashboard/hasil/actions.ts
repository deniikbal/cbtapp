"use server"

import { randomUUID } from "node:crypto"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { ambilForm, ambilRespons, cariNama, cariNis, hitungNilai, normNis, soalDariItems } from "@/lib/google-forms"
import { getDatabaseErrorMessage } from "@/lib/db-error"

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
  const peserta = await db
    .select({ id: students.id, nis: students.nis, name: students.name })
    .from(students)
    .where(eq(students.classroomId, jadwal[0].classroomId))
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
      scheduleId,
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

export async function getHasilDetail(scheduleId: string): Promise<HasilDetailResult> {
  const sesi = await wajibAdmin()
  if (sesi) return sesi

  try {
    return { ok: true, detail: await bacaHasilDetail(scheduleId) }
  } catch (error) {
    return { ok: false, message: pesanError(error, "Gagal mengambil rincian hasil.") }
  }
}

async function bacaHasilDetail(scheduleId: string): Promise<HasilDetail> {
  const jadwal = await db
    .select({ judul: questionBanks.title, items: questionBanks.formItems, kelas: classrooms.name })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
    .where(eq(examSchedules.id, scheduleId))
    .limit(1)

  if (!jadwal[0]) throw new Error("Jadwal tidak ditemukan.")

  const soal = soalDariItems((jadwal[0].items as unknown[] | null) ?? [])
  const dinilai = soal.filter((s) => s.kunci.length > 0)

  const rows = await db
    .select()
    .from(examResults)
    .where(eq(examResults.scheduleId, scheduleId))
    .orderBy(asc(examResults.nama))

  return {
    judul: jadwal[0].judul,
    kelas: jadwal[0].kelas,
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
