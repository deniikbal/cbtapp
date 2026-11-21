import { cookies, headers } from "next/headers"
import type { NextRequest } from "next/server"
import PDFDocument from "pdfkit"

import { auth } from "@/lib/auth"
import { bolehUnduhPdf } from "@/lib/akses-pdf"
import { ambilAnalisisButir } from "@/lib/analisis-data"
import type { AnalisisButir } from "@/lib/analisis-butir"
import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MARGIN = 32
const LEBAR = 595.28 - MARGIN * 2
const TINGGI = 841.89
const BAWAH = TINGGI - MARGIN - 22
const TINGGI_BARIS = 12.5

type Kolom = { lebar?: number; judul: string; rata?: "left" | "center" | "right" }

const angka = (n: number, desimal = 3) => (Number.isInteger(n) ? String(n) : n.toFixed(desimal))
const isi = (teks: string) => (teks && teks.trim() ? teks : "-")

// Kolom terakhir menyerap sisa lebar supaya tabel selalu pas tanpa hitung manual.
function rapikan(kolom: Kolom[]) {
  const terpakai = kolom.reduce((s, k) => s + (k.lebar ?? 0), 0)
  const sisa = kolom.filter((k) => !k.lebar).length
  const lebarSisa = sisa ? Math.max(30, (LEBAR - terpakai) / sisa) : 0
  return kolom.map((k) => ({ ...k, lebar: k.lebar ?? lebarSisa, rata: k.rata ?? ("center" as const) }))
}

// pdfkit tidak punya tabel: baris digambar sendiri + pindah halaman sendiri.
function gambarTabel(doc: PDFKit.PDFDocument, kolomAwal: Kolom[], baris: string[][]) {
  const kolom = rapikan(kolomAwal)
  let y = doc.y
  const gambarHeader = () => {
    doc.rect(MARGIN, y, LEBAR, TINGGI_BARIS).fill("#e5e7eb")
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(6.5)
    let x = MARGIN
    for (const k of kolom) {
      doc.text(k.judul, x + 1, y + 3.2, { width: (k.lebar as number) - 2, align: k.rata, lineBreak: false })
      x += k.lebar as number
    }
    y += TINGGI_BARIS
    doc.fillColor("#000000").font("Helvetica").fontSize(6.5)
  }

  gambarHeader()
  for (const [i, barisIsi] of baris.entries()) {
    if (y + TINGGI_BARIS > BAWAH) {
      doc.addPage()
      y = MARGIN
      gambarHeader()
    }
    if (i % 2 === 1) doc.rect(MARGIN, y, LEBAR, TINGGI_BARIS).fill("#f3f4f6").fillColor("#000000")
    let x = MARGIN
    for (const [j, k] of kolom.entries()) {
      doc.text(barisIsi[j] ?? "", x + 1, y + 3.2, {
        width: (k.lebar as number) - 2,
        align: k.rata,
        lineBreak: false,
        ellipsis: true,
      })
      x += k.lebar as number
    }
    y += TINGGI_BARIS
  }
  doc.y = y + 8
}

function judulBagian(doc: PDFKit.PDFDocument, teks: string) {
  if (doc.y + 32 > BAWAH) doc.addPage()
  doc.moveDown(0.35)
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827").text(teks, MARGIN, doc.y, { width: LEBAR })
  doc.moveDown(0.15)
  doc.font("Helvetica").fontSize(7)
}

// Distribusi jawaban per soal sebagai kartu batang horizontal (gaya kuis).
function gambarDistribusi(doc: PDFKit.PDFDocument, butir: AnalisisButir[]) {
  judulBagian(doc, "DISTRIBUSI JAWABAN SISWA PER SOAL")
  doc.font("Helvetica-Oblique").fontSize(5.8).fillColor("#6b7280")
    .text("Batang hijau = kunci jawaban.", MARGIN, doc.y, { width: LEBAR })
  doc.fillColor("#000000").moveDown(0.2)

  const PAD = 8
  const HEADER = 18
  const BARIS = 13
  const BAR_TINGGI = 7
  const labelW = 16
  const kananW = 86
  const barX = MARGIN + PAD + labelW
  const barW = LEBAR - PAD * 2 - labelW - kananW

  butir.forEach((b, i) => {
    const opsi = b.opsiDetail.length
      ? b.opsiDetail
      : b.sebaran.map((s) => ({ label: s.jawaban, jumlah: s.jumlah, proporsi: s.persen / 100, kunci: s.kunci }))
    const footer = (b.kosong ? 1 : 0) + (b.catatan ? 1 : 0)
    const tinggi = PAD + HEADER + opsi.length * BARIS + footer * 10 + PAD
    if (doc.y + tinggi > BAWAH) doc.addPage()
    const y0 = doc.y

    doc.roundedRect(MARGIN, y0, LEBAR, tinggi, 5).lineWidth(0.7).stroke("#e5e7eb")

    doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827")
      .text(`Soal ${i + 1}`, MARGIN + PAD, y0 + PAD, { width: LEBAR - PAD * 2, lineBreak: false })
    const kunciLabel = b.opsiDetail.find((o) => o.kunci)?.label ?? "?"
    const pillW = 52
    const pillX = MARGIN + LEBAR - PAD - pillW
    doc.roundedRect(pillX, y0 + PAD - 2, pillW, 12, 6).fill("#16a34a")
    doc.font("Helvetica-Bold").fontSize(6.5).fillColor("#ffffff")
      .text(`Kunci: ${kunciLabel}`, pillX, y0 + PAD + 1, { width: pillW, align: "center", lineBreak: false })

    let y = y0 + PAD + HEADER
    for (const o of opsi) {
      const persen = (o.proporsi * 100).toFixed(1)
      doc.font("Helvetica-Bold").fontSize(7).fillColor(o.kunci ? "#16a34a" : "#374151")
        .text(o.label, MARGIN + PAD, y, { width: labelW, lineBreak: false })
      doc.roundedRect(barX, y + 1, barW, BAR_TINGGI, 3).fill("#e5e7eb")
      const w = Math.max(0, Math.min(1, o.proporsi)) * barW
      if (w > 0.5) doc.roundedRect(barX, y + 1, w, BAR_TINGGI, 3).fill(o.kunci ? "#16a34a" : "#9ca3af")
      doc.font("Helvetica").fontSize(6.5).fillColor("#374151")
        .text(`${persen}% (${o.jumlah}/${b.dikerjakan})`, MARGIN + LEBAR - PAD - kananW, y, { width: kananW, align: "right", lineBreak: false })
      y += BARIS
    }
    if (b.kosong) {
      doc.font("Helvetica").fontSize(5.8).fillColor("#6b7280")
        .text(`Kosong: ${b.kosong}`, MARGIN + PAD, y, { width: LEBAR - PAD * 2, lineBreak: false })
      y += 10
    }
    if (b.catatan) {
      doc.font("Helvetica-Oblique").fontSize(5.8).fillColor("#6b7280")
        .text(b.catatan, MARGIN + PAD, y, { width: LEBAR - PAD * 2, lineBreak: false, ellipsis: true })
      y += 10
    }
    doc.fillColor("#000000")
    doc.y = y0 + tinggi + 6
  })
}

export async function GET(request: NextRequest) {
  const bankId = request.nextUrl.searchParams.get("bankId") ?? ""

  // Admin (sesi better-auth) boleh semua bank; guru hanya bank miliknya.
  const session = await auth.api.getSession({ headers: await headers() })
  let teacherId: string | undefined

  if (!session) {
    const teacherCookie = (await cookies()).get("teacher_id")?.value
    if (!teacherCookie) return new Response("Sesi habis. Silakan login ulang.", { status: 401 })

    const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherCookie) })
    if (!guru || !guru.active) return new Response("Sesi habis. Silakan login ulang.", { status: 401 })
    teacherId = guru.id

    // Unduh PDF untuk guru = fitur berbayar (sekali bayar, aktif permanen).
    if (!(await bolehUnduhPdf(guru.id))) return new Response("Akses unduh PDF belum aktif.", { status: 402 })
  }

  const hasil = await ambilAnalisisButir(bankId, teacherId ? { teacherId } : {})
  if (!hasil.ok) return new Response(hasil.message, { status: 400 })

  const { identitas, ketuntasan, statistik, siswa, butir } = hasil.data
  const perluRevisi = butir.map((b, i) => ({ b, no: i + 1 })).filter((x) => x.b.status === "Soal Perlu Direvisi").map((x) => x.no)

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: MARGIN, bufferPages: true })
    const potongan: Buffer[] = []
    doc.on("data", (c: Buffer) => potongan.push(c))
    doc.on("end", () => resolve(Buffer.concat(potongan)))
    doc.on("error", reject)

    // ── Kop laporan
    doc.font("Helvetica-Bold").fontSize(12).text("LAPORAN ANALISIS BUTIR SOAL", MARGIN, MARGIN, { align: "center", width: LEBAR })
    doc.font("Helvetica").fontSize(8).text(`${identitas.kode} — ${identitas.judul}`, { align: "center", width: LEBAR })
    doc.moveDown(0.5)

    // ── Identitas laporan: 2 pasang label/nilai per baris
    const pasangan: [string, string][] = [
      ["Nama Sekolah", identitas.sekolah],
      ["Mata Pelajaran", identitas.mataPelajaran],
      ["Nama Tes", isi(identitas.namaTes)],
      ["Tanggal Tes", isi(identitas.tanggalTes)],
      ["Tahun Pelajaran", isi(identitas.tahunPelajaran)],
      ["Semester", isi(identitas.semester)],
      ["Kelas", identitas.kelas],
      ["KKM", String(identitas.kkm)],
      ["Jumlah Soal", String(identitas.jumlahSoal)],
      ["Jumlah Opsi", String(identitas.jumlahOpsi)],
      ["Jumlah Siswa", String(identitas.jumlahSiswa)],
      ["Guru Mata Pelajaran", `${identitas.guru}${identitas.nipGuru ? ` / ${identitas.nipGuru}` : ""}`],
    ]
    const lebarLabel = 76
    const lebarNilai = LEBAR / 2 - lebarLabel
    let y = doc.y
    for (let i = 0; i < pasangan.length; i += 2) {
      for (const [sisi, idx] of [[0, i], [1, i + 1]] as const) {
        const p = pasangan[idx]
        if (!p) continue
        const x = MARGIN + sisi * (LEBAR / 2)
        doc.font("Helvetica-Bold").fontSize(6.5).text(p[0], x, y + 1, { width: lebarLabel, lineBreak: false })
        doc.font("Helvetica").fontSize(6.5).text(`: ${p[1]}`, x + lebarLabel, y + 1, { width: lebarNilai - 4, lineBreak: false, ellipsis: true })
      }
      y += 11
    }
    doc.y = y + 4

    // ── Ketuntasan
    judulBagian(doc, "KETUNTASAN (berdasarkan KKM)")
    doc.fontSize(7).text(
      `${ketuntasan.tuntas} siswa Tuntas (${angka(ketuntasan.persenTuntas, 1)}%)   ·   ${ketuntasan.belum} siswa Belum Tuntas (${angka(ketuntasan.persenBelum, 1)}%)`,
      MARGIN,
      doc.y,
      { width: LEBAR },
    )

    // ── Data siswa
    judulBagian(doc, "DATA SISWA")
    gambarTabel(
      doc,
      [
        { lebar: 20, judul: "No" },
        { lebar: 128, judul: "Nama", rata: "left" },
        { lebar: 46, judul: "Kelas", rata: "left" },
        { lebar: Math.max(80, Math.min(180, identitas.jumlahSoal * 10)), judul: "Rincian Jawaban", rata: "left" },
        { lebar: 22, judul: "B" },
        { lebar: 22, judul: "S" },
        { lebar: 32, judul: "Skor" },
        { lebar: 38, judul: "Nilai" },
        { judul: "Ket." },
      ],
      siswa.map((s) => [
        String(s.no),
        s.nama,
        s.kelas,
        s.rincian,
        String(s.benar),
        String(s.salah),
        String(s.skor),
        angka(s.nilai, 0),
        s.ket,
      ]),
    )

    // ── Statistik ringkas skor & nilai
    judulBagian(doc, "STATISTIK SKOR DAN NILAI")
    gambarTabel(
      doc,
      [
        { lebar: 110, judul: "Ukuran", rata: "left" },
        { judul: "Jumlah" },
        { judul: "Terkecil" },
        { judul: "Terbesar" },
        { judul: "Rata-rata" },
        { judul: "Simpangan Baku" },
      ],
      [
        ["SKOR", angka(statistik.skor.jumlah, 2), angka(statistik.skor.terkecil, 2), angka(statistik.skor.terbesar, 2), angka(statistik.skor.rataRata, 2), angka(statistik.skor.simpanganBaku, 2)],
        ["NILAI", angka(statistik.nilai.jumlah, 2), angka(statistik.nilai.terkecil, 2), angka(statistik.nilai.terbesar, 2), angka(statistik.nilai.rataRata, 2), angka(statistik.nilai.simpanganBaku, 2)],
      ],
    )

    // ── Statistik butir
    judulBagian(doc, "STATISTIK BUTIR SOAL")
    gambarTabel(
      doc,
      [
        { lebar: 20, judul: "No" },
        { lebar: 40, judul: "Prop.Cor" },
        { lebar: 36, judul: "D.Beda" },
        { lebar: 82, judul: "T.Kesukaran" },
        { lebar: 40, judul: "Pt.Biser" },
        { lebar: 36, judul: "Biser" },
        { lebar: 26, judul: "Kunci" },
        { lebar: 138, judul: "Efek.Opsi", rata: "left" },
        { judul: "Status", rata: "left" },
      ],
      butir.map((b, i) => [
        String(i + 1),
        angka(b.kesukaran),
        angka(b.dayaBeda, 2),
        `${b.kesukaranLabel} (${b.kesukaranLabel === "Mudah" ? "Easy" : b.kesukaranLabel === "Sedang" ? "Medium" : "Sukar"})`,
        angka(b.ptBiser),
        angka(b.biser),
        b.opsiDetail.find((o) => o.kunci)?.label ?? "?",
        b.efekOpsi,
        b.status === "Soal Baik" ? "Soal Baik" : "Perlu Direvisi",
      ]),
    )

    // ── Distribusi jawaban per soal (kartu batang horizontal)
    gambarDistribusi(doc, butir)

    // ── Rekomendasi
    judulBagian(doc, "REKOMENDASI")
    doc.fontSize(6.8).text(
      perluRevisi.length
        ? `Butir yang perlu direvisi: ${perluRevisi.join(", ")}. Butir dengan kesukaran ekstrem, daya beda rendah, atau pengecoh yang tidak berfungsi sebaiknya diperbaiki sebelum dipakai lagi.`
        : "Semua butir berada pada rentang kesukaran dan daya beda yang wajar. Tidak ada butir yang wajib direvisi.",
      MARGIN,
      doc.y,
      { width: LEBAR, align: "justify" },
    )

    // ── Tanda tangan
    if (doc.y + 96 > BAWAH) doc.addPage()
    const tanggalCetak = new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    }).format(new Date())
    const yTtd = doc.y + 12
    const setengah = LEBAR / 2
    doc.font("Helvetica").fontSize(7)
    doc.text(`Bantarujeg, ${tanggalCetak}`, MARGIN + setengah, yTtd, { width: setengah - 6 })
    doc.text("Guru Mata Pelajaran", MARGIN, yTtd + 12, { width: setengah - 6 })
    doc.text("Kepala Sekolah", MARGIN + setengah, yTtd + 12, { width: setengah - 6 })
    doc.font("Helvetica-Bold").fontSize(7.5)
    doc.text(identitas.guru, MARGIN, yTtd + 58, { width: setengah - 6 })
    doc.text(isi(identitas.kepalaSekolah), MARGIN + setengah, yTtd + 58, { width: setengah - 6 })
    doc.font("Helvetica").fontSize(7)
    doc.text(identitas.nipGuru ? `NIP. ${identitas.nipGuru}` : "NIP. -", MARGIN, yTtd + 70, { width: setengah - 6 })
    doc.text(identitas.nipKepalaSekolah ? `NIP. ${identitas.nipKepalaSekolah}` : "NIP. -", MARGIN + setengah, yTtd + 70, { width: setengah - 6 })

    // ── Footer nomor halaman
    const rentang = doc.bufferedPageRange()
    for (let i = rentang.start; i < rentang.start + rentang.count; i += 1) {
      doc.switchToPage(i)
      doc.font("Helvetica").fontSize(6).fillColor("#6b7280")
      doc.text(
        `${identitas.sekolah} · analisis butir ${identitas.kode} · halaman ${i + 1} dari ${rentang.count}`,
        MARGIN,
        TINGGI - MARGIN - 10,
        { width: LEBAR, align: "right", lineBreak: false },
      )
      doc.fillColor("#000000")
    }

    doc.end()
  })

  const namaFile = `analisis-butir-${identitas.kode}-${new Date().toISOString().slice(0, 10)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-")

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `inline; filename="${namaFile}"`,
      "cache-control": "no-store",
    },
  })
}
