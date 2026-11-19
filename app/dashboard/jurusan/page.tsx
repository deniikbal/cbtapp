import { asc, count, eq } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, Download, FileText, Filter, GraduationCap, Home, LayoutDashboard, RotateCcw, Search, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { MajorCreateDialog } from "@/components/major-create-dialog"
import { MajorRowActions } from "@/components/major-row-actions"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
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
import { StatCard } from "@/components/stat-card"

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
      <DashboardSidebar active="/dashboard/jurusan" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Jurusan" description="Kelola data jurusan" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Data Jurusan</h1>
            <p className="text-sm text-muted-foreground">Kelola jurusan untuk pengelompokan kelas dan peserta.</p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Jurusan" value={rows.length} description="Semua jurusan" icon={Building2} />
            <StatCard label="Terpakai" value={usedMajors} description="Memiliki kelas" icon={GraduationCap} />
            <StatCard label="Belum Terpakai" value={rows.length - usedMajors} description="Belum memiliki kelas" icon={Filter} />
            <StatCard label="Total Kelas" value={rows.reduce((sum, row) => sum + row.classCount, 0)} description="Dari semua jurusan" icon={Users} />
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
                      <TableRow key={row.id} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{index + 1}</TableCell><TableCell className="font-medium">{row.name}</TableCell><TableCell><Badge variant="outline" className="font-mono font-normal">{row.code}</Badge></TableCell><TableCell className="tabular-nums">{row.classCount}</TableCell><TableCell><Badge variant="secondary" className={cn("font-normal", row.classCount > 0 ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{row.classCount > 0 ? "Terpakai" : "Belum terpakai"}</Badge></TableCell><TableCell className="text-right"><MajorRowActions major={row} /></TableCell></TableRow>
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

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
