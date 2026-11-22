import Link from "next/link"
import { redirect } from "next/navigation"
import { eq, inArray, sql } from "drizzle-orm"
import { Activity, BookOpen, CalendarDays, FileQuestion, FileUp, FileText, LogOut } from "lucide-react"

import { logoutProktor, proktorAktif } from "@/app/proktor/login/actions"
import { AksiIkon } from "@/components/aksi-ikon"
import { KelasTooltip } from "@/components/kelas-tooltip"
import { StatCard } from "@/components/stat-card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { buttonVariants, Button } from "@/components/ui/button"
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
import { classrooms, examSchedules, questionBanks, subjects } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function ProktorDashboardPage() {
  const proktor = await proktorAktif()
  if (!proktor) redirect("/proktor/login")

  const banks = await db
    .select({
      id: questionBanks.id,
      code: questionBanks.code,
      title: questionBanks.title,
      grade: questionBanks.grade,
      formId: questionBanks.formId,
      formItems: questionBanks.formItems,
      subjectName: subjects.name,
    })
    .from(questionBanks)
    .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(sql`${questionBanks.proctorIds} @> ${JSON.stringify([proktor.id])}::jsonb`)
    .orderBy(questionBanks.code)

  const bankIds = banks.map((b) => b.id)
  const jadwal = bankIds.length
    ? await db
        .select({
          bankId: examSchedules.questionBankId,
          kelas: classrooms.name,
        })
        .from(examSchedules)
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .where(inArray(examSchedules.questionBankId, bankIds))
        .orderBy(classrooms.name)
    : []

  const ringkas = banks.map((bank) => {
    const jadwalBank = jadwal.filter((j) => j.bankId === bank.id)
    return {
      ...bank,
      jumlahSoal: bank.formId ? hitungSoal(bank.formItems) : 0,
      jumlahJadwal: jadwalBank.length,
      kelas: [...new Set(jadwalBank.map((j) => j.kelas))],
    }
  })

  const totalSoal = ringkas.reduce((n, b) => n + b.jumlahSoal, 0)

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 md:px-6 lg:px-8">
          <div className="leading-tight">
            <p className="text-[11px]">Area Proktor</p>
            <p className="text-sm font-semibold">{proktor.name}</p>
            <p className="text-[11px]">NIP {proktor.nip}</p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/proktor/dashboard/pengerjaan" className={buttonVariants({ variant: "outline", size: "sm", className: "h-11 rounded-sm border-brand-foreground/60 bg-transparent text-xs text-brand-foreground hover:bg-brand-foreground/15 hover:text-brand-foreground sm:h-7" })}>
              <Activity className="size-4" aria-hidden="true" />
              Progress Pengerjaan
            </Link>
          <form action={logoutProktor}>
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
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        <section className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Dashboard Proktor</h1>
          <p className="text-sm text-muted-foreground">
            Bank soal yang Anda dampingi. Tugas Anda: mengimpor dan merapikan soal dari Word.
          </p>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3 md:gap-4">
          <StatCard label="Bank Soal" value={ringkas.length} description="Ditugaskan ke Anda" icon={BookOpen} />
          <StatCard label="Jadwal Ujian" value={jadwal.length} description="Jadwal kelas terkait" icon={CalendarDays} />
          <StatCard label="Butir Soal" value={totalSoal} description="Soal pada form" icon={FileText} />
        </section>

        <Card className="gap-0 rounded-sm py-0">
          <CardHeader className="gap-0 border-b px-4 py-3">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <CardTitle>Bank Soal</CardTitle>
                <Badge variant="secondary" className="font-normal">
                  {ringkas.length}
                </Badge>
              </div>
              <CardDescription className="text-[11px]">
                Hanya bank soal yang menunjuk Anda sebagai proktor. Soal diubah lewat impor Word.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 py-4">
            {ringkas.length === 0 ? (
              <div className="mx-auto flex max-w-sm flex-col items-center gap-3 py-8 text-muted-foreground">
                <FileQuestion className="size-8 text-muted-foreground/60" />
                <div className="space-y-1 text-center">
                  <div className="font-medium text-foreground">Belum ada bank soal</div>
                  <p className="text-sm">Bank soal yang menunjuk Anda sebagai proktor akan tampil di sini. Hubungi panitia.</p>
                </div>
              </div>
            ) : (
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Bank Soal</TableHead>
                      <TableHead>Mapel / Tingkat</TableHead>
                      <TableHead className="text-center">Soal</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ringkas.map((bank) => (
                      <TableRow key={bank.id} className="transition-colors hover:bg-muted/40">
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
                        <TableCell>
                          <div className="flex flex-col text-sm">
                            <span>{bank.subjectName ?? "-"}</span>
                            <span className="text-xs text-muted-foreground">{bank.grade}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center tabular-nums">
                          {bank.formId ? bank.jumlahSoal : <span className="text-muted-foreground">-</span>}
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
                        <TableCell>
                          <div className="flex items-center justify-end gap-0.5">
                            <AksiIkon label={bank.formId ? "Impor soal dari Word" : "Buat form dulu"}>
                              <Button
                                nativeButton={false}
                                variant="ghost"
                                size="icon-sm"
                                disabled={!bank.formId}
                                className="rounded-sm"
                                render={<Link href={`/proktor/dashboard/impor?bank=${bank.id}`} />}
                              >
                                <FileUp className="size-4" />
                                <span className="sr-only">Impor soal</span>
                              </Button>
                            </AksiIkon>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Kartu mobile: tabel 5 kolom tidak layak di layar sempit. */}
            <div className="space-y-3 md:hidden">
              {ringkas.map((bank) => (
                <div key={bank.id} className="rounded-sm border bg-card p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{bank.title}</p>
                      <p className="font-mono text-xs text-muted-foreground">{bank.code}</p>
                    </div>
                    {bank.jumlahJadwal > 0 && (
                      <div className="flex shrink-0 items-center gap-1">
                        <Badge variant="secondary" className="rounded-sm font-normal">
                          {bank.jumlahJadwal} jadwal
                        </Badge>
                        <KelasTooltip kelas={bank.kelas} />
                      </div>
                    )}
                  </div>

                  <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div>
                      <dt className="text-xs text-muted-foreground">Mapel / Tingkat</dt>
                      <dd>
                        {bank.subjectName ?? "-"} <span className="text-xs text-muted-foreground">{bank.grade}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted-foreground">Soal</dt>
                      <dd className="tabular-nums">{bank.formId ? bank.jumlahSoal : "-"}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 border-t pt-3">
                    <Button
                      nativeButton={false}
                      variant="outline"
                      size="sm"
                      disabled={!bank.formId}
                      className="h-11 w-full rounded-sm"
                      render={<Link href={`/proktor/dashboard/impor?bank=${bank.id}`} />}
                    >
                      <FileUp className="size-4" />
                      Impor soal
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  )
}

function hitungSoal(formItems: unknown): number {
  if (!Array.isArray(formItems)) return 0
  return formItems.filter((item) => {
    if (typeof item !== "object" || item === null) return false
    const q = (item as { questionItem?: { question?: { grading?: { pointValue?: number } } } }).questionItem?.question
    return (q?.grading?.pointValue ?? 0) > 0
  }).length
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
