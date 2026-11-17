"use server"

import { eq } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionBanks, teachers } from "@/lib/db/schema"
import { parseSoalDocx, type SoalImpor } from "@/lib/impor-docx"
import { tambahSoalKeForm } from "@/lib/google-forms"

type Pratinjau = { ok: true; soal: SoalImpor[]; peringatan: string[] } | { ok: false; message: string }

type Baca = { ok: true; buffer: Buffer } | { ok: false; error: string }

async function bacaFile(formData: FormData): Promise<Baca> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file .docx dulu." }
  if (!/\.docx$/i.test(file.name)) return { ok: false, error: "Format harus .docx (Word 2007+). Simpan ulang dari Word bila masih .doc." }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Ukuran file maksimal 5 MB." }
  return { ok: true, buffer: Buffer.from(await file.arrayBuffer()) }
}

/** Parse saja, tanpa mengubah apa pun. */
export async function pratinjauSoalWord(formData: FormData): Promise<Pratinjau> {
  const baca = await bacaFile(formData)
  if (!baca.ok) return { ok: false, message: baca.error }
  try {
    const { soal, peringatan } = await parseSoalDocx(baca.buffer)
    if (soal.length === 0) {
      return { ok: false, message: "Tidak ada soal yang terbaca. Pastikan penomoran seperti \"1. pertanyaan\" dengan opsi a–e." }
    }
    return { ok: true, soal, peringatan }
  } catch (error) {
    console.error("Gagal parse docx:", error)
    return { ok: false, message: "File tidak bisa dibaca sebagai .docx." }
  }
}

/** Tambahkan soal dari Word ke Google Form bank soal + simpan butirnya ke database. */
export async function imporSoalWord(bankId: string, formData: FormData): Promise<{ ok: boolean; message: string }> {
  // Admin (sesi) atau guru pemilik bank lewat cookie.
  const sesi = await auth.api.getSession({ headers: await headers() })
  let teacherId: string | undefined
  if (!sesi) {
    const cookie = (await cookies()).get("teacher_id")?.value
    const guru = cookie ? await db.query.teachers.findFirst({ where: eq(teachers.id, cookie) }) : null
    if (!guru?.active) return { ok: false, message: "Sesi habis. Silakan login ulang." }
    teacherId = guru.id
  }

  const baca = await bacaFile(formData)
  if (!baca.ok) return { ok: false, message: baca.error }

  const [bank] = await db.select().from(questionBanks).where(eq(questionBanks.id, bankId)).limit(1)
  if (!bank) return { ok: false, message: "Bank soal tidak ditemukan." }
  if (teacherId && bank.teacherId !== teacherId) return { ok: false, message: "Bank soal ini bukan milik Anda." }
  if (!bank.formId) return { ok: false, message: "Bank soal belum punya form. Buat form dulu." }

  try {
    const { soal, peringatan } = await parseSoalDocx(baca.buffer)
    if (soal.length === 0) return { ok: false, message: "Tidak ada soal yang terbaca dari dokumen." }
    const siap = soal.filter((s) => s.opsi.length >= 2 && s.kunci)
    if (siap.length === 0) return { ok: false, message: "Semua soal belum lengkap (butuh opsi a–e dan kunci)." }

    const items = await tambahSoalKeForm(bank.formId, siap)
    await db.update(questionBanks).set({ formItems: items, updatedAt: new Date() }).where(eq(questionBanks.id, bank.id))

    revalidatePath("/dashboard/bank-soal")
    revalidatePath("/guru/dashboard")
    const dilewati = soal.length - siap.length
    return {
      ok: true,
      message: `${siap.length} soal ditambahkan ke form.${dilewati ? ` ${dilewati} soal dilewati karena belum lengkap.` : ""}${peringatan.length ? ` Catatan: ${peringatan[0]}` : ""}`,
    }
  } catch (error) {
    console.error("Gagal impor soal Word:", error)
    return { ok: false, message: error instanceof Error ? error.message : "Gagal impor soal." }
  }
}
