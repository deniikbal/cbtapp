import type { ComponentType } from "react"
import { BarChart3, BookOpen, BookOpenCheck, Building2, CalendarDays, CheckCircle2, FileText, GraduationCap, Home, LayoutDashboard, LinkIcon, Settings, ShieldCheck, ShieldOff, Smartphone, UserCog, UserRound, Users } from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ExamBrowserSettingsForm } from "@/components/exam-browser-settings-form"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { getAllowedUserAgentPatterns, getExamBrowserSettings } from "@/lib/exam-browser"
import { cn } from "@/lib/utils"

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const settings = await getExamBrowserSettings()
  const patterns = getAllowedUserAgentPatterns(settings.allowedUserAgentPattern)

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/pengaturan" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar title="Pengaturan" description="Konfigurasi akses ujian" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Pengaturan SMANSABA Assesmen</h1>
            <p className="text-sm text-muted-foreground">Batasi login dan dashboard siswa agar hanya bisa dibuka dari aplikasi ExamBro Android.</p>
          </section>

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard label="Mode Wajib" value={settings.forceExamBrowser ? 1 : 0} description={settings.forceExamBrowser ? "Aktif" : "Nonaktif"} icon={settings.forceExamBrowser ? ShieldCheck : ShieldOff} accent="from-sky-500/10 to-sky-500/0 text-sky-600 dark:text-sky-400" ringClass="ring-sky-500/20" />
            <StatCard label="Pola UA" value={patterns.length} description="Keyword terdaftar" icon={Smartphone} accent="from-blue-500/10 to-blue-500/0 text-blue-600 dark:text-blue-400" ringClass="ring-blue-500/20" />
            <StatCard label="Halaman Cek" value={1} description="/cek-browser" icon={CheckCircle2} accent="from-pink-500/10 to-pink-500/0 text-pink-600 dark:text-pink-400" ringClass="ring-pink-500/20" />
            <StatCard label="Link App" value={settings.downloadUrl ? 1 : 0} description={settings.downloadUrl ? "Tersedia" : "Belum diisi"} icon={LinkIcon} accent="from-emerald-500/10 to-emerald-500/0 text-emerald-600 dark:text-emerald-400" ringClass="ring-emerald-500/20" />
          </section>

          <Alert>
            <Smartphone className="size-4" />
            <AlertTitle>Cara mengambil User-Agent</AlertTitle>
            <AlertDescription>
              Buka <Link href="/cek-browser" className="font-medium underline underline-offset-4">/cek-browser</Link> dari aplikasi ExamBro yang akan dipakai siswa, lalu salin keyword uniknya ke pengaturan ini.
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center gap-2">
                  <CardTitle>Proteksi Halaman Siswa</CardTitle>
                  <Badge variant="secondary" className={cn("font-normal", settings.forceExamBrowser ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/10 text-amber-700 dark:text-amber-300")}>{settings.forceExamBrowser ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <CardDescription>Pengaturan ini berlaku untuk halaman login siswa di root (/) dan /siswa/dashboard.</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="pt-6">
              <ExamBrowserSettingsForm settings={settings} />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }
type StatCardProps = { label: string; value: number; description: string; icon: ComponentType<{ className?: string }>; accent: string; ringClass: string }
function StatCard({ label, value, description, icon: Icon, accent, ringClass }: StatCardProps) { return <Card className={cn("relative overflow-hidden transition-shadow hover:shadow-md", ringClass)}><div className={cn("pointer-events-none absolute inset-0 bg-gradient-to-br opacity-100", accent)} /><CardHeader className="relative"><div className="flex items-start justify-between gap-2"><div className="space-y-1"><p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p><p className="text-2xl font-semibold tracking-tight tabular-nums md:text-3xl">{value.toLocaleString("id-ID")}</p></div><div className={cn("flex size-9 items-center justify-center rounded-lg bg-background/80 ring-1 ring-foreground/5 backdrop-blur", accent.split(" ").find((className) => className.startsWith("text-")) ?? "")}><Icon className="size-4" /></div></div></CardHeader><CardContent className="relative"><p className="text-xs text-muted-foreground">{description}</p></CardContent></Card> }
