"use server"

import { asc, eq, inArray } from "drizzle-orm"
import { headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { auth } from "@/lib/auth"
import { hitungNilai, soalDariItems } from "@/lib/google-forms"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { analisisButir, type AnalisisButir } from "@/lib/analisis-butir"
import { ambilAnalisisButir, type AnalisisBank } from "@/lib/analisis-data"
import { jalankanSync, type HasilSyncResult } from "@/lib/sync-hasil"

// Server action mengembalikan {ok,message}: error yang dilempar tidak sampai ke
// pengguna di build produksi (diganti digest generik).
type Gagal = { ok: false; message: string }

async function wajibAdmin(): Promise<Gagal | null> {
  const session = await auth.api.getSession({ headers: await headers() })
  return session ? null : { ok: false, message: "Sesi habis. Silakan login ulang." }
}

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

// Hubungkan respons yang NIS/namanya tidak cocok ke siswa yang benar (pilihan admin).
// Jadwal ikut dipindah ke jadwal kelas siswa supaya nilainya muncul di rekap kelas itu.
export async function hubungkanRespons(resultId: string, studentId: string): Promise<{ ok: boolean; message: string }> {
  const sesi = await wajibAdmin()
  if (sesi) return sesi
  if (!resultId || !studentId) return { ok: false, message: "Pilihan tidak lengkap." }

  try {
    const baris = await db
      .select({ scheduleId: examResults.scheduleId, bankId: examSchedules.questionBankId })
      .from(examResults)
      .innerJoin(examSchedules, eq(examResults.scheduleId, examSchedules.id))
      .where(eq(examResults.id, resultId))
      .limit(1)
    if (!baris[0]) return { ok: false, message: "Respons tidak ditemukan." }

    const siswa = await db
      .select({ id: students.id, classroomId: students.classroomId })
      .from(students)
      .where(eq(students.id, studentId))
      .limit(1)
    if (!siswa[0]) return { ok: false, message: "Siswa tidak ditemukan." }

    // Jadwal kelas siswa untuk bank ini (kalau ada) — nilainya ikut pindah ke sana.
    const jadwalTujuan = await db
      .select({ id: examSchedules.id, classroomId: examSchedules.classroomId })
      .from(examSchedules)
      .where(eq(examSchedules.questionBankId, baris[0].bankId))
    const target = jadwalTujuan.find((j) => j.classroomId === siswa[0].classroomId)

    await db
      .update(examResults)
      .set({ studentId, matchVia: "manual", ...(target ? { scheduleId: target.id } : {}) })
      .where(eq(examResults.id, resultId))

    // Tanpa ini baris "belum terhubung" tetap tampil setelah dihubungkan.
    revalidatePath("/dashboard/hasil")
    revalidatePath("/dashboard/pengerjaan")

    return { ok: true, message: "Respons berhasil dihubungkan ke siswa." }
  } catch (error) {
    return { ok: false, message: pesanError(error, "Gagal menghubungkan respons.") }
  }
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

export type AnalisisButirResult = { ok: true; data: AnalisisBank } | Gagal

export async function getAnalisisButir(bankId: string): Promise<AnalisisButirResult> {
  const sesi = await wajibAdmin()
  if (sesi) return sesi

  try {
    const hasil = await ambilAnalisisButir(bankId)
    return hasil.ok ? { ok: true, data: hasil.data } : hasil
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
