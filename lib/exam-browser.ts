import { sql } from "drizzle-orm"

import { db } from "@/lib/db"
import { examBrowserSettings } from "@/lib/db/schema"

export const EXAM_BROWSER_SETTING_ID = "default"

export type ExamBrowserSettings = {
  id: string
  forceExamBrowser: boolean
  allowedUserAgentPattern: string
  blockedMessage: string
  downloadUrl: string
  configCode: string
  configExamUrl: string
  configUserAgent: string
  configExitPin: string
  configSchoolName: string
  formEditorEmails: string
  formPublicEdit: boolean
}

export const defaultExamBrowserSettings: ExamBrowserSettings = {
  id: EXAM_BROWSER_SETTING_ID,
  forceExamBrowser: false,
  allowedUserAgentPattern: "",
  blockedMessage: "Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android.",
  downloadUrl: "",
  configCode: "",
  configExamUrl: "https://asas.sman1bantarujeg.sch.id",
  configUserAgent: "smansaba",
  configExitPin: "1234",
  configSchoolName: "SMAN 1 Bantarujeg",
  formEditorEmails: "",
  formPublicEdit: false,
}

export async function ensureExamBrowserSettingsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS "exam_browser_settings" (
      "id" text PRIMARY KEY NOT NULL,
      "forceExamBrowser" boolean DEFAULT false NOT NULL,
      "allowedUserAgentPattern" text DEFAULT '' NOT NULL,
      "blockedMessage" text DEFAULT 'Akses assesmen hanya bisa dibuka melalui aplikasi ExamBro Android.' NOT NULL,
      "downloadUrl" text DEFAULT '' NOT NULL,
      "formEditorEmails" text DEFAULT '' NOT NULL,
      "formPublicEdit" boolean DEFAULT false NOT NULL,
      "createdAt" timestamp with time zone DEFAULT now() NOT NULL,
      "updatedAt" timestamp with time zone DEFAULT now() NOT NULL
    )
  `)
  // Kolom tambahan (idempotent) untuk tabel yang sudah ada.
  await db.execute(sql`ALTER TABLE "exam_browser_settings" ADD COLUMN IF NOT EXISTS "configCode" text DEFAULT '' NOT NULL`)
  await db.execute(sql`ALTER TABLE "exam_browser_settings" ADD COLUMN IF NOT EXISTS "configExamUrl" text DEFAULT 'https://asas.sman1bantarujeg.sch.id' NOT NULL`)
  await db.execute(sql`ALTER TABLE "exam_browser_settings" ADD COLUMN IF NOT EXISTS "configUserAgent" text DEFAULT 'smansaba' NOT NULL`)
  await db.execute(sql`ALTER TABLE "exam_browser_settings" ADD COLUMN IF NOT EXISTS "configExitPin" text DEFAULT '1234' NOT NULL`)
  await db.execute(sql`ALTER TABLE "exam_browser_settings" ADD COLUMN IF NOT EXISTS "configSchoolName" text DEFAULT 'SMAN 1 Bantarujeg' NOT NULL`)
}

export async function getExamBrowserSettings() {
  try {
    await ensureExamBrowserSettingsTable()
    const rows = await db.select().from(examBrowserSettings).limit(1)

    return rows[0] ?? defaultExamBrowserSettings
  } catch {
    return defaultExamBrowserSettings
  }
}

export function getAllowedUserAgentPatterns(value: string) {
  return value
    .split(/[\n,]/)
    .map((pattern) => pattern.trim())
    .filter(Boolean)
}

export function isAllowedExamBrowser(userAgent: string, patternValue: string) {
  const patterns = getAllowedUserAgentPatterns(patternValue)

  if (patterns.length === 0) return false

  const normalizedUserAgent = userAgent.toLowerCase()

  return patterns.some((pattern) => normalizedUserAgent.includes(pattern.toLowerCase()))
}

export async function canAccessStudentArea(userAgent: string) {
  const settings = await getExamBrowserSettings()

  if (!settings.forceExamBrowser) return true

  return isAllowedExamBrowser(userAgent, settings.allowedUserAgentPattern)
}
