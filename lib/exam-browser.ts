import { db } from "@/lib/db"
import { examBrowserSettings } from "@/lib/db/schema"

export const EXAM_BROWSER_SETTING_ID = "default"

export type ExamBrowserSettings = {
  id: string
  forceExamBrowser: boolean
  allowedUserAgentPattern: string
  blockedMessage: string
  downloadUrl: string
}

export const defaultExamBrowserSettings: ExamBrowserSettings = {
  id: EXAM_BROWSER_SETTING_ID,
  forceExamBrowser: false,
  allowedUserAgentPattern: "",
  blockedMessage: "Akses ujian hanya bisa dibuka melalui aplikasi ExamBro Android.",
  downloadUrl: "",
}

export async function getExamBrowserSettings() {
  try {
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
