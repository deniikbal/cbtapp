import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examResults, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { ambilForm, ambilRespons, cariNis, hitungNilai, normNis, soalDariItems } from "@/lib/google-forms"

export type HasilSyncInfo = { respons: number; cocok: number; tidakCocok: number; totalSoal: number }
export type HasilSyncResult = { ok: true; info: HasilSyncInfo } | { ok: false; message: string }

// Inti sync: dipakai server action (klik manual) dan /api/sync-otomatis (cron).
export async function jalankanSync(scheduleId: string): Promise<HasilSyncResult> {
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

  await db
    .update(questionBanks)
    .set({ formItems: form.items, syncedAt: new Date(), updatedAt: new Date() })
    .where(eq(questionBanks.id, jadwal[0].bankId))

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
