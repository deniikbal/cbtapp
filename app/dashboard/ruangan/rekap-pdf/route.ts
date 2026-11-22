import { headers } from "next/headers"
import PDFDocument from "pdfkit"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examRooms, students } from "@/lib/db/schema"
import { eq } from "drizzle-orm"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const MARGIN = 32
const LEBAR = 595.28 - MARGIN * 2
const TINGGI = 841.89
const BAWAH = TINGGI - MARGIN - 22
const BARIS = 13

type Baris = { kelas: string; jumlah: number }

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return new Response("Tidak punya akses.", { status: 401 })
  }

  const ruanganRows = await db.select({ id: examRooms.id, name: examRooms.name }).from(examRooms)
  const siswaRows = await db
    .select({ roomId: students.roomId, className: classrooms.name })
    .from(students)
    .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
    .where(eq(students.active, true))

  const perRuangan = new Map<string, Map<string, number>>()
  let totalSiswa = 0
  for (const s of siswaRows) {
    if (!s.roomId) continue
    totalSiswa += 1
    const kelas = perRuangan.get(s.roomId) ?? new Map<string, number>()
    kelas.set(s.className, (kelas.get(s.className) ?? 0) + 1)
    perRuangan.set(s.roomId, kelas)
  }

  const collator = new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" })
  const rekap = ruanganRows
    .map((room) => {
      const kelas = [...(perRuangan.get(room.id) ?? new Map<string, number>()).entries()]
        .map(([nama, jumlah]) => ({ kelas: nama, jumlah }))
        .sort((a, b) => collator.compare(a.kelas, b.kelas))
      return {
        nama: room.name,
        kelas,
        total: kelas.reduce((s, k) => s + k.jumlah, 0),
      }
    })
    .sort((a, b) => collator.compare(a.nama, b.nama))

  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true })
  const potongan: Buffer[] = []
  doc.on("data", (chunk: Buffer) => potongan.push(chunk))
  const selesai = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(potongan)))
  })

  // Judul
  doc.font("Helvetica-Bold").fontSize(14).text("REKAPITULASI RUANGAN UJIAN", { align: "center" })
  doc.font("Helvetica").fontSize(9).fillColor("#4b5563").text("SMAN 1 Bantarujeg", { align: "center" })
  doc
    .fillColor("#6b7280")
    .fontSize(8)
    .text(
      `Dicetak ${new Date().toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })} • hanya peserta aktif`,
      { align: "center" },
    )
  doc.moveDown(0.8).fillColor("#000000")

  const kolom = [
    { judul: "Ruangan", lebar: 110, rata: "left" as const },
    { judul: "Kelas", lebar: 90, rata: "left" as const },
    { judul: "Jumlah Siswa", lebar: 70, rata: "right" as const },
  ]
  const lebarIsi = kolom.reduce((s, k) => s + k.lebar, 0)
  const sisaLebar = LEBAR - lebarIsi
  kolom[kolom.length - 1].lebar += sisaLebar

  const x0 = MARGIN
  const gambarHeaderTabel = (y: number) => {
    doc.rect(x0, y, LEBAR, BARIS).fill("#e5e7eb")
    let x = x0
    doc.fillColor("#111827").font("Helvetica-Bold").fontSize(8)
    for (const k of kolom) {
      doc.text(k.judul, x + 4, y + 3.5, { width: k.lebar - 8, align: k.rata })
      x += k.lebar
    }
    return y + BARIS
  }

  let y = gambarHeaderTabel(doc.y)

  const pastikanRuang = (perlu: number) => {
    if (y + perlu <= BAWAH) return
    doc.addPage()
    y = gambarHeaderTabel(MARGIN)
  }

  doc.font("Helvetica").fontSize(8)

  for (const room of rekap) {
    pastikanRuang(BARIS * (room.kelas.length + 1) + 6)

    let x = x0
    doc.fillColor("#111827").font("Helvetica-Bold")
    doc.text(room.nama, x + 4, y + 3.5, { width: kolom[0].lebar - 8 })
    doc.text("Total", MARGIN + kolom[0].lebar + 4, y + 3.5, { width: kolom[1].lebar - 8 })
    doc.text(String(room.total), MARGIN + kolom[0].lebar + kolom[1].lebar + 4, y + 3.5, {
      width: kolom[2].lebar - 8,
      align: "right",
    })
    y += BARIS
    doc.font("Helvetica")

    for (const k of room.kelas) {
      doc.rect(x0, y, LEBAR, BARIS).fill("#f9fafb")
      x = MARGIN + kolom[0].lebar
      doc.fillColor("#111827").text(k.kelas, x + 4, y + 3.5, { width: kolom[1].lebar - 8 })
      doc.text(String(k.jumlah), x + kolom[1].lebar + 4, y + 3.5, {
        width: kolom[2].lebar - 8,
        align: "right",
      })
      y += BARIS
    }

    if (room.kelas.length === 0) {
      doc.fillColor("#6b7280").text("Belum ada peserta", MARGIN + kolom[0].lebar + 4, y + 3.5)
      y += BARIS
    }

    doc.moveTo(x0, y).lineTo(x0 + LEBAR, y).strokeColor("#d1d5db").lineWidth(0.7).stroke()
    y += 6
  }

  pastikanRuang(BARIS + 24)
  doc.moveTo(x0, y).lineTo(x0 + LEBAR, y).strokeColor("#9ca3af").lineWidth(1).stroke()
  y += 6
  doc.fillColor("#111827").font("Helvetica-Bold").fontSize(9)
  doc.text(`Total ruangan: ${rekap.length}`, x0 + 4, y)
  doc.text(`Total peserta aktif: ${totalSiswa}`, x0 + 4, y + 13)

  // Nomor halaman
  const jangkauan = doc.bufferedPageRange()
  for (let i = 0; i < jangkauan.count; i++) {
    doc.switchToPage(jangkauan.start + i)
    doc
      .font("Helvetica")
      .fontSize(7.5)
      .fillColor("#6b7280")
      .text(`Halaman ${i + 1} dari ${jangkauan.count}`, MARGIN, TINGGI - MARGIN - 10, {
        width: LEBAR,
        align: "center",
      })
  }

  doc.end()
  const buffer = await selesai

  return new Response(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="rekap-ruangan-${new Date().toISOString().slice(0, 10)}.pdf"`,
      "cache-control": "no-store",
    },
  })
}
