"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { classrooms } from "@/lib/db/schema"

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

  revalidatePath("/dashboard/kelas")
  revalidatePath("/dashboard/peserta")
}
