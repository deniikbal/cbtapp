"use server"

import { eq, sql } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { db } from "@/lib/db"
import { questionBanks, teachers } from "@/lib/db/schema"

function pesanError(teks: string) {
  return `/proktor/login?error=${encodeURIComponent(teks)}`
}

// Login proktor: hanya NIP, tanpa password. Hanya guru yang ditunjuk sebagai
// proktor di salah satu bank soal yang boleh masuk.
export async function loginProktor(formData: FormData) {
  const nip = String(formData.get("nip") ?? "").trim()
  if (!nip) redirect(pesanError("NIP wajib diisi."))

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.nip, nip) })
  if (!guru || !guru.active) redirect(pesanError("NIP tidak dikenal atau akun tidak aktif."))

  const [bank] = await db
    .select({ id: questionBanks.id })
    .from(questionBanks)
    .where(sql`${questionBanks.proctorIds} @> ${JSON.stringify([guru.id])}::jsonb`)
    .limit(1)
  if (!bank) redirect(pesanError("NIP ini belum ditunjuk sebagai proktor pada bank soal mana pun."))

  const cookieStore = await cookies()
  cookieStore.set("proctor_id", guru.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 12,
  })

  redirect("/proktor/dashboard")
}

export async function logoutProktor() {
  const cookieStore = await cookies()
  cookieStore.set("proctor_id", "", { path: "/", maxAge: 0 })
  redirect("/proktor/login")
}

export async function proktorAktif() {
  const cookieStore = await cookies()
  const proctorId = cookieStore.get("proctor_id")?.value
  if (!proctorId) return null

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, proctorId) })
  return guru?.active ? guru : null
}
