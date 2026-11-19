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
import { StatCard } from "@/components/stat-card"

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
            <StatCard label="Total Mapel" value={rows.length} description="Semua mata pelajaran" icon={BookOpen} />
            <StatCard label="Aktif" value={activeSubjects} description="Bisa dipakai bank ujian" icon={BookOpenCheck} />
            <StatCard label="Tidak Aktif" value={inactiveSubjects} description="Disembunyikan dari ujian" icon={Filter} />
            <StatCard label="Bank Ujian" value={0} description="Akan terhubung nanti" icon={BookOpenCheck} />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <SubjectManagementCard rows={rows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
