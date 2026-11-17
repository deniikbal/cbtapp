import { and, eq, inArray } from "drizzle-orm"

import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, reportSettings, subjects, teachers } from "@/lib/db/schema"
import { analisisButir, labelOpsi, type AnalisisButir } from "@/lib/analisis-butir"
import { SCHOOL_NAME } from "@/lib/brand"
import { soalDariItems, type Soal } from "@/lib/google-forms"

export type SiswaBaris = {
  no: number
  nama: string
  kelas: string
  rincian: string
  benar: number
  salah: number
  skor: number
  nilai: number
  ket: "Tuntas" | "Belum Tuntas"
}

export type StatistikRingkas = { jumlah: number; terkecil: number; terbesar: number; rataRata: number; simpanganBaku: number }

export type AnalisisBank = {
  identitas: {
    sekolah: string
    tahunPelajaran: string
    semester: string
    namaTes: string
    mataPelajaran: string
    tanggalTes: string
    kelas: string
    kkm: number
    guru: string
    nipGuru: string
    kepalaSekolah: string
    nipKepalaSekolah: string
    jumlahSoal: number
    jumlahOpsi: number
    jumlahSiswa: number
    kunci: string
    kode: string
    judul: string
    tingkat: string
    jumlahJadwal: number
  }
  ketuntasan: { tuntas: number; belum: number; persenTuntas: number; persenBelum: number }
  statistik: { skor: StatistikRingkas; nilai: StatistikRingkas }
  siswa: SiswaBaris[]
  ringkasan: { respons: number; butirDinilai: number; rataKesukaran: number; rataDayaBeda: number }
  butir: AnalisisButir[]
}

export type AnalisisBankResult = { ok: true; data: AnalisisBank } | { ok: false; message: string }

function statistik(angka: number[]): StatistikRingkas {
  if (!angka.length) return { jumlah: 0, terkecil: 0, terbesar: 0, rataRata: 0, simpanganBaku: 0 }
  const rata = angka.reduce((a, b) => a + b, 0) / angka.length
  return {
    jumlah: Math.round(angka.reduce((a, b) => a + b, 0) * 100) / 100,
    terkecil: Math.min(...angka),
    terbesar: Math.max(...angka),
    rataRata: Math.round(rata * 1000) / 1000,
    simpanganBaku: Math.round(Math.sqrt(angka.reduce((s, n) => s + (n - rata) ** 2, 0) / angka.length) * 1000) / 1000,
  }
}

// Huruf jawaban siswa untuk satu butir; butir teks ditampilkan apa adanya.
function rincianJawaban(soal: Soal, nilai: string[]) {
  if (!nilai.length) return "-"
  const jawaban = nilai[0]
  if (!soal.opsi.length) return jawaban.slice(0, 1).toUpperCase()
  const indeks = soal.opsi.findIndex((o) => o.toLowerCase() === jawaban)
  return indeks >= 0 ? labelOpsi(indeks) : jawaban.slice(0, 1).toUpperCase()
}

// Dipakai dialog analisis (admin & guru) dan unduhan PDF, supaya angkanya selalu sama.
export async function ambilAnalisisButir(
  bankId: string,
  opsi: { teacherId?: string } = {},
): Promise<AnalisisBankResult> {
  if (!bankId) return { ok: false, message: "Bank soal tidak valid." }

  const filter = opsi.teacherId
    ? and(eq(questionBanks.id, bankId), eq(questionBanks.teacherId, opsi.teacherId))
    : eq(questionBanks.id, bankId)

  const bank = await db
    .select({
      id: questionBanks.id,
      code: questionBanks.code,
      title: questionBanks.title,
      grade: questionBanks.grade,
      teacherName: questionBanks.teacherName,
      teacherId: questionBanks.teacherId,
      formItems: questionBanks.formItems,
      subjectName: subjects.name,
    })
    .from(questionBanks)
    .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(filter)
    .limit(1)
  if (!bank[0]) return { ok: false, message: "Bank soal tidak ditemukan." }

  const jadwal = await db
    .select({ id: examSchedules.id, kelas: classrooms.name, tanggal: examSchedules.examDate })
    .from(examSchedules)
    .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
    .where(eq(examSchedules.questionBankId, bankId))
  if (!jadwal.length) return { ok: false, message: "Bank soal ini belum punya jadwal." }

  const baris = await db
    .select({
      scheduleId: examResults.scheduleId,
      nama: examResults.nama,
      answers: examResults.answers,
      correct: examResults.correct,
      wrong: examResults.wrong,
      score: examResults.score,
    })
    .from(examResults)
    .where(inArray(examResults.scheduleId, jadwal.map((j) => j.id)))
  if (!baris.length) return { ok: false, message: "Belum ada respons untuk bank soal ini. Sync dulu di menu Hasil Ujian." }

  const soal = soalDariItems((bank[0].formItems as unknown[] | null) ?? [])
  const butir = analisisButir(
    soal,
    baris.map((b) => ({ answers: b.answers as never, skorTotal: b.correct })),
  )
  if (!butir.length) return { ok: false, message: "Form belum punya kunci jawaban. Aktifkan mode kuis lalu sync ulang." }

  const dinilai = soal.filter((s) => s.kunci.length > 0)
  const kelasPerJadwal = new Map(jadwal.map((j) => [j.id, j.kelas]))
  const teacherId = opsi.teacherId ?? bank[0].teacherId
  const laporan = await ambilIdentitasLaporan(teacherId)
  const guru = await ambilGuru(teacherId)
  const kkm = laporan.kkm

  const siswa: SiswaBaris[] = [...baris]
    .sort((a, b) => a.nama.localeCompare(b.nama))
    .map((b, i) => {
      const answers = b.answers as Record<string, { textAnswers?: { answers?: { value?: string }[] } }> | null
      const nilai = Number(b.score)
      return {
        no: i + 1,
        nama: b.nama || "-",
        kelas: kelasPerJadwal.get(b.scheduleId) ?? "-",
        rincian: dinilai
          .map((s) =>
            rincianJawaban(
              s,
              (answers?.[s.qid]?.textAnswers?.answers ?? [])
                .map((a) => (a.value ?? "").trim().toLowerCase())
                .filter(Boolean),
            ),
          )
          .join(""),
        benar: b.correct,
        salah: b.wrong,
        skor: b.correct,
        nilai,
        ket: nilai >= kkm ? "Tuntas" : "Belum Tuntas",
      }
    })

  const tuntas = siswa.filter((s) => s.ket === "Tuntas").length
  const rata = (angka: number[]) => (angka.length ? angka.reduce((a, b) => a + b, 0) / angka.length : 0)
  const tanggal = jadwal.map((j) => j.tanggal).filter(Boolean).sort().at(-1) ?? ""

  return {
    ok: true,
    data: {
      identitas: {
        sekolah: SCHOOL_NAME,
        tahunPelajaran: laporan.tahunPelajaran,
        semester: laporan.semester,
        namaTes: laporan.namaTes,
        mataPelajaran: bank[0].subjectName ?? "-",
        tanggalTes: tanggal,
        kelas: [...new Set([...kelasPerJadwal.values()])].join(", "),
        kkm,
        guru: guru?.nama ?? bank[0].teacherName ?? "-",
        nipGuru: guru?.nip ?? "",
        kepalaSekolah: laporan.kepalaSekolah,
        nipKepalaSekolah: laporan.nipKepalaSekolah,
        jumlahSoal: dinilai.length,
        jumlahOpsi: Math.max(0, ...dinilai.map((s) => s.opsi.length)),
        jumlahSiswa: siswa.length,
        kunci: dinilai
          .map((s) => {
            const indeks = s.opsi.findIndex((o) => s.kunci.includes(o.toLowerCase()))
            return indeks >= 0 ? labelOpsi(indeks) : "?"
          })
          .join(""),
        kode: bank[0].code,
        judul: bank[0].title,
        tingkat: bank[0].grade,
        jumlahJadwal: jadwal.length,
      },
      ketuntasan: {
        tuntas,
        belum: siswa.length - tuntas,
        persenTuntas: siswa.length ? Math.round((tuntas / siswa.length) * 1000) / 10 : 0,
        persenBelum: siswa.length ? Math.round(((siswa.length - tuntas) / siswa.length) * 1000) / 10 : 0,
      },
      statistik: {
        skor: statistik(siswa.map((s) => s.skor)),
        nilai: statistik(siswa.map((s) => s.nilai)),
      },
      siswa,
      ringkasan: {
        respons: baris.length,
        butirDinilai: butir.length,
        rataKesukaran: Math.round(rata(butir.map((b) => b.kesukaran)) * 10000) / 10000,
        rataDayaBeda: Math.round(rata(butir.map((b) => b.dayaBeda)) * 10000) / 10000,
      },
      butir,
    },
  }
}

async function ambilIdentitasLaporan(teacherId: string | null) {
  if (!teacherId) {
    return { tahunPelajaran: "", semester: "", namaTes: "", kkm: 75, kepalaSekolah: "", nipKepalaSekolah: "" }
  }
  const baris = await db
    .select()
    .from(reportSettings)
    .where(eq(reportSettings.teacherId, teacherId))
    .limit(1)
  return {
    tahunPelajaran: baris[0]?.tahunPelajaran ?? "",
    semester: baris[0]?.semester ?? "",
    namaTes: baris[0]?.namaTes ?? "",
    kkm: baris[0]?.kkm ?? 75,
    kepalaSekolah: baris[0]?.kepalaSekolah ?? "",
    nipKepalaSekolah: baris[0]?.nipKepalaSekolah ?? "",
  }
}

async function ambilGuru(teacherId: string | null) {
  if (!teacherId) return null
  const guru = await db
    .select({ nama: teachers.name, nip: teachers.nip })
    .from(teachers)
    .where(eq(teachers.id, teacherId))
    .limit(1)
  return guru[0] ?? null
}
