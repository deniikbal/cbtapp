"use server"

import { eq } from "drizzle-orm"
import { cookies, headers } from "next/headers"
import { revalidatePath } from "next/cache"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionBanks, teachers } from "@/lib/db/schema"
import { parseSoalDocx, parseSoalTeks, type SoalImpor } from "@/lib/impor-docx"
import { rapikanSoal, rapikanSoalAI } from "@/lib/rapikan-soal"
import {
  ambilForm,
  daftarSoalDariItems,
  hapusSoalForm,
  tambahSoalKeForm,
  ubahSoalForm,
  type JenisSoal,
  type SoalMasukan,
} from "@/lib/google-forms"

type Pratinjau = { ok: true; soal: SoalImpor[]; peringatan: string[] } | { ok: false; message: string }

type SoalRingkas = ReturnType<typeof daftarSoalDariItems>[number]

type MasukanSoal = {
  pertanyaan: string
  jenis?: JenisSoal
  bobot?: number
  opsi: string[]
  /** Huruf kunci untuk soal pilihan (A–E). */
  hurufKunci?: string
  /** Kunci teks untuk jawaban singkat. */
  kunciTeks?: string
}

/** Validasi masukan guru lalu ubah ke bentuk yang dipakai lapisan Google Forms. */
function keSoalMasukan(d: MasukanSoal): SoalMasukan | { error: string } {
  const jenis = d.jenis ?? "PILIHAN_GANDA"
  const bobot = d.bobot && d.bobot > 0 ? d.bobot : 1
  const pertanyaan = d.pertanyaan.trim()
  if (!pertanyaan) return { error: "Pertanyaan masih kosong." }

  if (jenis === "JAWABAN_SINGKAT" || jenis === "URAIAN") {
    return { pertanyaan, jenis, bobot, opsi: [], kunci: (d.kunciTeks ?? "").trim() }
  }

  const opsi = d.opsi.map((o) => o.trim()).filter(Boolean)
  if (opsi.length < 2) return { error: "Isi minimal 2 opsi." }
  const kembar = opsi
    .map((o, i) => ({ o: o.toLowerCase(), i }))
    .filter((v, i, arr) => arr.findIndex((w) => w.o === v.o) !== i)
    .map((v) => `${"ABCDE"[v.i]} ("${opsi[v.i]}")`)
  if (kembar.length) return { error: `Opsi tidak boleh kembar: ${kembar.join(", ")} sudah ada di opsi sebelumnya.` }
  const idx = "ABCDE".indexOf((d.hurufKunci ?? "").toUpperCase())
  if (idx < 0 || idx >= opsi.length) return { error: "Pilih kunci jawaban yang sesuai dengan opsi." }
  return { pertanyaan, jenis, bobot, opsi, kunci: "ABCDE"[idx] }
}

type Baca = { ok: true; buffer: Buffer } | { ok: false; error: string }

async function bacaFile(formData: FormData): Promise<Baca> {
  const file = formData.get("file")
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Pilih file .docx dulu." }
  if (!/\.docx$/i.test(file.name)) return { ok: false, error: "Format harus .docx (Word 2007+). Simpan ulang dari Word bila masih .doc." }
  if (file.size > 5 * 1024 * 1024) return { ok: false, error: "Ukuran file maksimal 5 MB." }
  return { ok: true, buffer: Buffer.from(await file.arrayBuffer()) }
}

/** Parse saja, tanpa mengubah apa pun (dari file Word). */
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

/** Parse saja, tanpa mengubah apa pun (dari teks yang ditempel). */
export async function pratinjauSoalTeks(teks: string): Promise<Pratinjau> {
  const { soal, peringatan } = parseSoalTeks(teks)
  if (soal.length === 0) {
    return { ok: false, message: "Tidak ada soal yang terbaca. Pastikan penomoran seperti \"1. pertanyaan\" dengan opsi a–e." }
  }
  return { ok: true, soal, peringatan }
}

/** Guru pemilik bank lewat cookie; admin lewat sesi. */
async function guruPemilik(bankTeacherId: string | null, bankTeacherIds: string[]): Promise<boolean> {
  const sesi = await auth.api.getSession({ headers: await headers() })
  if (sesi) return true
  const cookie = (await cookies()).get("teacher_id")?.value
  if (!cookie) return false
  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, cookie) })
  return Boolean(guru?.active && (bankTeacherId === guru.id || bankTeacherIds.includes(guru.id)))
}

async function cekAkses(bankId: string): Promise<{ ok: boolean; message: string }> {
  const [bank] = await db
    .select({ teacherId: questionBanks.teacherId, teacherIds: questionBanks.teacherIds })
    .from(questionBanks)
    .where(eq(questionBanks.id, bankId))
    .limit(1)
  if (!bank) return { ok: false, message: "Bank soal tidak ditemukan." }
  if (!(await guruPemilik(bank.teacherId, bank.teacherIds))) {
    return { ok: false, message: "Sesi habis atau bank soal ini bukan milik Anda. Silakan login ulang." }
  }
  return { ok: true, message: "" }
}

async function imporDariSoal(
  bankId: string,
  soal: SoalImpor[],
  peringatan: string[],
): Promise<{ ok: boolean; message: string }> {
  const [bank] = await db.select().from(questionBanks).where(eq(questionBanks.id, bankId)).limit(1)
  if (!bank) return { ok: false, message: "Bank soal tidak ditemukan." }
  if (!bank.formId) return { ok: false, message: "Bank soal belum punya form. Buat form dulu." }

  const lengkap = soal.filter((s) => s.opsi.length >= 2 && s.kunci)
  if (lengkap.length === 0) return { ok: false, message: "Semua soal belum lengkap (butuh opsi a–e dan kunci)." }

  // Buang soal yang isinya sama dengan yang sudah ada di form (cegah dobel).
  const { items: itemsLama } = await ambilForm(bank.formId)
  const sudahAda = new Set(daftarSoalDariItems(itemsLama).map((s) => kunciTeks(s.pertanyaan)))
  const siap = lengkap.filter((s) => !sudahAda.has(kunciTeks(s.pertanyaan)))
  const duplikat = lengkap.length - siap.length
  if (siap.length === 0) {
    return { ok: false, message: `Semua ${lengkap.length} soal sudah ada di form (duplikat). Tidak ada yang ditambahkan.` }
  }

  const items = await tambahSoalKeForm(bank.formId, siap)
  await db.update(questionBanks).set({ formItems: items, updatedAt: new Date() }).where(eq(questionBanks.id, bank.id))

  revalidatePath("/dashboard/bank-soal")
  revalidatePath("/guru/dashboard")
  const dilewati = soal.length - lengkap.length
  return {
    ok: true,
    message: `${siap.length} soal ditambahkan ke form.${dilewati ? ` ${dilewati} soal dilewati karena belum lengkap.` : ""}${duplikat ? ` ${duplikat} soal dilewati karena sudah ada di form.` : ""}${peringatan.length ? ` Catatan: ${peringatan[0]}` : ""}`,
  }
}

/** Tambahkan soal dari file Word ke Google Form bank soal + simpan butirnya ke database. */
export async function imporSoalWord(bankId: string, formData: FormData): Promise<{ ok: boolean; message: string }> {
  const akses = await cekAkses(bankId)
  if (!akses.ok) return akses

  const baca = await bacaFile(formData)
  if (!baca.ok) return { ok: false, message: baca.error }

  try {
    const { soal, peringatan } = await parseSoalDocx(baca.buffer)
    if (soal.length === 0) return { ok: false, message: "Tidak ada soal yang terbaca dari dokumen." }
    return await imporDariSoal(bankId, soal, peringatan)
  } catch (error) {
    console.error("Gagal impor soal Word:", error)
    return { ok: false, message: error instanceof Error ? error.message : "Gagal impor soal." }
  }
}

/** Tambahkan soal dari teks yang ditempel langsung. */
export async function imporSoalTeks(bankId: string, teks: string): Promise<{ ok: boolean; message: string }> {
  const akses = await cekAkses(bankId)
  if (!akses.ok) return akses

  try {
    const { soal, peringatan } = parseSoalTeks(teks)
    if (soal.length === 0) return { ok: false, message: "Tidak ada soal yang terbaca dari teks." }
    return await imporDariSoal(bankId, soal, peringatan)
  } catch (error) {
    console.error("Gagal impor soal teks:", error)
    return { ok: false, message: error instanceof Error ? error.message : "Gagal impor soal." }
  }
}

/** Rapikan teks mentah: coba AI (Gemini) dulu, jatuh ke perapian aturan bila gagal. */
export async function rapikanSoalTeks(
  teks: string,
): Promise<{ ok: true; teks: string; cara: "ai" | "aturan"; catatan?: string } | { ok: false; message: string }> {
  const mentah = (teks ?? "").trim()
  if (mentah.length < 10) return { ok: false, message: "Teks soal masih kosong." }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { ok: true, teks: rapikanSoal(mentah), cara: "aturan", catatan: "Kunci AI belum diset — dirapikan dengan aturan otomatis." }
  }

  try {
    const rapi = await rapikanSoalAI(mentah, apiKey)
    return { ok: true, teks: rapi, cara: "ai" }
  } catch (err) {
    const pesan = err instanceof Error ? err.message : "AI gagal."
    console.error("[rapikanSoalTeks]", pesan)
    return { ok: true, teks: rapikanSoal(mentah), cara: "aturan", catatan: `AI gagal (${pesan.slice(0, 80)}) — dirapikan dengan aturan otomatis.` }
  }
}

/** Daftar soal yang sudah ada di form, untuk ditampilkan di halaman impor. */
export async function daftarSoalForm(
  bankId: string,
): Promise<{ ok: true; soal: SoalRingkas[] } | { ok: false; message: string }> {
  const [bank] = await db.select({ formId: questionBanks.formId }).from(questionBanks).where(eq(questionBanks.id, bankId)).limit(1)
  if (!bank?.formId) return { ok: false, message: "Bank soal belum punya Google Form." }
  try {
    const { items } = await ambilForm(bank.formId)
    return { ok: true, soal: daftarSoalDariItems(items) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Gagal membaca form." }
  }
}

/** Kunci pembanding duplikat: huruf kecil, tanpa tanda baca & spasi berlebih. */
function kunciTeks(teks: string): string {
  return teks.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
}

/** Ubah satu soal yang sudah ada di form. */
export async function ubahSoal(
  bankId: string,
  qid: string,
  data: MasukanSoal,
): Promise<{ ok: boolean; message: string; soal?: SoalRingkas[] }> {
  const akses = await cekAkses(bankId)
  if (!akses.ok) return akses
  const siap = keSoalMasukan(data)
  if ("error" in siap) return { ok: false, message: siap.error }
  const [bank] = await db.select({ formId: questionBanks.formId }).from(questionBanks).where(eq(questionBanks.id, bankId)).limit(1)
  if (!bank?.formId) return { ok: false, message: "Bank soal belum punya Google Form." }
  try {
    const items = await ubahSoalForm(bank.formId, qid, siap)
    await db.update(questionBanks).set({ formItems: items, updatedAt: new Date() }).where(eq(questionBanks.id, bankId))
    revalidatePath("/guru/dashboard")
    return { ok: true, message: "Soal diperbarui.", soal: daftarSoalDariItems(items) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Gagal mengubah soal." }
  }
}

/** Hapus satu soal dari form. */
export async function hapusSoal(
  bankId: string,
  qid: string,
): Promise<{ ok: boolean; message: string; soal?: SoalRingkas[] }> {
  const akses = await cekAkses(bankId)
  if (!akses.ok) return akses
  const [bank] = await db.select({ formId: questionBanks.formId }).from(questionBanks).where(eq(questionBanks.id, bankId)).limit(1)
  if (!bank?.formId) return { ok: false, message: "Bank soal belum punya Google Form." }
  try {
    const items = await hapusSoalForm(bank.formId, qid)
    await db.update(questionBanks).set({ formItems: items, updatedAt: new Date() }).where(eq(questionBanks.id, bankId))
    revalidatePath("/guru/dashboard")
    return { ok: true, message: "Soal dihapus dari form.", soal: daftarSoalDariItems(items) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Gagal menghapus soal." }
  }
}

/** Tambah satu soal manual (diketik langsung di aplikasi). */
export async function tambahSoal(
  bankId: string,
  data: MasukanSoal,
): Promise<{ ok: boolean; message: string; soal?: SoalRingkas[] }> {
  const akses = await cekAkses(bankId)
  if (!akses.ok) return akses
  const siap = keSoalMasukan(data)
  if ("error" in siap) return { ok: false, message: siap.error }
  const [bank] = await db
    .select({ formId: questionBanks.formId })
    .from(questionBanks)
    .where(eq(questionBanks.id, bankId))
    .limit(1)
  if (!bank?.formId) return { ok: false, message: "Bank soal belum punya Google Form." }

  try {
    const items = await tambahSoalKeForm(bank.formId, [{ no: 1, pertanyaan: siap.pertanyaan, opsi: siap.opsi, kunci: siap.kunci, jenis: siap.jenis, bobot: siap.bobot } as SoalImpor])
    await db.update(questionBanks).set({ formItems: items, updatedAt: new Date() }).where(eq(questionBanks.id, bankId))
    revalidatePath("/guru/dashboard")
    return { ok: true, message: "Soal disimpan ke Google Form.", soal: daftarSoalDariItems(items) }
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Gagal menambah soal." }
  }
}
