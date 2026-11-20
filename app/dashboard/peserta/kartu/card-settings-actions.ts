"use server"

import { randomUUID } from "node:crypto"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"
import { sql } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { db } from "@/lib/db"

export type CardSettings = {
  schoolName: string
  examTitle: string
  academicYear: string
  principalName: string
  principalNip: string
  logoUrl: string
  signatureUrl: string
}

export async function getCardSettings(): Promise<CardSettings> {
  const result = await db.execute(sql`SELECT * FROM card_settings WHERE id = 'default' LIMIT 1`)
  const row = (result as any).rows?.[0] ?? (result as any)[0]
  if (!row) return { schoolName: "SMA Negeri 1 Bantarujeg", examTitle: "Asesmen Sumatif Akhir Tahun", academicYear: "2025/2026", principalName: "", principalNip: "", logoUrl: "", signatureUrl: "" }
  return {
    schoolName: row.schoolName ?? "",
    examTitle: row.examTitle ?? "",
    academicYear: row.academicYear ?? "",
    principalName: row.principalName ?? "",
    principalNip: row.principalNip ?? "",
    logoUrl: row.logoUrl ?? "",
    signatureUrl: row.signatureUrl ?? "",
  }
}

export async function saveCardSettings(formData: FormData) {
  const schoolName = String(formData.get("schoolName") ?? "").trim()
  const examTitle = String(formData.get("examTitle") ?? "").trim()
  const academicYear = String(formData.get("academicYear") ?? "").trim()
  const principalName = String(formData.get("principalName") ?? "").trim()
  const principalNip = String(formData.get("principalNip") ?? "").trim()

  let logoUrl = String(formData.get("existingLogoUrl") ?? "")
  let signatureUrl = String(formData.get("existingSignatureUrl") ?? "")

  const logoFile = formData.get("logo")
  if (logoFile instanceof File && logoFile.size > 0) {
    logoUrl = await saveUpload(logoFile, "card-logo")
  }
  const sigFile = formData.get("signature")
  if (sigFile instanceof File && sigFile.size > 0) {
    signatureUrl = await saveUpload(sigFile, "card-signature")
  }

  await db.execute(sql`
    INSERT INTO card_settings (id, "schoolName", "examTitle", "academicYear", "principalName", "principalNip", "logoUrl", "signatureUrl", "updatedAt")
    VALUES ('default', ${schoolName}, ${examTitle}, ${academicYear}, ${principalName}, ${principalNip}, ${logoUrl}, ${signatureUrl}, now())
    ON CONFLICT (id) DO UPDATE SET
      "schoolName" = ${schoolName}, "examTitle" = ${examTitle}, "academicYear" = ${academicYear},
      "principalName" = ${principalName}, "principalNip" = ${principalNip},
      "logoUrl" = ${logoUrl}, "signatureUrl" = ${signatureUrl}, "updatedAt" = now()
  `)
  revalidatePath("/dashboard/peserta/kartu")
}

async function saveUpload(file: File, prefix: string): Promise<string> {
  const dir = path.join(process.cwd(), "public", "uploads", "card")
  await mkdir(dir, { recursive: true })
  const ext = file.name.split(".").pop() || "png"
  const fname = `${prefix}-${randomUUID().slice(0, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(dir, fname), buf)
  return `/uploads/card/${fname}`
}
