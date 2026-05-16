"use server"

import { createHash } from "node:crypto"

import { eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { students } from "@/lib/db/schema"

export type StudentLoginState = {
  error?: string
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

export async function loginStudent(
  _state: StudentLoginState,
  formData: FormData
): Promise<StudentLoginState> {
  const nis = String(formData.get("nis") ?? "").trim()
  const password = String(formData.get("password") ?? "").trim()

  if (!nis || !password) {
    return { error: "NIS dan password wajib diisi." }
  }

  const student = await db.query.students.findFirst({
    where: eq(students.nis, nis),
  })

  if (!student || student.passwordHash !== hashPassword(password)) {
    return { error: "NIS atau password salah." }
  }

  if (!student.active) {
    return { error: "Akun siswa tidak aktif. Hubungi admin." }
  }

  const cookieStore = await cookies()
  cookieStore.set("student_id", student.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  })

  redirect("/siswa/dashboard")
}
