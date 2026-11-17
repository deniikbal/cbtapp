import type { ComponentType } from "react"
import { asc } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, FileText, Filter, GraduationCap, Home, LayoutDashboard, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { SubjectManagementCard } from "@/components/subject-management-card"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { subjects } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

type SubjectRow = { id: string; name: string; code: string; active: boolean }

export default async function MapelPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: SubjectRow[] = []

  try {
    rows = await db.select({ id: subjects.id, name: subjects.name, code: subjects.code, active: subjects.active }).from(subjects).orderBy(asc(subjects.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data mapel."
  }

  const activeSubjects = rows.filter((row) => row.active).length
  const inactiveSubjects = rows.length - activeSubjects

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/mapel" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Mapel" description="Kelola mata pelajaran" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Data Mapel</h1><p className="text-sm text-muted-foreground">Kelola mata pelajaran untuk bank soal dan jadwal ujian.</p></section>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Mapel" value={rows.length} description="Semua mata pelajaran" icon={BookOpen} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Aktif" value={activeSubjects} description="Bisa dipakai bank ujian" icon={BookOpenCheck} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Tidak Aktif" value={inactiveSubjects} description="Disembunyikan dari ujian" icon={Filter} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Bank Ujian" value={0} description="Akan terhubung nanti" icon={BookOpenCheck} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <SubjectManagementCard rows={rows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
