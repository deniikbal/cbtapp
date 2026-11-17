import { cookies, headers } from "next/headers"
import type { NextRequest } from "next/server"
import PDFDocument from "pdfkit"

import { auth } from "@/lib/auth"
import { ambilAnalisisButir } from "@/lib/analisis-data"
import { APP_NAME } from "@/lib/brand"
import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MARGIN = 34
const LEBAR = 841.89 - MARGIN * 2 // A4 landscape
const KOLOM = [22, 196, 30, 34, 40, 40, 30, 46, 30, 50, 80] // No, Butir, Jml, Benar, %Benar, Kosong, p, Ket, d, Ket, Pengecoh

function angka(n: number, desimal = 2) {
  return Number.isInteger(n) ? String(n) : n.toFixed(desimal)
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
  }

  const hasil = await ambilAnalisisButir(bankId, teacherId ? { teacherId } : {})
  if (!hasil.ok) return new Response(hasil.message, { status: 400 })

  const { bank, ringkasan, butir } = hasil.data

  const pdf = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: MARGIN, bufferPages: true })
    const potongan: Buffer[] = []
    doc.on("data", (c: Buffer) => potongan.push(c))
    doc.on("end", () => resolve(Buffer.concat(potongan)))
    doc.on("error", reject)

    const garis = () => doc.moveTo(MARGIN, doc.y).lineTo(MARGIN + LEBAR, doc.y).strokeColor("#d4d4d8").stroke()

    doc.font("Helvetica-Bold").fontSize(15).text("Analisis Butir Soal", MARGIN, MARGIN)
    doc.font("Helvetica").fontSize(9).fillColor("#52525b").text(APP_NAME, MARGIN, MARGIN + 19)
    doc.fillColor("#000000")

    doc.font("Helvetica-Bold").fontSize(11).text(`${bank.code} — ${bank.title}`, MARGIN, MARGIN + 38, { width: LEBAR })
    doc.font("Helvetica").fontSize(8.5).fillColor("#3f3f46").text(
      [
        `Mapel: ${bank.subjectName}`,
        `Tingkat: ${bank.grade}`,
        `Guru: ${bank.teacherName || "-"}`,
        `Kelas: ${ringkasan.kelas.join(", ") || "-"}`,
        `Jadwal: ${ringkasan.jumlahJadwal}`,
        `Dicetak: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
      ].join("   •   "),
      MARGIN,
      doc.y + 2,
      { width: LEBAR },
    )
    doc.fillColor("#000000")

    doc.moveDown(0.4)
    garis()
    doc.moveDown(0.4)

    doc.font("Helvetica-Bold").fontSize(9).text("Ringkasan", MARGIN, doc.y)
    doc.font("Helvetica").fontSize(8.5).text(
      `Respons dinilai: ${ringkasan.respons}   •   Butir dinilai: ${ringkasan.butirDinilai}   •   ` +
        `Rata-rata kesukaran: ${angka(ringkasan.rataKesukaran, 3)}   •   Rata-rata daya beda: ${angka(ringkasan.rataDayaBeda, 3)}`,
      MARGIN,
      doc.y + 1,
      { width: LEBAR },
    )

    doc.moveDown(0.6)
    garis()
    doc.moveDown(0.5)

    // ---- Rekap butir ----
    doc.font("Helvetica-Bold").fontSize(9).text("Rekap butir", MARGIN, doc.y)
    doc.moveDown(0.3)

    const kepala = ["No", "Butir soal", "Jml", "Benar", "% Benar", "Kosong", "p", "Kategori", "d", "Kategori", "Pengecoh"]
    const mulaiKepala = doc.y
    let x = MARGIN

    doc.font("Helvetica-Bold").fontSize(7.5)
    kepala.forEach((judul, i) => {
      doc.text(judul, x, mulaiKepala, { width: KOLOM[i], align: i >= 2 ? "right" : "left" })
      x += KOLOM[i]
    })
    doc.y = mulaiKepala + 12
    garis()

    butir.forEach((b, i) => {
      const tinggiJudul = doc.font("Helvetica").fontSize(7.5).heightOfString(b.judul || "(tanpa judul)", {
        width: KOLOM[1],
      })
      const tinggiBaris = Math.min(Math.max(tinggiJudul, 10), 24)

      if (doc.y + tinggiBaris > 470) {
        doc.addPage()
        doc.y = MARGIN
      }

      const yAwal = doc.y
      if (i % 2 === 1) {
        doc.rect(MARGIN, yAwal - 1.5, LEBAR, tinggiBaris + 3).fillColor("#f4f4f5").fill()
        doc.fillColor("#000000")
      }

      const sel = [
        String(i + 1),
        b.judul || "(tanpa judul)",
        String(b.dikerjakan),
        String(b.benar),
        `${angka(b.benarPersen, 2)}%`,
        String(b.kosong),
        angka(b.kesukaran, 3),
        b.kesukaranLabel,
        angka(b.dayaBeda, 2),
        b.dayaBedaLabel,
        `${b.distraksiMaks} (${b.distraksiLabel})`,
      ]

      x = MARGIN
      doc.font("Helvetica").fontSize(7.5)
      sel.forEach((isi, j) => {
        doc.text(isi, x, yAwal, {
          width: KOLOM[j],
          align: j >= 2 ? "right" : "left",
          height: tinggiBaris,
          ellipsis: true,
          lineBreak: j === 1,
        })
        x += KOLOM[j]
      })

      doc.y = yAwal + tinggiBaris + 2
    })

    // ---- Sebaran jawaban & catatan ----
    doc.addPage()
    doc.y = MARGIN
    doc.font("Helvetica-Bold").fontSize(9).text("Sebaran jawaban & tafsir per butir", MARGIN, doc.y, { width: LEBAR })
    doc.moveDown(0.4)
    garis()
    doc.moveDown(0.4)

    butir.forEach((b, i) => {
      const sebaran = b.sebaran.length
        ? b.sebaran.map((s) => `${s.jawaban}${s.kunci ? " (kunci)" : ""}: ${s.jumlah} siswa (${angka(s.persen, 2)}%)`).join("   |   ")
        : "Belum ada jawaban."

      const catatanTinggi = doc.font("Helvetica-Oblique").fontSize(7.5).heightOfString(b.catatan, { width: LEBAR - 20 })
      const sebaranTinggi = doc.font("Helvetica").fontSize(7.5).heightOfString(sebaran, { width: LEBAR - 20 })
      const total = 12 + 10 + sebaranTinggi + 3 + catatanTinggi + 10

      if (doc.y + total > 545) {
        doc.addPage()
        doc.y = MARGIN
      }

      doc.font("Helvetica-Bold").fontSize(8).fillColor("#000000")
      doc.text(`Butir ${i + 1}. ${b.judul || "(tanpa judul)"}`, MARGIN, doc.y, { width: LEBAR })
      doc.font("Helvetica").fontSize(7.5).fillColor("#3f3f46")
      doc.text(`Sebaran: ${sebaran}`, MARGIN + 10, doc.y + 1, { width: LEBAR - 20 })
      doc.font("Helvetica-Oblique").fillColor("#52525b")
      doc.text(b.catatan, MARGIN + 10, doc.y + 2, { width: LEBAR - 20 })
      doc.fillColor("#000000").moveDown(0.7)
    })

    // ---- Footer semua halaman ----
    const rentang = doc.bufferedPageRange()
    for (let i = rentang.start; i < rentang.start + rentang.count; i += 1) {
      doc.switchToPage(i)
      doc.font("Helvetica").fontSize(7).fillColor("#71717a").text(
        `${bank.code} — Analisis butir soal   •   ${APP_NAME}   •   Halaman ${i + 1} dari ${rentang.count}`,
        MARGIN,
        541,
        { width: LEBAR, align: "center" },
      )
    }

    doc.end()
  })

  const namaFile = `analisis-butir-${bank.code}-${new Date().toISOString().slice(0, 10)}.pdf`.replace(/[^a-zA-Z0-9._-]/g, "-")

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="${namaFile}"`,
      "cache-control": "no-store",
    },
  })
}
