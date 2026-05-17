import type { ComponentType } from "react"
import {
  BookOpen,
  BookOpenCheck,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  GraduationCap,
  Home,
  LayoutDashboard,
  LinkIcon,
  Settings,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Users,
} from "lucide-react"
import Link from "next/link"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { updateExamBrowserSettings } from "@/app/dashboard/pengaturan/actions"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarProvider, SidebarRail, SidebarTrigger } from "@/components/ui/sidebar"
import { Textarea } from "@/components/ui/textarea"
import { auth } from "@/lib/auth"
import { getAllowedUserAgentPatterns, getExamBrowserSettings } from "@/lib/exam-browser"
import { cn } from "@/lib/utils"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, active: false },
  { href: "/dashboard/jurusan", label: "Jurusan", icon: Building2, active: false },
  { href: "/dashboard/kelas", label: "Kelas", icon: GraduationCap, active: false },
  { href: "/dashboard/peserta", label: "Peserta", icon: Users, active: false },
  { href: "/dashboard/mapel", label: "Mapel", icon: BookOpen, active: false },
  { href: "/dashboard/bank-soal", label: "Bank Soal", icon: FileText, active: false },
  { href: "/dashboard/jadwal", label: "Jadwal", icon: CalendarDays, active: false },
  { href: "/dashboard/pengerjaan", label: "Pengerjaan", icon: BookOpenCheck, active: false },
  { href: "/dashboard/pengaturan", label: "Pengaturan", icon: Settings, active: true },
]

export default async function PengaturanPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const settings = await getExamBrowserSettings()
  const patterns = getAllowedUserAgentPatterns(settings.allowedUserAgentPattern)

  return (
    <SidebarProvider>
      <DashboardSidebar />
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
              <form
                key={`${settings.forceExamBrowser}-${settings.allowedUserAgentPattern}-${settings.blockedMessage}-${settings.downloadUrl}`}
                action={updateExamBrowserSettings}
                className="space-y-5"
              >
                <div className="flex items-start gap-3 rounded-xl border bg-muted/30 p-4">
                  <input id="forceExamBrowser" name="forceExamBrowser" type="checkbox" defaultChecked={settings.forceExamBrowser} className="mt-1 size-4 rounded border-border" />
                  <div className="space-y-1">
                    <Label htmlFor="forceExamBrowser">Wajib menggunakan ExamBro</Label>
                    <p className="text-sm text-muted-foreground">Jika aktif, Chrome/browser biasa akan diarahkan ke halaman blokir.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allowedUserAgentPattern">Pola User-Agent yang diizinkan</Label>
                  <Textarea id="allowedUserAgentPattern" name="allowedUserAgentPattern" defaultValue={settings.allowedUserAgentPattern} placeholder="Contoh: exambro&#10;exam browser" rows={5} />
                  <p className="text-xs text-muted-foreground">Bisa lebih dari satu, pisahkan dengan baris baru atau koma. Gunakan keyword unik, jangan User-Agent lengkap.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="blockedMessage">Pesan saat diblokir</Label>
                  <Textarea id="blockedMessage" name="blockedMessage" defaultValue={settings.blockedMessage} rows={3} />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="downloadUrl">Link Play Store ExamBro</Label>
                  <Input id="downloadUrl" name="downloadUrl" defaultValue={settings.downloadUrl} placeholder="https://play.google.com/store/apps/details?id=..." />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button nativeButton={false} variant="outline" className="gap-2" render={<Link href="/cek-browser" />}>Cek User-Agent</Button>
                  <Button type="submit" className="gap-2"><Settings className="size-4" />Simpan Pengaturan</Button>
                </div>
              </form>
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
