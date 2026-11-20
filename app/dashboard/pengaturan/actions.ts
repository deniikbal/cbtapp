"use server"

import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examBrowserSettings, questionBanks } from "@/lib/db/schema"
import { daftarEmailEditor, setFormAnyoneEditor, shareFormEditor } from "@/lib/google-forms"
import { ensureExamBrowserSettingsTable, getExamBrowserSettings, EXAM_BROWSER_SETTING_ID } from "@/lib/exam-browser"

export async function updateExamBrowserSettings(formData: FormData) {
  const forceExamBrowser = formData.get("forceExamBrowser") === "on"
  const allowedUserAgentPattern = String(formData.get("allowedUserAgentPattern") ?? "").trim()
  const blockedMessage = String(formData.get("blockedMessage") ?? "").trim()
  const downloadUrl = String(formData.get("downloadUrl") ?? "").trim()
  const configCode = String(formData.get("configCode") ?? "").trim()
  const formEditorEmails = String(formData.get("formEditorEmails") ?? "").trim()
  const formPublicEdit = formData.get("formPublicEdit") === "on"

  if (forceExamBrowser && !allowedUserAgentPattern) {
    throw new Error("Isi minimal satu pola User-Agent sebelum mode wajib ExamBro diaktifkan.")
  }

  await ensureExamBrowserSettingsTable()

  await db
    .insert(examBrowserSettings)
    .values({
      id: EXAM_BROWSER_SETTING_ID,
      forceExamBrowser,
      allowedUserAgentPattern,
      blockedMessage:
        blockedMessage || "Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android.",
      downloadUrl,
      configCode,
      formEditorEmails,
      formPublicEdit,
    })
    .onConflictDoUpdate({
      target: examBrowserSettings.id,
      set: {
        forceExamBrowser,
        allowedUserAgentPattern,
        blockedMessage:
          blockedMessage || "Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android.",
        downloadUrl,
        configCode,
        formEditorEmails,
        formPublicEdit,
        updatedAt: new Date(),
      },
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

export async function bagikanSemuaFormKeEditor(): Promise<{ ok: boolean; message: string }> {
  await ensureExamBrowserSettingsTable()
  const settings = await getExamBrowserSettings()
  const editors = daftarEmailEditor(settings.formEditorEmails)
  if (editors.length === 0) {
    return { ok: false, message: 'Isi dulu daftar email editor di kolom "Email editor Google Form".' }
  }

  const banks = await db
    .select({ formId: questionBanks.formId, code: questionBanks.code })
    .from(questionBanks)
  const targets = banks.filter((bank) => bank.formId)

  let sukses = 0
  const gagal: string[] = []
  for (const bank of targets) {
    try {
      if (settings.formPublicEdit) {
        if (await setFormAnyoneEditor(bank.formId)) sukses += 1
        else gagal.push(bank.code)
        continue
      }
      const hasil = await shareFormEditor(bank.formId, editors)
      if (hasil.ok.length === editors.length) sukses += 1
      else gagal.push(bank.code)
    } catch {
      gagal.push(bank.code)
    }
  }

  revalidatePath("/dashboard/bank-soal")
  const cara = settings.formPublicEdit ? "edit via link (siapa saja)" : `email editor: ${editors.join(", ")}`
  return {
    ok: true,
    message: `Akses diterapkan ke ${sukses} dari ${targets.length} form (${cara}).${gagal.length ? ` Gagal: ${gagal.join(", ")}.` : ""}`,
  }
}
