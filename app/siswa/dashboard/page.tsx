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
  // Ujian dianggap selesai bila sudah disubmit di aplikasi ATAU hasilnya sudah masuk lewat sync Google Form.
  const selesaiIds = [
    ...new Set([...completedAttempts.map((attempt) => attempt.scheduleId), ...hasilRows.map((hasil) => hasil.scheduleId)]),
  ]
  const completedExamRows = selesaiIds.length
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
        .where(inArray(examSchedules.id, selesaiIds))
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
  const completedSchedules = selesaiIds.length
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
      <div className="m3-siswa">
        <HeaderSiswa name={student[0].name} kelas={student[0].className} nis={student[0].nis} sesi={student[0].session} />
        <StudentDashboardNav active="hasil" />
        <main className="m3-main">
          <section className="space-y-1">
            <h1 className="m3-judul">Hasil ujian</h1>
            <p className="m3-sub">
              Ujian yang sudah Anda selesaikan. Nilai muncul setelah panitia menjalankan sync hasil.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
            <MetricCard label="Ujian selesai" value={String(completedExamRows.length)} icon={ClipboardCheck} variant="utama" />
            <MetricCard label="Sudah dinilai" value={String(dinilaiCount)} icon={CheckCircle2} />
            <MetricCard label="Menunggu sync" value={String(menungguCount)} icon={RefreshCw} variant="tonal" />
            <MetricCard
              label="Rata-rata nilai"
              value={rataRataTampil === null ? "-" : rataRataTampil.toFixed(2)}
              icon={Trophy}
            />
          </section>

          {completedExamRows.length === 0 ? (
            <div className="m3-card">
              <div className="flex items-start gap-3">
                <ClipboardCheck className="mt-0.5 size-5 shrink-0 opacity-60" aria-hidden="true" />
                <div className="space-y-1">
                  <p className="m3-seksi">Belum ada ujian yang selesai dikerjakan.</p>
                  <p className="m3-sub">Ujian yang sedang berlangsung bisa dikerjakan dari menu Beranda.</p>
                </div>
              </div>
              <Link href="/siswa/dashboard" className="m3-btn m3-btn--tonal">
                Lihat jadwal ujian
              </Link>
            </div>
          ) : (
            <div className="space-y-2">
              {completedExamRows.map((schedule) => {
                const hasil = hasilBySchedule.get(schedule.id)
                const submittedAt =
                  completedBySchedule.get(schedule.id)?.submittedAt ?? hasil?.submittedAt ?? null

                return (
                  <div key={schedule.id} className="m3-card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className="m3-chip m3-chip--mono">{schedule.code}</span>
                          <span className="m3-chip">{schedule.subjectCode}</span>
                        </div>
                        <h2 className="m3-seksi leading-snug">{schedule.title}</h2>
                        <p className="m3-sub">
                          {schedule.subjectName} · selesai {submittedAt ? formatTanggalJam(submittedAt) : "-"}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        {hasil && schedule.showScore ? (
                          <>
                            <p className="m3-metric-value" style={{ fontSize: 24, lineHeight: "28px", color: "var(--m3-on-primary-container)" }}>
                              {Number(hasil.score).toFixed(2)}
                            </p>
                            <p className="m3-info-label">Nilai</p>
                          </>
                        ) : hasil ? (
                          <span className="m3-chip">Nilai disembunyikan</span>
                        ) : (
                          <span className="m3-chip m3-chip--tonal">Menunggu sync</span>
                        )}
                      </div>
                    </div>

                    {hasil && schedule.showScore ? (
                      <>
                        <div className="m3-info" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
                          <InfoItem label="Benar" value={String(hasil.correct)} />
                          <InfoItem label="Salah" value={String(hasil.wrong)} />
                          <InfoItem label="Jumlah soal" value={String(hasil.total)} />
                        </div>
                        <p className="m3-info-label">Sinkron terakhir {formatTanggalJam(hasil.syncedAt)}</p>
                      </>
                    ) : hasil ? (
                      <p className="m3-sub">Panitia menyembunyikan nilai untuk ujian ini.</p>
                    ) : (
                      <p className="m3-sub">Nilai belum tersedia. Panitia belum menjalankan sync untuk ujian ini.</p>
                    )}
                  </div>
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
    <div className="m3-siswa">
      <HeaderSiswa name={student[0].name} kelas={student[0].className} nis={student[0].nis} sesi={student[0].session} />
      <StudentDashboardNav active={tabAktif} />

      <main className="m3-main">
        {/* Ringkasan siswa + progres */}
        <section className="space-y-2">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div className="min-w-0">
              <h1 className="m3-judul truncate">Halo, {student[0].name.split(" ")[0]}</h1>
              <p className="m3-sub">NIS {student[0].nis} · {student[0].className} · {student[0].majorCode}</p>
            </div>
            <span className="m3-chip">
              <RefreshCw className="size-3.5 shrink-0" aria-hidden="true" />
              {syncTerakhir ? formatTanggalJam(syncTerakhir) : "Belum sync"}
            </span>
          </div>

          <div className="m3-card" style={{ gap: 8 }}>
            <div className="flex items-center justify-between">
              <span className="m3-seksi">Progres ujian</span>
              <span className="m3-sub tabular-nums">{completedSchedules}/{schedules.length} · {progressPercent}%</span>
            </div>
            <div
              className="m3-progress"
              role="progressbar"
              aria-valuenow={progressPercent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label="Progres ujian selesai"
            >
              <span style={{ width: `${progressPercent}%` }} />
            </div>
          </div>
        </section>

        {/* Metrik */}
        <section className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-4">
          <MetricCard label="Total ujian" value={String(schedules.length)} icon={CalendarDays} variant="utama" />
          <MetricCard label="Hari ini" value={String(todaySchedules)} icon={Clock3} />
          <MetricCard label="Berlangsung" value={String(activeNowSchedules)} icon={Flame} variant="tonal" />
          <MetricCard
            label="Rata-rata nilai"
            value={rataRata === null ? "-" : rataRata.toFixed(2)}
            icon={Trophy}
          />
        </section>

        {/* Ringkasan hasil terbaru, detail ada di menu Hasil ujian. */}
        <section>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="m3-seksi">Hasil terbaru</h2>
            <Link href="/siswa/dashboard?tab=hasil" className="m3-chip m3-chip--aktif no-underline">
              Lihat semua hasil
            </Link>
          </div>
          {hasilRows.length === 0 ? (
            <div className="m3-card">
              <p className="m3-sub">Belum ada nilai yang tersinkron. Nilai muncul setelah panitia menjalankan sync hasil.</p>
            </div>
          ) : (
            <div className="m3-card" style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <div className="min-w-0 flex-1">
                <p className="m3-seksi truncate">{hasilRows[0].title}</p>
                <p className="m3-sub">{hasilRows[0].subjectName} · {formatTanggalJam(hasilRows[0].syncedAt)}</p>
              </div>
              {nilaiTerbaruTerlihat ? (
                <p className="m3-metric-value shrink-0" style={{ fontSize: 22 }}>
                  {Number(hasilTerbaru.score).toFixed(2)}
                </p>
              ) : (
                <span className="m3-chip shrink-0">Nilai disembunyikan</span>
              )}
            </div>
          )}
        </section>

        {/* Jadwal ujian */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="m3-seksi">Jadwal ujian</h2>
            <span className="m3-chip">{visibleSchedules.length} bisa dikerjakan</span>
          </div>

          {visibleSchedules.length === 0 ? (
            <div className="m3-card">
              <div className="flex items-center gap-3">
                <BookOpen className="size-5 shrink-0 opacity-60" aria-hidden="true" />
                <p className="m3-sub">
                  Belum ada jadwal yang bisa dikerjakan sekarang. Jadwal muncul sesuai tanggal dan jam dari panitia.
                </p>
              </div>
            </div>
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
                const sudahSelesai = Boolean(attempt?.submittedAt) || hasilBySchedule.has(schedule.id)
                const attemptStatus = sudahSelesai
                  ? "SUBMITTED"
                  : attempt?.startedAt
                    ? "STARTED"
                    : "NOT_STARTED"

                return (
                  <div key={schedule.id} className="m3-card">
                    <div className="flex items-start gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-1.5">
                          <span className="m3-chip m3-chip--mono">{schedule.code}</span>
                          {isToday && <span className="m3-chip m3-chip--tonal">Hari ini</span>}

                        </div>
                        <h3 className="m3-seksi leading-snug">{schedule.title}</h3>
                        <p className="m3-sub">{schedule.subjectName} ({schedule.subjectCode})</p>
                      </div>
                      <GraduationCap className="size-6 shrink-0 opacity-60" aria-hidden="true" />
                    </div>

                    <div className="m3-info">
                      <InfoItem label="Tanggal" value={formatDate(schedule.examDate)} />
                      <InfoItem label="Mulai" value={`${schedule.startTime.slice(0, 5)} WIB`} />
                      <InfoItem label="Durasi" value={`${schedule.durationMinutes} menit`} />
                      <InfoItem
                        label="Selesai"
                        value={calculateEndTime(schedule.startTime, schedule.durationMinutes)}
                      />
                    </div>

                    {attemptStatus === "SUBMITTED" ? (
                      <div className="m3-btn m3-btn--mati">
                        <CheckCircle2 className="size-4" aria-hidden="true" />
                        Selesai dikerjakan
                      </div>
                    ) : examStatus === "ACTIVE" ? (
                      <div className="grid gap-2">
                        <form action={startExam.bind(null, schedule.id)}>
                          <button type="submit" className="m3-btn m3-btn--utama">
                            {attemptStatus === "STARTED" ? "Buka lagi" : "Kerjakan ujian"}
                            <ExternalLink className="size-4" aria-hidden="true" />
                          </button>
                        </form>
                        {attemptStatus === "STARTED" && (
                          <form action={submitExam.bind(null, schedule.id)}>
                            <button type="submit" className="m3-btn m3-btn--bahaya">
                              Saya sudah selesai
                            </button>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="m3-btn m3-btn--mati">
                        <Clock3 className="size-4" aria-hidden="true" />
                        {examStatus === "UPCOMING" ? "Belum dimulai" : "Waktu ujian selesai"}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function HeaderSiswa({ name, kelas, nis, sesi }: { name: string; kelas: string; nis: string | number; sesi: string | number }) {
  const inisial = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((kata) => kata[0]?.toUpperCase() ?? "")
    .join("")

  return (
    <header className="m3-bar">
      <div className="m3-bar-inner">
        <div className="m3-avatar" aria-hidden="true">{inisial}</div>
        <div className="m3-bar-text">
          <p className="m3-bar-title truncate">{name}</p>
          <p className="m3-bar-sub truncate">{kelas} · NIS {nis} · Sesi {sesi}</p>
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

function ExamStatusChip({ status }: { status: "UPCOMING" | "ACTIVE" | "FINISHED" }) {
  if (status === "ACTIVE") return <span className="m3-chip m3-chip--aktif">Berlangsung</span>
  if (status === "FINISHED") return <span className="m3-chip m3-chip--tutup">Waktu habis</span>
  return null
}

function MetricCard({
  label,
  value,
  icon: Icon,
  variant = "netral",
}: {
  label: string
  value: string | number
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean | "true" | "false" }>
  variant?: "netral" | "utama" | "tonal"
}) {
  return (
    <div className={cn("m3-metric", variant === "utama" && "m3-metric--utama", variant === "tonal" && "m3-metric--tonal")}>
      <div className="min-w-0">
        <p className="m3-metric-label truncate">{label}</p>
        <p className="m3-metric-value">{value}</p>
      </div>
      <Icon className="size-5 shrink-0 opacity-80" aria-hidden="true" />
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