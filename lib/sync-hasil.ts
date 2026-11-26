import { randomUUID } from "node:crypto"

import { and, eq, inArray } from "drizzle-orm"
import { revalidatePath } from "next/cache"

import { db } from "@/lib/db"
import { examResults, examSchedules, questionBanks, students } from "@/lib/db/schema"
import { ambilForm, ambilRespons, cariNama, cariNis, hitungNilai, normNis, soalDariItems } from "@/lib/google-forms"

export type HasilSyncInfo = {
  respons: number
  cocok: number
  viaNama: number
  tidakCocok: number
  /** Respons yang sudah dihubungkan manual dan sengaja tidak disentuh sync. */
  dilindungi: number
  dobel: number
  totalSoal: number
}
export type HasilSyncResult = { ok: true; info: HasilSyncInfo } | { ok: false; message: string }

function normNama(nama: string) {
  return nama.toUpperCase().replace(/\s+/g, " ").trim()
}

// Inti sync: dipakai server action (klik manual) dan /api/sync-otomatis (cron).
export async function jalankanSync(scheduleId: string): Promise<HasilSyncResult> {
  const jadwal = await db
    .select({ classroomId: examSchedules.classroomId, bankId: questionBanks.id, formId: questionBanks.formId, title: questionBanks.title })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .where(eq(examSchedules.id, scheduleId))
    .limit(1)

  if (!jadwal[0]) return { ok: false, message: "Jadwal tidak ditemukan." }
  if (!jadwal[0].formId) return { ok: false, message: "Bank soal ini belum punya Form ID. Isi dulu di menu Bank Soal (link /edit)." }

  const form = await ambilForm(jadwal[0].formId)
  const soal = soalDariItems(form.items)
  if (!soal.length) return { ok: false, message: "Form tidak punya butir soal yang bisa dibaca." }

  await db
    .update(questionBanks)
    .set({ formItems: form.items, syncedAt: new Date(), updatedAt: new Date(), ...(form.published === null ? {} : { published: form.published }) })
    .where(eq(questionBanks.id, jadwal[0].bankId))

  const respons = await ambilRespons(jadwal[0].formId)

  // Satu form dipakai semua kelas yang dijadwalkan untuk bank ini: peserta dicocokkan
  // lintas kelas, lalu hasilnya ditempel ke jadwal kelas siswa masing-masing.
  const jadwalBank = await db
    .select({ id: examSchedules.id, classroomId: examSchedules.classroomId, session: examSchedules.session })
    .from(examSchedules)
    .where(eq(examSchedules.questionBankId, jadwal[0].bankId))
  // Satu kelas bisa punya dua jadwal (sesi 1 & 2): kunci wajib memuat sesi, kalau tidak
  // hasil semua siswa kelas itu menumpuk di jadwal sesi terakhir.
  const jadwalPerKelas = new Map(jadwalBank.map((j) => [`${j.classroomId}|${j.session ?? 1}`, j.id]))
  const jadwalKelasSaja = new Map<string, string>()
  for (const j of jadwalBank) if (!jadwalKelasSaja.has(j.classroomId)) jadwalKelasSaja.set(j.classroomId, j.id)

  const peserta = await db
    .select({ id: students.id, nis: students.nis, name: students.name, classroomId: students.classroomId, session: students.session })
    .from(students)
    .where(inArray(students.classroomId, jadwalBank.map((j) => j.classroomId)))
  const peta = new Map(peserta.map((s) => [normNis(s.nis), s]))

  // Cadangan pencocokan via nama: respons yang NIS-nya salah ketik dicocokkan lewat
  // NAMA (butir identitas form) — hanya diterima kalau nama unik di semua kelas
  // yang dijadwalkan untuk bank ini; kalau ambigu, dibiarkan "belum terhubung".
  const petaNama = new Map<string, typeof peserta>()
  for (const s of peserta) {
    const kunci = normNama(s.name)
    const list = petaNama.get(kunci) ?? []
    list.push(s)
    petaNama.set(kunci, list)
  }

  // Respons yang sudah dihubungkan manual jangan ditimpa sync berikutnya: NIS/nama
  // yang diketik siswa tetap tidak cocok, jadi tanpa perlindungan ini sambungannya
  // hilang lagi tiap sync (cron ±5 menit) dan barisnya muncul kembali.
  const responseIds = respons.map((r) => r.responseId).filter(Boolean)
  const terjagaBaris = responseIds.length
    ? await db
        .select({ responseId: examResults.responseId, studentId: examResults.studentId, submittedAt: examResults.submittedAt })
        .from(examResults)
        .where(and(inArray(examResults.responseId, responseIds), eq(examResults.matchVia, "manual")))
    : []
  const terjaga = new Set(terjagaBaris.map((row) => row.responseId))
  const waktuTerjaga = new Map(terjagaBaris.map((row) => [row.responseId, row.submittedAt?.getTime() ?? 0]))
  const siswaTerjaga = new Map(terjagaBaris.map((row) => [row.responseId, row.studentId]))

  let cocok = 0
  let viaNama = 0
  let tidakCocok = 0
  let dilindungi = 0
  let dobel = 0

  // Satu siswa hanya boleh punya satu hasil per bank soal. Google Form menerima
  // kiriman tanpa batas, jadi kiriman pertama yang dipakai dan sisanya dibuang.
  const petaById = new Map(peserta.map((s) => [s.id, s]))
  const dinilai = respons
    .map((r) => {
      // Baris yang dihubungkan manual ikut dihitung supaya kiriman berikutnya dari
      // siswa yang sama tetap dianggap dobel, walau NIS yang dia ketik tidak cocok.
      if (terjaga.has(r.responseId)) {
        const siswa = petaById.get(siswaTerjaga.get(r.responseId) ?? "") ?? null
        return { r, nisKetik: "", namaKetik: "", siswa, matchVia: "manual", waktu: waktuTerjaga.get(r.responseId) ?? 0 }
      }
      const nisKetik = cariNis(soal, r)
      const namaKetik = cariNama(soal, r)
      let siswa = peta.get(normNis(nisKetik)) ?? null
      let matchVia = siswa ? "nis" : "belum"
      if (!siswa && namaKetik) {
        const kandidat = petaNama.get(normNama(namaKetik)) ?? []
        if (kandidat.length === 1) {
          siswa = kandidat[0]
          matchVia = "nama"
        }
      }
      const waktu = r.createTime ? new Date(r.createTime).getTime() : 0
      return { r, nisKetik, namaKetik, siswa, matchVia, waktu }
    })
    .sort((a, b) => a.waktu - b.waktu)

  const sudahDipakai = new Set<string>()
  const dipakai = dinilai.filter((baris) => {
    if (!baris.siswa) return true
    if (sudahDipakai.has(baris.siswa.id)) {
      dobel++
      return false
    }
    sudahDipakai.add(baris.siswa.id)
    return true
  })

  for (const { r, nisKetik, namaKetik, siswa, matchVia } of dipakai) {
    if (terjaga.has(r.responseId)) {
      dilindungi++
      continue
    }
    if (!siswa) tidakCocok++
    else if (matchVia === "nama") viaNama++
    else cocok++

    const n = hitungNilai(soal, r)
    const nilai = {
      scheduleId: siswa
        ? (jadwalPerKelas.get(`${siswa.classroomId}|${siswa.session ?? 1}`) ?? jadwalKelasSaja.get(siswa.classroomId) ?? scheduleId)
        : scheduleId,
      studentId: siswa?.id ?? null,
      nis: siswa ? siswa.nis : nisKetik,
      nama: siswa ? siswa.name : namaKetik,
      respondentEmail: r.respondentEmail ?? "",
      startedAt: r.createTime ? new Date(r.createTime) : null,
      submittedAt: r.lastSubmittedTime ? new Date(r.lastSubmittedTime) : null,
      answers: r.answers as Record<string, unknown>,
      total: n.total,
      correct: n.benar,
      wrong: n.salah,
      score: String(n.skor),
      matchVia,
      syncedAt: new Date(),
    }

    // Respons yang belum terhubung TETAP disimpan (studentId null) supaya bisa
    // diselamatkan lewat halaman "Respons tidak terhubung" — tidak dibuang.
    await db
      .insert(examResults)
      .values({ id: randomUUID(), responseId: r.responseId, ...nilai })
      .onConflictDoUpdate({ target: examResults.responseId, set: nilai })
  }

  // Baris lama milik kiriman yang dibuang ikut dibersihkan agar laporan tidak dobel.
  const dibuang = dinilai.filter((baris) => !dipakai.includes(baris)).map((baris) => baris.r.responseId)
  if (dibuang.length) {
    await db.delete(examResults).where(inArray(examResults.responseId, dibuang))
  }

  revalidatePath("/dashboard/hasil")
  return {
    ok: true,
    info: { respons: respons.length, cocok, viaNama, tidakCocok, dilindungi, dobel, totalSoal: soal.filter((s) => s.kunci.length > 0).length },
  }
}
