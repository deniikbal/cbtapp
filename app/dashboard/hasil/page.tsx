import { asc, desc, eq, isNull } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, CheckCircle2, FileText, GraduationCap, Home, LayoutDashboard, Percent, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { HasilTableCard, type HasilRow } from "@/components/hasil-table-card"
import { ResponsTakTerhubungCard, type ResponsTakTerhubung, type SiswaPilihan } from "@/components/respons-tak-terhubung-card"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, students, subjects } from "@/lib/db/schema"
import { soalDariItems } from "@/lib/google-forms"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/stat-card"

export default async function HasilPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: HasilRow[] = []

  try {
    const [scheduleRows, hasilRows] = await Promise.all([
      db
        .select({
          id: examSchedules.id,
          bankId: questionBanks.id,
          examDate: examSchedules.examDate,
          startTime: examSchedules.startTime,
          title: questionBanks.title,
          code: questionBanks.code,
          formId: questionBanks.formId,
          formItems: questionBanks.formItems,
          syncedAt: questionBanks.syncedAt,
          className: classrooms.name,
        })
        .from(examSchedules)
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .orderBy(asc(examSchedules.examDate), asc(examSchedules.startTime)),
      db.select({ scheduleId: examResults.scheduleId, score: examResults.score }).from(examResults),
    ])

    // Satu baris = satu bank soal (satu Google Form), bukan per jadwal/kelas.
    const bankDariJadwal = new Map(scheduleRows.map((s) => [s.id, s.bankId]))
    const perBank = new Map<string, number[]>()
    for (const h of hasilRows) {
      const bankId = bankDariJadwal.get(h.scheduleId)
      if (!bankId) continue
      const list = perBank.get(bankId) ?? []
      list.push(Number(h.score))
      perBank.set(bankId, list)
    }

    const kelompok = new Map<string, typeof scheduleRows>()
    for (const s of scheduleRows) {
      const list = kelompok.get(s.bankId) ?? []
      list.push(s)
      kelompok.set(s.bankId, list)
    }

    rows = [...kelompok.entries()].map(([bankId, jadwal]) => {
      const utama = jadwal[0]
      const nilai = perBank.get(bankId) ?? []
      return {
        id: utama.id,
        bankId,
        title: utama.title,
        code: utama.code,
        kelas: [...new Set(jadwal.map((j) => j.className))].sort().join(", "),
        jumlahJadwal: jadwal.length,
        examDate: utama.examDate,
        startTime: utama.startTime,
        adaFormId: Boolean(utama.formId),
        soalDinilai: soalDariItems((utama.formItems as unknown[] | null) ?? []).filter((soal) => soal.kunci.length > 0).length,
        syncedAt: utama.syncedAt ? utama.syncedAt.toISOString() : null,
        respons: nilai.length,
        rataRata: nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null,
      }
    })
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data hasil ujian."
  }

  // Respons yang NIS/namanya tidak cocok — dikumpulkan supaya bisa diselamatkan manual.
  let takTerhubung: ResponsTakTerhubung[] = []
  let kelasList: { id: string; name: string }[] = []
  let siswaList: SiswaPilihan[] = []
  try {
    const [barisLiar, kelasRows, siswaRows] = await Promise.all([
      db
        .select({
          id: examResults.id,
          nis: examResults.nis,
          nama: examResults.nama,
          bank: questionBanks.title,
          kelas: classrooms.name,
          submittedAt: examResults.submittedAt,
        })
        .from(examResults)
        .innerJoin(examSchedules, eq(examResults.scheduleId, examSchedules.id))
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .where(isNull(examResults.studentId))
        .orderBy(desc(examResults.submittedAt))
        .limit(100),
      db.select({ id: classrooms.id, name: classrooms.name }).from(classrooms),
      db.select({ id: students.id, name: students.name, nis: students.nis, classroomId: students.classroomId }).from(students),
    ])
    takTerhubung = barisLiar.map((r) => ({
      id: r.id,
      nis: r.nis,
      nama: r.nama,
      bank: r.bank,
      kelas: r.kelas,
      kelasWaktu: r.kelas,
      submittedAt: r.submittedAt ? new Date(r.submittedAt).toLocaleString("id-ID") : null,
    }))
    kelasList = kelasRows
    siswaList = siswaRows
  } catch {
    takTerhubung = []
  }

  const totalJadwal = rows.length
  const adaHasil = rows.filter((row) => row.respons > 0).length
  const totalRespons = rows.reduce((sum, row) => sum + row.respons, 0)
  const semuaNilai = rows.filter((row) => row.rataRata !== null).map((row) => row.rataRata as number)
  const rataRata = semuaNilai.length ? semuaNilai.reduce((a, b) => a + b, 0) / semuaNilai.length : 0

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/hasil" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Hasil Ujian" description="Rekap nilai dari Google Form" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Hasil Ujian</h1>
            <p className="text-sm text-muted-foreground">Respons Google Form ditarik lewat Forms API, dicocokkan dengan NIS peserta, lalu dinilai dari kunci jawaban form.</p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Bank Soal" value={totalJadwal} description="Bank soal berjadwal" icon={CalendarDays} />
            <StatCard label="Ada hasil" value={adaHasil} description="Bank soal sudah punya respons" icon={CheckCircle2} />
            <StatCard label="Respons" value={totalRespons} description="Jawaban tersimpan" icon={FileText} />
            <StatCard label="Rata-rata" value={Math.round(rataRata * 10) / 10} description="Nilai rata-rata keseluruhan" icon={Percent} />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <ResponsTakTerhubungCard rows={takTerhubung} kelasList={kelasList} siswaList={siswaList} />

          <HasilTableCard rows={rows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
