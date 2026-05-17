"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { classrooms } from "@/lib/db/schema"

function revalidateClassroomPaths() {
  revalidatePath("/dashboard/kelas")
  revalidatePath("/dashboard/peserta")
}

export async function createClassroom(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const grade = String(formData.get("grade") ?? "").trim()
  const majorId = String(formData.get("majorId") ?? "").trim()

  if (!name || !grade || !majorId) {
    throw new Error("Nama kelas, tingkat, dan jurusan wajib diisi.")
  }

  await db.insert(classrooms).values({
    id: randomUUID(),
    name,
    grade,
    majorId,
  })

  revalidateClassroomPaths()
}

export async function updateClassroom(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const grade = String(formData.get("grade") ?? "").trim()
  const majorId = String(formData.get("majorId") ?? "").trim()

  if (!id || !name || !grade || !majorId) {
    throw new Error("Data kelas tidak lengkap.")
  }

  await db
    .update(classrooms)
    .set({ name, grade, majorId, updatedAt: new Date() })
    .where(eq(classrooms.id, id))

  revalidateClassroomPaths()
}

export async function deleteClassroom(id: string) {
  if (!id) throw new Error("ID kelas tidak valid.")

  await db.delete(classrooms).where(eq(classrooms.id, id))

  revalidateClassroomPaths()
}
