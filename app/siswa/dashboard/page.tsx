import type { ComponentType } from "react"
import { and, asc, desc, eq, inArray, max } from "drizzle-orm"
import {
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  CheckCircle2,
  Clock3,
  ExternalLink,
  Flame,
  GraduationCap,
  RefreshCw,
  Trophy,
} from "lucide-react"
import Link from "next/link"
import { cookies, headers } from "next/headers"
import { redirect } from "next/navigation"

import { startExam, submitExam } from "@/app/siswa/dashboard/actions"
import { StudentDashboardNav } from "@/components/student-dashboard-nav"
import { StudentLogoutButton } from "@/components/student-logout-button"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { db } from "@/lib/db"
import {
  classrooms,
  examAttempts,
  examResults,
  examSchedules,
  majors,
  questionBanks,
  students,
  subjects,
} from "@/lib/db/schema"
import { canAccessStudentArea } from "@/lib/exam-browser"
import { cn } from "@/lib/utils"

export default async function SiswaDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
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
      session: students.session,
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
        eq(examSchedules.session, student[0].session),
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

  // Hasil yang masuk lewat sync Google Form (lib/sync-hasil.ts).
  const hasilRows = await db
    .select({
      id: examResults.id,
      scheduleId: examResults.scheduleId,
      score: examResults.score,
      correct: examResults.correct,
      wrong: examResults.wrong,
      total: examResults.total,
      submittedAt: examResults.submittedAt,
      syncedAt: examResults.syncedAt,
      title: questionBanks.title,
      code: questionBanks.code,
      subjectName: subjects.name,
      subjectCode: subjects.code,
      examDate: examSchedules.examDate,
    })
    .from(examResults)
    .innerJoin(examSchedules, eq(examResults.scheduleId, examSchedules.id))
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
    .where(eq(examResults.studentId, student[0].id))
    .orderBy(desc(examResults.submittedAt))

  // Waktu sync yang ditampilkan = sync terakhir yang menyentuh hasil siswa ini.
  const syncBank = await db.select({ waktu: max(questionBanks.syncedAt) }).from(questionBanks)
  const syncHasilSendiri = hasilRows.reduce<Date | null>(
    (terakhir, baris) => (!terakhir || baris.syncedAt > terakhir ? baris.syncedAt : terakhir),
    null
  )
  const syncTerakhir = syncHasilSendiri ?? syncBank[0]?.waktu ?? null

  const attemptBySchedule = new Map(attemptRows.map((attempt) => [attempt.scheduleId, attempt]))
  const completedAttempts = attemptRows.filter((attempt) => attempt.submittedAt)
  const completedIds = completedAttempts.map((attempt) => attempt.scheduleId)
  const completedExamRows = completedIds.length
    ? await db
        .select({
          id: examSchedules.id,
          examDate: examSchedules.examDate,
          startTime: examSchedules.startTime,
          showScore: examSchedules.showScore,
          title: questionBanks.title,
          code: questionBanks.code,
          subjectName: subjects.name,
          subjectCode: subjects.code,
        })
        .from(examSchedules)
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .where(inArray(examSchedules.id, completedIds))
        .orderBy(desc(examSchedules.examDate), desc(examSchedules.startTime))
    : []
  const completedBySchedule = new Map(completedAttempts.map((attempt) => [attempt.scheduleId, attempt]))
  const hasilBySchedule = new Map(hasilRows.map((hasil) => [hasil.scheduleId, hasil]))
  const hasilTerlihat = hasilRows.filter((hasil) =>
    completedExamRows.some((schedule) => schedule.id === hasil.scheduleId && schedule.showScore)
  )
  const rataRataTampil =
    hasilTerlihat.length > 0
      ? hasilTerlihat.reduce((jumlah, baris) => jumlah + Number(baris.score), 0) / hasilTerlihat.length
      : null
  const today = getTodayInTimeZone("Asia/Jakarta")
  const visibleSchedules = schedules.filter(
    (schedule) => getExamStatus(schedule.examDate, schedule.startTime, schedule.durationMinutes) === "ACTIVE"
  )
  const todaySchedules = schedules.filter((schedule) => schedule.examDate === today).length
  const completedSchedules = attemptRows.filter((attempt) => attempt.submittedAt).length
  const activeNowSchedules = visibleSchedules.length

  const { tab } = await searchParams
  const tabAktif = tab === "hasil" ? "hasil" : "beranda"
  const progressPercent = schedules.length > 0 ? Math.round((completedSchedules / schedules.length) * 100) : 0
  const rataRata =
    hasilRows.length > 0
      ? hasilRows.reduce((jumlah, baris) => jumlah + Number(baris.score), 0) / hasilRows.length
      : null

  if (tabAktif === "hasil") {
    const dinilaiCount = completedExamRows.filter((schedule) => hasilBySchedule.has(schedule.id)).length
    const menungguCount = completedExamRows.length - dinilaiCount
    const totalBenar = completedExamRows.reduce(
      (jumlah, schedule) => jumlah + (hasilBySchedule.get(schedule.id)?.correct ?? 0),
      0
    )

    return (
      <div className="min-h-svh bg-background">
        <HeaderSiswa name={student[0].name} kelas={student[0].className} />
        <StudentDashboardNav active="hasil" />
        <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4 pb-24 sm:gap-5 sm:px-6 md:pb-6 md:pt-6">
          <section className="space-y-1">
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Hasil ujian</h1>
            <p className="text-xs text-muted-foreground sm:text-sm">
              Ujian yang sudah Anda selesaikan. Nilai muncul setelah panitia menjalankan sync hasil.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            <MetricCard label="Ujian selesai" value={String(completedExamRows.length)} icon={ClipboardCheck} warna="bg-brand" />
            <MetricCard label="Sudah dinilai" value={String(dinilaiCount)} icon={CheckCircle2} warna="bg-card text-foreground border" />
            <MetricCard label="Menunggu sync" value={String(menungguCount)} icon={RefreshCw} warna="bg-token-respons" />
            <MetricCard
              label="Rata-rata nilai"
              value={rataRataTampil === null ? "-" : rataRataTampil.toFixed(2)}
              icon={Trophy}
              warna="bg-card text-foreground border"
            />
          </section>

          {completedExamRows.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="flex items-start gap-3 px-3 py-4">
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-2">
                  <p className="text-sm">Belum ada ujian yang selesai dikerjakan.</p>
                  <p className="text-xs text-muted-foreground">
                    Ujian yang sedang berlangsung bisa dikerjakan dari menu Beranda.
                  </p>
                  <Button nativeButton={false} variant="outline" className="h-11 sm:h-9" render={<Link href="/siswa/dashboard" />}>
                    Lihat jadwal ujian
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {completedExamRows.map((schedule) => {
                const hasil = hasilBySchedule.get(schedule.id)
                const submittedAt = completedBySchedule.get(schedule.id)?.submittedAt

                return (
                  <Card key={schedule.id} className="rounded-lg">
                    <CardContent className="px-3 py-3 sm:px-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-[10px]">{schedule.code}</Badge>
                            <span className="text-[11px] text-muted-foreground sm:text-xs">
                              {schedule.subjectName} ({schedule.subjectCode})
                            </span>
                          </div>
                          <h2 className="text-sm font-medium leading-snug">{schedule.title}</h2>
                          <p className="text-[11px] text-muted-foreground sm:text-xs">
                            Selesai dikerjakan {submittedAt ? formatTanggalJam(submittedAt) : "-"}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          {hasil && schedule.showScore ? (
                            <>
                              <p className="text-2xl font-semibold tabular-nums leading-none text-primary">
                                {Number(hasil.score).toFixed(2)}
                              </p>
                              <p className="mt-1 text-[11px] text-muted-foreground">Nilai</p>
                            </>
                          ) : hasil ? (
                            <Badge variant="outline" className="text-[11px] font-normal">Nilai disembunyikan</Badge>
                          ) : (
                            <Badge variant="outline" className="border-token-respons text-[11px] font-normal text-amber-700">
                              Menunggu sync
                            </Badge>
                          )}
                        </div>
                      </div>

                      {hasil && schedule.showScore ? (
                        <>
                          <Separator className="my-3" />
                          <div className="grid grid-cols-3 gap-2 text-center text-xs">
                            <div>
                              <p className="text-[11px] text-muted-foreground">Benar</p>
                              <p className="font-semibold tabular-nums text-lime-700">{hasil.correct}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Salah</p>
                              <p className="font-semibold tabular-nums text-amber-700">{hasil.wrong}</p>
                            </div>
                            <div>
                              <p className="text-[11px] text-muted-foreground">Jumlah soal</p>
                              <p className="font-semibold tabular-nums">{hasil.total}</p>
                            </div>
                          </div>
                          <p className="mt-3 text-[11px] text-muted-foreground">
                            Sinkron terakhir {formatTanggalJam(hasil.syncedAt)}
                          </p>
                        </>
                      ) : hasil ? (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Panitia menyembunyikan nilai untuk ujian ini.
                        </p>
                      ) : (
                        <p className="mt-3 text-xs text-muted-foreground">
                          Nilai belum tersedia. Panitia belum menjalankan sync untuk ujian ini.
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </main>
      </div>
    )
  }

  const hasilTerbaru = hasilRows[0]
  const nilaiTerbaruTerlihat = hasilTerbaru
    ? completedExamRows.some((schedule) => schedule.id === hasilTerbaru.scheduleId && schedule.showScore)
    : false

  return (
    <div className="min-h-svh bg-background">
      <HeaderSiswa name={student[0].name} kelas={student[0].className} />
      <StudentDashboardNav active={tabAktif} />

      <main className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pt-4 pb-24 sm:gap-5 sm:px-6 md:pb-6 md:pt-6">
        {/* Ringkasan siswa + progres */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold tracking-tight text-foreground sm:text-xl">
                Halo, {student[0].name}
              </h1>
              <p className="text-xs text-muted-foreground">
                NIS {student[0].nis} · {student[0].className} · {student[0].majorCode}
              </p>
            </div>
            <p className="flex min-w-0 max-w-[45%] shrink items-center gap-1.5 text-[11px] text-muted-foreground sm:max-w-none">
              <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">
                Sync terakhir: {syncTerakhir ? formatTanggalJam(syncTerakhir) : "belum pernah"}
              </span>
            </p>
          </div>

          <div className="rounded-lg border bg-card px-3 py-2">
            <div className="mb-1.5 flex items-center justify-between text-xs">
              <span className="font-medium text-foreground">Progres ujian</span>
              <span className="font-medium tabular-nums text-muted-foreground">
                {completedSchedules}/{schedules.length} · {progressPercent}%
              </span>
            </div>
            <div
              className="h-1.5 overflow-hidden rounded-lg bg-muted"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres ujian selesai"
            >
              <div className="h-full rounded-lg bg-brand" style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </section>

        {/* Metrik */}
        <section className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <MetricCard label="Total ujian" value={String(schedules.length)} icon={CalendarDays} warna="bg-brand" />
          <MetricCard label="Hari ini" value={String(todaySchedules)} icon={Clock3} warna="bg-token-jadwal" />
          <MetricCard label="Berlangsung" value={String(activeNowSchedules)} icon={Flame} warna="bg-token-respons" />
          <MetricCard
            label="Rata-rata nilai"
            value={rataRata === null ? "-" : rataRata.toFixed(2)}
            icon={Trophy}
            warna="bg-card text-foreground border"
          />
        </section>

        {/* Ringkasan hasil terbaru, detail ada di menu Hasil ujian. */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold">Hasil terbaru</h2>
            <Link
              href="/siswa/dashboard?tab=hasil"
              className="flex h-11 items-center text-xs font-medium text-primary hover:underline sm:h-9"
            >
              Lihat semua hasil
            </Link>
          </div>
          {hasilRows.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="px-3 py-3 text-xs text-muted-foreground">
                Belum ada nilai yang tersinkron. Nilai muncul setelah panitia menjalankan sync hasil.
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-lg">
              <CardContent className="flex items-center justify-between gap-3 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{hasilRows[0].title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {hasilRows[0].subjectName} · {formatTanggalJam(hasilRows[0].syncedAt)}
                  </p>
                </div>
                {nilaiTerbaruTerlihat ? (
                  <p className="shrink-0 text-xl font-semibold tabular-nums text-primary">
                    {Number(hasilTerbaru.score).toFixed(2)}
                  </p>
                ) : (
                  <Badge variant="outline" className="shrink-0 text-[11px] font-normal">Nilai disembunyikan</Badge>
                )}
              </CardContent>
            </Card>
          )}
        </section>

        {/* Jadwal ujian */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Jadwal ujian</h2>
            <span className="text-xs text-muted-foreground">{visibleSchedules.length} bisa dikerjakan</span>
          </div>

          {visibleSchedules.length === 0 ? (
            <Card className="rounded-lg">
              <CardContent className="flex items-center gap-3 px-3 py-3">
                <BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <p className="text-xs text-muted-foreground">
                  Belum ada jadwal yang bisa dikerjakan sekarang. Jadwal muncul sesuai tanggal dan jam dari panitia.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {visibleSchedules.map((schedule) => {
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
                  <Card
                    key={schedule.id}
                    className={cn(
                      "rounded-lg border-l-[3px]",
                      examStatus === "ACTIVE" ? "border-l-brand" : "border-l-muted-foreground/30"
                    )}
                  >
                    <CardContent className="px-3 py-2.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Badge variant="secondary" className="font-mono text-[10px]">
                              {schedule.code}
                            </Badge>
                            {isToday && (
                              <Badge variant="outline" className="border-token-respons text-[10px] text-amber-700">
                                Hari ini
                              </Badge>
                            )}
                            <ExamStatusBadge status={examStatus} />
                          </div>
                          <h3 className="text-sm font-medium leading-snug text-foreground">{schedule.title}</h3>
                          <p className="text-[11px] text-muted-foreground">
                            {schedule.subjectName} ({schedule.subjectCode})
                          </p>
                        </div>
                        <GraduationCap className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                      </div>

                      <Separator className="my-2" />

                      <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs sm:gap-4 md:grid-cols-4">
                        <InfoItem label="Tanggal" value={formatDate(schedule.examDate)} />
                        <InfoItem label="Mulai" value={schedule.startTime.slice(0, 5)} />
                        <InfoItem label="Durasi" value={`${schedule.durationMinutes} menit`} />
                        <InfoItem
                          label="Selesai"
                          value={calculateEndTime(schedule.startTime, schedule.durationMinutes)}
                        />
                      </div>

                      <div className="mt-2.5">
                        {attemptStatus === "SUBMITTED" ? (
                          <Button variant="secondary" className="h-11 w-full gap-2 sm:h-9" disabled>
                            <CheckCircle2 className="size-4 text-brand" aria-hidden="true" />
                            Selesai dikerjakan
                          </Button>
                        ) : examStatus === "ACTIVE" ? (
                          <div className="grid gap-2">
                            <form action={startExam.bind(null, schedule.id)}>
                              <Button type="submit" className="h-11 w-full gap-2 bg-brand text-brand-foreground hover:bg-brand/90 sm:h-9">
                                {attemptStatus === "STARTED" ? "Buka lagi" : "Kerjakan ujian"}
                                <ExternalLink className="size-4" aria-hidden="true" />
                              </Button>
                            </form>
                            {attemptStatus === "STARTED" && (
                              <form action={submitExam.bind(null, schedule.id)}>
                                <Button
                                  type="submit"
                                  className="h-11 w-full gap-2 bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500/40 sm:h-9"
                                >
                                  Saya sudah selesai
                                </Button>
                              </form>
                            )}
                          </div>
                        ) : (
                          <Button variant="outline" className="h-11 w-full gap-2 sm:h-9" disabled>
                            <Clock3 className="size-4" aria-hidden="true" />
                            Waktu ujian selesai
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

function HeaderSiswa({ name, kelas }: { name: string; kelas: string }) {
  return (
    <header className="sticky top-0 z-10 bg-brand text-brand-foreground">
      <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-2 px-4 py-2.5 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight">
            SMANSABA<span className="text-brand-foreground/70">.</span>CBT
          </p>
          <p className="truncate text-[11px] sm:text-xs text-brand-foreground">
            {name} · {kelas}
          </p>
        </div>
        <StudentLogoutButton />
      </div>
    </header>
  )
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground sm:text-xs">{label}</p>
      <p className="font-medium tabular-nums text-foreground">{value}</p>
    </div>
  )
}

function ExamStatusBadge({ status }: { status: "UPCOMING" | "ACTIVE" | "FINISHED" }) {
  if (status === "ACTIVE") {
    return (
      <Badge className="bg-brand text-[10px] text-brand-foreground hover:bg-brand/90">Berlangsung</Badge>
    )
  }
  if (status === "FINISHED") {
    return (
      <Badge variant="secondary" className="text-[10px]">
        Selesai
      </Badge>
    )
  }
  return null
}

function MetricCard({
  label,
  value,
  icon: Icon,
  warna,
}: {
  label: string
  value: string
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  warna: string
}) {
  const solid = warna.startsWith("bg-card") ? "" : "text-white"
  return (
    <div className={cn("flex items-center justify-between gap-2 rounded-lg px-2.5 py-2", warna, solid)}>
      <div className="min-w-0 leading-tight">
        <p className="truncate text-[11px] sm:text-xs">{label}</p>
        <p className="text-lg font-semibold leading-none tabular-nums">{value}</p>
      </div>
      <Icon className="size-5 shrink-0 opacity-90" aria-hidden="true" />
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

function formatTanggalJam(value: Date | string) {
  const tanggal = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(tanggal.getTime())) return "-"

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  }).format(tanggal)
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