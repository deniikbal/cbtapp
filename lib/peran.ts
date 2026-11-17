import { eq } from "drizzle-orm"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { user } from "@/lib/db/schema"

export type Peran = "admin" | "superadmin"

/** Peran user yang sedang login (null = belum login). */
export async function peranSekarang(): Promise<Peran | null> {
  const sesi = await auth.api.getSession({ headers: await headers() })
  if (!sesi) return null
  const [baris] = await db.select({ role: user.role }).from(user).where(eq(user.id, sesi.user.id)).limit(1)
  return (baris?.role as Peran) ?? "admin"
}

/** Hanya superadmin yang boleh mengelola akun user. */
export async function bolehKelolaUser() {
  return (await peranSekarang()) === "superadmin"
}
