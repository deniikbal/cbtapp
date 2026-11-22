import { redirect } from "next/navigation"
import { asc, eq, inArray, sql } from "drizzle-orm"
import { CheckCircle2, Clock3, LogOut, Timer, Users } from "lucide-react"

import { logoutProktor, proktorAktif } from "@/app/proktor/login/actions"
import { AutoRefresh } from "@/components/auto-refresh"
import { ProktorBottomNav, ProktorNav } from "@/components/proktor-nav"
import { ProgressTableCard } from "@/components/progress-table-card"
import type { ProgressStudent } from "@/components/progress-detail-dialog"
import { StatCard } from "@/components/stat-card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { db } from "@/lib/db"
import { classrooms, examAttempts, examResults, examSchedules, majors, questionBanks, students, subjects } from "@/lib/db/schema"
import { relWaktu } from "@/lib/utils"

export const dynamic = "force-dynamic"

// Konsep & UI sama dengan /dashboard/pengerjaan milik admin, hanya dibatasi ke
// bank soal yang menunjuk proktor ini.
export default async function ProktorPengerjaanPage() {
  const proktor = await proktorAktif()
  if (!proktor) redirect("/proktor")

  let databaseError: string | null = null
  let rows: {
    id: string
    examDate: string
    startTime: string
    durationMinutes: number
    active: boolean
    title: string
    code: string
    subjectCode: string
    className: string
    classroomId: string
    majorCode: string
    totalStudents: number
    notStarted: number
    started: number
    submitted: number
    percent: number
    students: ProgressStudent[]
  }[] = []
  let sinkronTerakhir: Date | null = null

  try {
    const bankRows = await db
      .select({ id: questionBanks.id })
      .from(questionBanks)
      .where(sql`${questionBanks.proctorIds} @> ${JSON.stringify([proktor.id])}::jsonb`)
    const bankIds = bankRows.map((b) => b.id)

    const [scheduleRows, studentRows, attemptRows, resultRows] = await Promise.all([
      bankIds.length
        ? db
            .select({
              id: examSchedules.id,
              examDate: examSchedules.examDate,
              startTime: examSchedules.startTime,
              durationMinutes: examSchedules.durationMinutes,
              active: examSchedules.active,
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
            .where(inArray(examSchedules.questionBankId, bankIds))
            .orderBy(asc(examSchedules.examDate), asc(examSchedules.startTime))
        : [],
      db.select({ id: students.id, name: students.name, nis: students.nis, classroomId: students.classroomId }).from(students).orderBy(asc(students.name)),
      db
        .select({ scheduleId: examAttempts.scheduleId, studentId: examAttempts.studentId, startedAt: examAttempts.startedAt, submittedAt: examAttempts.submittedAt })
        .from(examAttempts),
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

    rows = scheduleRows.map((schedule) => {
      const classStudents = studentsByClassroom.get(schedule.classroomId) ?? []
      const attemptByStudent = attemptsBySchedule.get(schedule.id) ?? new Map<string, { studentId: string; startedAt: Date | null; submittedAt: Date | null }>()
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

      return { ...schedule, totalStudents, notStarted, started: startedOnly, submitted, percent, students: studentDetails }
    })
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data pengerjaan."
  }

  const totalStudents = rows.reduce((sum, row) => sum + row.totalStudents, 0)
  const totalSubmitted = rows.reduce((sum, row) => sum + row.submitted, 0)
  const totalStarted = rows.reduce((sum, row) => sum + row.started, 0)
  const totalNotStarted = rows.reduce((sum, row) => sum + row.notStarted, 0)

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
            <ProktorNav />
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

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-24 md:px-6 md:pb-6 lg:px-8">
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
      </div>
      <ProktorBottomNav />
    </main>
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
