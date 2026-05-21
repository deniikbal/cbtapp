import type { ComponentType } from "react"
import { and, asc, eq } from "drizzle-orm"
import {
  BookOpen,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flame,
  GraduationCap,
  Trophy,
  UserRound,
} from "lucide-react"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { startExam, submitExam } from "@/app/siswa/dashboard/actions"
import { StudentLogoutButton } from "@/components/student-logout-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { db } from "@/lib/db"
import { classrooms, examAttempts, examSchedules, majors, questionBanks, students, subjects } from "@/lib/db/schema"
import { canAccessStudentArea } from "@/lib/exam-browser"
import { cn } from "@/lib/utils"


export default async function SiswaDashboardPage() {
  const cookieStore = await cookies()
  const headerStore = await headers()
  const studentId = cookieStore.get("student_id")?.value

  if (!(await canAccessStudentArea(headerStore.get("user-agent") ?? ""))) {
    redirect("/blocked")
  }

  if (!studentId) redirect("/")

  const student = await db
    .select({
      id: students.id,
      name: students.name,
      nis: students.nis,
      active: students.active,
      classroomId: classrooms.id,
      className: classrooms.name,
      majorName: majors.name,
      majorCode: majors.code,
    })
    .from(students)
    .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
    .innerJoin(majors, eq(classrooms.majorId, majors.id))
    .where(eq(students.id, studentId))
    .limit(1)

  if (!student[0] || !student[0].active) redirect("/")

  const schedules = await db
    .select({
      id: examSchedules.id,
      examDate: examSchedules.examDate,
      startTime: examSchedules.startTime,
      durationMinutes: examSchedules.durationMinutes,
      title: questionBanks.title,
      code: questionBanks.code,
      googleFormUrl: questionBanks.googleFormUrl,
      subjectName: subjects.name,
      subjectCode: subjects.code,
    })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(
      and(
        eq(examSchedules.classroomId, student[0].classroomId),
        eq(examSchedules.active, true),
        eq(questionBanks.active, true)
      )
    )
    .orderBy(asc(examSchedules.examDate), asc(examSchedules.startTime))

  const attemptRows = await db
    .select({
      scheduleId: examAttempts.scheduleId,
      startedAt: examAttempts.startedAt,
      submittedAt: examAttempts.submittedAt,
    })
    .from(examAttempts)
    .where(eq(examAttempts.studentId, student[0].id))

  const attemptBySchedule = new Map(attemptRows.map((attempt) => [attempt.scheduleId, attempt]))
  const today = getTodayInTimeZone("Asia/Jakarta")
  const todaySchedules = schedules.filter((schedule) => schedule.examDate === today).length
  const completedSchedules = attemptRows.filter((attempt) => attempt.submittedAt).length
  const activeNowSchedules = schedules.filter(
    (schedule) => getExamStatus(schedule.examDate, schedule.startTime, schedule.durationMinutes) === "ACTIVE"
  ).length
  const progressPercent = schedules.length > 0 ? Math.round((completedSchedules / schedules.length) * 100) : 0

  return (
    <div className="min-h-svh bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-lg">
        <div className="h-1 bg-gradient-to-r from-primary via-blue-400 to-primary/40" />
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold tracking-tight text-foreground">
              SMANSABA<span className="text-primary">.</span>CBT
            </p>
          </div>
          <StudentLogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:gap-6 sm:px-6 sm:py-8">
        {/* Welcome Section */}
        <section className="space-y-4 rounded-2xl bg-gradient-to-br from-primary/5 via-transparent to-blue-500/5 p-4 sm:p-5">
          <div className="flex items-center gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary/10">
              <UserRound className="size-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                Halo, {student[0].name}
              </h1>
              <p className="text-sm text-muted-foreground">
                NIS {student[0].nis} · {student[0].className} · {student[0].majorCode}
              </p>
            </div>
          </div>

          {/* Progress */}
          <div className="rounded-xl border bg-card p-4">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">Progress Ujian</span>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-blue-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {completedSchedules} dari {schedules.length} ujian selesai
            </p>
          </div>
        </section>

        {/* Stat Cards */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Ujian" value={schedules.length} icon={CalendarDays} color="blue" />
          <StatCard label="Hari Ini" value={todaySchedules} icon={Clock3} color="amber" />
          <StatCard label="Berlangsung" value={activeNowSchedules} icon={Flame} color="rose" />
          <StatCard label="Selesai" value={completedSchedules} icon={Trophy} color="green" />
        </section>

        {/* Exam List */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-base font-semibold text-foreground">Jadwal Ujian</h2>
            <span className="text-sm text-muted-foreground">{schedules.length} jadwal</span>
          </div>

          {schedules.length === 0 ? (
            <Card>
              <CardContent className="flex min-h-56 flex-col items-center justify-center gap-3 text-center">
                <div className="rounded-xl bg-primary/10 p-3">
                  <BookOpen className="size-6 text-primary" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">Belum ada jadwal</p>
                  <p className="max-w-xs text-sm text-muted-foreground">
                    Jadwal ujian akan tampil setelah admin membuat jadwal untuk kelasmu.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {schedules.map((schedule) => {
                const isToday = schedule.examDate === today
                const examStatus = getExamStatus(
                  schedule.examDate,
                  schedule.startTime,
                  schedule.durationMinutes
                )
                const attempt = attemptBySchedule.get(schedule.id)
                const attemptStatus = attempt?.submittedAt
                  ? "SUBMITTED"
                  : attempt?.startedAt
                    ? "STARTED"
                    : "NOT_STARTED"

                return (
                  <Card key={schedule.id} className={cn(
                    "border-l-[3px] transition-shadow hover:shadow-md",
                    examStatus === "ACTIVE" ? "border-l-primary" : examStatus === "UPCOMING" ? "border-l-amber-400" : "border-l-muted-foreground/30"
                  )}>
                    <CardContent className="p-4 sm:p-5">
                      {/* Top row: Title & Status */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-xs">
                              {schedule.code}
                            </Badge>
                            {isToday && (
                              <Badge className="border-amber-200 bg-amber-100 text-xs text-amber-700 hover:bg-amber-100">
                                Hari ini
                              </Badge>
                            )}
                            <ExamStatusBadge status={examStatus} />
                          </div>
                          <h3 className="text-base font-semibold leading-snug text-foreground">
                            {schedule.title}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {schedule.subjectName} ({schedule.subjectCode})
                          </p>
                        </div>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <GraduationCap className="size-4.5 text-primary" />
                        </div>
                      </div>

                      <Separator className="my-3" />

                      {/* Info Grid */}
                      <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                        <InfoItem label="Tanggal" value={formatDate(schedule.examDate)} />
                        <InfoItem label="Mulai" value={schedule.startTime.slice(0, 5)} />
                        <InfoItem label="Durasi" value={`${schedule.durationMinutes} menit`} />
                        <InfoItem
                          label="Selesai"
                          value={calculateEndTime(schedule.startTime, schedule.durationMinutes)}
                        />
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4">
                        {attemptStatus === "SUBMITTED" ? (
                          <Button variant="secondary" className="w-full gap-2" disabled>
                            <CheckCircle2 className="size-4 text-primary" />
                            Selesai dikerjakan
                          </Button>
                        ) : examStatus === "ACTIVE" ? (
                          <div className="grid gap-2">
                            <form action={startExam.bind(null, schedule.id, schedule.googleFormUrl)}>
                              <Button type="submit" className="w-full gap-2">
                                {attemptStatus === "STARTED" ? "Buka Lagi" : "Kerjakan Ujian"}
                                <ExternalLink className="size-4" />
                              </Button>
                            </form>
                            {attemptStatus === "STARTED" && (
                              <form action={submitExam.bind(null, schedule.id)}>
                                <Button type="submit" variant="outline" className="w-full gap-2">
                                  Saya sudah selesai
                                </Button>
                              </form>
                            )}
                          </div>
                        ) : examStatus === "FINISHED" ? (
                          <Button variant="outline" className="w-full gap-2" disabled>
                            <Clock3 className="size-4" />
                            Waktu ujian selesai
                          </Button>
                        ) : (
                          <Button variant="outline" className="w-full gap-2" disabled>
                            <Clock3 className="size-4" />
                            Belum bisa dikerjakan
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function ExamStatusBadge({ status }: { status: "UPCOMING" | "ACTIVE" | "FINISHED" }) {
  if (status === "ACTIVE") {
    return (
      <Badge variant="default" className="text-xs">
        Berlangsung
      </Badge>
    )
  }
  if (status === "FINISHED") {
    return (
      <Badge variant="secondary" className="text-xs">
        Selesai
      </Badge>
    )
  }
  return null
}

const statColorMap = {
  blue: { bg: "bg-blue-50", icon: "text-blue-500" },
  amber: { bg: "bg-amber-50", icon: "text-amber-500" },
  rose: { bg: "bg-rose-50", icon: "text-rose-500" },
  green: { bg: "bg-emerald-50", icon: "text-emerald-500" },
} as const

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string
  value: number
  icon: ComponentType<{ className?: string }>
  color: keyof typeof statColorMap
}) {
  const colors = statColorMap[color]
  return (
    <div className="rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className={cn("flex size-8 items-center justify-center rounded-lg", colors.bg)}>
          <Icon className={cn("size-4", colors.icon)} />
        </div>
      </div>
      <p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value.toLocaleString("id-ID")}
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{label}</p>
    </div>
  )
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
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

function getExamStatus(
  examDate: string,
  startTime: string,
  durationMinutes: number
): "UPCOMING" | "ACTIVE" | "FINISHED" {
  const startValue = getDateTimeValue(examDate, startTime)
  const endValue = getDateTimeValue(examDate, calculateEndTime(startTime, durationMinutes))
  const now = getDateTimePartsInTimeZone("Asia/Jakarta")
  const nowValue = Number(
    `${now.year}${pad2(now.month)}${pad2(now.day)}${pad2(now.hours)}${pad2(now.minutes)}`
  )

  if (nowValue < startValue) return "UPCOMING"
  if (nowValue <= endValue) return "ACTIVE"
  return "FINISHED"
}

function getDateTimeValue(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hours, minutes] = timeValue.split(":").map(Number)

  return Number(`${year}${pad2(month)}${pad2(day)}${pad2(hours)}${pad2(minutes)}`)
}

function getTodayInTimeZone(timeZone: string) {
  const parts = getDateTimePartsInTimeZone(timeZone)

  return `${parts.year}-${pad2(parts.month)}-${pad2(parts.day)}`
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
