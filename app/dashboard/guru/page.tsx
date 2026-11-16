import type { ComponentType } from "react"
import {
  BookOpen,
  BookOpenCheck,
  FileText,
  Building2,
  CalendarDays,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  Settings,
  UserCog,
  UserRound,
  Users,
  ShieldCheck,
  BarChart3 } from "lucide-react"
import { asc } from "drizzle-orm"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { TeacherManagementCard } from "@/components/teacher-management-card"
import { UserNav } from "@/components/user-nav"
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
import { teachers } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/guru", label: "Guru", icon: UserRound, active: true },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck, active: false },
  { href: "/dashboard/hasil", label: "Hasil Ujian", icon: BarChart3, active: false },
  { href: "/dashboard/user", label: "User", icon: UserCog, active: false },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings, active: false },
]

export type TeacherRow = {
  id: string
  name: string
  nip: string
  nuptk: string
  gender: string
  birthPlace: string
  birthDate: string
  active: boolean
  hasPassword: boolean
}

export default async function GuruPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let teacherRows: TeacherRow[] = []
  let databaseError: string | null = null

  try {
    const rows = await db
      .select({
        id: teachers.id,
        name: teachers.name,
        nip: teachers.nip,
        nuptk: teachers.nuptk,
        gender: teachers.gender,
        birthPlace: teachers.birthPlace,
        birthDate: teachers.birthDate,
        active: teachers.active,
        passwordHash: teachers.passwordHash,
      })
      .from(teachers)
      .orderBy(asc(teachers.name))

    teacherRows = rows.map(({ passwordHash, ...row }) => ({ ...row, hasPassword: passwordHash.length > 0 }))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data guru."
  }

  const activeTeachers = teacherRows.filter((teacher) => teacher.active).length

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar
          title="Guru"
          description="Data guru dan akun login"
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Data Guru</h1>
            <p className="text-sm text-muted-foreground">
              Kelola identitas guru, status aktif, dan password untuk login guru.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Guru"
              value={teacherRows.length}
              description="Semua guru terdaftar"
              icon={Users}
              accent="from-sky-500/10 to-sky-500/0 text-sky-600"
              ringClass="ring-sky-500/20"
            />
            <StatCard
              label="Aktif"
              value={activeTeachers}
              description="Bisa login"
              icon={ShieldCheck}
              accent="from-blue-500/10 to-blue-500/0 text-blue-600"
              ringClass="ring-blue-500/20"
            />
            <StatCard
              label="Tidak Aktif"
              value={teacherRows.length - activeTeachers}
              description="Akses login dimatikan"
              icon={KeyRound}
              accent="from-pink-500/10 to-pink-500/0 text-pink-600"
              ringClass="ring-pink-500/20"
            />
            <StatCard
              label="Punya Password"
              value={teacherRows.filter((teacher) => teacher.hasPassword).length}
              description="Siap dipakai login"
              icon={UserRound}
              accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600"
              ringClass="ring-emerald-500/20"
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

          <TeacherManagementCard teachers={teacherRows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link href="/dashboard" />}>
              <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Home className="size-4" />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">SMANSABA Assesmen</span>
                <span className="truncate text-xs text-muted-foreground">Manajemen Assesmen</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Utama</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon

                return (
                  <SidebarMenuItem key={item.label}>
                    <SidebarMenuButton
                      isActive={item.active}
                      tooltip={item.label}
                      render={<Link href={item.href} />}
                    >
                      <Icon className="size-4" />
                      <span className="truncate">{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
      <SidebarRail />
    </Sidebar>
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

type StatCardProps = {
  label: string
  value: number
  description: string
  icon: ComponentType<{ className?: string }>
  accent: string
  ringClass: string
}

function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) {
  return (
    <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}>
      <div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} />
      <CardHeader className="relative">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">
              {value.toLocaleString("id-ID")}
            </p>
          </div>
          <div
            className={cn(
              "flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur",
              accent.split(" ").find((className) => className.startsWith("text-")) ?? ""
            )}
          >
            <Icon className="size-4" />
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative">
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  )
}


