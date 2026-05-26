"use server"

import { createHash, randomUUID } from "node:crypto"

import { eq, inArray, sql } from "drizzle-orm"
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

export async function previewStudentNisUpdatesExcel(formData: FormData) {
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pilih file Excel terlebih dahulu.")
  }

  const rows = await parseNisUpdateExcel(file)

  if (rows.length === 0) {
    throw new Error("File Excel tidak berisi data update NIS.")
  }

  return buildNisUpdatePreview(rows)
}

export async function confirmStudentNisUpdates(updates: { oldNis: string; newNis: string }[]) {
  if (updates.length === 0) {
    throw new Error("Tidak ada data valid untuk diupdate.")
  }

  const rows: NisUpdateRow[] = updates.map((update, index) => ({
    rowNumber: index + 1,
    name: "",
    className: "",
    oldNis: update.oldNis,
    newNis: update.newNis,
  }))
  const preview = await buildNisUpdatePreview(rows)
  const validRows = preview.rows.filter((row) => row.valid && row.studentId)

  if (validRows.length === 0) {
    throw new Error("Tidak ada data valid untuk diupdate.")
  }

  for (const batch of chunkArray(validRows, 300)) {
    await db.execute(sql`
      update ${students}
      set
        "nis" = update_values.new_nis,
        "updatedAt" = now()
      from (values ${sql.join(
        batch.map((row) => sql`(${row.studentId}, ${row.newNis})`),
        sql`, `
      )}) as update_values(student_id, new_nis)
      where ${students.id} = update_values.student_id
    `)
  }

  revalidatePath("/dashboard/peserta")

  return { updated: validRows.length }
}

export async function importStudentNisUpdatesExcel(formData: FormData) {
  const preview = await previewStudentNisUpdatesExcel(formData)
  const validUpdates = preview.rows
    .filter((row) => row.valid)
    .map((row) => ({ oldNis: row.oldNis, newNis: row.newNis }))
  const response = await confirmStudentNisUpdates(validUpdates)

  return { updated: response.updated, skipped: 0, errors: preview.rows.filter((row) => !row.valid).map((row) => `Baris ${row.rowNumber}: ${row.message}`) }
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

type NisUpdateRow = {
  rowNumber: number
  name: string
  className: string
  oldNis: string
  newNis: string
}

type NisUpdatePreviewRow = NisUpdateRow & {
  valid: boolean
  message: string
  studentId?: string
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

async function parseNisUpdateExcel(file: File): Promise<NisUpdateRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) return []

  const sheet = workbook.Sheets[sheetName]
  const range = XLSX.utils.decode_range(sheet["!ref"] ?? "A1:D1")
  const rows: NisUpdateRow[] = []

  for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
    const row = {
      rowNumber: rowIndex + 1,
      name: getCellText(sheet, rowIndex, 0),
      className: getCellText(sheet, rowIndex, 1),
      oldNis: getCellText(sheet, rowIndex, 2),
      newNis: getCellText(sheet, rowIndex, 3),
    }

    if (row.name || row.className || row.oldNis || row.newNis) {
      rows.push(row)
    }
  }

  return rows
}

async function buildNisUpdatePreview(rows: NisUpdateRow[]) {
  const studentRows = await db
    .select({ id: students.id, name: students.name, nis: students.nis, className: classrooms.name })
    .from(students)
    .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
  const studentByNis = new Map(studentRows.map((student) => [student.nis, student]))
  const seenOldNis = new Set<string>()
  const seenNewNis = new Set<string>()

  const previewRows: NisUpdatePreviewRow[] = rows.map((row) => {
    let valid = true
    let message = "Valid"
    const oldLastThree = lastThreeDigits(row.oldNis)
    const newLastThree = lastThreeDigits(row.newNis)
    const student = resolveStudentForNisUpdate(row, studentRows, studentByNis)

    if (!row.oldNis || !row.newNis) {
      valid = false
      message = "nis_lama dan nis_baru wajib diisi."
    } else if (seenOldNis.has(row.oldNis)) {
      valid = false
      message = `nis_lama “${row.oldNis}” duplikat di file.`
    } else if (seenNewNis.has(row.newNis)) {
      valid = false
      message = `nis_baru “${row.newNis}” duplikat di file.`
    } else if (!student) {
      valid = false
      message = `Siswa dengan NIS lama “${row.oldNis}” tidak ditemukan.`
    } else if (oldLastThree.length < 3 || newLastThree.length < 3) {
      valid = false
      message = "NIS lama dan NIS baru harus memiliki minimal 3 angka."
    } else if (oldLastThree !== newLastThree) {
      valid = false
      message = "3 angka terakhir NIS lama dan NIS baru tidak sama."
    } else {
      const conflict = studentByNis.get(row.newNis)
      if (conflict && conflict.id !== student.id) {
        valid = false
        message = `NIS baru “${row.newNis}” sudah dipakai siswa lain.`
      } else if (student.nis === row.newNis) {
        message = "Valid, NIS tidak berubah."
      } else if (student.nis !== row.oldNis) {
        message = `Valid, dicocokkan ke NIS database “${student.nis}”.`
      }
    }

    if (row.oldNis) seenOldNis.add(row.oldNis)
    if (row.newNis) seenNewNis.add(row.newNis)

    return { ...row, valid, message, studentId: student?.id }
  })

  return {
    valid: previewRows.filter((row) => row.valid).length,
    invalid: previewRows.filter((row) => !row.valid).length,
    rows: previewRows,
  }
}

function chunkArray<T>(items: T[], size: number) {
  const chunks: T[][] = []
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size))
  }
  return chunks
}

function resolveStudentForNisUpdate(
  row: NisUpdateRow,
  studentRows: { id: string; name: string; nis: string; className: string }[],
  studentByNis: Map<string, { id: string; name: string; nis: string; className: string }>
) {
  const exactStudent = studentByNis.get(row.oldNis)
  if (exactStudent) return exactStudent

  const oldLastThree = lastThreeDigits(row.oldNis)
  if (oldLastThree.length < 3) return null

  let candidates = studentRows.filter((student) => lastThreeDigits(student.nis) === oldLastThree)
  const normalizedName = normalizeKey(row.name)
  const normalizedClassName = normalizeKey(row.className)

  if (normalizedName) {
    candidates = candidates.filter((student) => normalizeKey(student.name) === normalizedName)
  }

  if (normalizedClassName) {
    candidates = candidates.filter((student) => normalizeKey(student.className) === normalizedClassName)
  }

  return candidates.length === 1 ? candidates[0] : null
}

function getCellText(sheet: XLSX.WorkSheet, row: number, column: number) {
  const cell = sheet[XLSX.utils.encode_cell({ r: row, c: column })]
  return String(cell?.w ?? cell?.v ?? "").trim()
}

function lastThreeDigits(value: string) {
  return value.replace(/\D/g, "").slice(-3)
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase()
}
