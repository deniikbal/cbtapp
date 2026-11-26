import { readFile } from "node:fs/promises"
import path from "node:path"

import PDFDocument from "pdfkit"

import { getCardSettings } from "@/app/dashboard/peserta/kartu/card-settings-actions"
import type { BelumMengerjakan } from "@/lib/belum-mengerjakan"

const MARGIN = 36
const LEBAR = 595.28 - MARGIN * 2
const BAWAH = 841.89 - MARGIN - 24
const BARIS = 13

/** Kop surat: logo di kiri, nama sekolah + judul asesmen di tengah, garis ganda di bawah. */
async function gambarKop(doc: PDFKit.PDFDocument) {
  const s = await getCardSettings()
  const y0 = MARGIN

  if (s.logoUrl) {
    try {
      const berkas = path.join(process.cwd(), "public", s.logoUrl.replace(/^\//, ""))
      const logo = await readFile(berkas)
      doc.image(logo, MARGIN, y0 + 2, { fit: [52, 52] })
    } catch {
      // Logo hilang dari disk: kop tetap jalan tanpa gambar.
    }
  }

  doc.font("Helvetica-Bold").fontSize(13).text(s.schoolName || "SMA Negeri 1 Bantarujeg", MARGIN, y0 + 4, { width: LEBAR, align: "center" })
  doc.font("Helvetica").fontSize(8.5).text(s.examTitle || "Asesmen Sumatif", { width: LEBAR, align: "center" })
  if (s.academicYear) doc.fontSize(8).text(`Tahun Pelajaran ${s.academicYear}`, { width: LEBAR, align: "center" })

  const yGaris = y0 + 62
  doc.moveTo(MARGIN, yGaris).lineTo(MARGIN + LEBAR, yGaris).lineWidth(1.4).strokeColor("#111827").stroke()
  doc.moveTo(MARGIN, yGaris + 2.4).lineTo(MARGIN + LEBAR, yGaris + 2.4).lineWidth(0.6).strokeColor("#111827").stroke()
  doc.strokeColor("#000000").lineWidth(1)
  doc.y = yGaris + 10
}

function judulBagian(doc: PDFKit.PDFDocument, teks: string) {
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#111827").text(teks, MARGIN, doc.y, { width: LEBAR })
  doc.moveDown(0.25)
  doc.font("Helvetica").fillColor("#000000")
}

/** PDF daftar peserta yang belum mengerjakan — kop mengikuti kartu ujian. */
export async function buatPdfBelumMengerjakan(data: BelumMengerjakan): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "portrait", margin: MARGIN, bufferPages: true })
    const potongan: Buffer[] = []
    doc.on("data", (c: Buffer) => potongan.push(c))
    doc.on("end", () => resolve(Buffer.concat(potongan)))
    doc.on("error", reject)

    void (async () => {
      await gambarKop(doc)

      doc.font("Helvetica-Bold").fontSize(10.5).text("DAFTAR PESERTA BELUM MENGERJAKAN", { align: "center", width: LEBAR })
      doc.font("Helvetica").fontSize(8).text(`${data.bank.code} — ${data.bank.title}`, { align: "center", width: LEBAR })
      doc.fontSize(8).text(`Peserta ${data.total} siswa · sudah mengerjakan ${data.sudah} · belum mengerjakan ${data.belum}`, { align: "center", width: LEBAR })
      doc.moveDown(0.6)

      const gambarHeader = () => {
        const y = doc.y
        doc.rect(MARGIN, y, LEBAR, BARIS).fill("#e5e7eb")
        doc.fillColor("#111827").font("Helvetica-Bold").fontSize(7)
        doc.text("No", MARGIN + 2, y + 3.6, { width: 24 })
        doc.text("NIS", MARGIN + 26, y + 3.6, { width: 74 })
        doc.text("Nama Siswa", MARGIN + 100, y + 3.6, { width: LEBAR - 104 })
        doc.font("Helvetica").fontSize(7).fillColor("#000000")
        doc.y = y + BARIS
      }

      if (!data.kelas.length) doc.fontSize(8).text("Tidak ada peserta pada bank soal ini.", { width: LEBAR })

      for (const k of data.kelas) {
        if (doc.y + BARIS * 3 > BAWAH) {
          doc.addPage()
          await gambarKop(doc)
        }
        judulBagian(doc, `KELAS ${k.kelas} · SESI ${k.sesi} — ${k.belum.length} dari ${k.peserta} siswa belum mengerjakan`)
        if (!k.belum.length) {
          doc.fontSize(7.5).fillColor("#16a34a").text("Semua siswa kelas ini sudah mengerjakan.", MARGIN + 2, doc.y, { width: LEBAR })
          doc.fillColor("#000000").moveDown(0.5)
          continue
        }
        gambarHeader()
        k.belum.forEach((s, i) => {
          if (doc.y + BARIS > BAWAH) {
            doc.addPage()
            void gambarKop(doc)
            gambarHeader()
          }
          const y = doc.y
          if (i % 2 === 1) doc.rect(MARGIN, y, LEBAR, BARIS).fill("#f3f4f6").fillColor("#000000")
          doc.font("Helvetica").fontSize(7.5)
          doc.text(String(i + 1), MARGIN + 2, y + 3.6, { width: 24, lineBreak: false })
          doc.text(s.nis || "-", MARGIN + 26, y + 3.6, { width: 74, lineBreak: false })
          doc.text(s.nama, MARGIN + 100, y + 3.6, { width: LEBAR - 104, lineBreak: false, ellipsis: true })
          doc.y = y + BARIS
        })
        doc.moveDown(0.8)
      }

      doc.font("Helvetica").fontSize(7).fillColor("#6b7280").text(
        `Dicetak ${new Date().toLocaleString("id-ID")} · sumber: respons Google Form yang sudah tersinkron`,
        MARGIN,
        BAWAH + 4,
        { width: LEBAR },
      )
      doc.end()
    })().catch(reject)
  })
}
