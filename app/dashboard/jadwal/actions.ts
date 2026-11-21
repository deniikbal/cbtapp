"use server"

import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { examSchedules } from "@/lib/db/schema"

function readScheduleBaseForm(formData: FormData) {
  const questionBankId = String(formData.get("questionBankId") ?? "").trim()
  const examDate = String(formData.get("examDate") ?? "").trim()
  const startTime = String(formData.get("startTime") ?? "").trim()
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0)
  const session = Math.max(1, Number(formData.get("session") ?? 1) || 1)
  const active = String(formData.get("active") ?? "true") === "true"
  // Checkbox yang tidak dicentang tidak dikirim FormData, jadi default false.
  const showScore = formData.get("showScore") === "true"

  if (!questionBankId || !examDate || !startTime || !durationMinutes) {
    throw new Error("Bank soal, tanggal, jam mulai, dan durasi wajib diisi.")
  }

  return { questionBankId, examDate, startTime, durationMinutes, active, session, showScore }
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
          eq(examSchedules.startTime, base.startTime),
          eq(examSchedules.session, base.session)
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
  revalidatePath("/siswa/dashboard")

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
          eq(examSchedules.startTime, base.startTime),
          eq(examSchedules.session, base.session)
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

export async function deleteExamSchedule(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id) return { ok: false, message: "ID jadwal tidak valid." }

  return deleteExamSchedules([id])
}

export async function deleteExamSchedules(ids: string[]): Promise<{ ok: boolean; message: string }> {
  const validIds = ids.map((id) => id.trim()).filter(Boolean)
  if (validIds.length === 0) return { ok: false, message: "ID jadwal tidak valid." }

  try {
    await db.delete(examSchedules).where(inArray(examSchedules.id, validIds))
    revalidatePath("/dashboard/jadwal")
    revalidatePath("/siswa/dashboard")
    return { ok: true, message: validIds.length > 1 ? "Grup jadwal berhasil dihapus." : "Jadwal berhasil dihapus." }
  } catch (error) {
    console.error("Gagal menghapus jadwal:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}


export async function duplicateExamScheduleToNextSession(
  ids: string[],
  startTime: string
): Promise<{ ok: boolean; message: string }> {
  const validIds = [...new Set((ids ?? []).map((value) => String(value).trim()).filter(Boolean))]
  const jam = String(startTime ?? "").trim()
  if (validIds.length === 0) return { ok: false, message: "ID jadwal tidak valid." }
  if (!/^\d{2}:\d{2}$/.test(jam)) return { ok: false, message: "Jam mulai wajib diisi." }

  const rows = await db.select().from(examSchedules).where(inArray(examSchedules.id, validIds))
  if (rows.length === 0) return { ok: false, message: "Jadwal tidak ditemukan." }

  const nextSession = Math.max(...rows.map((row) => row.session)) + 1

  const existing = await db
    .select({ classroomId: examSchedules.classroomId })
    .from(examSchedules)
    .where(
      and(
        eq(examSchedules.questionBankId, rows[0].questionBankId),
        eq(examSchedules.examDate, rows[0].examDate),
        eq(examSchedules.startTime, jam),
        eq(examSchedules.session, nextSession)
      )
    )
  const occupied = new Set(existing.map((row) => row.classroomId))

  const values = rows
    .filter((row) => !occupied.has(row.classroomId))
    .map((row) => ({
      id: randomUUID(),
      questionBankId: row.questionBankId,
      classroomId: row.classroomId,
      examDate: row.examDate,
      startTime: jam,
      durationMinutes: row.durationMinutes,
      active: row.active,
      showScore: row.showScore,
      session: nextSession,
    }))

  if (values.length === 0) {
    return { ok: false, message: `Sesi ${nextSession} pukul ${jam} sudah ada untuk semua kelas ini.` }
  }

  try {
    await db.insert(examSchedules).values(values)
  } catch (error) {
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }

  revalidatePath("/dashboard/jadwal")
  revalidatePath("/siswa/dashboard")

  const puluh = values.length
  return { ok: true, message: `Jadwal sesi ${nextSession} dibuat pukul ${jam} untuk ${puluh} kelas. Tetapkan sesi ${nextSession} pada siswa di halaman Peserta.` }
}
