"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examBrowserSettings } from "@/lib/db/schema"
import { EXAM_BROWSER_SETTING_ID } from "@/lib/exam-browser"

export async function updateExamBrowserSettings(formData: FormData) {
  const forceExamBrowser = formData.get("forceExamBrowser") === "on"
  const allowedUserAgentPattern = String(formData.get("allowedUserAgentPattern") ?? "").trim()
  const blockedMessage = String(formData.get("blockedMessage") ?? "").trim()
  const downloadUrl = String(formData.get("downloadUrl") ?? "").trim()

  if (forceExamBrowser && !allowedUserAgentPattern) {
    throw new Error("Isi minimal satu pola User-Agent sebelum mode wajib ExamBro diaktifkan.")
  }

  await db
    .insert(examBrowserSettings)
    .values({
      id: EXAM_BROWSER_SETTING_ID,
      forceExamBrowser,
      allowedUserAgentPattern,
      blockedMessage:
        blockedMessage || "Akses ujian hanya bisa dibuka melalui aplikasi ExamBro Android.",
      downloadUrl,
    })
    .onConflictDoUpdate({
      target: examBrowserSettings.id,
      set: {
        forceExamBrowser,
        allowedUserAgentPattern,
        blockedMessage:
          blockedMessage || "Akses ujian hanya bisa dibuka melalui aplikasi ExamBro Android.",
        downloadUrl,
        updatedAt: new Date(),
      },
    })

  revalidatePath("/dashboard/pengaturan")
  revalidatePath("/")
  revalidatePath("/siswa/dashboard")
  revalidatePath("/blocked")
}
