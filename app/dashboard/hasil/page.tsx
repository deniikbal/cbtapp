import type { ComponentType } from "react"
import { asc, eq } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, CheckCircle2, FileText, GraduationCap, Home, LayoutDashboard, Percent, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { HasilTableCard, type HasilRow } from "@/components/hasil-table-card"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examResults, examSchedules, questionBanks, subjects } from "@/lib/db/schema"
import { soalDariItems } from "@/lib/google-forms"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },

  { href: "/dashboard/guru", label: "Guru", icon: UserRound, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck, active: false },
  { href: "/dashboard/hasil", label: "Hasil Ujian", icon: BarChart3, active: true },
  { href: "/dashboard/user", label: "User", icon: UserCog, active: false },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings, active: false },
]

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
        respons: nilai.length,
        rataRata: nilai.length ? nilai.reduce((a, b) => a + b, 0) / nilai.length : null,
      }
    })
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data hasil ujian."
  }

  const totalJadwal = rows.length
  const adaHasil = rows.filter((row) => row.respons > 0).length
  const totalRespons = rows.reduce((sum, row) => sum + row.respons, 0)
  const semuaNilai = rows.filter((row) => row.rataRata !== null).map((row) => row.rataRata as number)
  const rataRata = semuaNilai.length ? semuaNilai.reduce((a, b) => a + b, 0) / semuaNilai.length : 0

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Hasil Ujian" description="Rekap nilai dari Google Form" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Hasil Ujian</h1>
            <p className="text-sm text-muted-foreground">Respons Google Form ditarik lewat Forms API, dicocokkan dengan NIS peserta, lalu dinilai dari kunci jawaban form.</p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Bank Soal" value={totalJadwal} description="Bank soal berjadwal" icon={CalendarDays} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Ada hasil" value={adaHasil} description="Bank soal sudah punya respons" icon={CheckCircle2} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Respons" value={totalRespons} description="Jawaban tersimpan" icon={FileText} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Rata-rata" value={Math.round(rataRata * 10) / 10} description="Nilai rata-rata keseluruhan" icon={Percent} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <HasilTableCard rows={rows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardSidebar() { return <Sidebar collapsible="icon"><SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" render={<Link href="/dashboard" />}><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Home className="size-4" /></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">SMANSABA Assesmen</span><span className="truncate text-xs text-muted-foreground">Manajemen Assesmen</span></div></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupLabel>Menu Utama</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{menuItems.map((item) => { const Icon = item.icon; return <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={item.active} tooltip={item.label} render={<Link href={item.href} />}><Icon className="size-4" /><span className="truncate">{item.label}</span></SidebarMenuButton></SidebarMenuItem> })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter /><SidebarRail /></Sidebar> }
function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
