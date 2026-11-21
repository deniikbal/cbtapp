import { Activity, BookOpenCheck, CalendarDays, CheckCircle2, Clock3, Settings, Users } from "lucide-react"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examSchedules, questionBanks, students, subjects } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/stat-card"

type RecentExam = {
  id: string
  name: string
  code: string
  subjectCode: string
  participants: number
  status: "Terjadwal" | "Aktif" | "Selesai" | "Nonaktif"
  schedule: string
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  let databaseError: string | null = null
  let recentExams: RecentExam[] = []
  let totalQuestionBanks = 0
  let totalStudents = 0
  let activeSessions = 0
  let finishedSessions = 0

  try {
    const [bankRows, studentRows, scheduleRows] = await Promise.all([
      db.select({ id: questionBanks.id }).from(questionBanks),
      db.select({ id: students.id, classroomId: students.classroomId }).from(students),
      db
        .select({
          id: examSchedules.id,
          active: examSchedules.active,
          examDate: examSchedules.examDate,
          startTime: examSchedules.startTime,
          durationMinutes: examSchedules.durationMinutes,
          classroomId: examSchedules.classroomId,
          className: classrooms.name,
          title: questionBanks.title,
          code: questionBanks.code,
          subjectCode: subjects.code,
        })
        .from(examSchedules)
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .orderBy(desc(examSchedules.examDate), desc(examSchedules.startTime)),
    ])

    const participantByClassroom = new Map<string, number>()
    for (const student of studentRows) {
      participantByClassroom.set(
        student.classroomId,
        (participantByClassroom.get(student.classroomId) ?? 0) + 1
      )
    }

    totalQuestionBanks = bankRows.length
    totalStudents = studentRows.length
    activeSessions = scheduleRows.filter((row) => getScheduleStatus(row) === "Aktif").length
    finishedSessions = scheduleRows.filter((row) => getScheduleStatus(row) === "Selesai").length
    recentExams = scheduleRows.slice(0, 10).map((row) => ({
      id: row.id,
      name: row.title,
      code: row.code,
      subjectCode: row.subjectCode,
      participants: participantByClassroom.get(row.classroomId) ?? 0,
      status: getScheduleStatus(row),
      schedule: `${row.className} · ${formatDate(row.examDate)} ${row.startTime.slice(0, 5)}`,
    }))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data dashboard."
  }

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard" />
      <SidebarInset className="min-w-0 bg-muted/30">
        <DashboardNavbar
          title="Dashboard"
          description="Ringkasan aktivitas SMANSABA Assesmen"
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Dashboard Assesmen
            </h1>
            <p className="text-sm text-muted-foreground">
              Ringkasan peserta, bank soal, dan jadwal ujian.
            </p>
          </section>

          {/* Stat cards: flat, neutral, green icon as the only accent */}
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Bank Soal" value={totalQuestionBanks} description="Bank assesmen tersedia" icon={BookOpenCheck} />
            <StatCard label="Peserta" value={totalStudents} description="Peserta terdaftar" icon={Users} />
            <StatCard label="Sesi Aktif" value={activeSessions} description="Sedang berjalan" icon={Activity} />
            <StatCard label="Selesai" value={finishedSessions} description="Sesi telah selesai" icon={CheckCircle2} />
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>{databaseError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <CardTitle>Jadwal Terbaru</CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {recentExams.length}
                    </Badge>
                  </div>
                  <CardDescription>
                    10 jadwal assesmen terakhir berdasarkan tanggal.
                  </CardDescription>
                </div>
                <Button nativeButton={false} size="sm" className="gap-2" render={<Link href="/dashboard/jadwal" />}>
                  <CalendarDays className="size-4" />
                  Kelola Jadwal
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <div className="hidden overflow-x-auto rounded-lg border md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-10 text-center">#</TableHead>
                      <TableHead>Nama Assesmen</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead className="text-right">Peserta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="w-24 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExams.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                            <CalendarDays className="size-8 text-muted-foreground/60" />
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">Belum ada jadwal</div>
                              <p className="text-sm">Buat jadwal pertama di menu Jadwal untuk melihatnya di sini.</p>
                            </div>
                            <Button nativeButton={false} size="sm" render={<Link href="/dashboard/jadwal" />}>
                              Kelola Jadwal
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : recentExams.map((exam, index) => (
                      <TableRow key={exam.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                                {getInitials(exam.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{exam.name}</p>
                              <p className="text-xs text-muted-foreground">{exam.subjectCode}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {exam.code}
                        </TableCell>
                        <TableCell className="text-right tabular-nums">{exam.participants}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("font-normal", getStatusBadgeClass(exam.status))}
                          >
                            {exam.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{exam.schedule}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href="/dashboard/jadwal" />}>
                              <Clock3 className="size-4" />
                              <span className="sr-only">Detail</span>
                            </Button>
                            <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href="/dashboard/jadwal" />}>
                              <Settings className="size-4" />
                              <span className="sr-only">Atur</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Daftar kartu mobile: pengganti tabel 7 kolom di layar sempit (R-03). */}
              {recentExams.length > 0 && (
                <div className="space-y-3 md:hidden">
                  {recentExams.map((exam) => (
                    <div key={exam.id} className="rounded-sm border bg-card p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-3">
                          <Avatar className="size-8">
                            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
                              {getInitials(exam.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate font-medium">{exam.name}</p>
                            <p className="font-mono text-xs text-muted-foreground">{exam.code}</p>
                          </div>
                        </div>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Peserta</dt>
                          <dd className="tabular-nums">{exam.participants}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Status</dt>
                          <dd>
                            <Badge variant="secondary" className={cn("font-normal", getStatusBadgeClass(exam.status))}>
                              {exam.status}
                            </Badge>
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-xs text-muted-foreground">Jadwal</dt>
                          <dd className="text-muted-foreground">{exam.schedule}</dd>
                        </div>
                      </dl>

                      <div className="mt-3 flex flex-wrap gap-2 border-t pt-3">
                        <Button nativeButton={false} variant="outline" size="sm" className="h-11 rounded-sm" render={<Link href="/dashboard/jadwal" />}>
                          <Clock3 className="size-4" />
                          Detail
                        </Button>
                        <Button nativeButton={false} variant="outline" size="sm" className="h-11 rounded-sm" render={<Link href="/dashboard/jadwal" />}>
                          <Settings className="size-4" />
                          Atur
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

/* ─── Helpers ─── */

function getScheduleStatus(schedule: {
  active: boolean
  examDate: string
  startTime: string
  durationMinutes: number
}): RecentExam["status"] {
  if (!schedule.active) return "Nonaktif"

  const startValue = getDateTimeValue(schedule.examDate, schedule.startTime)
  const endValue = getDateTimeValue(
    schedule.examDate,
    calculateEndTime(schedule.startTime, schedule.durationMinutes)
  )
  const now = getDateTimePartsInTimeZone("Asia/Jakarta")
  const nowValue = Number(
    `${now.year}${pad2(now.month)}${pad2(now.day)}${pad2(now.hours)}${pad2(now.minutes)}`
  )

  if (nowValue < startValue) return "Terjadwal"
  if (nowValue <= endValue) return "Aktif"
  return "Selesai"
}

function getStatusBadgeClass(status: RecentExam["status"]) {
  if (status === "Aktif") return "bg-primary/10 text-primary"
  if (status === "Selesai") return "bg-muted text-muted-foreground"
  if (status === "Nonaktif") return "bg-destructive/10 text-destructive"
  return "bg-amber-500/10 text-amber-700"
}

function getDateTimeValue(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hours, minutes] = timeValue.split(":").map(Number)
  return Number(`${year}${pad2(month)}${pad2(day)}${pad2(hours)}${pad2(minutes)}`)
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function calculateEndTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  date.setMinutes(date.getMinutes() + durationMinutes)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function getDateTimePartsInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  )
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function DashboardNavbar({
  title,
  description,
  userName,
  userEmail,
}: {
  title: string
  description: string
  userName: string
  userEmail: string
}) {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}