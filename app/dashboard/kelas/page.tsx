import { asc, count, eq } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, FileText, Filter, GraduationCap, Home, LayoutDashboard, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ClassroomManagementCard } from "@/components/classroom-management-card"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, majors, students } from "@/lib/db/schema"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/stat-card"

type ClassRow = { id: string; name: string; grade: string; majorId: string; majorName: string; majorCode: string; studentCount: number }
type MajorOption = { id: string; name: string; code: string }

export default async function KelasPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: ClassRow[] = []
  let majorOptions: MajorOption[] = []

  try {
    rows = await db
      .select({ id: classrooms.id, name: classrooms.name, grade: classrooms.grade, majorId: classrooms.majorId, majorName: majors.name, majorCode: majors.code, studentCount: count(students.id) })
      .from(classrooms)
      .innerJoin(majors, eq(classrooms.majorId, majors.id))
      .leftJoin(students, eq(students.classroomId, classrooms.id))
      .groupBy(classrooms.id, classrooms.name, classrooms.grade, classrooms.majorId, majors.name, majors.code)
      .orderBy(asc(classrooms.name))

    majorOptions = await db.select({ id: majors.id, name: majors.name, code: majors.code }).from(majors).orderBy(asc(majors.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data kelas."
  }

  const usedClasses = rows.filter((row) => row.studentCount > 0).length
  const totalStudents = rows.reduce((sum, row) => sum + row.studentCount, 0)

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/kelas" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Kelas" description="Kelola data kelas" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Data Kelas</h1><p className="text-sm text-muted-foreground">Kelola kelas berdasarkan tingkat, jurusan, dan jumlah peserta.</p></section>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Kelas" value={rows.length} description="Semua kelas" icon={GraduationCap} />
            <StatCard label="Terisi" value={usedClasses} description="Memiliki peserta" icon={Users} />
            <StatCard label="Kosong" value={rows.length - usedClasses} description="Belum ada peserta" icon={Filter} />
            <StatCard label="Peserta" value={totalStudents} description="Total peserta kelas" icon={Users} />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <ClassroomManagementCard rows={rows} majorOptions={majorOptions} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
