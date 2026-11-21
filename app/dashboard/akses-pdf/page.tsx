import { asc } from "drizzle-orm"
import { Clock, Download, ShieldCheck, Users } from "lucide-react"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { PdfAccessCard, type AksesRow } from "@/components/pdf-access-card"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { teachers } from "@/lib/db/schema"
import { bolehKelolaUser } from "@/lib/peran"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/stat-card"

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

export default async function AksesPdfPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")
  if (!(await bolehKelolaUser())) redirect("/dashboard")

  let aksesRows: AksesRow[] = []
  let databaseError: string | null = null
  try {
    const akses = await db
      .select({
        id: teachers.id,
        name: teachers.name,
        nip: teachers.nip,
        status: teachers.aksesPdf,
        diaktifkanPada: teachers.aksesPdfPada,
        dasar: teachers.aksesPdfDasar,
        catatan: teachers.aksesPdfCatatan,
      })
      .from(teachers)
      .orderBy(asc(teachers.name))
    aksesRows = akses.map((r) => ({
      id: r.id,
      name: r.name,
      nip: r.nip,
      status: r.status ?? "belum",
      diaktifkanPada: r.diaktifkanPada ? r.diaktifkanPada.toISOString().slice(0, 10) : null,
      dasar: r.dasar ?? 0,
      catatan: r.catatan ?? "",
    }))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data akses PDF."
  }

  const aktif = aksesRows.filter((row) => row.status === "aktif").length
  const menunggu = aksesRows.filter((row) => row.status === "menunggu").length

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/akses-pdf" />
      <SidebarInset className="bg-muted/30">
        <DashboardNavbar
          title="Akses Unduh PDF"
          description="Akses gratis & verifikasi dukungan sukarela laporan analisis butir"
          userName={session.user.name}
          userEmail={session.user.email}
        />

        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Akses Unduh PDF Analisis Butir
            </h1>
            <p className="text-sm text-muted-foreground">
              Semua guru boleh mengunduh PDF secara gratis. Guru yang berkenan dapat mendukung pengembangan seikhlasnya;
              kelola status dan verifikasinya di sini. Khusus superadmin.
            </p>
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>
                Jalankan migration database terlebih dahulu. Detail: {databaseError}
              </AlertDescription>
            </Alert>
          )}

          <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
            <StatCard
              label="Total Guru"
              value={aksesRows.length}
              description="Semua guru terdaftar"
              icon={Users}
            />
            <StatCard
              label="Aktif"
              value={aktif}
              description="Boleh unduh PDF"
              icon={ShieldCheck}
            />
            <StatCard
              label="Menunggu"
              value={menunggu}
              description="Menunggu verifikasi"
              icon={Clock}
            />
            <StatCard
              label="Belum Aktif"
              value={aksesRows.length - aktif}
              description="Belum punya akses"
              icon={Download}
            />
          </section>

          <PdfAccessCard rows={aksesRows} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

