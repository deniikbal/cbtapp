import type { ComponentType } from "react"
import {
  Activity,
  BookOpen,
  BookOpenCheck,
  FileText,
  Building2,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Filter,
  GraduationCap,
  Home,
  LayoutDashboard,
  RotateCcw,
  Search,
  Settings,
  UserCog,
  Users,
} from "lucide-react"
import Link from "next/link"
import { desc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

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
import { classrooms, examSchedules, questionBanks, students, subjects } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: true },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck, active: false },
  { href: "/dashboard/user", label: "User", icon: UserCog, active: false },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings, active: false },
]

type RecentExam = {
  id: string
  name: string
  code: string
  subjectCode: string
  participants: number
  status: "Terjadwal" | "Aktif" | "Selesai" | "Nonaktif"
  schedule: string
}

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })

  if (!session) {
    redirect("/login")
  }

  let databaseError: string | null = null
  let recentExams: RecentExam[] = []
  let totalQuestionBanks = 0
  let totalStudents = 0
  let activeSessions = 0
  let finishedSessions = 0

  try {
    const [bankRows, studentRows, scheduleRows] = await Promise.all([
      db.select({ id: questionBanks.id }).from(questionBanks),
      db.select({ id: students.id, classroomId: students.classroomId }).from(students),
      db
        .select({
          id: examSchedules.id,
          active: examSchedules.active,
          examDate: examSchedules.examDate,
          startTime: examSchedules.startTime,
          durationMinutes: examSchedules.durationMinutes,
          classroomId: examSchedules.classroomId,
          className: classrooms.name,
          title: questionBanks.title,
          code: questionBanks.code,
          subjectCode: subjects.code,
        })
        .from(examSchedules)
        .innerJoin(questionBanks, eq(examSchedules.questionBankId, questionBanks.id))
        .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .innerJoin(classrooms, eq(examSchedules.classroomId, classrooms.id))
        .orderBy(desc(examSchedules.examDate), desc(examSchedules.startTime)),
    ])

    const participantByClassroom = new Map<string, number>()
    for (const student of studentRows) {
      participantByClassroom.set(
        student.classroomId,
        (participantByClassroom.get(student.classroomId) ?? 0) + 1
      )
    }

    totalQuestionBanks = bankRows.length
    totalStudents = studentRows.length
    activeSessions = scheduleRows.filter((row) => getScheduleStatus(row) === "Aktif").length
    finishedSessions = scheduleRows.filter((row) => getScheduleStatus(row) === "Selesai").length
    recentExams = scheduleRows.slice(0, 10).map((row) => ({ 
      id: row.id,
      name: row.title,
      code: row.code,
      subjectCode: row.subjectCode,
      participants: participantByClassroom.get(row.classroomId) ?? 0,
      status: getScheduleStatus(row),
      schedule: `${row.className} • ${formatDate(row.examDate)} ${row.startTime.slice(0, 5)}`,
    }))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data dashboard."
  }

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar
          title="Dashboard"
          description="Ringkasan aktivitas SMANSABA Assesmen"
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Dashboard Assesmen
            </h1>
            <p className="text-sm text-muted-foreground">
              Ringkasan data berdasarkan peserta, bank soal, dan jadwal yang tersimpan.
            </p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              label="Bank Soal"
              value={totalQuestionBanks}
              description="Bank assesmen tersedia"
              icon={BookOpenCheck}
              accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400"
              ringClass="ring-sky-500/20"
            />
            <StatCard
              label="Peserta"
              value={totalStudents}
              description="Peserta terdaftar"
              icon={Users}
              accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400"
              ringClass="ring-blue-500/20"
            />
            <StatCard
              label="Sesi Aktif"
              value={activeSessions}
              description="Assesmen sedang berjalan"
              icon={Activity}
              accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400"
              ringClass="ring-pink-500/20"
            />
            <StatCard
              label="Selesai"
              value={finishedSessions}
              description="Sesi assesmen selesai"
              icon={CheckCircle2}
              accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400"
              ringClass="ring-emerald-500/20"
            />
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>{databaseError}</AlertDescription>
            </Alert>
          )}

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2">
                    <CardTitle>Jadwal Assesmen Terbaru</CardTitle>
                    <Badge variant="secondary" className="font-normal">
                      {recentExams.length} hasil
                    </Badge>
                  </div>
                  <CardDescription>
                    Pantau jadwal, status, dan jumlah peserta per kelas secara real-time.
                  </CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:shrink-0">
                  <Button nativeButton={false} className="gap-2" render={<Link href="/dashboard/jadwal" />}>
                    <CalendarDays className="size-4" />
                    Kelola Jadwal
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-12">
                <div className="relative md:col-span-5">
                  <Label htmlFor="search-exam" className="sr-only">
                    Cari ujian
                  </Label>
                  <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input id="search-exam" placeholder="Cari nama atau kode assesmen..." className="pl-8" />
                </div>
                <div className="md:col-span-3">
                  <Label htmlFor="filter-status" className="sr-only">
                    Filter status
                  </Label>
                  <Select defaultValue="ALL">
                    <SelectTrigger id="filter-status" className="w-full">
                      <div className="flex items-center gap-2 truncate">
                        <Filter className="size-4 text-muted-foreground" />
                        <SelectValue placeholder="Semua status" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="ALL">Semua status</SelectItem>
                      <SelectItem value="SCHEDULED">Terjadwal</SelectItem>
                      <SelectItem value="ACTIVE">Aktif</SelectItem>
                      <SelectItem value="DONE">Selesai</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="filter-period" className="sr-only">
                    Filter periode
                  </Label>
                  <Select defaultValue="ALL">
                    <SelectTrigger id="filter-period" className="w-full">
                      <div className="flex items-center gap-2 truncate">
                        <CalendarDays className="size-4 text-muted-foreground" />
                        <SelectValue placeholder="Semua periode" />
                      </div>
                    </SelectTrigger>
                    <SelectContent align="start">
                      <SelectItem value="ALL">Semua periode</SelectItem>
                      <SelectItem value="ACTIVE">Periode aktif</SelectItem>
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
                      <TableHead>Nama Assesmen</TableHead>
                      <TableHead>Kode</TableHead>
                      <TableHead>Peserta</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Jadwal</TableHead>
                      <TableHead className="w-32 text-right">Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentExams.length === 0 ? (
                      <TableRow className="hover:bg-transparent">
                        <TableCell colSpan={7} className="h-48 text-center">
                          <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground">
                            <div className="rounded-full bg-muted p-4">
                              <CalendarDays className="size-7" />
                            </div>
                            <div className="space-y-1">
                              <div className="font-medium text-foreground">Belum ada jadwal</div>
                              <p className="text-sm">Jadwal assesmen akan tampil setelah dibuat di menu Jadwal.</p>
                            </div>
                            <Button nativeButton={false} size="sm" render={<Link href="/dashboard/jadwal" />}>
                              Kelola Jadwal
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : recentExams.map((exam, index) => (
                      <TableRow key={exam.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="text-center text-sm text-muted-foreground tabular-nums">
                          {index + 1}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="size-8">
                              <AvatarFallback className="bg-sky-500/15 text-xs font-medium text-sky-700 dark:text-sky-300">
                                {getInitials(exam.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate font-medium">{exam.name}</p>
                              <p className="text-xs text-muted-foreground">SMANSABA Assesmen</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {exam.code}
                        </TableCell>
                        <TableCell className="tabular-nums">{exam.participants}</TableCell>
                        <TableCell>
                          <Badge
                            variant="secondary"
                            className={cn("font-normal", getStatusBadgeClass(exam.status))}
                          >
                            {exam.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{exam.schedule}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1.5">
                            <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href="/dashboard/jadwal" />}>
                              <Clock3 className="size-4" />
                              <span className="sr-only">Detail</span>
                            </Button>
                            <Button nativeButton={false} variant="ghost" size="icon-sm" render={<Link href="/dashboard/jadwal" />}>
                              <Settings className="size-4" />
                              <span className="sr-only">Atur</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 flex flex-col items-center justify-between gap-3 md:flex-row">
                <p className="text-sm text-muted-foreground">
                  Menampilkan <span className="font-medium text-foreground">{recentExams.length ? 1 : 0}</span>–
                  <span className="font-medium text-foreground">{recentExams.length}</span> dari{" "}
                  <span className="font-medium text-foreground">{recentExams.length}</span> entri
                </p>
                <Button variant="outline" size="sm" disabled>
                  Halaman 1
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function getScheduleStatus(schedule: {
  active: boolean
  examDate: string
  startTime: string
  durationMinutes: number
}): RecentExam["status"] {
  if (!schedule.active) return "Nonaktif"

  const startValue = getDateTimeValue(schedule.examDate, schedule.startTime)
  const endValue = getDateTimeValue(
    schedule.examDate,
    calculateEndTime(schedule.startTime, schedule.durationMinutes)
  )
  const now = getDateTimePartsInTimeZone("Asia/Jakarta")
  const nowValue = Number(
    `${now.year}${pad2(now.month)}${pad2(now.day)}${pad2(now.hours)}${pad2(now.minutes)}`
  )

  if (nowValue < startValue) return "Terjadwal"
  if (nowValue <= endValue) return "Aktif"
  return "Selesai"
}

function getStatusBadgeClass(status: RecentExam["status"]) {
  if (status === "Aktif") return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
  if (status === "Selesai") return "bg-sky-500/10 text-sky-700 dark:text-sky-300"
  if (status === "Nonaktif") return "bg-rose-500/10 text-rose-700 dark:text-rose-300"
  return "bg-amber-500/10 text-amber-700 dark:text-amber-300"
}

function getDateTimeValue(dateValue: string, timeValue: string) {
  const [year, month, day] = dateValue.split("-").map(Number)
  const [hours, minutes] = timeValue.split(":").map(Number)

  return Number(`${year}${pad2(month)}${pad2(day)}${pad2(hours)}${pad2(minutes)}`)
}

function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number)

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(year, month - 1, day))
}

function calculateEndTime(startTime: string, durationMinutes: number) {
  const [hours, minutes] = startTime.split(":").map(Number)
  const date = new Date(2000, 0, 1, hours, minutes)
  date.setMinutes(date.getMinutes() + durationMinutes)
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`
}

function getDateTimePartsInTimeZone(timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date()).map((part) => [part.type, part.value])
  )

  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hours: Number(parts.hour),
    minutes: Number(parts.minute),
  }
}

function pad2(value: number) {
  return String(value).padStart(2, "0")
}

function DashboardSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" isActive render={<Link href="/dashboard" />}>
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase()
}
