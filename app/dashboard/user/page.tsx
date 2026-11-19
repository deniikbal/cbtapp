import { asc } from "drizzle-orm"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, FileText, GraduationCap, Home, LayoutDashboard, Settings, ShieldCheck, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { UserManagementCard, type UserManagementRow } from "@/components/user-management-card"
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
import { user } from "@/lib/db/schema"
import { bolehKelolaUser } from "@/lib/peran"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/stat-card"

export default async function UserPage() {
  const currentSession = await auth.api.getSession({ headers: await headers() })
  if (!currentSession) redirect("/login")
  if (!(await bolehKelolaUser())) redirect("/dashboard")

  let databaseError: string | null = null
  let rows: UserManagementRow[] = []

  try {
    const result = await db
      .select({
        id: user.id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified,
        role: user.role,
        createdAt: user.createdAt,
      })
      .from(user)
      .orderBy(asc(user.name))

    rows = result.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    }))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data user."
  }

  const newUsersThisMonth = rows.filter((row) => {
    const createdAt = new Date(row.createdAt)
    const now = new Date()
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear()
  }).length
  const uniqueDomains = new Set(rows.map((row) => row.email.split("@")[1]).filter(Boolean)).size

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/user" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="User" description="Kelola akun dashboard" userName={currentSession.user.name} userEmail={currentSession.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1"><h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Data User</h1><p className="text-sm text-muted-foreground">Kelola akun admin dan operator yang dapat mengakses dashboard.</p></section>
          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Total User" value={rows.length} description="Akun dashboard" icon={Users} />
            <StatCard label="User Baru" value={newUsersThisMonth} description="Dibuat bulan ini" icon={ShieldCheck} />
            <StatCard label="Domain Email" value={uniqueDomains} description="Domain email unik" icon={UserCog} />
            <StatCard label="Akun Dashboard" value={rows.length} description="Akses admin/operator" icon={BookOpenCheck} />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <UserManagementCard users={rows} currentUserId={currentSession.user.id} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
