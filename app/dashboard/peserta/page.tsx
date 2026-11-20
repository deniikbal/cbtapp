import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, FileText, GraduationCap, Home, KeyRound, LayoutDashboard, Settings, ShieldCheck, UserCog, UserRound, Users } from "lucide-react"
import { asc, eq } from "drizzle-orm"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { StudentManagementCard } from "@/components/student-management-card"
import { Button } from "@/components/ui/button"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
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

const naturalClassroomCollator = new Intl.Collator("id-ID", {
  numeric: true,
  sensitivity: "base",
})

type StudentRow = {
  id: string
  name: string
  nis: string
  active: boolean
  className: string
  classroomId: string
  majorName: string
  kartuPassword: string | null
}

type ClassroomOption = {
  id: string
  name: string
  majorName: string
}

export default async function PesertaPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  let databaseError: string | null = null
  let studentRows: StudentRow[] = []
  let classroomOptions: ClassroomOption[] = []

  try {
    studentRows = await db
      .select({
        id: students.id,
        name: students.name,
        nis: students.nis,
        active: students.active,
        className: classrooms.name,
        classroomId: classrooms.id,
        majorName: majors.name,
        kartuPassword: students.kartuPassword,
      })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .innerJoin(majors, eq(classrooms.majorId, majors.id))
      .orderBy(asc(students.name))

    classroomOptions = await db
      .select({
        id: classrooms.id,
        name: classrooms.name,
        majorName: majors.name,
      })
      .from(classrooms)
      .innerJoin(majors, eq(classrooms.majorId, majors.id))
      .orderBy(asc(classrooms.name))

    classroomOptions.sort((a, b) => {
      const byName = naturalClassroomCollator.compare(a.name, b.name)
      return byName || naturalClassroomCollator.compare(a.majorName, b.majorName)
    })
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data peserta."
  }

  const activeStudents = studentRows.filter((student) => student.active).length
  const inactiveStudents = studentRows.length - activeStudents
  const totalClasses = new Set(studentRows.map((student) => student.classroomId)).size

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/peserta" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar
          title="Peserta"
          description="Kelola akun peserta ujian"
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
                Data Peserta
              </h1>
              <p className="text-sm text-muted-foreground">
                Kelola akun peserta, NIS, status, dan penempatan kelas.
              </p>
            </div>
            <Button variant="outline" className="h-11 gap-1.5 sm:h-9" render={<Link href="/dashboard/peserta/kartu" />}>
              Kartu Ujian
            </Button>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Peserta"
              value={studentRows.length}
              description="Semua peserta terdaftar"
              icon={Users}
            />
            <StatCard
              label="Aktif"
              value={activeStudents}
              description="Bisa login ujian"
              icon={ShieldCheck}
            />
            <StatCard
              label="Tidak Aktif"
              value={inactiveStudents}
              description="Akses login dimatikan"
              icon={KeyRound}
            />
            <StatCard
              label="Kelas"
              value={totalClasses}
              description="Kelas berisi peserta"
              icon={GraduationCap}
            />
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>
                Jalankan migration database terlebih dahulu. Detail: {databaseError}
              </AlertDescription>
            </Alert>
          )}

          <StudentManagementCard students={studentRows} classrooms={classroomOptions} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}


function DashboardNavbar({
  title,
  description,
  userName,
  userEmail,
}: {
  title: string
  description: string
  userName: string
  userEmail: string
}) {
  return (
    <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <SidebarTrigger />
          <div>
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>
        <UserNav name={userName} email={userEmail} />
      </div>
    </header>
  )
}

