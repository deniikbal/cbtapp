"use server"

import { createHash, randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
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

export async function setStudentStatus(id: string, active: boolean) {
  await db.update(students).set({ active, updatedAt: new Date() }).where(eq(students.id, id))
  revalidatePath("/dashboard/peserta")
}
