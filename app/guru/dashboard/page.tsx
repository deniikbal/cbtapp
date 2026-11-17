import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq, inArray, sql } from "drizzle-orm"
import { ExternalLink, LogOut } from "lucide-react"

import { logoutGuru } from "@/app/guru/login/actions"
import { GuruAnalisisButton } from "@/components/guru-analisis-button"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, subjects, teachers } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function GuruDashboardPage() {
  const cookieStore = await cookies()
  const teacherId = cookieStore.get("teacher_id")?.value
  if (!teacherId) redirect("/guru/login")

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) })
  if (!guru || !guru.active) redirect("/guru/login")

  const banks = await db
    .select({
      id: questionBanks.id,
      code: questionBanks.code,
      title: questionBanks.title,
      grade: questionBanks.grade,
      formId: questionBanks.formId,
      subjectName: subjects.name,
    })
    .from(questionBanks)
    .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(eq(questionBanks.teacherId, guru.id))
    .orderBy(questionBanks.code)

  const bankIds = banks.map((b) => b.id)

  const jadwal = bankIds.length
    ? await db
        .select({
          id: examSchedules.id,
          bankId: examSchedules.questionBankId,
          kelas: classrooms.name,
          tanggal: examSchedules.examDate,
        })
        .from(examSchedules)
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .where(inArray(examSchedules.questionBankId, bankIds))
        .orderBy(examSchedules.examDate, classrooms.name)
    : []

  const hasil = jadwal.length
    ? await db
        .select({
          scheduleId: examResults.scheduleId,
          respons: sql<number>`count(*)::int`,
          rata: sql<number>`coalesce(avg(${examResults.score}), 0)::float`,
        })
        .from(examResults)
        .where(inArray(examResults.scheduleId, jadwal.map((j) => j.id)))
        .groupBy(examResults.scheduleId)
    : []

  const hasilPerJadwal = new Map(hasil.map((h) => [h.scheduleId, h]))

  const ringkas = banks.map((bank) => {
    const jadwalBank = jadwal.filter((j) => j.bankId === bank.id)
    let respons = 0
    let totalNilai = 0

    for (const j of jadwalBank) {
      const h = hasilPerJadwal.get(j.id)
      if (!h) continue
      respons += h.respons
      totalNilai += h.rata * h.respons
    }

    return {
      ...bank,
      jumlahJadwal: jadwalBank.length,
      kelas: [...new Set(jadwalBank.map((j) => j.kelas))],
      respons,
      rataRata: respons ? totalNilai / respons : 0,
    }
  })

  const totalRespons = ringkas.reduce((n, b) => n + b.respons, 0)

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-3 py-2">
          <div className="leading-tight">
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Area Guru</p>
            <h1 className="text-sm font-semibold">{guru.name}</h1>
            <p className="text-[11px] text-muted-foreground">NIP {guru.nip}</p>
          </div>
          <form action={logoutGuru}>
            <Button type="submit" variant="outline" size="sm">
              <LogOut className="size-4" />
              Keluar
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-3 px-3 py-3">
        <div className="grid gap-2 sm:grid-cols-3">
          {[
            { label: "Bank soal milik saya", nilai: ringkas.length },
            { label: "Jadwal ujian", nilai: jadwal.length },
            { label: "Respons masuk", nilai: totalRespons },
          ].map((kartu) => (
            <Card key={kartu.label} className="gap-0 py-0">
              <CardHeader className="gap-0.5 px-3 py-2">
                <CardDescription className="text-[11px]">{kartu.label}</CardDescription>
                <CardTitle className="text-base leading-none">{kartu.nilai}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>

        <Card className="gap-0 py-0">
          <CardHeader className="gap-0.5 px-3 py-2">
            <CardTitle className="text-sm">Bank soal &amp; hasil</CardTitle>
            <CardDescription className="text-[11px]">
              Hanya bank soal yang terhubung ke akun Anda. Data hasil berasal dari sync Google Form oleh panitia.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            {ringkas.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Belum ada bank soal yang terhubung ke akun Anda. Hubungi panitia.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="text-xs [&_th]:h-8 [&_th]:px-2 [&_th]:py-1 [&_td]:px-2 [&_td]:py-1">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bank soal</TableHead>
                      <TableHead>Mapel</TableHead>
                      <TableHead>Tingkat</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="text-right">Respons</TableHead>
                      <TableHead className="text-right">Rata-rata</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ringkas.map((bank) => (
                      <TableRow key={bank.id}>
                        <TableCell>
                          <p className="font-medium leading-tight">{bank.code}</p>
                          <p className="text-[11px] leading-tight text-muted-foreground">{bank.title}</p>
                        </TableCell>
                        <TableCell>{bank.subjectName ?? "-"}</TableCell>
                        <TableCell>{bank.grade}</TableCell>
                        <TableCell>
                          {bank.jumlahJadwal === 0 ? (
                            <span className="text-[11px] text-muted-foreground">Belum dijadwalkan</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-normal">
                                {bank.jumlahJadwal} jadwal
                              </Badge>
                              {bank.kelas.map((kelas) => (
                                <Badge key={kelas} variant="outline" className="h-5 px-1.5 text-[10px] font-normal">
                                  {kelas}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{bank.respons}</TableCell>
                        <TableCell className="text-right">
                          {bank.respons ? bank.rataRata.toFixed(2) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {bank.formId ? (
                              <a
                                href={`https://docs.google.com/forms/d/${bank.formId}/edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: "outline", size: "sm", className: "h-7 gap-1 px-2 text-[11px]" })}
                              >
                                <ExternalLink className="size-3.5" />
                                Edit form
                              </a>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="Form belum dibuat"
                                className="h-7 gap-1 px-2 text-[11px]"
                              >
                                <ExternalLink className="size-3.5" />
                                Edit form
                              </Button>
                            )}
                            <GuruAnalisisButton bankId={bank.id} judul={bank.code} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </main>
  )
}
