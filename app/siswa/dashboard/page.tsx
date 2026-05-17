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
  Sparkles,
  Trophy,
  UserRound,
} from "lucide-react"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { startExam, submitExam } from "@/app/siswa/dashboard/actions"
import { StudentLogoutButton } from "@/components/student-logout-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="min-h-svh overflow-hidden bg-[#fff7d6] bg-[radial-gradient(circle_at_15%_10%,rgba(34,211,238,.35),transparent_28%),radial-gradient(circle_at_90%_0%,rgba(244,114,182,.35),transparent_26%),radial-gradient(circle_at_50%_100%,rgba(132,204,22,.25),transparent_32%)]">
      <header className="sticky top-0 z-10 border-b-4 border-black bg-white/80 px-4 py-3 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-black tracking-tight text-black">SMANSABA<span className="text-fuchsia-600">.</span>Quest</p>
            <p className="truncate text-xs font-bold text-black/60">Student exam arena</p>
          </div>
          <StudentLogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:py-6">
        <section className="relative overflow-hidden rounded-[2rem] border-4 border-black bg-gradient-to-br from-fuchsia-500 via-violet-500 to-cyan-400 p-5 text-white shadow-[8px_8px_0_#111] sm:p-6">
          <div className="absolute -top-10 -right-8 size-32 rounded-full bg-yellow-300/80 blur-sm" />
          <div className="absolute right-16 bottom-4 size-8 rotate-12 rounded-lg border-4 border-black bg-lime-300" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <Badge className="border-2 border-black bg-yellow-300 text-black shadow-[3px_3px_0_#111] hover:bg-yellow-300">
                <Sparkles className="mr-1 size-3.5" /> Ready player?
              </Badge>
              <h1 className="truncate text-3xl font-black tracking-tight sm:text-4xl">Hi, {student[0].name}</h1>
              <p className="text-sm font-bold text-white/85">NIS {student[0].nis} • {student[0].className} • {student[0].majorCode}</p>
            </div>
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl border-4 border-black bg-white text-fuchsia-600 shadow-[5px_5px_0_#111]">
              <UserRound className="size-7" />
            </div>
          </div>
          <div className="relative mt-6 rounded-2xl border-2 border-white/40 bg-black/20 p-3 backdrop-blur">
            <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-wide">
              <span>Progress Quest</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full border-2 border-black bg-white">
              <div className="h-full rounded-full bg-gradient-to-r from-lime-300 to-yellow-300" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PlayStatCard label="Total Quest" value={schedules.length} description="Jadwal kelasmu" icon={CalendarDays} className="bg-cyan-300" />
          <PlayStatCard label="Hari Ini" value={todaySchedules} description="Misi hari ini" icon={Clock3} className="bg-yellow-300" />
          <PlayStatCard label="Live Now" value={activeNowSchedules} description="Sedang aktif" icon={Flame} className="bg-fuchsia-300" />
          <PlayStatCard label="Done" value={completedSchedules} description="Sudah submit" icon={Trophy} className="bg-lime-300" />
        </section>

        <Card className="overflow-hidden rounded-[1.75rem] border-4 border-black bg-white shadow-[8px_8px_0_#111]">
          <CardHeader className="border-b-4 border-black bg-black text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle className="text-2xl font-black tracking-tight">Exam Missions</CardTitle>
                <CardDescription className="font-semibold text-white/70">Klik Kerjakan untuk membuka Google Form.</CardDescription>
              </div>
              <Badge className="shrink-0 border-2 border-white bg-fuchsia-500 font-bold text-white">
                {schedules.length} jadwal
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <div className="rounded-3xl border-4 border-black bg-yellow-300 p-4 text-black shadow-[5px_5px_0_#111]">
                  <BookOpen className="size-7" />
                </div>
                <div className="space-y-1">
                  <p className="font-medium text-foreground">Belum ada jadwal</p>
                  <p className="max-w-sm text-sm">
                    Jadwal ujian akan tampil setelah admin membuat jadwal untuk kelasmu.
                  </p>
                </div>
              </div>
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
                    <article
                      key={schedule.id}
                      className="group rounded-[1.5rem] border-4 border-black bg-gradient-to-br from-white to-cyan-50 p-4 shadow-[5px_5px_0_#111] transition-transform hover:-translate-y-1 hover:shadow-[8px_8px_0_#111]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-2 border-black bg-yellow-300 font-mono font-bold text-black hover:bg-yellow-300">
                              {schedule.code}
                            </Badge>
                            {isToday && (
                              <Badge className="border-2 border-black bg-fuchsia-500 font-bold text-white hover:bg-fuchsia-500">
                                Hari ini
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-lg font-black leading-snug text-black">{schedule.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {schedule.subjectName} ({schedule.subjectCode})
                          </p>
                        </div>
                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border-4 border-black bg-lime-300 text-black shadow-[3px_3px_0_#111] transition-transform group-hover:rotate-6">
                          <GraduationCap className="size-5" />
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
                        <InfoItem label="Tanggal" value={formatDate(schedule.examDate)} />
                        <InfoItem label="Mulai" value={schedule.startTime.slice(0, 5)} />
                        <InfoItem label="Durasi" value={`${schedule.durationMinutes} menit`} />
                        <InfoItem
                          label="Selesai"
                          value={calculateEndTime(schedule.startTime, schedule.durationMinutes)}
                        />
                      </div>

                      {attemptStatus === "SUBMITTED" ? (
                        <Button className="mt-4 w-full gap-2 border-2 border-black bg-lime-300 font-black text-black shadow-[4px_4px_0_#111]" disabled>
                          Selesai dikerjakan
                          <CheckCircle2 className="size-4" />
                        </Button>
                      ) : examStatus === "ACTIVE" ? (
                        <div className="mt-4 grid gap-2">
                          <form action={startExam.bind(null, schedule.id, schedule.googleFormUrl)}>
                            <Button type="submit" className="w-full gap-2 border-2 border-black bg-fuchsia-500 font-black text-white shadow-[4px_4px_0_#111] transition-transform hover:-translate-y-0.5 hover:bg-fuchsia-600 hover:shadow-[6px_6px_0_#111]">
                              {attemptStatus === "STARTED" ? "Buka Lagi" : "Kerjakan Ujian"}
                              <ExternalLink className="size-4" />
                            </Button>
                          </form>
                          {attemptStatus === "STARTED" && (
                            <form action={submitExam.bind(null, schedule.id)}>
                              <Button type="submit" variant="outline" className="w-full gap-2 border-2 border-black font-black shadow-[4px_4px_0_#111]">
                                Saya sudah selesai
                              </Button>
                            </form>
                          )}
                        </div>
                      ) : examStatus === "FINISHED" ? (
                        <Button className="mt-4 w-full gap-2 border-2 border-black font-black shadow-[4px_4px_0_#111]" disabled>
                          Waktu ujian selesai
                          <Clock3 className="size-4" />
                        </Button>
                      ) : (
                        <Button className="mt-4 w-full gap-2 border-2 border-black font-black shadow-[4px_4px_0_#111]" disabled>
                          Belum bisa dikerjakan
                          <Clock3 className="size-4" />
                        </Button>
                      )}
                    </article>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border-2 border-black bg-white p-3 shadow-[3px_3px_0_#111]">
      <p className="text-xs font-bold text-black/55">{label}</p>
      <p className="mt-1 font-black tabular-nums text-black">{value}</p>
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

function PlayStatCard({
  label,
  value,
  description,
  icon: Icon,
  className,
}: {
  label: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
  className: string
}) {
  return (
    <div className={cn("rounded-3xl border-4 border-black p-4 text-black shadow-[5px_5px_0_#111] transition-transform hover:-translate-y-1", className)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wide text-black/60">{label}</p>
          <p className="mt-1 text-3xl font-black tracking-tight tabular-nums">{value.toLocaleString("id-ID")}</p>
        </div>
        <div className="flex size-9 items-center justify-center rounded-2xl border-2 border-black bg-white">
          <Icon className="size-4" />
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-black/65">{description}</p>
    </div>
  )
}
