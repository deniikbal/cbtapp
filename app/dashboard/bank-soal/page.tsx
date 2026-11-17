import type { ComponentType } from "react"
import { asc, eq } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, FileText, Filter, GraduationCap, Home, LayoutDashboard, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { QuestionBankManagementCard } from "@/components/question-bank-management-card"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionBanks, subjects, teachers } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

type BankRow = { id: string; code: string; title: string; teacherName: string; teacherId: string | null; grade: string; googleFormUrl: string; formId: string; active: boolean; subjectId: string; subjectName: string; subjectCode: string }
type SubjectOption = { id: string; name: string; code: string }
type TeacherOption = { id: string; name: string }

export default async function BankSoalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: BankRow[] = []
  let subjectOptions: SubjectOption[] = []
  let teacherOptions: TeacherOption[] = []

  try {
    rows = await db
      .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, teacherName: questionBanks.teacherName, teacherId: questionBanks.teacherId, grade: questionBanks.grade, googleFormUrl: questionBanks.googleFormUrl, formId: questionBanks.formId, active: questionBanks.active, subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code })
      .from(questionBanks)
      .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
      .orderBy(asc(questionBanks.code))

    subjectOptions = await db.select({ id: subjects.id, name: subjects.name, code: subjects.code }).from(subjects).orderBy(asc(subjects.name))
    teacherOptions = await db.select({ id: teachers.id, name: teachers.name }).from(teachers).where(eq(teachers.active, true)).orderBy(asc(teachers.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data bank soal."
  }

  const activeBanks = rows.filter((row) => row.active).length
  const inactiveBanks = rows.length - activeBanks
  const subjectUsed = new Set(rows.map((row) => row.subjectId)).size

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/bank-soal" />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-muted/30">
        <DashboardNavbar title="Bank Soal" description="Kelola link Google Form" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bank Soal</h1><p className="text-sm text-muted-foreground">Kelola bank soal dan link Google Form ujian.</p></section>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total Soal" value={rows.length} description="Link Google Form" icon={FileText} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Aktif" value={activeBanks} description="Bisa dijadwalkan" icon={BookOpenCheck} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Tidak Aktif" value={inactiveBanks} description="Tidak dipakai" icon={Filter} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Mapel" value={subjectUsed} description="Mapel terpakai" icon={BookOpen} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <QuestionBankManagementCard rows={rows} subjects={subjectOptions} teachers={teacherOptions} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
