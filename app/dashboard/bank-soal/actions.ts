"use server"

import { randomUUID } from "node:crypto"

import { eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { getDatabaseErrorMessage } from "@/lib/db-error"
import { getExamBrowserSettings } from "@/lib/exam-browser"
import { daftarEmailEditor, setFormAnyoneEditor, shareFormEditor } from "@/lib/google-forms"
import { classrooms, examSchedules, questionBanks, subjects, teachers } from "@/lib/db/schema"
import { buatFormKosong, formIdDari } from "@/lib/google-forms"

// Form ID wajib untuk sync hasil; boleh kosong saat bank dibuat, diisi belakangan.
// formIdDari melempar error untuk input salah, jadi ditangkap dan diteruskan sebagai pesan.
function bacaFormId(formData: FormData): { formId: string; error: string | null } {
  const mentah = String(formData.get("formId") ?? "").trim()
  if (!mentah) return { formId: "", error: null }

  try {
    return { formId: formIdDari(mentah), error: null }
  } catch (error) {
    return { formId: "", error: error instanceof Error ? error.message : "Form ID tidak valid." }
  }
}

// Link yang disimpan/bagikan ke siswa = /viewform. Link /edit dari guru
// otomatis diubah supaya satu kolom tidak bercampur dua jenis link.
function keLinkSiswa(url: string) {
  // Jangan sentuh link publik /d/e/<token>/viewform (format responderUri).
  const id = url.match(/\/forms\/d\/([A-Za-z0-9_-]{20,})\/(?:edit|viewform)/)?.[1]
  return id ? `https://docs.google.com/forms/d/${id}/viewform` : url
}

// Kembalikan URL valid, atau null kalau tidak bisa dipakai. Tidak melempar error
// supaya pesan bisa sampai ke pengguna (throw di server action jadi digest generik).
function normalizeUrl(url: string) {
  const mentah = url.trim()
  if (!mentah) return null

  const kandidat = /^https?:\/\//i.test(mentah) ? mentah : `https://${mentah}`

  try {
    const parsed = new URL(kandidat)
    if (!parsed.hostname.includes(".")) return null
    return parsed.toString()
  } catch {
    return null
  }
}

async function generateQuestionBankIdentity(subjectId: string, grade: string) {
  const subject = await db
    .select({ name: subjects.name, code: subjects.code })
    .from(subjects)
    .where(eq(subjects.id, subjectId))
    .limit(1)

  if (!subject[0]) return null

  return {
    code: `${subject[0].code.toUpperCase()}-${grade}`,
    title: `Assesmen ${subject[0].name} Kelas ${grade}`,
  }
}

async function bacaGuru(formData: FormData) {
  const teacherId = String(formData.get("teacherId") ?? "").trim()
  if (!teacherId) return null

  const [teacher] = await db
    .select({ id: teachers.id, name: teachers.name })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)

  return teacher ?? null
}

export async function createQuestionBank(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const teacher = await bacaGuru(formData)
  const teacherName = teacher?.name ?? ""
  const grade = String(formData.get("grade") ?? "").trim().toUpperCase()
  const urlMentah = normalizeUrl(String(formData.get("googleFormUrl") ?? ""))
  const googleFormUrl = urlMentah ? keLinkSiswa(urlMentah) : null
  const { formId, error: formIdError } = bacaFormId(formData)
  const active = String(formData.get("active") ?? "true") === "true"

  if (!subjectId) return { ok: false, message: "Mapel wajib dipilih." }
  if (!teacher) return { ok: false, message: "Guru pembuat wajib dipilih dari daftar guru." }
  if (!grade) return { ok: false, message: "Kelas wajib dipilih." }
  // Link boleh kosong: form bisa dibuat belakangan lewat tombol "Buat form kosong".
  if (String(formData.get("googleFormUrl") ?? "").trim() && !googleFormUrl) {
    return { ok: false, message: "Link Google Form tidak valid. Contoh: https://forms.gle/xxxx" }
  }
  if (formIdError) return { ok: false, message: `${formIdError}. Kosongkan kolom Form ID bila belum ada.` }

  try {
    const generated = await generateQuestionBankIdentity(subjectId, grade)
    if (!generated) return { ok: false, message: "Mapel tidak ditemukan." }

    await db.insert(questionBanks).values({
      id: randomUUID(),
      code: generated.code,
      title: generated.title,
      teacherName,
      teacherId: teacher.id,
      grade,
      subjectId,
      googleFormUrl: googleFormUrl ?? "",
      formId,
      active,
    })
  } catch (error) {
    return { ok: false, message: getDatabaseErrorMessage(error, "Gagal menyimpan bank soal.") }
  }

  revalidatePath("/dashboard/bank-soal")
  return { ok: true, message: "Bank soal berhasil ditambahkan." }
}

export async function updateQuestionBank(formData: FormData): Promise<{ ok: boolean; message: string }> {
  const id = String(formData.get("id") ?? "").trim()
  const subjectId = String(formData.get("subjectId") ?? "").trim()
  const teacher = await bacaGuru(formData)
  const teacherName = teacher?.name ?? ""
  const grade = String(formData.get("grade") ?? "").trim().toUpperCase()
  const urlMentah = normalizeUrl(String(formData.get("googleFormUrl") ?? ""))
  const googleFormUrl = urlMentah ? keLinkSiswa(urlMentah) : null
  const { formId, error: formIdError } = bacaFormId(formData)
  const active = String(formData.get("active") ?? "true") === "true"

  if (!id) return { ok: false, message: "Data bank soal tidak dikenali." }
  if (!subjectId) return { ok: false, message: "Mapel wajib dipilih." }
  if (!teacher) return { ok: false, message: "Guru pembuat wajib dipilih dari daftar guru." }
  if (!grade) return { ok: false, message: "Kelas wajib dipilih." }
  if (String(formData.get("googleFormUrl") ?? "").trim() && !googleFormUrl) {
    return { ok: false, message: "Link Google Form tidak valid. Contoh: https://forms.gle/xxxx" }
  }
  if (formIdError) return { ok: false, message: `${formIdError}. Kosongkan kolom Form ID bila belum ada.` }

  try {
    await db
      .update(questionBanks)
      .set({ subjectId, teacherName, teacherId: teacher.id, grade, googleFormUrl: googleFormUrl ?? "", formId, active, updatedAt: new Date() })
      .where(eq(questionBanks.id, id))
  } catch (error) {
    return { ok: false, message: getDatabaseErrorMessage(error, "Gagal mengubah bank soal.") }
  }

  revalidatePath("/dashboard/bank-soal")
  return { ok: true, message: "Bank soal berhasil diperbarui." }
}

export type BuatFormResult =
  | { ok: true; message: string; formId: string; editUrl: string; shareUrl: string }
  | { ok: false; message: string }

// Bikin form kosong (judul saja) di akun Google pemilik token, lalu simpan
// formId + link edit ke bank soal. Soal tetap diisi guru di Google Forms.
export async function buatFormDariBank(bankId: string): Promise<BuatFormResult> {
  const id = (bankId ?? "").trim()
  if (!id) return { ok: false, message: "Data bank soal tidak dikenali." }

  try {
    const [bank] = await db
      .select({ code: questionBanks.code, title: questionBanks.title, grade: questionBanks.grade, formId: questionBanks.formId })
      .from(questionBanks)
      .where(eq(questionBanks.id, id))
      .limit(1)

    if (!bank) return { ok: false, message: "Bank soal tidak ditemukan." }
    if (bank.formId) {
      return { ok: false, message: "Bank soal ini sudah punya Form ID. Kosongkan dulu kolom Form ID kalau mau membuat form baru." }
    }

    const kelasAngkatan = (
      await db.select({ name: classrooms.name }).from(classrooms).where(eq(classrooms.grade, bank.grade))
    )
      .map((k) => k.name)
      .sort((a, b) => a.localeCompare(b, "id", { numeric: true }))

    const { formId, editUrl, responderUri } = await buatFormKosong(`${bank.code} | ${bank.title}`, {
      kelas: kelasAngkatan,
    })
    const shareUrl = responderUri || `https://docs.google.com/forms/d/${formId}/viewform`

    await db
      .update(questionBanks)
      .set({ formId, googleFormUrl: shareUrl, updatedAt: new Date() })
      .where(eq(questionBanks.id, id))

    // Bagikan akses edit ke email tambahan (pengaturan), supaya bukan hanya pemilik token yang bisa edit.
    let catatanEditor = ""
    try {
      const settings = await getExamBrowserSettings()
      if (settings.formPublicEdit) {
        catatanEditor = (await setFormAnyoneEditor(formId))
          ? " Form bisa diedit siapa saja yang punya link edit."
          : " Gagal mengaktifkan edit-via-link pada form."
      }
      const editors = daftarEmailEditor(settings.formEditorEmails)
      if (editors.length > 0) {
        const hasil = await shareFormEditor(formId, editors)
        if (hasil.ok.length > 0) catatanEditor = ` Akses edit diberikan ke: ${hasil.ok.join(", ")}.`
        if (hasil.gagal.length > 0) catatanEditor += ` Gagal dibagikan ke: ${hasil.gagal.join(", ")}.`
      }
    } catch {
      // pemberian akses gagal tidak membuat pembuatan form gagal
    }

    revalidatePath("/dashboard/bank-soal")
    return { ok: true, message: `Form kosong dibuat. Link siswa tersimpan; isi soal lewat tombol edit form.${catatanEditor}`, formId, editUrl, shareUrl }
  } catch (error) {
    return { ok: false, message: error instanceof Error ? error.message : "Gagal membuat form di Google." }
  }
}

export async function deleteQuestionBanks(ids: string[]): Promise<{ ok: boolean; message: string }> {
  const validIds = ids.map((id) => id.trim()).filter(Boolean)
  if (validIds.length === 0) return { ok: false, message: "Pilih minimal satu bank soal." }

  try {
    const used = await db
      .select({ id: examSchedules.questionBankId })
      .from(examSchedules)
      .where(inArray(examSchedules.questionBankId, validIds))
    const dipakai = new Set(used.map((row) => row.id))
    const boleh = validIds.filter((id) => !dipakai.has(id))

    if (boleh.length === 0) {
      return { ok: false, message: "Semua bank soal terpilih masih dipakai jadwal. Hapus jadwalnya terlebih dahulu, atau nonaktifkan bank soal." }
    }

    await db.delete(questionBanks).where(inArray(questionBanks.id, boleh))
    revalidatePath("/dashboard/bank-soal")
    const dilewati = validIds.length - boleh.length
    return {
      ok: true,
      message: dilewati > 0
        ? `${boleh.length} bank soal dihapus, ${dilewati} dilewati karena masih dipakai jadwal.`
        : `${boleh.length} bank soal dihapus.`,
    }
  } catch (error) {
    console.error("Gagal menghapus bank soal:", error)
    return { ok: false, message: getDatabaseErrorMessage(error) }
  }
}

export async function deleteQuestionBank(id: string): Promise<{ ok: boolean; message: string }> {
  if (!id) return { ok: false, message: "ID bank soal tidak valid." }

  const usedSchedules = await db
    .select({ id: examSchedules.id })
    .from(examSchedules)
    .where(eq(examSchedules.questionBankId, id))
    .limit(1)

  if (usedSchedules.length > 0) {
    // pesan dikembalikan, bukan di-throw: throw di server action diubah Next jadi pesan generik ber-digest di production
    return { ok: false, message: "Bank soal tidak bisa dihapus karena sudah dipakai pada jadwal. Hapus jadwal terkait terlebih dahulu, atau nonaktifkan bank soal." }
  }

  await db.delete(questionBanks).where(eq(questionBanks.id, id))
  revalidatePath("/dashboard/bank-soal")
  return { ok: true, message: "Bank soal berhasil dihapus." }
}
