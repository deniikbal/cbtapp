import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import * as XLSX from "xlsx"

import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, students } from "@/lib/db/schema"

const naturalCollator = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
})

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const rows = await db
    .select({
      nama: students.name,
      kelas: classrooms.name,
      nis_lama: students.nis,
    })
    .from(students)
    .innerJoin(classrooms, eq(students.classroomId, classrooms.id))

  rows.sort((a, b) => {
    const byClass = naturalCollator.compare(a.kelas, b.kelas)
    return byClass || naturalCollator.compare(a.nama, b.nama)
  })

  const templateRows = rows.map((row) => ({
    nama: row.nama,
    kelas: row.kelas,
    nis_lama: row.nis_lama,
    nis_baru: "",
  }))

  const workbook = XLSX.utils.book_new()
  const worksheet = XLSX.utils.json_to_sheet(templateRows, {
    header: ["nama", "kelas", "nis_lama", "nis_baru"],
  })

  worksheet["!cols"] = [{ wch: 32 }, { wch: 18 }, { wch: 18 }, { wch: 18 }]
  for (let rowIndex = 2; rowIndex <= templateRows.length + 1; rowIndex++) {
    const nisBaruCell = `D${rowIndex}`
    worksheet[nisBaruCell] = worksheet[nisBaruCell] ?? { t: "s", v: "" }
    worksheet[nisBaruCell].t = "s"
    worksheet[nisBaruCell].z = "@"
  }
  XLSX.utils.book_append_sheet(workbook, worksheet, "Update NIS")

  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })

  return new NextResponse(buffer, {
    headers: {
      "Content-Disposition": 'attachment; filename="update-nis-peserta.xlsx"',
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
  })
}
