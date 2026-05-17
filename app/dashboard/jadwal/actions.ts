"use server"

import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examSchedules } from "@/lib/db/schema"

function readScheduleBaseForm(formData: FormData) {
  const questionBankId = String(formData.get("questionBankId") ?? "").trim()
  const examDate = String(formData.get("examDate") ?? "").trim()
  const startTime = String(formData.get("startTime") ?? "").trim()
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0)
  const active = String(formData.get("active") ?? "true") === "true"

  if (!questionBankId || !examDate || !startTime || !durationMinutes) {
    throw new Error("Bank soal, tanggal, jam mulai, dan durasi wajib diisi.")
  }

  return { questionBankId, examDate, startTime, durationMinutes, active }
}


export async function createExamSchedule(formData: FormData) {
  const base = readScheduleBaseForm(formData)
  const classroomIds = formData
    .getAll("classroomIds")
    .map((value) => String(value).trim())
    .filter(Boolean)

  if (classroomIds.length === 0) {
    throw new Error("Pilih minimal satu kelas.")
  }

  let skipped = 0
  const values = []

  for (const classroomId of classroomIds) {
    const duplicate = await db
      .select({ id: examSchedules.id })
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.questionBankId, base.questionBankId),
          eq(examSchedules.classroomId, classroomId),
          eq(examSchedules.examDate, base.examDate),
          eq(examSchedules.startTime, base.startTime)
        )
      )
      .limit(1)

    if (duplicate.length > 0) {
      skipped += 1
      continue
    }

    values.push({ id: randomUUID(), ...base, classroomId })
  }

  if (values.length === 0) {
    throw new Error("Semua kelas yang dipilih sudah memiliki jadwal yang sama.")
  }

  await db.insert(examSchedules).values(values)
  revalidatePath("/dashboard/jadwal")

  return { created: values.length, skipped }
}

export async function updateExamSchedule(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const base = readScheduleBaseForm(formData)
  const classroomIds = formData
    .getAll("classroomIds")
    .map((value) => String(value).trim())
    .filter(Boolean)

  if (!id) throw new Error("ID jadwal tidak valid.")
  if (classroomIds.length === 0) throw new Error("Pilih minimal satu kelas.")

  const [primaryClassroomId, ...additionalClassroomIds] = classroomIds

  await db
    .update(examSchedules)
    .set({ ...base, classroomId: primaryClassroomId, updatedAt: new Date() })
    .where(eq(examSchedules.id, id))

  let created = 0
  let skipped = 0

  for (const classroomId of additionalClassroomIds) {
    const duplicate = await db
      .select({ id: examSchedules.id })
      .from(examSchedules)
      .where(
        and(
          eq(examSchedules.questionBankId, base.questionBankId),
          eq(examSchedules.classroomId, classroomId),
          eq(examSchedules.examDate, base.examDate),
          eq(examSchedules.startTime, base.startTime)
        )
      )
      .limit(1)

    if (duplicate.length > 0) {
      skipped += 1
      continue
    }

    await db.insert(examSchedules).values({ id: randomUUID(), ...base, classroomId })
    created += 1
  }

  revalidatePath("/dashboard/jadwal")

  return { updated: 1, created, skipped }
}

export async function setExamScheduleStatus(id: string, active: boolean) {
  if (!id) throw new Error("ID jadwal tidak valid.")

  await db
    .update(examSchedules)
    .set({ active, updatedAt: new Date() })
    .where(eq(examSchedules.id, id))

  revalidatePath("/dashboard/jadwal")
  revalidatePath("/siswa/dashboard")
}

export async function deleteExamSchedule(id: string) {
  if (!id) throw new Error("ID jadwal tidak valid.")

  await db.delete(examSchedules).where(eq(examSchedules.id, id))
  revalidatePath("/dashboard/jadwal")
}
