"use server"

import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { examSchedules, questionBanks, subjects, teachers } from "@/lib/db/schema"
import { formIdDari } from "@/lib/google-forms"

// Form ID wajib untuk sync hasil; boleh kosong saat bank dibuat, diisi belakangan.
function bacaFormId(formData: FormData) {
  const mentah = String(formData.get("formId") ?? "").trim()
  return mentah ? formIdDari(mentah) : ""
}

function normalizeUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Link Google Form harus diawali http:// atau https://.")
  }
  return url
}

async function generateQuestionBankIdentity(subjectId: string, grade: string) {
  const subject = await db
    .select({ name: subjects.name, code: subjects.code })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1)

  if (!subject[0]) throw new Error("Mapel tidak ditemukan.")

  return {
    code: `${subject[0].code.toUpperCase()}-${grade}`,
    title: `Assesmen ${subject[0].name} Kelas ${grade}`,
  }
}

async function bacaGuru(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "").trim()
  if (!teacherId) return null

  const [teacher] = await db
    .select({ id: teachers.id, name: teachers.name })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)

  return teacher ?? null
}

export async function createQuestionBank(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const teacher = await bacaGuru(formData)
  const teacherName = teacher?.name ?? ""
  const grade = String(formData.get("grade") ?? "").trim().toUpperCase()
  const googleFormUrl = normalizeUrl(String(formData.get("googleFormUrl") ?? "").trim())
  const formId = bacaFormId(formData)
  const active = String(formData.get("active") ?? "true") === "true"

  if (!subjectId || !teacher || !grade || !googleFormUrl) {
    throw new Error("Mapel, guru pembuat, kelas, dan link Google Form wajib diisi.")
  }

  const generated = await generateQuestionBankIdentity(subjectId, grade)

  await db.insert(questionBanks).values({
    id: randomUUID(),
    code: generated.code,
    title: generated.title,
    teacherName,
    teacherId: teacher.id,
    grade,
    subjectId,
    googleFormUrl,
    formId,
    active,
  })

  revalidatePath("/dashboard/bank-soal")
}

export async function updateQuestionBank(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const teacher = await bacaGuru(formData)
  const teacherName = teacher?.name ?? ""
  const grade = String(formData.get("grade") ?? "").trim().toUpperCase()
  const googleFormUrl = normalizeUrl(String(formData.get("googleFormUrl") ?? "").trim())
  const formId = bacaFormId(formData)
  const active = String(formData.get("active") ?? "true") === "true"

  if (!id || !subjectId || !teacher || !grade || !googleFormUrl) {
    throw new Error("Mapel, guru pembuat, kelas, dan link Google Form wajib diisi.")
  }

  await db
    .update(questionBanks)
    .set({ subjectId, teacherName, teacherId: teacher.id, grade, googleFormUrl, formId, active, updatedAt: new Date() })
    .where(eq(questionBanks.id, id))

  revalidatePath("/dashboard/bank-soal")
}

export async function deleteQuestionBanks(ids: string[]): Promise<{ ok: boolean; message: string }> {
  const validIds = ids.map((id) => id.trim()).filter(Boolean)
  if (validIds.length === 0) return { ok: false, message: "Pilih minimal satu bank soal." }

  try {
    const used = await db
      .select({ id: examSchedules.questionBankId })
      .from(examSchedules)
      .where(inArray(examSchedules.questionBankId, validIds))
    const dipakai = new Set(used.map((row) => row.id))
    const boleh = validIds.filter((id) => !dipakai.has(id))

    if (boleh.length === 0) {
      return { ok: false, message: "Semua bank soal terpilih masih dipakai jadwal. Hapus jadwalnya terlebih dahulu, atau nonaktifkan bank soal." }
    }

    await db.delete(questionBanks).where(inArray(questionBanks.id, boleh))
    revalidatePath("/dashboard/bank-soal")
    const dilewati = validIds.length - boleh.length
    return {
      ok: true,
      message: dilewati > 0
        ? `${boleh.length} bank soal dihapus, ${dilewati} dilewati karena masih dipakai jadwal.`
        : `${boleh.length} bank soal dihapus.`,
    }
  } catch (error) {
    console.error("Gagal menghapus bank soal:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

export async function deleteQuestionBank(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id) return { ok: false, message: "ID bank soal tidak valid." }

  const usedSchedules = await db
    .select({ id: examSchedules.id })
    .from(examSchedules)
    .where(eq(examSchedules.questionBankId, id))
    .limit(1)

  if (usedSchedules.length > 0) {
    // pesan dikembalikan, bukan di-throw: throw di server action diubah Next jadi pesan generik ber-digest di production
    return { ok: false, message: "Bank soal tidak bisa dihapus karena sudah dipakai pada jadwal. Hapus jadwal terkait terlebih dahulu, atau nonaktifkan bank soal." }
  }

  await db.delete(questionBanks).where(eq(questionBanks.id, id))
  revalidatePath("/dashboard/bank-soal")
  return { ok: true, message: "Bank soal berhasil dihapus." }
}
