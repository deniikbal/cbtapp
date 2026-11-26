import { asc, eq } from "drizzle-orm"
import { CheckCircle2, Clock3, RefreshCw, Timer, Users } from "lucide-react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { AutoRefresh } from "@/components/auto-refresh"
import { ProgressTableCard } from "@/components/progress-table-card"
import type { ProgressStudent } from "@/components/progress-detail-dialog"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examAttempts, examResults, examSchedules, majors, questionBanks, students, subjects } from "@/lib/db/schema"
import { cn, relWaktu } from "@/lib/utils"
import { StatCard } from "@/components/stat-card"

type ScheduleRow = {
  id: string
  examDate: string
  startTime: string
  durationMinutes: number
  active: boolean
  session: number
  title: string
  code: string
  subjectCode: string
  className: string
  classroomId: string
  majorCode: string
}

type ProgressRow = Omit<ScheduleRow, "id" | "session" | "startTime"> & {
  /** Satu baris = satu kelas untuk satu mapel/tanggal; sesi 1 & 2 digabung. */
  id: string
  startTime: string
  sessions: number[]
  totalStudents: number
  notStarted: number
  started: number
  submitted: number
  percent: number
  students: ProgressStudent[]
}

export default async function PengerjaanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: ProgressRow[] = []
  let sinkronTerakhir: Date | null = null

  try {
    const [scheduleRows, studentRows, attemptRows, resultRows] = await Promise.all([
      db
        .select({
          id: examSchedules.id,
          examDate: examSchedules.examDate,
          startTime: examSchedules.startTime,
          durationMinutes: examSchedules.durationMinutes,
          active: examSchedules.active,
          session: examSchedules.session,
          title: questionBanks.title,
          code: questionBanks.code,
          subjectCode: subjects.code,
          className: classrooms.name,
          classroomId: classrooms.id,
          majorCode: majors.code,
        })
        .from(examSchedules)
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .innerJoin(majors, eq(classrooms.majorId, majors.id))
        .orderBy(asc(examSchedules.examDate), asc(examSchedules.startTime)),
      db
        .select({ id: students.id, name: students.name, nis: students.nis, classroomId: students.classroomId, active: students.active })
        .from(students)
        .where(eq(students.active, true))
        .orderBy(asc(students.name)),
      db
        .select({ scheduleId: examAttempts.scheduleId, studentId: examAttempts.studentId, startedAt: examAttempts.startedAt, submittedAt: examAttempts.submittedAt })
        .from(examAttempts),
      // Sync hasil Google Form hanya menulis exam_results, jadi progres harus
      // membaca dua sumber: tombol kerjakan siswa (exam_attempts) dan respons form.
      db
        .select({ scheduleId: examResults.scheduleId, studentId: examResults.studentId, startedAt: examResults.startedAt, submittedAt: examResults.submittedAt, syncedAt: examResults.syncedAt })
        .from(examResults),
    ])

    const studentsByClassroom = new Map<string, typeof studentRows>()
    for (const student of studentRows) {
      const list = studentsByClassroom.get(student.classroomId) ?? []
      list.push(student)
      studentsByClassroom.set(student.classroomId, list)
    }

    // Gabungkan dua sumber; satu siswa satu baris (submitted menang, started paling awal).
    for (const result of resultRows) {
      if (result.syncedAt && (!sinkronTerakhir || result.syncedAt > sinkronTerakhir)) sinkronTerakhir = result.syncedAt
    }
    const attemptsBySchedule = new Map<string, Map<string, { studentId: string; startedAt: Date | null; submittedAt: Date | null }>>()
    for (const attempt of [...attemptRows, ...resultRows]) {
      if (!attempt.studentId) continue
      const perStudent = attemptsBySchedule.get(attempt.scheduleId) ?? new Map()
      const lama = perStudent.get(attempt.studentId)
      perStudent.set(attempt.studentId, {
        studentId: attempt.studentId,
        startedAt: pilihAwal(lama?.startedAt ?? null, attempt.startedAt),
        submittedAt: lama?.submittedAt ?? attempt.submittedAt,
      })
      attemptsBySchedule.set(attempt.scheduleId, perStudent)
    }

    // Kelas yang punya dua sesi tetap tampil sebagai SATU baris: sesi digabung,
    // dan status tiap siswa diambil dari jadwal sesinya sendiri.
    const perKelas = new Map<string, ScheduleRow[]>()
    for (const schedule of scheduleRows) {
      const kunci = `${schedule.classroomId}|${schedule.code}|${schedule.examDate}`
      perKelas.set(kunci, [...(perKelas.get(kunci) ?? []), schedule])
    }

    rows = [...perKelas.values()].map((jadwal) => {
      const pertama = jadwal[0]
      const sessions = [...new Set(jadwal.map((item) => item.session ?? 1))].sort((a, b) => a - b)
      const idJadwal = jadwal.map((item) => item.id)
      const classStudents = studentsByClassroom.get(pertama.classroomId) ?? []
      const attemptByStudent = new Map<string, { studentId: string; startedAt: Date | null; submittedAt: Date | null }>()
      for (const id of idJadwal) {
        for (const [studentId, attempt] of attemptsBySchedule.get(id) ?? []) {
          const lama = attemptByStudent.get(studentId)
          attemptByStudent.set(studentId, {
            studentId,
            startedAt: pilihAwal(lama?.startedAt ?? null, attempt.startedAt),
            submittedAt: lama?.submittedAt ?? attempt.submittedAt,
          })
        }
      }
      const studentDetails: ProgressStudent[] = classStudents.map((student) => {
        const attempt = attemptByStudent.get(student.id)
        const status = attempt?.submittedAt ? "SUBMITTED" : attempt?.startedAt ? "STARTED" : "NOT_STARTED"

        return {
          id: student.id,
          name: student.name,
          nis: student.nis,
          status,
          startedAt: attempt?.startedAt?.toISOString() ?? null,
          submittedAt: attempt?.submittedAt?.toISOString() ?? null,
        }
      })
      const submitted = studentDetails.filter((student) => student.status === "SUBMITTED").length
      const startedOnly = studentDetails.filter((student) => student.status === "STARTED").length
      const totalStudents = studentDetails.length
      const notStarted = Math.max(totalStudents - submitted - startedOnly, 0)
      const percent = totalStudents ? Math.round((submitted / totalStudents) * 100) : 0

      return {
        ...pertama,
        id: jadwal.map((item) => item.id).join(","),
        startTime: [...jadwal].map((item) => item.startTime).sort()[0],
        sessions,
        totalStudents,
        notStarted,
        started: startedOnly,
        submitted,
        percent,
        students: studentDetails,
      }
    })
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data pengerjaan."
  }

  const totalStudents = rows.reduce((sum, row) => sum + row.totalStudents, 0)
  const totalSubmitted = rows.reduce((sum, row) => sum + row.submitted, 0)
  const totalStarted = rows.reduce((sum, row) => sum + row.started, 0)
  const totalNotStarted = rows.reduce((sum, row) => sum + row.notStarted, 0)

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/pengerjaan" />
      <SidebarInset className="min-w-0 bg-muted/30">
        <DashboardNavbar title="Pengerjaan" description="Pantau status pengerjaan assesmen" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Progress Pengerjaan</h1>
              <p className="text-sm text-muted-foreground">Respons Google Form ditarik otomatis tiap 5 menit selama ujian berlangsung.</p>
            </div>
            <div className="flex flex-col items-start gap-1 md:items-end">
              <AutoRefresh intervalMs={60_000} />
              <p className="text-xs text-muted-foreground">Sync gform terakhir: {sinkronTerakhir ? `${relWaktu(sinkronTerakhir.toISOString())} • ${jamWIB(sinkronTerakhir.toISOString())} WIB` : "belum ada"}</p>
            </div>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Target" value={totalStudents.toLocaleString("id-ID")} description="Total peserta terjadwal" icon={Users} />
            <StatCard label="Selesai" value={totalSubmitted.toLocaleString("id-ID")} description="Tombol selesai + respons form" icon={CheckCircle2} />
            <StatCard label="Sedang" value={totalStarted.toLocaleString("id-ID")} description="Sudah mulai, belum selesai" icon={Timer} />
            <StatCard label="Belum" value={totalNotStarted.toLocaleString("id-ID")} description="Belum mulai" icon={Clock3} />
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>{databaseError}</AlertDescription>
            </Alert>
          )}

          <ProgressTableCard rows={rows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function pilihAwal(a: Date | null, b: Date | null) {
  if (!a) return b
  if (!b) return a
  return a < b ? a : b
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

