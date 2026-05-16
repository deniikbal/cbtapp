import type { ComponentType } from "react"
import { asc, count, eq } from "drizzle-orm"
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
  LayoutDashboard,
  RotateCcw,
  Search,
  Settings,
  Users,
} from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { MajorCreateDialog } from "@/components/major-create-dialog"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, majors } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: true },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "#", label: "Ujian", icon: BookOpenCheck, active: false },
  { href: "#", label: "Pengaturan", icon: Settings, active: false },
]

type MajorRow = { id: string; name: string; code: string; classCount: number }

export default async function JurusanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: MajorRow[] = []

  try {
    rows = await db
      .select({ id: majors.id, name: majors.name, code: majors.code, classCount: count(classrooms.id) })
      .from(majors)
      .leftJoin(classrooms, eq(classrooms.majorId, majors.id))
      .groupBy(majors.id, majors.name, majors.code)
      .orderBy(asc(majors.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data jurusan."
  }

  const usedMajors = rows.filter((row) => row.classCount > 0).length

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Jurusan" description="Kelola data jurusan" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Data Jurusan</h1>
            <p className="text-sm text-muted-foreground">Periode aktif: <span className="font-medium text-foreground">—</span></p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Jurusan" value={rows.length} description="Semua jurusan" icon={Building2} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Terpakai" value={usedMajors} description="Memiliki kelas" icon={GraduationCap} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Belum Terpakai" value={rows.length - usedMajors} description="Belum memiliki kelas" icon={Filter} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Total Kelas" value={rows.reduce((sum, row) => sum + row.classCount, 0)} description="Dari semua jurusan" icon={Users} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center gap-2"><CardTitle>Daftar Jurusan</CardTitle><Badge variant="secondary" className="font-normal">{rows.length} hasil</Badge></div>
                  <CardDescription>Kelola nama dan kode jurusan untuk relasi kelas.</CardDescription>
                </div>
                <div className="flex flex-col gap-2 sm:flex-row md:shrink-0"><Button variant="outline" className="gap-2"><Download className="size-4" />Export</Button><MajorCreateDialog /></div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-12">
                <div className="relative md:col-span-8"><Label htmlFor="search-major" className="sr-only">Cari jurusan</Label><Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="search-major" placeholder="Cari nama atau kode jurusan..." className="pl-8" /></div>
                <div className="md:col-span-2"><Select defaultValue="ALL"><SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent align="start"><SelectItem value="ALL">Semua</SelectItem><SelectItem value="USED">Terpakai</SelectItem><SelectItem value="EMPTY">Belum terpakai</SelectItem></SelectContent></Select></div>
                <div className="md:col-span-2"><Button variant="outline" className="w-full gap-2" disabled><RotateCcw className="size-4" />Reset</Button></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-12 text-center">#</TableHead><TableHead>Nama Jurusan</TableHead><TableHead>Kode</TableHead><TableHead>Total Kelas</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><Building2 className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">Belum ada jurusan</div><p className="text-sm">Tambahkan jurusan sebelum membuat kelas.</p></div><MajorCreateDialog /></div></TableCell></TableRow>
                    ) : rows.map((row, index) => (
                      <TableRow key={row.id} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{index + 1}</TableCell><TableCell className="font-medium">{row.name}</TableCell><TableCell><Badge variant="outline" className="font-mono font-normal">{row.code}</Badge></TableCell><TableCell className="tabular-nums">{row.classCount}</TableCell><TableCell><Badge variant="secondary" className={cn("font-normal", row.classCount > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{row.classCount > 0 ? "Terpakai" : "Belum terpakai"}</Badge></TableCell><TableCell className="text-right"><Button variant="ghost" size="icon-sm"><Settings className="size-4" /><span className="sr-only">Atur jurusan</span></Button></TableCell></TableRow>
                    ))}
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

function DashboardSidebar() { return <Sidebar collapsible="icon"><SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" render={<Link href="/dashboard" />}><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Home className="size-4" /></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">CBT App</span><span className="truncate text-xs text-muted-foreground">Admin Panel</span></div></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupLabel>Menu Utama</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{menuItems.map((item) => { const Icon = item.icon; return <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={item.active} tooltip={item.label} render={<Link href={item.href} />}><Icon className="size-4" /><span className="truncate">{item.label}</span></SidebarMenuButton></SidebarMenuItem> })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter /><SidebarRail /></Sidebar> }
function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
