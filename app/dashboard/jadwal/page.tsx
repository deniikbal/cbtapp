import type { ComponentType } from "react"
import { asc, eq } from "drizzle-orm"
import { BookOpen, BookOpenCheck, Building2, CalendarDays, FileText, Filter, GraduationCap, Home, LayoutDashboard, Settings, UserCog, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ExamScheduleTableCard } from "@/components/exam-schedule-table-card"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examSchedules, majors, questionBanks, subjects } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: true },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck, active: false },
  { href: "/dashboard/user", label: "User", icon: UserCog, active: false },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings, active: false },
]

type ScheduleRow = { id: string; questionBankId: string; classroomId: string; examDate: string; startTime: string; durationMinutes: number; active: boolean; title: string; code: string; className: string; majorCode: string; subjectCode: string }

type BankOption = { id: string; code: string; title: string; subjectCode: string }
type ClassOption = { id: string; name: string; majorCode: string }

export default async function JadwalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: ScheduleRow[] = []
  let bankOptions: BankOption[] = []
  let classroomOptions: ClassOption[] = []

  try {
    rows = await db.select({ id: examSchedules.id, questionBankId: examSchedules.questionBankId, classroomId: examSchedules.classroomId, examDate: examSchedules.examDate, startTime: examSchedules.startTime, durationMinutes: examSchedules.durationMinutes, active: examSchedules.active, title: questionBanks.title, code: questionBanks.code, className: classrooms.name, majorCode: majors.code, subjectCode: subjects.code }).from(examSchedules).innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id)).innerJoin(subjects, eq(questionBanks.subjectId, subjects.id)).innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id)).innerJoin(majors, eq(classrooms.majorId, majors.id)).orderBy(asc(examSchedules.examDate), asc(examSchedules.startTime))
    bankOptions = await db.select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, subjectCode: subjects.code }).from(questionBanks).innerJoin(subjects, eq(questionBanks.subjectId, subjects.id)).orderBy(asc(questionBanks.code))
    classroomOptions = await db.select({ id: classrooms.id, name: classrooms.name, majorCode: majors.code }).from(classrooms).innerJoin(majors, eq(classrooms.majorId, majors.id)).orderBy(asc(classrooms.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data jadwal."
  }

  const activeSchedules = rows.filter((row) => row.active).length
  const inactiveSchedules = rows.length - activeSchedules
  const classUsed = new Set(rows.map((row) => row.classroomId)).size
  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Jadwal" description="Atur pelaksanaan ujian" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Jadwal Ujian</h1><p className="text-sm text-muted-foreground">Jam selesai dihitung otomatis dari jam mulai + durasi.</p></section>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Jadwal" value={rows.length} description="Semua jadwal" icon={CalendarDays} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Aktif" value={activeSchedules} description="Bisa dilihat siswa" icon={BookOpenCheck} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Tidak Aktif" value={inactiveSchedules} description="Disembunyikan" icon={Filter} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Kelas" value={classUsed} description="Kelas terjadwal" icon={GraduationCap} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>
          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}
          <ExamScheduleTableCard rows={rows} banks={bankOptions} classrooms={classroomOptions} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardSidebar() { return <Sidebar collapsible="icon"><SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" render={<Link href="/dashboard" />}><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Home className="size-4" /></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">SMANSABA Assesmen</span><span className="truncate text-xs text-muted-foreground">Manajemen Assesmen</span></div></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupLabel>Menu Utama</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{menuItems.map((item) => { const Icon = item.icon; return <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={item.active} tooltip={item.label} render={<Link href={item.href} />}><Icon className="size-4" /><span className="truncate">{item.label}</span></SidebarMenuButton></SidebarMenuItem> })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter /><SidebarRail /></Sidebar> }
function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
