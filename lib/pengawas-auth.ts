import { cookies, headers } from "next/headers"
import { eq } from "drizzle-orm"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"

export type AktorPengawas =
  | { jenis: "proktor"; id: string; nama: string }
  | { jenis: "admin"; id: string; nama: string }

// Pengawas boleh proktor (cookie proctor_id) atau admin yang sudah login.
export async function aktorPengawas(): Promise<AktorPengawas | null> {
  const cookieStore = await cookies()
  const proctorId = cookieStore.get("proctor_id")?.value
  if (proctorId) {
    const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, proctorId) })
    if (guru?.active) return { jenis: "proktor", id: guru.id, nama: guru.name }
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (session?.user) return { jenis: "admin", id: session.user.id, nama: session.user.name }

  return null
}

// Tanggal hari ini menurut WIB (yyyy-mm-dd), sama seperti cara app ini menyimpan examDate.
export function tanggalWib(): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Jakarta",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  return fmt.format(new Date())
}

// Rentang waktu jadwal dalam UTC.
export function jendelaJadwal(examDate: string, startTime: string, durationMinutes: number) {
  const [y, m, d] = examDate.split("-").map(Number)
  const [hh, mm] = startTime.split(":").map(Number)
  const start = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1, (hh ?? 0) - 7, mm ?? 0))
  const end = new Date(start.getTime() + durationMinutes * 60_000)
  return { start, end }
}
