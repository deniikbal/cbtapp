"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { subjects } from "@/lib/db/schema"

export async function createSubject(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim().toUpperCase()
  const active = String(formData.get("active") ?? "true") === "true"

  if (!name || !code) throw new Error("Nama dan kode mapel wajib diisi.")

  await db.insert(subjects).values({ id: randomUUID(), name, code, active })
  revalidatePath("/dashboard/mapel")
}

export async function updateSubject(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const name = String(formData.get("name") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim().toUpperCase()
  const active = String(formData.get("active") ?? "true") === "true"

  if (!id || !name || !code) throw new Error("Data mapel tidak lengkap.")

  await db
    .update(subjects)
    .set({ name, code, active, updatedAt: new Date() })
    .where(eq(subjects.id, id))

  revalidatePath("/dashboard/mapel")
}

export async function deleteSubject(id: string) {
  if (!id) throw new Error("ID mapel tidak valid.")

  await db.delete(subjects).where(eq(subjects.id, id))
  revalidatePath("/dashboard/mapel")
}
