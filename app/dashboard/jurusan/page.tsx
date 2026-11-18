import { asc, count, eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { headers } from "next/headers"

import { MajorCreateDialog } from "@/components/major-create-dialog"
import { MajorRowActions } from "@/components/major-row-actions"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
  const totalKelas = rows.reduce((sum, row) => sum + row.classCount, 0)

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/jurusan" />
      <SidebarInset>
        <DashboardNavbar title="Jurusan" description="Kelola data jurusan" userName={session.user.name} userEmail={session.user.email} />
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 md:px-6 lg:px-8">
          <section className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div className="space-y-1">
              <h1 className="text-2xl font-medium tracking-tight">Data Jurusan</h1>
              <p className="text-sm text-muted-foreground">Pengelompokan kelas dan peserta per jurusan</p>
            </div>
            <MajorCreateDialog />
          </section>

          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Stat label="Total jurusan" value={rows.length} />
            <Stat label="Terpakai" value={usedMajors} />
            <Stat label="Belum terpakai" value={rows.length - usedMajors} muted={rows.length - usedMajors === 0} />
            <Stat label="Total kelas" value={totalKelas} />
          </section>

          {databaseError && <Alert variant="destructive"><AlertTitle>Database belum siap</AlertTitle><AlertDescription>{databaseError}</AlertDescription></Alert>}

          <Card className="py-0 gap-0">
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-sm font-medium">Daftar jurusan</h2>
              <p className="text-sm text-muted-foreground tabular-nums">{rows.length} jurusan</p>
            </div>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 pl-6 text-center">#</TableHead>
                    <TableHead>Nama jurusan</TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Total kelas</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-32 pr-6 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={6} className="h-48 text-center">
                        <div className="mx-auto max-w-sm space-y-1 text-muted-foreground">
                          <div className="font-medium text-foreground">Belum ada jurusan</div>
                          <p className="text-sm">Tambahkan jurusan sebelum membuat kelas</p>
                          <div className="pt-2"><MajorCreateDialog /></div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row, index) => (
                      <TableRow key={row.id} className="transition-colors hover:bg-muted/40">
                        <TableCell className="pl-6 text-center text-sm text-muted-foreground tabular-nums">{index + 1}</TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">{row.code}</TableCell>
                        <TableCell className="tabular-nums">{row.classCount}</TableCell>
                        <TableCell>
                          <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                            <span aria-hidden className={row.classCount > 0 ? "size-1.5 rounded-full bg-primary" : "size-1.5 rounded-full bg-border"} />
                            {row.classCount > 0 ? "Terpakai" : "Belum terpakai"}
                          </span>
                        </TableCell>
                        <TableCell className="pr-6 text-right"><MajorRowActions major={row} /></TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

function DashboardNavbar({ title, description, userName, userEmail }: { title: string; description: string; userName: string; userEmail: string }) { return <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8"><div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4"><div className="flex items-center gap-3"><SidebarTrigger /><div><p className="text-sm font-medium">{title}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><UserNav name={userName} email={userEmail} /></div></header> }

function Stat({ label, value, muted }: { label: string; value: number; muted?: boolean }) {
  return (
    <Card className="gap-1 rounded-xl py-5">
      <CardContent className="px-6">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className={muted ? "text-3xl font-medium tabular-nums text-muted-foreground/60" : "text-3xl font-medium tabular-nums tracking-tight"}>{value.toLocaleString("id-ID")}</p>
      </CardContent>
    </Card>
  )
}
