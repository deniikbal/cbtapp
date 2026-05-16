"use server"

import { randomUUID } from "node:crypto"

import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { questionBanks } from "@/lib/db/schema"

function normalizeUrl(url: string) {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    throw new Error("Link Google Form harus diawali http:// atau https://.")
  }
  return url
}

export async function createQuestionBank(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase()
  const title = String(formData.get("title") ?? "").trim()
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const googleFormUrl = normalizeUrl(String(formData.get("googleFormUrl") ?? "").trim())
  const active = String(formData.get("active") ?? "true") === "true"

  if (!code || !title || !subjectId || !googleFormUrl) {
    throw new Error("Kode soal, judul, mapel, dan link Google Form wajib diisi.")
  }

  await db.insert(questionBanks).values({
    id: randomUUID(),
    code,
    title,
    subjectId,
    googleFormUrl,
    active,
  })

  revalidatePath("/dashboard/bank-soal")
}

export async function updateQuestionBank(formData: FormData) {
  const id = String(formData.get("id") ?? "").trim()
  const code = String(formData.get("code") ?? "").trim().toUpperCase()
  const title = String(formData.get("title") ?? "").trim()
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const googleFormUrl = normalizeUrl(String(formData.get("googleFormUrl") ?? "").trim())
  const active = String(formData.get("active") ?? "true") === "true"

  if (!id || !code || !title || !subjectId || !googleFormUrl) {
    throw new Error("Data bank soal tidak lengkap.")
  }

  await db
    .update(questionBanks)
    .set({ code, title, subjectId, googleFormUrl, active, updatedAt: new Date() })
    .where(eq(questionBanks.id, id))

  revalidatePath("/dashboard/bank-soal")
}

export async function deleteQuestionBank(id: string) {
  if (!id) throw new Error("ID bank soal tidak valid.")

  await db.delete(questionBanks).where(eq(questionBanks.id, id))
  revalidatePath("/dashboard/bank-soal")
}
