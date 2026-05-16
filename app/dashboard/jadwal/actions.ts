"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examSchedules } from "@/lib/db/schema"

function readScheduleForm(formData: FormData) {
  const questionBankId = String(formData.get("questionBankId") ?? "").trim()
  const classroomId = String(formData.get("classroomId") ?? "").trim()
  const examDate = String(formData.get("examDate") ?? "").trim()
  const startTime = String(formData.get("startTime") ?? "").trim()
  const durationMinutes = Number(formData.get("durationMinutes") ?? 0)
  const active = String(formData.get("active") ?? "true") === "true"

  if (!questionBankId || !classroomId || !examDate || !startTime || !durationMinutes) {
    throw new Error("Bank soal, kelas, tanggal, jam mulai, dan durasi wajib diisi.")
  }

  return { questionBankId, classroomId, examDate, startTime, durationMinutes, active }
}

export async function createExamSchedule(formData: FormData) {
  await db.insert(examSchedules).values({ id: randomUUID(), ...readScheduleForm(formData) })
  revalidatePath("/dashboard/jadwal")
}

export async function updateExamSchedule(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  if (!id) throw new Error("ID jadwal tidak valid.")

  await db
    .update(examSchedules)
    .set({ ...readScheduleForm(formData), updatedAt: new Date() })
    .where(eq(examSchedules.id, id))

  revalidatePath("/dashboard/jadwal")
}

export async function deleteExamSchedule(id: string) {
  if (!id) throw new Error("ID jadwal tidak valid.")

  await db.delete(examSchedules).where(eq(examSchedules.id, id))
  revalidatePath("/dashboard/jadwal")
}
