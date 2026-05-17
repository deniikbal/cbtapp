"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examSchedules, questionBanks, subjects } from "@/lib/db/schema"

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

export async function createQuestionBank(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const teacherName = String(formData.get("teacherName") ?? "").trim()
  const grade = String(formData.get("grade") ?? "").trim().toUpperCase()
  const googleFormUrl = normalizeUrl(String(formData.get("googleFormUrl") ?? "").trim())
  const active = String(formData.get("active") ?? "true") === "true"

  if (!subjectId || !teacherName || !grade || !googleFormUrl) {
    throw new Error("Mapel, kelas, nama guru, dan link Google Form wajib diisi.")
  }

  const generated = await generateQuestionBankIdentity(subjectId, grade)

  await db.insert(questionBanks).values({
    id: randomUUID(),
    code: generated.code,
    title: generated.title,
    teacherName,
    grade,
    subjectId,
    googleFormUrl,
    active,
  })

  revalidatePath("/dashboard/bank-soal")
}

export async function updateQuestionBank(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const teacherName = String(formData.get("teacherName") ?? "").trim()
  const grade = String(formData.get("grade") ?? "").trim().toUpperCase()
  const googleFormUrl = normalizeUrl(String(formData.get("googleFormUrl") ?? "").trim())
  const active = String(formData.get("active") ?? "true") === "true"

  if (!id || !subjectId || !teacherName || !grade || !googleFormUrl) {
    throw new Error("Mapel, kelas, nama guru, dan link Google Form wajib diisi.")
  }

  await db
    .update(questionBanks)
    .set({ subjectId, teacherName, grade, googleFormUrl, active, updatedAt: new Date() })
    .where(eq(questionBanks.id, id))

  revalidatePath("/dashboard/bank-soal")
}

export async function deleteQuestionBank(id: string) {
  if (!id) throw new Error("ID bank soal tidak valid.")

  const usedSchedules = await db
    .select({ id: examSchedules.id })
    .from(examSchedules)
    .where(eq(examSchedules.questionBankId, id))
    .limit(1)

  if (usedSchedules.length > 0) {
    throw new Error("Bank soal tidak bisa dihapus karena sudah dipakai pada jadwal. Hapus jadwal terkait terlebih dahulu, atau nonaktifkan bank soal.")
  }

  await db.delete(questionBanks).where(eq(questionBanks.id, id))
  revalidatePath("/dashboard/bank-soal")
}
