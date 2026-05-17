"use server"

import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { examAttempts } from "@/lib/db/schema"

async function getStudentId() {
  const cookieStore = await cookies()
  const studentId = cookieStore.get("student_id")?.value

  if (!studentId) redirect("/")

  return studentId
}

async function findAttempt(scheduleId: string, studentId: string) {
  const rows = await db
    .select({ id: examAttempts.id, submittedAt: examAttempts.submittedAt })
    .from(examAttempts)
    .where(and(eq(examAttempts.scheduleId, scheduleId), eq(examAttempts.studentId, studentId)))
    .limit(1)

  return rows[0]
}

export async function startExam(scheduleId: string, googleFormUrl: string) {
  if (!scheduleId || !googleFormUrl) throw new Error("Jadwal ujian tidak valid.")

  const studentId = await getStudentId()
  const attempt = await findAttempt(scheduleId, studentId)
  const now = new Date()

  if (!attempt) {
    await db.insert(examAttempts).values({
      id: randomUUID(),
      scheduleId,
      studentId,
      startedAt: now,
    })
  } else if (!attempt.submittedAt) {
    await db
      .update(examAttempts)
      .set({ startedAt: now, updatedAt: now })
      .where(eq(examAttempts.id, attempt.id))
  }

  revalidatePath("/siswa/dashboard")
  redirect(googleFormUrl)
}

export async function submitExam(scheduleId: string) {
  if (!scheduleId) throw new Error("Jadwal ujian tidak valid.")

  const studentId = await getStudentId()
  const attempt = await findAttempt(scheduleId, studentId)
  const now = new Date()

  if (!attempt) {
    await db.insert(examAttempts).values({
      id: randomUUID(),
      scheduleId,
      studentId,
      startedAt: now,
      submittedAt: now,
    })
  } else {
    await db
      .update(examAttempts)
      .set({ submittedAt: now, updatedAt: now })
      .where(eq(examAttempts.id, attempt.id))
  }

  revalidatePath("/siswa/dashboard")
}

export async function logoutStudent() {
  const cookieStore = await cookies()
  cookieStore.set("student_id", "", {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    expires: new Date(0),
  })
  redirect("/")
}
