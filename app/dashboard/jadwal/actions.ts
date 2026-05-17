"use server"

import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"
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


function getDatabaseErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)

  if (
    message.includes("exam_schedules_unique_slot_idx") ||
    message.includes("duplicate key") ||
    message.includes("unique constraint")
  ) {
    return "Jadwal duplikat: bank soal, kelas, tanggal, dan jam mulai sudah ada."
  }

  return error instanceof Error ? error.message : "Terjadi kesalahan database."
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

  try {
    await db.insert(examSchedules).values(values)
  } catch (error) {
    throw new Error(getDatabaseErrorMessage(error))
  }

  revalidatePath("/dashboard/jadwal")

  return { created: values.length, skipped }
}

export async function updateExamSchedule(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("ID jadwal tidak valid.")

  formData.append("ids", id)
  return updateExamScheduleGroup(formData)
}

export async function updateExamScheduleGroup(formData: FormData) {
  const base = readScheduleBaseForm(formData)
  const ids = formData
    .getAll("ids")
    .map((value) => String(value).trim())
    .filter(Boolean)
  const classroomIds = formData
    .getAll("classroomIds")
    .map((value) => String(value).trim())
    .filter(Boolean)

  if (ids.length === 0) throw new Error("ID jadwal tidak valid.")
  if (classroomIds.length === 0) throw new Error("Pilih minimal satu kelas.")

  const existingRows = await db
    .select({ id: examSchedules.id, classroomId: examSchedules.classroomId })
    .from(examSchedules)
    .where(inArray(examSchedules.id, ids))

  const selectedClassroomIds = new Set(classroomIds)
  const existingByClassroom = new Map(existingRows.map((row) => [row.classroomId, row.id]))
  let updated = 0
  let created = 0
  let deleted = 0
  let skipped = 0

  for (const row of existingRows) {
    if (!selectedClassroomIds.has(row.classroomId)) {
      await db.delete(examSchedules).where(eq(examSchedules.id, row.id))
      deleted += 1
      continue
    }

    try {
      await db
        .update(examSchedules)
        .set({ ...base, updatedAt: new Date() })
        .where(eq(examSchedules.id, row.id))
      updated += 1
    } catch (error) {
      throw new Error(getDatabaseErrorMessage(error))
    }
  }

  for (const classroomId of classroomIds) {
    if (existingByClassroom.has(classroomId)) continue

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

    try {
      await db.insert(examSchedules).values({ id: randomUUID(), ...base, classroomId })
      created += 1
    } catch (error) {
      const message = getDatabaseErrorMessage(error)
      if (message.startsWith("Jadwal duplikat")) {
        skipped += 1
        continue
      }
      throw new Error(message)
    }
  }

  revalidatePath("/dashboard/jadwal")
  revalidatePath("/siswa/dashboard")

  return { updated, created, deleted, skipped }
}

export async function setExamScheduleStatus(id: string, active: boolean) {
  if (!id) throw new Error("ID jadwal tidak valid.")

  await setExamSchedulesStatus([id], active)
}

export async function setExamSchedulesStatus(ids: string[], active: boolean) {
  const validIds = ids.map((id) => id.trim()).filter(Boolean)
  if (validIds.length === 0) throw new Error("ID jadwal tidak valid.")

  await db
    .update(examSchedules)
    .set({ active, updatedAt: new Date() })
    .where(inArray(examSchedules.id, validIds))

  revalidatePath("/dashboard/jadwal")
  revalidatePath("/siswa/dashboard")
}

export async function deleteExamSchedule(id: string) {
  if (!id) throw new Error("ID jadwal tidak valid.")

  await deleteExamSchedules([id])
}

export async function deleteExamSchedules(ids: string[]) {
  const validIds = ids.map((id) => id.trim()).filter(Boolean)
  if (validIds.length === 0) throw new Error("ID jadwal tidak valid.")

  await db.delete(examSchedules).where(inArray(examSchedules.id, validIds))
  revalidatePath("/dashboard/jadwal")
  revalidatePath("/siswa/dashboard")
}
