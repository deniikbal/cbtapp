"use server"

import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examRooms, students } from "@/lib/db/schema"

type Result = { ok: boolean; message: string }

function bersihkanNama(nama: unknown) {
  return String(nama ?? "").trim()
}

export async function buatRuangan(nama: string): Promise<Result> {
  const name = bersihkanNama(nama)
  if (!name) return { ok: false, message: "Nama ruangan wajib diisi." }
  if (name.length > 60) return { ok: false, message: "Nama ruangan maksimal 60 karakter." }

  try {
    await db.insert(examRooms).values({ id: randomUUID(), name })
  } catch (error) {
    const pesan = error instanceof Error ? error.message : ""
    if (pesan.includes("exam_rooms_name_idx") || pesan.includes("duplicate key")) {
      return { ok: false, message: `Ruangan “${name}” sudah ada.` }
    }
    return { ok: false, message: "Gagal membuat ruangan." }
  }

  revalidatePath("/dashboard/ruangan")
  return { ok: true, message: `Ruangan “${name}” dibuat.` }
}

export async function ubahRuangan(id: string, nama: string): Promise<Result> {
  const roomId = String(id ?? "").trim()
  const name = bersihkanNama(nama)
  if (!roomId) return { ok: false, message: "Ruangan tidak valid." }
  if (!name) return { ok: false, message: "Nama ruangan wajib diisi." }
  if (name.length > 60) return { ok: false, message: "Nama ruangan maksimal 60 karakter." }

  try {
    await db.update(examRooms).set({ name, updatedAt: new Date() }).where(eq(examRooms.id, roomId))
  } catch (error) {
    const pesan = error instanceof Error ? error.message : ""
    if (pesan.includes("exam_rooms_name_idx") || pesan.includes("duplicate key")) {
      return { ok: false, message: `Ruangan “${name}” sudah ada.` }
    }
    return { ok: false, message: "Gagal mengubah ruangan." }
  }

  revalidatePath("/dashboard/ruangan")
  return { ok: true, message: `Ruangan diubah menjadi “${name}”.` }
}

export async function hapusRuangan(id: string): Promise<Result> {
  const roomId = String(id ?? "").trim()
  if (!roomId) return { ok: false, message: "Ruangan tidak valid." }

  // Siswa di dalam ruangan otomatis lepas (roomId null) oleh ON DELETE SET NULL.
  await db.delete(examRooms).where(eq(examRooms.id, roomId))

  revalidatePath("/dashboard/ruangan")
  return { ok: true, message: "Ruangan dihapus. Sisanya kembali tanpa ruangan." }
}

export async function tambahSiswaKeRuangan(roomId: string, studentIds: string[]): Promise<Result> {
  const ruangan = String(roomId ?? "").trim()
  const unik = [...new Set((studentIds ?? []).filter(Boolean))]

  if (!ruangan) return { ok: false, message: "Ruangan tidak valid." }
  if (unik.length === 0) return { ok: false, message: "Pilih siswa terlebih dahulu." }
  if (unik.length > 2000) return { ok: false, message: "Maksimal 2000 siswa sekali tambah." }

  const hasil = await db
    .update(students)
    .set({ roomId: ruangan, updatedAt: new Date() })
    .where(inArray(students.id, unik))
    .returning({ id: students.id })

  revalidatePath("/dashboard/ruangan")
  return { ok: true, message: `${hasil.length} siswa masuk ruangan.` }
}

export async function keluarkanSiswaDariRuangan(studentIds: string[]): Promise<Result> {
  const unik = [...new Set((studentIds ?? []).filter(Boolean))]

  if (unik.length === 0) return { ok: false, message: "Pilih siswa terlebih dahulu." }
  if (unik.length > 2000) return { ok: false, message: "Maksimal 2000 siswa sekali keluarkan." }

  const hasil = await db
    .update(students)
    .set({ roomId: null, updatedAt: new Date() })
    .where(inArray(students.id, unik))
    .returning({ id: students.id })

  revalidatePath("/dashboard/ruangan")
  return { ok: true, message: `${hasil.length} siswa dikeluarkan dari ruangan.` }
}
