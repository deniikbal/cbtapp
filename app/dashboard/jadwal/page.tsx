import { asc, avg, count, eq, sql } from "drizzle-orm"
import type { ComponentType } from "react"
import { CalendarClock, FileText, Percent, RefreshCw } from "lucide-react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AutoRefresh } from "@/components/auto-refresh"
import { ExamScheduleTableCard } from "@/components/exam-schedule-table-card"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, majors, questionBanks, students, subjects, teachers } from "@/lib/db/schema"
import { cn, relWaktu } from "@/lib/utils"

type StatusJadwal = "akan" | "berlangsung" | "selesai"

type ScheduleRow = {
  id: string
  questionBankId: string
  classroomId: string
  examDate: string
  startTime: string
  durationMinutes: number
  active: boolean
  title: string
  code: string
  className: string
  majorCode: string
  subjectCode: string
  peserta: number
  respons: number
  syncedAt: string | null
  status: StatusJadwal
}

type BankOption = { id: string; code: string; title: string; subjectCode: string }
type ClassOption = { id: string; name: string; majorCode: string }

export default async function JadwalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: ScheduleRow[] = []
  let bankOptions: BankOption[] = []
  let classroomOptions: ClassOption[] = []
  let teacherOptions: { id: string; name: string }[] = []
  let rataRata: number | null = null

  try {
    const [scheduleRows, pesertaAgg, hasilAgg, bankOpts, teacherOpts, classOpts] = await Promise.all([
      db
        .select({
          id: examSchedules.id,
          questionBankId: examSchedules.questionBankId,
          classroomId: examSchedules.classroomId,
          examDate: examSchedules.examDate,
          startTime: examSchedules.startTime,
          durationMinutes: examSchedules.durationMinutes,
          active: examSchedules.active,
          title: questionBanks.title,
          code: questionBanks.code,
          bankSyncedAt: questionBanks.syncedAt,
          className: classrooms.name,
          majorCode: majors.code,
          subjectCode: subjects.code,
        })
        .from(examSchedules)
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .innerJoin(majors, eq(classrooms.majorId, majors.id))
        .orderBy(asc(examSchedules.examDate), asc(examSchedules.startTime)),
      db
        .select({ classroomId: students.classroomId, jumlah: count() })
        .from(students)
        .where(eq(students.active, true))
        .groupBy(students.classroomId),
      db
        .select({
          scheduleId: examResults.scheduleId,
          jumlah: count(),
          rata: avg(examResults.score),
          syncTerakhir: sql<string | null>`max(${examResults.syncedAt})`,
        })
        .from(examResults)
        .groupBy(examResults.scheduleId),
      db
        .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, subjectCode: subjects.code })
        .from(questionBanks)
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .orderBy(asc(questionBanks.code)),
      db.select({ id: teachers.id, name: teachers.name }).from(teachers).where(eq(teachers.active, true)).orderBy(asc(teachers.name)),
      db
        .select({ id: classrooms.id, name: classrooms.name, majorCode: majors.code })
        .from(classrooms)
        .innerJoin(majors, eq(classrooms.majorId, majors.id))
        .orderBy(asc(classrooms.name)),
    ])

    const pesertaPerKelas = new Map(pesertaAgg.map((p) => [p.classroomId, p.jumlah]))
    const hasilPerJadwal = new Map(hasilAgg.map((h) => [h.scheduleId, h]))
    const bankSyncPerBank = new Map(scheduleRows.map((s) => [s.questionBankId, isoOrNull(s.bankSyncedAt)]))

    rows = scheduleRows.map((row) => {
      const h = hasilPerJadwal.get(row.id)
      return {
        id: row.id,
        questionBankId: row.questionBankId,
        classroomId: row.classroomId,
        examDate: row.examDate,
        startTime: row.startTime,
        durationMinutes: row.durationMinutes,
        active: row.active,
        title: row.title,
        code: row.code,
        className: row.className,
        majorCode: row.majorCode,
        subjectCode: row.subjectCode,
        peserta: pesertaPerKelas.get(row.classroomId) ?? 0,
        respons: h?.jumlah ?? 0,
        syncedAt: h?.syncTerakhir ? isoOrNull(h.syncTerakhir) : (bankSyncPerBank.get(row.questionBankId) ?? null),
        status: statusJadwal(row.examDate, row.startTime, row.durationMinutes),
      }
    })
    bankOptions = bankOpts
    teacherOptions = teacherOpts
    classroomOptions = classOpts
    const totalJumlah = hasilAgg.reduce((sum, h) => sum + h.jumlah, 0)
    rataRata = totalJumlah > 0 ? hasilAgg.reduce((sum, h) => sum + h.jumlah * Number(h.rata ?? 0), 0) / totalJumlah : null
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data jadwal."
  }

  const berlangsung = rows.filter((row) => row.status === "berlangsung").length
  const totalRespons = rows.reduce((sum, row) => sum + row.respons, 0)
  const sinkronTerakhir = rows.reduce<string | null>((acc, row) => (row.syncedAt && (!acc || row.syncedAt > acc) ? row.syncedAt : acc), null)

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/jadwal" />
      <SidebarInset className="min-w-0 bg-muted/30">
        <DashboardNavbar title="Jadwal" description="Atur pelaksanaan ujian" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Jadwal Ujian</h1>
              <p className="text-sm text-muted-foreground">Respons Google Form ditarik otomatis tiap 5 menit selama ujian berlangsung.</p>
            </div>
            <AutoRefresh intervalMs={60_000} />
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Berlangsung" value={String(berlangsung)} description="Jadwal dalam jam ujian" icon={CalendarClock} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" />
            <StatCard label="Respons masuk" value={totalRespons.toLocaleString("id-ID")} description="Tersinkron dari Google Form" icon={FileText} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" />
            <StatCard
              label="Sinkron terakhir"
              value={relWaktu(sinkronTerakhir)}
              description={sinkronTerakhir ? `${jamWIB(sinkronTerakhir)} WIB` : "Belum ada sync"}
              icon={RefreshCw}
              accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400"
            />
            <StatCard
              label="Rata-rata nilai"
              value={rataRata === null ? "-" : (Math.round(rataRata * 10) / 10).toLocaleString("id-ID")}
              description="Dari respons tersinkron"
              icon={Percent}
              accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400"
            />
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>{databaseError}</AlertDescription>
            </Alert>
          )}

          <ExamScheduleTableCard rows={rows} banks={bankOptions} classrooms={classroomOptions} teachers={teacherOptions} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function statusJadwal(examDate: string, startTime: string, durationMinutes: number, now = Date.now()): StatusJadwal {
  const mulai = Date.parse(`${examDate}T${startTime.slice(0, 5)}:00+07:00`)
  const selesai = mulai + (durationMinutes + 10) * 60_000
  if (now < mulai) return "akan"
  if (now <= selesai) return "berlangsung"
  return "selesai"
}

function isoOrNull(value: Date | string | null): string | null {
  if (!value) return null
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

function jamWIB(iso: string): string {
  return new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" }).format(new Date(iso)).replace(".", ":")
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <UserNav name={userName} email={userEmail} />
      </div>
    </header>
  )
}

type StatCardProps = { label: string; value: string; description: string; icon: ComponentType<{ className?: string }>; accent: string }

function StatCard({ label, value, description, icon: Icon, accent }: StatCardProps) {
  return (
    <Card className="relative overflow-hidden transition-shadow hover:shadow-md">
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} />
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className={cn("truncate text-2xl font-semibold tracking-tight tabular-nums md:text-3xl", value.length > 6 && "text-lg md:text-xl")}>{value}</p>
          </div>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur",
              accent.split(" ").find((className) => className.startsWith("text-")) ?? ""
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
