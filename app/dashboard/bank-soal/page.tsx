import type { ComponentType } from "react"
import { asc, eq } from "drizzle-orm"
import { BookOpen, BookOpenCheck, Building2, CalendarDays, Download, ExternalLink, Filter, FileText, GraduationCap, Home, LayoutDashboard, LinkIcon, RotateCcw, Search, Settings, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { QuestionBankCreateDialog } from "@/components/question-bank-create-dialog"
import { QuestionBankRowActions } from "@/components/question-bank-row-actions"
import { SubjectCreateDialog } from "@/components/subject-create-dialog"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionBanks, subjects } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: true },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck, active: false },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings, active: false },
]

type BankRow = { id: string; code: string; title: string; teacherName: string; grade: string; googleFormUrl: string; active: boolean; subjectId: string; subjectName: string; subjectCode: string }
type SubjectOption = { id: string; name: string; code: string }

export default async function BankSoalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: BankRow[] = []
  let subjectOptions: SubjectOption[] = []

  try {
    rows = await db
      .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, teacherName: questionBanks.teacherName, grade: questionBanks.grade, googleFormUrl: questionBanks.googleFormUrl, active: questionBanks.active, subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code })
      .from(questionBanks)
      .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
      .orderBy(asc(questionBanks.code))

    subjectOptions = await db.select({ id: subjects.id, name: subjects.name, code: subjects.code }).from(subjects).orderBy(asc(subjects.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data bank soal."
  }

  const activeBanks = rows.filter((row) => row.active).length
  const inactiveBanks = rows.length - activeBanks
  const subjectUsed = new Set(rows.map((row) => row.subjectId)).size

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Bank Soal" description="Kelola link Google Form" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bank Soal</h1><p className="text-sm text-muted-foreground">Periode aktif: <span className="font-medium text-foreground">—</span></p></section>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Soal" value={rows.length} description="Link Google Form" icon={FileText} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Aktif" value={activeBanks} description="Bisa dijadwalkan" icon={BookOpenCheck} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Tidak Aktif" value={inactiveBanks} description="Tidak dipakai" icon={Filter} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Mapel" value={subjectUsed} description="Mapel terpakai" icon={BookOpen} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="flex flex-col gap-1.5"><div className="flex items-center gap-2"><CardTitle>Daftar Bank Soal</CardTitle><Badge variant="secondary" className="font-normal">{rows.length} hasil</Badge></div><CardDescription>Bank soal hanya menyimpan kode, mapel, dan link Google Form. Durasi nanti di jadwal.</CardDescription></div>
                <div className="flex flex-col gap-2 sm:flex-row md:shrink-0"><Button variant="outline" className="gap-2"><Download className="size-4" />Export</Button>{subjectOptions.length === 0 ? <SubjectCreateDialog /> : <QuestionBankCreateDialog subjects={subjectOptions} />}</div>
              </div>
              <div className="mt-4 grid gap-3 md:grid-cols-12">
                <div className="relative md:col-span-5"><Label htmlFor="search-bank" className="sr-only">Cari bank soal</Label><Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" /><Input id="search-bank" placeholder="Cari kode, judul, atau mapel..." className="pl-8" /></div>
                <div className="md:col-span-3"><Select defaultValue="ALL"><SelectTrigger className="w-full"><div className="flex items-center gap-2 truncate"><BookOpen className="size-4 text-muted-foreground" /><SelectValue placeholder="Semua mapel" /></div></SelectTrigger><SelectContent align="start"><SelectItem value="ALL">Semua mapel</SelectItem>{subjectOptions.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.code}</SelectItem>)}</SelectContent></Select></div>
                <div className="md:col-span-2"><Select defaultValue="ALL"><SelectTrigger className="w-full"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent align="start"><SelectItem value="ALL">Semua</SelectItem><SelectItem value="ACTIVE">Aktif</SelectItem><SelectItem value="INACTIVE">Tidak aktif</SelectItem></SelectContent></Select></div>
                <div className="md:col-span-2"><Button variant="outline" className="w-full gap-2" disabled><RotateCcw className="size-4" />Reset</Button></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-hidden rounded-lg border">
                <Table>
                  <TableHeader><TableRow className="bg-muted/40 hover:bg-muted/40"><TableHead className="w-12 text-center">#</TableHead><TableHead>Kode Soal</TableHead><TableHead>Judul</TableHead><TableHead>Kelas</TableHead><TableHead>Guru</TableHead><TableHead>Mapel</TableHead><TableHead>Link GForm</TableHead><TableHead>Status</TableHead><TableHead className="w-32 text-right">Aksi</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {rows.length === 0 ? (
                      <TableRow className="hover:bg-transparent"><TableCell colSpan={9} className="h-48 text-center"><div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-muted-foreground"><div className="rounded-full bg-muted p-4"><FileText className="size-7" /></div><div className="space-y-1"><div className="font-medium text-foreground">Belum ada bank soal</div><p className="text-sm">{subjectOptions.length === 0 ? "Tambahkan mapel terlebih dahulu." : "Tambahkan link Google Form untuk mulai membuat jadwal."}</p></div>{subjectOptions.length === 0 ? <SubjectCreateDialog /> : <QuestionBankCreateDialog subjects={subjectOptions} />}</div></TableCell></TableRow>
                    ) : rows.map((row, index) => (
                      <TableRow key={row.id} className="transition-colors hover:bg-muted/40"><TableCell className="text-center text-sm text-muted-foreground tabular-nums">{index + 1}</TableCell><TableCell><Badge variant="outline" className="font-mono font-normal">{row.code}</Badge></TableCell><TableCell className="font-medium">{row.title}</TableCell><TableCell><Badge variant="outline" className="font-normal">{row.grade}</Badge></TableCell><TableCell>{row.teacherName || "—"}</TableCell><TableCell><div className="flex flex-col"><span>{row.subjectName}</span><span className="text-xs text-muted-foreground">{row.subjectCode}</span></div></TableCell><TableCell><Button nativeButton={false} variant="ghost" size="sm" className="gap-2" render={<a href={row.googleFormUrl} target="_blank" rel="noreferrer" />}><LinkIcon className="size-4" />Buka <ExternalLink className="size-3" /></Button></TableCell><TableCell><Badge variant="secondary" className={cn("font-normal", row.active ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300")}>{row.active ? "Aktif" : "Tidak aktif"}</Badge></TableCell><TableCell><QuestionBankRowActions bank={row} subjects={subjectOptions} /></TableCell></TableRow>
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

function DashboardSidebar() { return <Sidebar collapsible="icon"><SidebarHeader><SidebarMenu><SidebarMenuItem><SidebarMenuButton size="lg" render={<Link href="/dashboard" />}><div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Home className="size-4" /></div><div className="grid flex-1 text-left text-sm leading-tight"><span className="truncate font-semibold">SMANSABA Assesmen</span><span className="truncate text-xs text-muted-foreground">Manajemen Assesmen</span></div></SidebarMenuButton></SidebarMenuItem></SidebarMenu></SidebarHeader><SidebarContent><SidebarGroup><SidebarGroupLabel>Menu Utama</SidebarGroupLabel><SidebarGroupContent><SidebarMenu>{menuItems.map((item) => { const Icon = item.icon; return <SidebarMenuItem key={item.label}><SidebarMenuButton isActive={item.active} tooltip={item.label} render={<Link href={item.href} />}><Icon className="size-4" /><span className="truncate">{item.label}</span></SidebarMenuButton></SidebarMenuItem> })}</SidebarMenu></SidebarGroupContent></SidebarGroup></SidebarContent><SidebarFooter /><SidebarRail /></Sidebar> }
function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
