import { asc, eq } from "drizzle-orm"
import { BarChart3, BookOpen, Building2, CalendarDays, FileText, GraduationCap, Home, LayoutDashboard, Settings, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { BankSoalBody } from "@/components/bank-soal-body"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { majors, questionBanks, subjects, teachers } from "@/lib/db/schema"
import { cn } from "@/lib/utils"

type BankRow = { id: string; code: string; title: string; teacherName: string; teacherId: string | null; teacherIds: string[]; grade: string; majorId: string | null; proctorIds: string[]; googleFormUrl: string; formId: string; syncedAt: Date | null; active: boolean; published: boolean | null; subjectId: string; subjectName: string; subjectCode: string; formItems: unknown | null }
type SubjectOption = { id: string; name: string; code: string }
type TeacherOption = { id: string; name: string }

export default async function BankSoalPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rows: BankRow[] = []
  let subjectOptions: SubjectOption[] = []
  let teacherOptions: TeacherOption[] = []
  let majorOptions: { id: string; name: string }[] = []

  try {
    rows = await db
      .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, teacherName: questionBanks.teacherName, teacherId: questionBanks.teacherId, teacherIds: questionBanks.teacherIds, grade: questionBanks.grade, majorId: questionBanks.majorId, proctorIds: questionBanks.proctorIds, googleFormUrl: questionBanks.googleFormUrl, formId: questionBanks.formId, syncedAt: questionBanks.syncedAt, formItems: questionBanks.formItems, active: questionBanks.active, published: questionBanks.published, subjectId: subjects.id, subjectName: subjects.name, subjectCode: subjects.code })
      .from(questionBanks)
      .innerJoin(subjects, eq(questionBanks.subjectId, subjects.id))
      .orderBy(asc(questionBanks.code))

    subjectOptions = await db.select({ id: subjects.id, name: subjects.name, code: subjects.code }).from(subjects).orderBy(asc(subjects.name))
    teacherOptions = await db.select({ id: teachers.id, name: teachers.name }).from(teachers).where(eq(teachers.active, true)).orderBy(asc(teachers.name))
    majorOptions = await db.select({ id: majors.id, name: majors.name }).from(majors).orderBy(asc(majors.name))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data bank soal."
  }


  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/bank-soal" />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-muted/30">
        <DashboardNavbar title="Bank Soal" description="Kelola link Google Form" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Bank Soal</h1><p className="text-sm text-muted-foreground">Kelola bank soal dan link Google Form ujian.</p></section>
          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <BankSoalBody rows={rows} subjects={subjectOptions} teachers={teacherOptions} majors={majorOptions} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
