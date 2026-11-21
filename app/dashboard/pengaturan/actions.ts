"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examBrowserSettings } from "@/lib/db/schema"
import { ensureExamBrowserSettingsTable, EXAM_BROWSER_SETTING_ID } from "@/lib/exam-browser"

export async function updateExamBrowserSettings(formData: FormData) {
  const forceExamBrowser = formData.get("forceExamBrowser") === "on"
  const allowedUserAgentPattern = String(formData.get("allowedUserAgentPattern") ?? "").trim()
  const blockedMessage = String(formData.get("blockedMessage") ?? "").trim()
  const downloadUrl = String(formData.get("downloadUrl") ?? "").trim()
  const configCode = String(formData.get("configCode") ?? "").trim()
  const configExamUrl = String(formData.get("configExamUrl") ?? "").trim() || "https://asas.sman1bantarujeg.sch.id"
  const configUserAgent = String(formData.get("configUserAgent") ?? "").trim() || "smansaba"
  const configExitPin = String(formData.get("configExitPin") ?? "").trim() || "1234"
  const configSchoolName = String(formData.get("configSchoolName") ?? "").trim() || "SMAN 1 Bantarujeg"

  if (forceExamBrowser && !allowedUserAgentPattern) {
    throw new Error("Isi minimal satu pola User-Agent sebelum mode wajib ExamBro diaktifkan.")
  }

  await ensureExamBrowserSettingsTable()

  const values = {
    forceExamBrowser,
    allowedUserAgentPattern,
    blockedMessage: blockedMessage || "Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android.",
    downloadUrl,
    configCode,
    configExamUrl,
    configUserAgent,
    configExitPin,
    configSchoolName,
  }

  await db
    .insert(examBrowserSettings)
    .values({ id: EXAM_BROWSER_SETTING_ID, ...values })
    .onConflictDoUpdate({
      target: examBrowserSettings.id,
      set: { ...values, updatedAt: new Date() },
    })

  revalidatePath("/dashboard/pengaturan")
  revalidatePath("/")
  revalidatePath("/siswa/dashboard")
  revalidatePath("/blocked")
}

export async function generateExamConfigCode() {
  const code = String(Math.floor(1000 + Math.random() * 9000))
  await ensureExamBrowserSettingsTable()
  await db
    .insert(examBrowserSettings)
    .values({ id: EXAM_BROWSER_SETTING_ID, configCode: code })
    .onConflictDoUpdate({
      target: examBrowserSettings.id,
      set: { configCode: code, updatedAt: new Date() },
    })
  return code
}
