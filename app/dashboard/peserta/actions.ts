"use server"

import { createHash, randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import * as XLSX from "xlsx"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { classrooms, majors, students } from "@/lib/db/schema"

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

export async function createStudent(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const nis = String(formData.get("nis") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()
  const classroomId = String(formData.get("classroomId") ?? "").trim()
  const active = String(formData.get("active") ?? "true") === "true"

  if (!name || !nis || !password || !classroomId) {
    throw new Error("Nama, NIS, password, dan kelas wajib diisi.")
  }

  await db.insert(students).values({
    id: randomUUID(),
    name,
    nis,
    passwordHash: hashPassword(password),
    active,
    classroomId,
  })

  revalidatePath("/dashboard/peserta")
}

export async function updateStudent(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const nis = String(formData.get("nis") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()
  const classroomId = String(formData.get("classroomId") ?? "").trim()
  const active = String(formData.get("active") ?? "true") === "true"

  if (!id || !name || !nis || !classroomId) {
    throw new Error("Nama, NIS, dan kelas wajib diisi.")
  }

  await db
    .update(students)
    .set({
      name,
      nis,
      classroomId,
      active,
      ...(password ? { passwordHash: hashPassword(password) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(students.id, id))

  revalidatePath("/dashboard/peserta")
}

export async function deleteStudent(id: string) {
  if (!id) throw new Error("ID peserta tidak valid.")

  await db.delete(students).where(eq(students.id, id))

  revalidatePath("/dashboard/peserta")
}

export async function seedInitialMasterData() {
  const existingMajor = await db.query.majors.findFirst()

  if (!existingMajor) {
    const rplId = randomUUID()
    const tkjId = randomUUID()

    await db.insert(majors).values([
      { id: rplId, name: "Rekayasa Perangkat Lunak", code: "RPL" },
      { id: tkjId, name: "Teknik Komputer Jaringan", code: "TKJ" },
    ])

    await db.insert(classrooms).values([
      { id: randomUUID(), name: "X RPL 1", grade: "X", majorId: rplId },
      { id: randomUUID(), name: "XI TKJ 1", grade: "XI", majorId: tkjId },
    ])
  }

  revalidatePath("/dashboard/peserta")
}

export async function importStudentsExcel(formData: FormData) {
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pilih file Excel terlebih dahulu.")
  }

  const rows = await parseExcel(file)

  if (rows.length === 0) {
    throw new Error("File Excel tidak berisi data peserta.")
  }

  const classroomRows = await db.select({ id: classrooms.id, name: classrooms.name }).from(classrooms)
  const classroomByName = new Map(classroomRows.map((classroom) => [normalizeKey(classroom.name), classroom.id]))
  const nisValues = rows.map((row) => row.nis).filter(Boolean)
  const existingStudents = nisValues.length
    ? await db.select({ nis: students.nis }).from(students).where(inArray(students.nis, nisValues))
    : []
  const existingNis = new Set(existingStudents.map((student) => student.nis))
  const seenNis = new Set<string>()
  const values: (typeof students.$inferInsert)[] = []
  const errors: string[] = []
  let skipped = 0

  rows.forEach((row, index) => {
    const line = index + 2

    if (!row.name || !row.nis || !row.password || !row.className) {
      errors.push(`Baris ${line}: nama, nis, password, dan kelas wajib diisi.`)
      return
    }

    const classroomId = classroomByName.get(normalizeKey(row.className))
    if (!classroomId) {
      errors.push(`Baris ${line}: kelas “${row.className}” tidak ditemukan.`)
      return
    }

    if (existingNis.has(row.nis) || seenNis.has(row.nis)) {
      skipped += 1
      return
    }

    seenNis.add(row.nis)
    values.push({
      id: randomUUID(),
      name: row.name,
      nis: row.nis,
      passwordHash: hashPassword(row.password),
      classroomId,
      active: row.active,
    })
  })

  if (values.length > 0) {
    await db.insert(students).values(values)
  }

  revalidatePath("/dashboard/peserta")

  return { created: values.length, skipped, errors }
}

export async function setStudentStatus(id: string, active: boolean) {
  await db.update(students).set({ active, updatedAt: new Date() }).where(eq(students.id, id))
  revalidatePath("/dashboard/peserta")
}

type CsvStudentRow = {
  name: string
  nis: string
  password: string
  className: string
  active: boolean
}

async function parseExcel(file: File): Promise<CsvStudentRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })

  return records.map((record) => {
    const data = new Map(
      Object.entries(record).map(([key, value]) => [normalizeKey(key), String(value).trim()])
    )
    const status = normalizeKey(data.get("status") ?? "aktif")

    return {
      name: data.get("nama") ?? data.get("name") ?? "",
      nis: data.get("nis") ?? "",
      password: data.get("password") ?? "",
      className: data.get("kelas") ?? data.get("class") ?? "",
      active: !(status === "tidak aktif" || status === "nonaktif" || status === "false" || status === "0"),
    }
  })
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}
