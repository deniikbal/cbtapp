"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { majors } from "@/lib/db/schema"

function revalidateMajorPaths() {
  revalidatePath("/dashboard/jurusan")
  revalidatePath("/dashboard/kelas")
}

export async function createMajor(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim().toUpperCase()

  if (!name || !code) {
    throw new Error("Nama dan kode jurusan wajib diisi.")
  }

  await db.insert(majors).values({
    id: randomUUID(),
    name,
    code,
  })

  revalidateMajorPaths()
}

export async function updateMajor(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim().toUpperCase()

  if (!id || !name || !code) {
    throw new Error("Data jurusan tidak lengkap.")
  }

  await db.update(majors).set({ name, code, updatedAt: new Date() }).where(eq(majors.id, id))

  revalidateMajorPaths()
}

export async function deleteMajor(id: string) {
  if (!id) throw new Error("ID jurusan tidak valid.")

  await db.delete(majors).where(eq(majors.id, id))

  revalidateMajorPaths()
}
