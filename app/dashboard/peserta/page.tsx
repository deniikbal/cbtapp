import type { ComponentType } from "react"
import {
  BookOpen,
  BookOpenCheck,
  FileText,
  Building2,
  CalendarDays,
  Download,
  Filter,
  GraduationCap,
  Home,
  KeyRound,
  LayoutDashboard,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Users,
} from "lucide-react"
import { asc, eq } from "drizzle-orm"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { SeedMasterDataButton } from "@/components/seed-master-data-button"
import { StudentCreateDialog } from "@/components/student-create-dialog"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, majors, students } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: true },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "#", label: "Ujian", icon: BookOpenCheck, active: false },
  { href: "#", label: "Pengaturan", icon: Settings, active: false },
]

type StudentRow = {
  id: string
  name: string
  nis: string
  active: boolean
  className: string
  classroomId: string
  majorName: string
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
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data peserta."
  }

  const activeStudents = studentRows.filter((student) => student.active).length
  const inactiveStudents = studentRows.length - activeStudents
  const totalClasses = new Set(studentRows.map((student) => student.classroomId)).size

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar
          title="Peserta"
          description="Kelola akun peserta ujian"
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Data Peserta
            </h1>
            <p className="text-sm text-muted-foreground">
              Periode aktif: <span className="font-medium text-foreground">—</span>
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Peserta"
              value={studentRows.length}
              description="Semua peserta terdaftar"
              icon={Users}
              accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400"
              ringClass="ring-sky-500/20"
            />
            <StatCard
              label="Aktif"
              value={activeStudents}
              description="Bisa login ujian"
              icon={ShieldCheck}
              accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400"
              ringClass="ring-blue-500/20"
            />
            <StatCard
              label="Tidak Aktif"
              value={inactiveStudents}
              description="Akses login dimatikan"
              icon={KeyRound}
              accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400"
              ringClass="ring-pink-500/20"
            />
            <StatCard
              label="Kelas"
              value={totalClasses}
              description="Kelas berisi peserta"
              icon={GraduationCap}
              accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400"
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

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle>Daftar Peserta</CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {studentRows.length} hasil
                    </Badge>
                  </div>
                  <CardDescription>
                    Data login peserta berisi nama, NIS, password, kelas, jurusan, dan status.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                  {classroomOptions.length === 0 && <SeedMasterDataButton />}
                  <Button variant="outline" className="gap-2">
                    <Download className="size-4" />
                    Import
                  </Button>
                  <StudentCreateDialog classrooms={classroomOptions} />
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-12">
                <div className="relative md:col-span-5">
                  <Label htmlFor="search-student" className="sr-only">
                    Cari peserta
                  </Label>
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="search-student" placeholder="Cari nama atau NIS..." className="pl-8" />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="filter-class" className="sr-only">
                    Filter kelas
                  </Label>
                  <Select defaultValue="ALL">
                    <SelectTrigger id="filter-class" className="w-full">
                      <div className="flex items-center gap-2 truncate">
                        <Filter className="size-4 text-muted-foreground" />
                        <SelectValue placeholder="Semua kelas" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="ALL">Semua kelas</SelectItem>
                      {classroomOptions.map((classroom) => (
                        <SelectItem key={classroom.id} value={classroom.id}>
                          {classroom.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="filter-status" className="sr-only">
                    Filter status
                  </Label>
                  <Select defaultValue="ALL">
                    <SelectTrigger id="filter-status" className="w-full">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="ALL">Semua status</SelectItem>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="INACTIVE">Tidak aktif</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Button variant="outline" className="w-full gap-2" disabled>
                    <RotateCcw className="size-4" />
                    Reset
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Nama</TableHead>
                      <TableHead>NIS</TableHead>
                      <TableHead>Password</TableHead>
                      <TableHead>Kelas</TableHead>
                      <TableHead>Jurusan</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-32 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {studentRows.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={8} className="h-48 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                            <div className="rounded-full bg-muted p-4">
                              <Users className="size-7" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">Belum ada peserta</div>
                              <p className="text-sm">
                                {classroomOptions.length === 0
                                  ? "Buat data awal kelas dan jurusan terlebih dahulu."
                                  : "Tambahkan peserta untuk mulai mengatur akun ujian."}
                              </p>
                            </div>
                            {classroomOptions.length === 0 && <SeedMasterDataButton />}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      studentRows.map((student, index) => (
                        <TableRow key={student.nis} className="transition-colors hover:bg-muted/40">
                        <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-blue-500/15 text-xs font-medium text-blue-700 dark:text-blue-300">
                                {getInitials(student.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{student.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {student.nis}
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          ••••••••
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-normal">
                            {student.className}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{student.majorName}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "font-normal",
                              student.active
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                : "bg-rose-500/10 text-rose-700 dark:text-rose-300"
                            )}
                          >
                            {student.active ? "Aktif" : "Tidak aktif"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button variant="ghost" size="icon-sm">
                              <Settings className="size-4" />
                              <span className="sr-only">Atur peserta</span>
                            </Button>
                          </div>
                        </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
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
                <span className="truncate font-semibold">CBT App</span>
                <span className="truncate text-xs text-muted-foreground">Admin Panel</span>
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
