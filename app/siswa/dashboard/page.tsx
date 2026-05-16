import type { ComponentType } from "react"
import { and, asc, eq } from "drizzle-orm"
import {
  BookOpen,
  CalendarDays,
  Clock3,
  ExternalLink,
  GraduationCap,
  UserRound,
} from "lucide-react"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { StudentLogoutButton } from "@/components/student-logout-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { db } from "@/lib/db"
import { classrooms, examSchedules, majors, questionBanks, students, subjects } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

export default async function SiswaDashboardPage() {
  const cookieStore = await cookies()
  const studentId = cookieStore.get("student_id")?.value

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

  const today = getTodayInTimeZone("Asia/Jakarta")
  const todaySchedules = schedules.filter((schedule) => schedule.examDate === today).length

  return (
    <div className="min-h-svh bg-muted/30">
      <header className="sticky top-0 z-10 border-b bg-background px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">CBT App</p>
            <p className="truncate text-xs text-muted-foreground">Dashboard Siswa</p>
          </div>
          <StudentLogoutButton />
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 py-4 sm:gap-6 sm:py-6">
        <section className="rounded-2xl bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <p className="text-xs font-medium opacity-80">Selamat datang</p>
              <h1 className="truncate text-2xl font-semibold tracking-tight">{student[0].name}</h1>
              <p className="text-sm opacity-85">NIS {student[0].nis}</p>
            </div>
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/20">
              <UserRound className="size-5" />
            </div>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <p className="text-xs opacity-75">Kelas</p>
              <p className="mt-1 font-medium">{student[0].className}</p>
            </div>
            <div className="rounded-xl bg-white/10 p-3 ring-1 ring-white/15">
              <p className="text-xs opacity-75">Jurusan</p>
              <p className="mt-1 font-medium">{student[0].majorCode}</p>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          <StatCard
            label="Total Jadwal"
            value={schedules.length}
            description="Ujian kelasmu"
            icon={CalendarDays}
            accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400"
            ringClass="ring-sky-500/20"
          />
          <StatCard
            label="Hari Ini"
            value={todaySchedules}
            description="Ujian hari ini"
            icon={Clock3}
            accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400"
            ringClass="ring-blue-500/20"
          />
        </section>

        <Card>
          <CardHeader className="border-b">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Jadwal Ujian</CardTitle>
                <CardDescription>Klik Kerjakan untuk membuka Google Form.</CardDescription>
              </div>
              <Badge variant="secondary" className="shrink-0 font-normal">
                {schedules.length} jadwal
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {schedules.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center gap-3 text-center text-muted-foreground">
                <div className="rounded-full bg-muted p-4">
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
                  const canStart = canStartExam(schedule.examDate, schedule.startTime)

                  return (
                    <article
                      key={schedule.id}
                      className="rounded-2xl border bg-background p-4 shadow-xs transition-shadow hover:shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="font-mono font-normal">
                              {schedule.code}
                            </Badge>
                            {isToday && (
                              <Badge className="bg-blue-500/10 text-blue-700 dark:text-blue-300">
                                Hari ini
                              </Badge>
                            )}
                          </div>
                          <h2 className="text-base font-semibold leading-snug">{schedule.title}</h2>
                          <p className="text-sm text-muted-foreground">
                            {schedule.subjectName} ({schedule.subjectCode})
                          </p>
                        </div>
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
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

                      {canStart ? (
                        <Button
                          nativeButton={false}
                          className="mt-4 w-full gap-2"
                          render={<a href={schedule.googleFormUrl} target="_blank" rel="noreferrer" />}
                        >
                          Kerjakan Ujian
                          <ExternalLink className="size-4" />
                        </Button>
                      ) : (
                        <Button className="mt-4 w-full gap-2" disabled>
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
    <div className="rounded-xl bg-muted/60 p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium tabular-nums">{value}</p>
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

function canStartExam(examDate: string, startTime: string) {
  const [year, month, day] = examDate.split("-").map(Number)
  const [hours, minutes] = startTime.split(":").map(Number)
  const now = getDateTimePartsInTimeZone("Asia/Jakarta")
  const nowValue = Number(
    `${now.year}${pad2(now.month)}${pad2(now.day)}${pad2(now.hours)}${pad2(now.minutes)}`
  )
  const startValue = Number(
    `${year}${pad2(month)}${pad2(day)}${pad2(hours)}${pad2(minutes)}`
  )

  return nowValue >= startValue
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

function StatCard({
  label,
  value,
  description,
  icon: Icon,
  accent,
  ringClass,
}: {
  label: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
  accent: string
  ringClass: string
}) {
  return (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} />
      <CardHeader className="relative p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-[11px] font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums">
              {value.toLocaleString("id-ID")}
            </p>
          </div>
          <div
            className={cn(
              "flex size-8 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur",
              accent.split(" ").find((className) => className.startsWith("text-")) ?? ""
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative px-4 pb-4">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}
