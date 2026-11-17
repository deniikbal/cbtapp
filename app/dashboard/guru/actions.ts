"use server"

import { createHash, randomUUID } from "node:crypto"

import { asc, eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { teachers } from "@/lib/db/schema"
import { bolehKelolaUser } from "@/lib/peran"

const PATH = "/dashboard/guru"

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex")
}

function baca(formData: FormData) {
  return {
    id: String(formData.get("id") ?? "").trim(),
    name: String(formData.get("name") ?? "").trim(),
    nip: String(formData.get("nip") ?? "").trim(),
    nuptk: String(formData.get("nuptk") ?? "").trim(),
    gender: String(formData.get("gender") ?? "").trim(),
    birthPlace: String(formData.get("birthPlace") ?? "").trim(),
    birthDate: String(formData.get("birthDate") ?? "").trim(),
    password: String(formData.get("password") ?? "").trim(),
    active: String(formData.get("active") ?? "true") === "true",
  }
}

export async function listTeachers() {
  return db.select().from(teachers).orderBy(asc(teachers.name))
}

export async function createTeacher(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const data = baca(formData)
  if (!data.name || !data.nip || !data.password) {
    return { ok: false, message: "Nama, NIP, dan password wajib diisi." }
  }

  try {
    await db.insert(teachers).values({
      id: randomUUID(),
      name: data.name,
      nip: data.nip,
      nuptk: data.nuptk,
      gender: data.gender,
      birthPlace: data.birthPlace,
      birthDate: data.birthDate,
      passwordHash: hashPassword(data.password),
      active: data.active,
    })
    revalidatePath(PATH)
    return { ok: true, message: `Guru ${data.name} ditambahkan.` }
  } catch (error) {
    console.error("Gagal menambah guru:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

export async function updateTeacher(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const data = baca(formData)
  if (!data.id || !data.name || !data.nip) {
    return { ok: false, message: "Nama dan NIP wajib diisi." }
  }

  try {
    await db
      .update(teachers)
      .set({
        name: data.name,
        nip: data.nip,
        nuptk: data.nuptk,
        gender: data.gender,
        birthPlace: data.birthPlace,
        birthDate: data.birthDate,
        active: data.active,
        ...(data.password ? { passwordHash: hashPassword(data.password) } : {}),
        updatedAt: new Date(),
      })
      .where(eq(teachers.id, data.id))
    revalidatePath(PATH)
    return {
      ok: true,
      message: data.password
        ? `Data ${data.name} diperbarui, password diganti.`
        : `Data ${data.name} diperbarui.`,
    }
  } catch (error) {
    console.error("Gagal memperbarui guru:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

export async function setAksesPdf(teacherId: string, aktif: boolean): Promise<{ ok: boolean; message: string }> {
  if (!teacherId) return { ok: false, message: "Guru tidak ditemukan." }
  const sesi = await auth.api.getSession({ headers: await headers() })
  if (!sesi) return { ok: false, message: "Sesi habis. Silakan login ulang." }
  if (!(await bolehKelolaUser())) return { ok: false, message: "Hanya superadmin yang boleh mengubah akses unduh PDF." }
  try {
    await db
      .update(teachers)
      .set({
        aksesPdf: aktif ? "aktif" : "ditolak",
        aksesPdfPada: aktif ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(teachers.id, teacherId))
    revalidatePath(PATH)
    revalidatePath("/guru/dashboard")
    return { ok: true, message: aktif ? "Akses unduh PDF diaktifkan." : "Akses unduh PDF ditolak." }
  } catch (error) {
    console.error("Gagal mengubah akses PDF:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

export async function deleteTeacher(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id) return { ok: false, message: "Data guru tidak ditemukan." }

  try {
    await db.delete(teachers).where(eq(teachers.id, id))
    revalidatePath(PATH)
    return { ok: true, message: "Guru dihapus." }
  } catch (error) {
    console.error("Gagal menghapus guru:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}
