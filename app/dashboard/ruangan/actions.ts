"use server"

import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import * as XLSX from "xlsx"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examRooms, students } from "@/lib/db/schema"

type Result = { ok: boolean; message: string }

function bersihkanNama(nama: unknown) {
  return String(nama ?? "").trim()
}

// NIS dari Excel bisa berupa angka ("1234", 1234, 1234.0) — samakan jadi digit tanpa nol depan.
function kunciNis(nilai: unknown) {
  const digit = String(nilai ?? "").replace(/[^0-9]/g, "")
  return digit.replace(/^0+/, "") || digit
}

function kunciNama(nama: string) {
  return nama.trim().toLowerCase().replace(/\s+/g, " ")
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


export async function importRuanganExcel(formData: FormData): Promise<{
  dipetakan: number
  ruanganBaru: string[]
  tanpaRuangan: number
  errors: string[]
}> {
  const file = formData.get("file")

  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Pilih file Excel terlebih dahulu.")
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran file maksimal 5 MB.")
  }

  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" })
  const sheetName = workbook.SheetNames[0]
  if (!sheetName) throw new Error("File Excel tidak punya sheet.")

  const records = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], { defval: "" })
  if (records.length === 0) throw new Error("File Excel kosong. Kolom yang dibutuhkan: NIS dan Ruangan.")

  // Baris → { kunci NIS, nama ruangan }
  const baris: { kunci: string; nisAsli: string; ruangan: string }[] = []
  const errors: string[] = []

  records.forEach((record, index) => {
    const data = new Map(Object.entries(record).map(([key, value]) => [kunciNama(key), String(value).trim()]))
    const nisAsli = data.get("nis") ?? data.get("nisn") ?? ""
    const ruangan = data.get("ruangan") ?? data.get("room") ?? ""
    if (!nisAsli && !ruangan) return
    if (!nisAsli || !ruangan) {
      errors.push(`Baris ${index + 2}: NIS dan Ruangan harus diisi.`)
      return
    }
    baris.push({ kunci: kunciNis(nisAsli), nisAsli, ruangan })
  })

  if (baris.length === 0) {
    throw new Error("Tidak ada baris valid. Pastikan kolom pertama berjudul NIS dan kolom kedua Ruangan.")
  }

  // Ruangan: pakai yang sudah ada (tanpa beda huruf besar/kecil), buat kalau belum ada.
  const ruanganRows = await db.select({ id: examRooms.id, name: examRooms.name }).from(examRooms)
  const ruanganByNama = new Map(ruanganRows.map((room) => [kunciNama(room.name), room]))
  const ruanganBaru: string[] = []

  for (const nama of [...new Set(baris.map((row) => row.ruangan))]) {
    const kunci = kunciNama(nama)
    if (ruanganByNama.has(kunci)) continue
    const id = randomUUID()
    await db.insert(examRooms).values({ id, name: nama })
    ruanganByNama.set(kunci, { id, name: nama })
    ruanganBaru.push(nama)
  }

  // Peserta: cocokkan lewat NIS.
  const siswaRows = await db.select({ id: students.id, nis: students.nis, roomId: students.roomId }).from(students)
  const siswaByNis = new Map<string, (typeof siswaRows)[number]>()
  for (const siswa of siswaRows) {
    const kunci = kunciNis(siswa.nis)
    if (kunci) siswaByNis.set(kunci, siswa)
  }

  const perRuangan = new Map<string, { id: string; siswaIds: string[] }>()
  let tanpaRuangan = 0
  const tidakDitemukan: string[] = []

  for (const row of baris) {
    const siswa = siswaByNis.get(row.kunci)
    if (!siswa) {
      tidakDitemukan.push(row.nisAsli)
      continue
    }
    const room = ruanganByNama.get(kunciNama(row.ruangan))
    if (!room) continue
    const grup = perRuangan.get(room.id) ?? { id: room.id, siswaIds: [] }
    grup.siswaIds.push(siswa.id)
    perRuangan.set(room.id, grup)
    if (!siswa.roomId) tanpaRuangan += 1
  }

  let dipetakan = 0
  for (const { id, siswaIds } of perRuangan.values()) {
    if (siswaIds.length === 0) continue
    const hasil = await db
      .update(students)
      .set({ roomId: id, updatedAt: new Date() })
      .where(inArray(students.id, siswaIds))
      .returning({ id: students.id })
    dipetakan += hasil.length
  }

  if (tidakDitemukan.length > 0) {
    const cuplikan = tidakDitemukan.slice(0, 10).join(", ")
    errors.push(
      `${tidakDitemukan.length} NIS tidak ditemukan di data peserta: ${cuplikan}${tidakDitemukan.length > 10 ? ", …" : ""}`,
    )
  }

  revalidatePath("/dashboard/ruangan")
  revalidatePath("/dashboard/peserta")

  return { dipetakan, ruanganBaru, tanpaRuangan, errors }
}
