"use server"

import { createHash, randomInt } from "node:crypto"

import { and, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { students } from "@/lib/db/schema"

// Tanpa l, o, 0, 1 supaya tidak salah baca saat siswa mengetik.
const HURUF = "abcdefghijkmnpqrstuvwxyz"
const ANGKA = "23456789"

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

function buatPassword() {
  while (true) {
    let hasil = ""
    for (let i = 0; i < 4; i++) {
      const alfabet = randomInt(2) === 0 ? HURUF : ANGKA
      hasil += alfabet[randomInt(alfabet.length)]
    }
    if (/[a-z]/.test(hasil) && /[0-9]/.test(hasil)) return hasil
  }
}

async function pastikanSesi() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) throw new Error("Sesi berakhir. Silakan login ulang.")
}

export async function generateKartuPassword(classroomId: string) {
  await pastikanSesi()

  if (!classroomId) throw new Error("Kelas belum dipilih.")

  const daftar = await db
    .select({ id: students.id })
    .from(students)
    .where(eq(students.classroomId, classroomId))

  if (daftar.length === 0) throw new Error("Tidak ada peserta di kelas ini.")

  for (const siswa of daftar) {
    const password = buatPassword()
    await db
      .update(students)
      .set({ passwordHash: hashPassword(password), kartuPassword: password, updatedAt: new Date() })
      .where(eq(students.id, siswa.id))
  }

  revalidatePath("/dashboard/peserta/kartu")
  revalidatePath("/dashboard/peserta")

  return { jumlah: daftar.length }
}

export async function hapusKartuPassword(classroomId: string) {
  await pastikanSesi()

  if (!classroomId) throw new Error("Kelas belum dipilih.")

  const terhapus = await db
    .update(students)
    .set({ kartuPassword: null })
    .where(and(eq(students.classroomId, classroomId)))
    .returning({ id: students.id })

  revalidatePath("/dashboard/peserta/kartu")

  return { jumlah: terhapus.length }
}
