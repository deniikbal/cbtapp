import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { eq, inArray, or, sql } from "drizzle-orm"
import { BookOpen, CalendarDays, ChevronDown, ClipboardList, ExternalLink, FileQuestion, FileUp, LogOut } from "lucide-react"

import { getAksesPdfGuru, getIdentitasLaporan } from "@/app/guru/dashboard/actions"
import { logoutGuru } from "@/app/guru/login/actions"
import { GuruAnalisisButton } from "@/components/guru-analisis-button"
import { GuruIdentitasForm } from "@/components/guru-identitas-form"
import { KelasTooltip } from "@/components/kelas-tooltip"
import { StatCard } from "@/components/stat-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button, buttonVariants } from "@/components/ui/button"
import Link from "next/link"
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
      formItems: questionBanks.formItems,
      syncedAt: questionBanks.syncedAt,
      subjectName: subjects.name,
    })
    .from(questionBanks)
    .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(or(eq(questionBanks.teacherId, guru.id), sql`${questionBanks.teacherIds} @> ${JSON.stringify([guru.id])}::jsonb`))
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
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 md:px-6 lg:px-8">
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

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard Guru</h1>
          <p className="text-sm text-muted-foreground">
            Ringkasan bank soal, jadwal, dan hasil ujian yang terhubung ke akun Anda.
          </p>
        </section>

        {/* Stat cards: flat, neutral, green icon as the only accent — sama dengan dashboard admin */}
        <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3">
          <StatCard label="Bank Soal Saya" value={ringkas.length} description="Bank assesmen terhubung" icon={BookOpen} />
          <StatCard label="Jadwal Ujian" value={jadwal.length} description="Jadwal assesmen Anda" icon={CalendarDays} />
          <StatCard label="Respons Masuk" value={totalRespons} description="Jawaban tersinkron" icon={ClipboardList} />
        </section>

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="gap-0 border-b px-4 py-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <CardTitle>Bank Soal &amp; Hasil</CardTitle>
                  <Badge variant="secondary" className="font-normal">
                    {ringkas.length}
                  </Badge>
                </div>
                <CardDescription className="text-[11px]">
                  Hanya bank soal yang terhubung ke akun Anda. Data hasil berasal dari sync Google Form oleh panitia.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4">
            {ringkas.length === 0 ? (
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-8 text-muted-foreground">
                <FileQuestion className="size-8 text-muted-foreground/60" />
                <div className="space-y-1 text-center">
                  <div className="font-medium text-foreground">Belum ada bank soal</div>
                  <p className="text-sm">Bank soal yang terhubung ke akun Anda akan tampil di sini. Hubungi panitia bila dirasa kurang.</p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Bank Soal</TableHead>
                      <TableHead>Mapel</TableHead>
                      <TableHead>Tingkat</TableHead>
                      <TableHead className="text-center">Soal</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="text-right">Respons</TableHead>
                      <TableHead className="text-right">Rata-rata</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ringkas.map((bank, index) => (
                      <TableRow key={bank.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8 rounded-sm">
                              <AvatarFallback className="rounded-sm bg-primary/10 text-xs font-medium text-primary">
                                {getInitials(bank.code)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{bank.title}</p>
                              <p className="font-mono text-xs text-muted-foreground">{bank.code}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{bank.subjectName ?? "-"}</TableCell>
                        <TableCell className="text-sm">{bank.grade}</TableCell>
                        <TableCell className="text-center tabular-nums">
                          {bank.formId ? hitungSoal(bank.formItems) : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell>
                          {bank.jumlahJadwal === 0 ? (
                            <span className="text-sm text-muted-foreground">Belum dijadwalkan</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <Badge variant="secondary" className="rounded-sm font-normal">
                                {bank.jumlahJadwal} jadwal
                              </Badge>
                              <KelasTooltip kelas={bank.kelas} />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{bank.respons}</TableCell>
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
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {bank.formId ? (
                              <a
                                href={`https://docs.google.com/forms/d/${bank.formId}/edit`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 gap-1 rounded-sm px-2 text-xs sm:h-8" })}
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
                                className="h-11 gap-1 rounded-sm px-2 text-xs sm:h-8"
                              >
                                <ExternalLink className="size-3.5" />
                                Edit form
                              </Button>
                            )}
                            <Button
                              nativeButton={false}
                              variant="outline"
                              size="sm"
                              disabled={!bank.formId}
                              title={bank.formId ? "Impor soal dari Word" : "Buat form dulu"}
                              className="h-11 gap-1 rounded-sm px-2 text-xs sm:h-8"
                              render={<Link href={`/guru/dashboard/impor?bank=${bank.id}`} />}
                            >
                              <FileUp className="size-3.5" />
                              Impor
                            </Button>
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

        {/* Auto collapse: tertutup secara default, klik header untuk membuka. */}
        <details className="group gap-0 rounded-sm border bg-card py-0 text-card-foreground shadow-sm">
          <summary className="cursor-pointer list-none select-none border-b px-4 py-3 group-open:border-b-0 [&::-webkit-details-marker]:hidden">
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle>Identitas Laporan</CardTitle>
                <CardDescription className="text-[11px]">
                  Dipakai di header PDF analisis butir: nama tes, tahun pelajaran, semester, KKM, kepala sekolah.
                </CardDescription>
              </div>
              <ChevronDown className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </div>
          </summary>
          <div className="border-t">
            <GuruIdentitasForm identitas={identitas} />
          </div>
        </details>
      </div>
    </main>
  )
}

function hitungSoal(formItems: unknown): number {
  if (!Array.isArray(formItems)) return 0
  return formItems.filter((item) => typeof item === "object" && item !== null && "questionItem" in item).length
}

function getInitials(name: string) {
  return name
    .split(/[\s-]+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
