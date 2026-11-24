import { and, eq } from "drizzle-orm"
import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { UjianHeartbeat } from "@/components/ujian-heartbeat"
import { db } from "@/lib/db"
import { examSchedules, questionBanks, students } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

function statusNow(examDate: string, startTime: string, durationMinutes: number) {
  const toVal = (d: string, t: string) => {
    const [y, m, dd] = d.split("-").map(Number)
    const [h, mi] = t.split(":").map(Number)
    return Number(`${y}${String(m).padStart(2, "0")}${String(dd).padStart(2, "0")}${String(h).padStart(2, "0")}${String(mi).padStart(2, "0")}`)
  }
  const [h, mi] = startTime.split(":").map(Number)
  const end = new Date(2000, 0, 1, h, mi)
  end.setMinutes(end.getMinutes() + durationMinutes)
  const endT = `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}`
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false })
  const p = Object.fromEntries(fmt.formatToParts(new Date()).map((x) => [x.type, x.value]))
  const now = Number(`${p.year}${p.month}${p.day}${p.hour}${p.minute}`)
  if (now < toVal(examDate, startTime)) return "UPCOMING"
  if (now <= toVal(examDate, endT)) return "ACTIVE"
  return "FINISHED"
}

export default async function UjianPage({ params }: { params: Promise<{ scheduleId: string }> }) {
  const { scheduleId } = await params
  const cookieStore = await cookies()
  const studentId = cookieStore.get("student_id")?.value
  if (!studentId) redirect("/")

  const rows = await db
    .select({
      examDate: examSchedules.examDate,
      startTime: examSchedules.startTime,
      durationMinutes: examSchedules.durationMinutes,
      googleFormUrl: questionBanks.googleFormUrl,
      scheduleActive: examSchedules.active,
      bankActive: questionBanks.active,
      title: questionBanks.title,
      session: examSchedules.session,
    })
    .from(examSchedules)
    .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
    .innerJoin(students, and(eq(students.id, studentId), eq(students.session, examSchedules.session)))
    .where(and(eq(examSchedules.id, scheduleId), eq(students.active, true)))
    .limit(1)

  const s = rows[0]
  let blocked: string | null = null
  if (!s) blocked = "Jadwal ini bukan untuk sesi Anda. Hubungi guru bila keliru."
  else if (!s.scheduleActive || !s.bankActive) blocked = "Jadwal ujian tidak aktif."
  else if (statusNow(s.examDate, s.startTime, s.durationMinutes) === "UPCOMING") blocked = `Belum dimulai. Sesi ${s.session} dibuka pukul ${s.startTime.slice(0, 5)} WIB.`
  else if (statusNow(s.examDate, s.startTime, s.durationMinutes) === "FINISHED") blocked = "Waktu ujian sesi ini sudah berakhir."
  else if (!s.googleFormUrl) blocked = "Form ujian belum tersedia. Hubungi guru."

  if (blocked) {
    return (
      <main className="m3-siswa flex min-h-svh items-center justify-center p-6">
        <div className="m3-card w-full max-w-sm text-center">
          <p className="m3-judul">Tidak bisa membuka ujian</p>
          <p className="m3-sub">{blocked}</p>
          <a href="/siswa/dashboard" className="m3-btn m3-btn--tonal">Kembali ke dashboard</a>
        </div>
      </main>
    )
  }

  return (
    <div className="m3-siswa flex h-svh flex-col">
      <UjianHeartbeat scheduleId={scheduleId} />
      <header className="m3-bar">
        <div className="m3-bar-inner">
          <div className="m3-bar-text">
            <p className="m3-bar-title truncate">{s!.title}</p>
            <p className="m3-bar-sub truncate">Sesi {s!.session} · form dibuka di dalam aplikasi</p>
          </div>
          <a
            href={s!.googleFormUrl}
            target="_blank"
            rel="noreferrer"
            className="m3-btn m3-btn--garis"
            style={{ minHeight: 40, paddingInline: 16 }}
          >
            Buka tab baru
          </a>
        </div>
      </header>
      <iframe
        src={s!.googleFormUrl}
        title={s!.title}
        className="min-h-0 w-full flex-1 border-0"
        allow="camera; microphone"
      />
    </div>
  )
}
