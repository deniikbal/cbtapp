"use server"

import { randomUUID } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { classrooms, examAttempts, examSchedules, questionBanks, students } from "@/lib/db/schema"

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

async function findScheduleForStudent(scheduleId: string, studentId: string) {
  const rows = await db
    .select({
      examDate: examSchedules.examDate,
      startTime: examSchedules.startTime,
      durationMinutes: examSchedules.durationMinutes,
      googleFormUrl: questionBanks.googleFormUrl,
      scheduleActive: examSchedules.active,
      bankActive: questionBanks.active,
    })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
    .innerJoin(students, eq(students.classroomId, classrooms.id))
    .where(and(eq(examSchedules.id, scheduleId), eq(students.id, studentId), eq(students.active, true)))
    .limit(1)

  return rows[0]
}

export async function startExam(scheduleId: string) {
  if (!scheduleId) throw new Error("Jadwal ujian tidak valid.")

  const studentId = await getStudentId()
  const schedule = await findScheduleForStudent(scheduleId, studentId)

  if (!schedule?.scheduleActive || !schedule.bankActive) {
    throw new Error("Jadwal ujian tidak aktif.")
  }

  if (getExamStatus(schedule.examDate, schedule.startTime, schedule.durationMinutes) !== "ACTIVE") {
    throw new Error("Ujian hanya bisa dibuka sesuai tanggal dan jam yang diatur admin.")
  }

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
  redirect(schedule.googleFormUrl)
}

export async function submitExam(scheduleId: string) {
  if (!scheduleId) throw new Error("Jadwal ujian tidak valid.")

  const studentId = await getStudentId()
  const schedule = await findScheduleForStudent(scheduleId, studentId)
  if (!schedule) throw new Error("Jadwal ujian tidak valid.")

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

function getExamStatus(
  examDate: string,
  startTime: string,
  durationMinutes: number
): "UPCOMING" | "ACTIVE" | "FINISHED" {
  const startValue = getDateTimeValue(examDate, startTime)
  const endValue = getDateTimeValue(examDate, calculateEndTime(startTime, durationMinutes))
  const now = getDateTimePartsInTimeZone("Asia/Jakarta")
  const nowValue = Number(
    `${now.year}${pad2(now.month)}${pad2(now.day)}${pad2(now.hours)}${pad2(now.minutes)}`
  )

  if (nowValue < startValue) return "UPCOMING"
  if (nowValue <= endValue) return "ACTIVE"
  return "FINISHED"
}

function getDateTimeValue(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hours, minutes] = timeValue.split(":").map(Number)

  return Number(`${year}${pad2(month)}${pad2(day)}${pad2(hours)}${pad2(minutes)}`)
}

function calculateEndTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  date.setMinutes(date.getMinutes() + durationMinutes)
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function getDateTimePartsInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}
