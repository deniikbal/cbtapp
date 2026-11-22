import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { RuanganManagementCard, type RuanganRow, type SiswaRow } from "@/components/ruangan-management-card"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examRooms, students } from "@/lib/db/schema"

export default async function RuanganPage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  let databaseError: string | null = null
  let rooms: RuanganRow[] = []
  let siswa: SiswaRow[] = []

  try {
    const roomRows = await db.select({ id: examRooms.id, name: examRooms.name }).from(examRooms)
    const siswaRows = await db
      .select({ id: students.id, name: students.name, nis: students.nis, roomId: students.roomId, className: classrooms.name })
      .from(students)
      .innerJoin(classrooms, eq(students.classroomId, classrooms.id))
      .where(eq(students.active, true))

    const membersByRoom = new Map<string, SiswaRow[]>()
    for (const s of siswaRows) {
      if (!s.roomId) continue
      const list = membersByRoom.get(s.roomId) ?? []
      list.push(s)
      membersByRoom.set(s.roomId, list)
    }

    rooms = roomRows.map((room) => {
      const members = membersByRoom.get(room.id) ?? []
      const perClassMap = new Map<string, number>()
      for (const s of members) perClassMap.set(s.className, (perClassMap.get(s.className) ?? 0) + 1)
      const perClass = [...perClassMap.entries()]
        .map(([className, jumlah]) => ({ className, jumlah }))
        .sort((a, b) => new Intl.Collator("id-ID", { numeric: true, sensitivity: "base" }).compare(a.className, b.className))
      return { id: room.id, name: room.name, memberIds: members.map((m) => m.id), perClass }
    })

    siswa = siswaRows.map((s) => ({ id: s.id, name: s.name, nis: s.nis, className: s.className, roomId: s.roomId }))
  } catch (error) {
    databaseError = error instanceof Error ? error.message : "Gagal mengambil data ruangan."
  }

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/ruangan" />
      <SidebarInset className="min-w-0 bg-muted/30">
        <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <p className="text-sm font-medium">Ruangan</p>
                <p className="text-xs text-muted-foreground">Ruang ujian dengan kelas campuran</p>
              </div>
            </div>
            <UserNav name={session.user.name} email={session.user.email} />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          <section className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Ruangan Ujian</h1>
            <p className="text-sm text-muted-foreground">
              Satu ruangan boleh berisi siswa dari beberapa kelas, kelas asli siswa tidak berubah.
            </p>
          </section>

          {databaseError && (
            <Alert variant="destructive">
              <AlertTitle>Database belum siap</AlertTitle>
              <AlertDescription>{databaseError}</AlertDescription>
            </Alert>
          )}

          <RuanganManagementCard rooms={rooms} students={siswa} />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
