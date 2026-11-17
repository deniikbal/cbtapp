"use server"

import { createHash } from "node:crypto"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"

export type GuruLoginState = {
  error?: string
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

export async function loginGuru(_state: GuruLoginState, formData: FormData): Promise<GuruLoginState> {
  const nip = String(formData.get("nip") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()

  if (!nip || !password) return { error: "NIP dan password wajib diisi." }

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.nip, nip) })

  if (!guru || guru.passwordHash !== hashPassword(password)) {
    return { error: "NIP atau password salah." }
  }

  if (!guru.active) return { error: "Akun guru tidak aktif. Hubungi admin." }

  const cookieStore = await cookies()
  cookieStore.set("teacher_id", guru.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })

  redirect("/guru/dashboard")
}

export async function logoutGuru() {
  const cookieStore = await cookies()
  cookieStore.set("teacher_id", "", { path: "/", maxAge: 0 })
  redirect("/guru/login")
}

export async function guruAktif() {
  const cookieStore = await cookies()
  const teacherId = cookieStore.get("teacher_id")?.value
  if (!teacherId) return null

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) })
  return guru?.active ? guru : null
}
