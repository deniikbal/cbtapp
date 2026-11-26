import { and, eq, inArray, isNotNull } from "drizzle-orm"

import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, students } from "@/lib/db/schema"

export type BelumSiswa = { id: string; nama: string; nis: string }
export type BelumKelas = {
  kelas: string
  sesi: number
  peserta: number
  belum: BelumSiswa[]
}
export type BelumMengerjakan = {
  bank: { id: string; code: string; title: string }
  total: number
  sudah: number
  belum: number
  kelas: BelumKelas[]
}

/**
 * Siswa aktif yang belum punya respons Google Form untuk bank soal ini.
 * Respons dianggap ada bila `exam_results` untuk bank ini memuat studentId siswa tersebut,
 * tanpa melihat jadwal (sesi) mana yang dipakai — data lama bisa menempel di sesi lain.
 */
export async function ambilBelumMengerjakan(bankId: string): Promise<BelumMengerjakan> {
  const [bank] = await db
    .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title })
    .from(questionBanks)
    .where(eq(questionBanks.id, bankId))
    .limit(1)
  if (!bank) throw new Error("Bank soal tidak ditemukan.")

  const jadwal = await db
    .select({
      id: examSchedules.id,
      classroomId: examSchedules.classroomId,
      session: examSchedules.session,
      kelas: classrooms.name,
    })
    .from(examSchedules)
    .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
    .where(eq(examSchedules.questionBankId, bankId))

  const kelasId = [...new Set(jadwal.map((j) => j.classroomId))]
  if (!kelasId.length) return { bank, total: 0, sudah: 0, belum: 0, kelas: [] }

  const [peserta, hasil] = await Promise.all([
    db
      .select({ id: students.id, nama: students.name, nis: students.nis, classroomId: students.classroomId, session: students.session })
      .from(students)
      .where(and(eq(students.active, true), inArray(students.classroomId, kelasId))),
    db
      .select({ studentId: examResults.studentId })
      .from(examResults)
      .innerJoin(examSchedules, eq(examResults.scheduleId, examSchedules.id))
      .where(and(eq(examSchedules.questionBankId, bankId), isNotNull(examResults.studentId))),
  ])

  const sudah = new Set(hasil.map((h) => h.studentId as string))
  const sesiPerKelas = new Map<string, number[]>()
  for (const j of jadwal) {
    const list = sesiPerKelas.get(j.classroomId) ?? []
    if (!list.includes(j.session ?? 1)) list.push(j.session ?? 1)
    sesiPerKelas.set(j.classroomId, list)
  }

  const kelompok = new Map<string, BelumKelas>()
  for (const s of peserta) {
    const sesi = s.session ?? 1
    const adaJadwal = sesiPerKelas.get(s.classroomId)?.includes(sesi) ?? false
    // Siswa yang sesinya tidak punya jadwal untuk bank ini tidak dihitung sebagai peserta.
    if (!adaJadwal) continue
    const kelas = jadwal.find((j) => j.classroomId === s.classroomId)?.kelas ?? "-"
    const kunci = `${kelas}|${sesi}`
    const baris = kelompok.get(kunci) ?? { kelas, sesi, peserta: 0, belum: [] }
    baris.peserta += 1
    if (!sudah.has(s.id)) baris.belum.push({ id: s.id, nama: s.nama, nis: s.nis })
    kelompok.set(kunci, baris)
  }

  const kelas = [...kelompok.values()]
    .map((k) => ({ ...k, belum: k.belum.sort((a, b) => a.nama.localeCompare(b.nama)) }))
    .sort((a, b) => a.kelas.localeCompare(b.kelas) || a.sesi - b.sesi)

  const total = kelas.reduce((sum, k) => sum + k.peserta, 0)
  const jumlahBelum = kelas.reduce((sum, k) => sum + k.belum.length, 0)

  return { bank, total, sudah: total - jumlahBelum, belum: jumlahBelum, kelas }
}
