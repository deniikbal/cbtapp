"use server"

import { randomUUID } from "node:crypto"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { majors } from "@/lib/db/schema"

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

  revalidatePath("/dashboard/jurusan")
  revalidatePath("/dashboard/kelas")
}
