import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq, inArray, sql } from "drizzle-orm"
import { BookOpen, CalendarDays, ClipboardList, ExternalLink, LogOut } from "lucide-react"

import { getAksesPdfGuru, getIdentitasLaporan } from "@/app/guru/dashboard/actions"
import { logoutGuru } from "@/app/guru/login/actions"
import { GuruAnalisisButton } from "@/components/guru-analisis-button"
import { GuruIdentitasForm } from "@/components/guru-identitas-form"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import { ImporDocxDialog } from "@/components/impor-docx-dialog"
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

  const identitas = await getIdentitasLaporan()
  const aksesPdf = await getAksesPdfGuru()
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
      <header className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-2 px-2.5 py-2">
          <div className="leading-tight">
            <p className="text-[11px]">Area Guru</p>
            <p className="text-sm font-semibold">{guru.name}</p>
            <p className="text-[11px]">NIP {guru.nip}</p>
          </div>
          <form action={logoutGuru}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-11 rounded-sm border-brand-foreground/60 bg-transparent text-xs text-brand-foreground hover:bg-brand-foreground/15 hover:text-brand-foreground sm:h-7"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-2 px-2.5 py-2">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div className="leading-tight">
            <h1 className="text-base font-semibold text-foreground">Dashboard guru</h1>
            <p className="text-[11px] text-muted-foreground">
              Ringkasan bank soal, jadwal, dan hasil ujian yang terhubung ke akun Anda.
            </p>
          </div>
        </div>

        <div className="grid gap-1.5 sm:grid-cols-3">
          {[
            { label: "Bank soal saya", nilai: ringkas.length, ikon: BookOpen, warna: "bg-brand" },
            { label: "Jadwal ujian", nilai: jadwal.length, ikon: CalendarDays, warna: "bg-token-jadwal" },
            { label: "Respons masuk", nilai: totalRespons, ikon: ClipboardList, warna: "bg-token-respons" },
          ].map((kartu) => (
            <div
              key={kartu.label}
              className={`flex items-center justify-between gap-2 rounded-sm px-2.5 py-2 text-white ${kartu.warna}`}
            >
              <div className="leading-tight">
                <p className="text-[11px]">{kartu.label}</p>
                <p className="text-lg leading-none font-semibold">{kartu.nilai}</p>
              </div>
              <kartu.ikon className="size-6 opacity-90" aria-hidden="true" />
            </div>
          ))}
        </div>

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="gap-0 px-2.5 py-1.5">
            <CardTitle className="text-sm">Bank soal &amp; hasil</CardTitle>
            <CardDescription className="text-[11px]">
              Hanya bank soal yang terhubung ke akun Anda. Data hasil berasal dari sync Google Form oleh panitia.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2.5 pb-2">
            {ringkas.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                Belum ada bank soal yang terhubung ke akun Anda. Hubungi panitia.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <Table className="overflow-hidden rounded-sm text-[11px] [&_tbody_tr:hover]:bg-muted/50 [&_th]:h-7 [&_th]:bg-muted/60 [&_th]:px-2 [&_th]:py-0 [&_td]:px-2 [&_td]:py-0.5">
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
                              <Badge variant="secondary" className="h-4 rounded-sm px-1.5 text-[10px] font-normal">
                                {bank.jumlahJadwal} jadwal
                              </Badge>
                              {bank.kelas.map((kelas) => (
                                <Badge key={kelas} variant="outline" className="h-4 rounded-sm px-1.5 text-[10px] font-normal">
                                  {kelas}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{bank.respons}</TableCell>
                        <TableCell className="text-right">
                          {bank.respons ? (
                            <span
                              className={
                                bank.rataRata >= Number(identitas.kkm || 0)
                                  ? "font-medium text-emerald-700"
                                  : "font-medium text-amber-700"
                              }
                              title={
                                bank.rataRata >= Number(identitas.kkm || 0)
                                  ? `Di atas KKM ${identitas.kkm}`
                                  : `Di bawah KKM ${identitas.kkm}`
                              }
                            >
                              {bank.rataRata.toFixed(2)}
                            </span>
                          ) : (
                            "-"
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            {bank.formId ? (
                              <a
                                href={`https://docs.google.com/forms/d/${bank.formId}/edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 gap-1 rounded-sm px-1.5 text-[11px] sm:h-6" })}
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
                                className="h-11 gap-1 rounded-sm px-1.5 text-[11px] sm:h-6"
                              >
                                <ExternalLink className="size-3.5" />
                                Edit form
                              </Button>
                            )}
                            <ImporDocxDialog bankId={bank.id} kode={bank.code} disabled={!bank.formId} />
                            <GuruAnalisisButton bankId={bank.id} judul={bank.code} akses={aksesPdf} />
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

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="gap-0 px-2.5 py-1.5">
            <CardTitle className="text-sm">Identitas laporan</CardTitle>
            <CardDescription className="text-[11px]">
              Dipakai di header PDF analisis butir: nama tes, tahun pelajaran, semester, KKM, kepala sekolah.
            </CardDescription>
          </CardHeader>
          <GuruIdentitasForm identitas={identitas} />
        </Card>
      </div>
    </main>
  )
}
