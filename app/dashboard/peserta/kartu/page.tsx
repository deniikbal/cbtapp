import { asc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { KartuUjianControls } from "@/components/kartu-ujian-controls"
import { UserNav } from "@/components/user-nav"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, examRooms, majors, students } from "@/lib/db/schema"
import { CardSettingsForm } from "@/components/card-settings-form"
import { getCardSettings } from "./card-settings-actions"



export default async function KartuUjianPage({
  searchParams,
}: {
  searchParams: Promise<{ kelas?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { kelas } = await searchParams
  let galat: string | null = null
  let opsiKelas: { id: string; name: string; majorName: string }[] = []
  let peserta: { id: string; name: string; nis: string; kartuPassword: string | null; roomName: string | null }[] = []
  let namaKelas = ""

  try {
    opsiKelas = await db
      .select({ id: classrooms.id, name: classrooms.name, majorName: majors.name })
      .from(classrooms)
      .innerJoin(majors, eq(classrooms.majorId, majors.id))
      .orderBy(asc(classrooms.name))

    if (kelas) {
      namaKelas = opsiKelas.find((item) => item.id === kelas)?.name ?? ""
      peserta = await db
        .select({
          id: students.id,
          name: students.name,
          nis: students.nis,
          kartuPassword: students.kartuPassword,
          roomName: examRooms.name,
        })
        .from(students)
        .leftJoin(examRooms, eq(students.roomId, examRooms.id))
        .where(eq(students.classroomId, kelas))
        .orderBy(asc(students.name))
    }
  } catch (error) {
    galat = error instanceof Error ? error.message : "Gagal mengambil data kartu ujian."
  }

  const tanpaPassword = peserta.filter((siswa) => !siswa.kartuPassword).length
  const cardSettings = await getCardSettings()

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/peserta/kartu" />
      <SidebarInset className="bg-muted/30">
        <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8 print:hidden">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <p className="text-sm font-medium">Kartu Ujian</p>
                <p className="text-xs text-muted-foreground">Cetak kartu peserta per kelas</p>
              </div>
            </div>
            <UserNav name={session.user.name} email={session.user.email} />
          </div>
        </header>

    <main className="mx-auto flex w-full max-w-5xl flex-col gap-4 px-4 py-6 md:px-6">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div className="space-y-1">
          <Link href="/dashboard/peserta" className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Kembali ke peserta
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Kartu Ujian</h1>
          <p className="text-sm text-muted-foreground">
            Cetak kartu berisi nama, kelas, username (NIS), dan password untuk dibagikan ke siswa.
          </p>
        </div>
      </div>

      {galat && (
        <Alert variant="destructive" className="print:hidden">
          <AlertTitle>Gagal memuat data</AlertTitle>
          <AlertDescription>{galat}</AlertDescription>
        </Alert>
      )}

      <CardSettingsForm settings={cardSettings} />

      <KartuUjianControls
        classrooms={opsiKelas}
        classroomId={kelas ?? ""}
        jumlahSiswa={peserta.length}
        jumlahTanpaPassword={tanpaPassword}
      />

      {kelas && peserta.length > 0 && (
        <>
          <p className="text-xs text-muted-foreground print:hidden">
            {peserta.length} peserta ·{" "}
            {tanpaPassword > 0 ? `${tanpaPassword} belum punya password kartu` : "semua sudah punya password kartu"}
          </p>
          <section className="kartu-cetak grid grid-cols-1 gap-3 sm:grid-cols-2">
            {peserta.map((siswa) => (
              <article
                key={siswa.id}
                className="kartu-item flex break-inside-avoid flex-col border border-border bg-white p-3 text-[11px] leading-tight"
              >
                <header className="flex items-center gap-2 border-b border-border pb-2 text-center">
                  {cardSettings.logoUrl && <img src={cardSettings.logoUrl} alt="Logo" className="size-10 object-contain" />}
                  <div className="flex-1">
                    <p className="text-[10px] font-bold uppercase">{cardSettings.schoolName}</p>
                    <p className="text-[12px] font-semibold text-brand">{cardSettings.examTitle}</p>
                    <p className="text-[9px] text-muted-foreground">Tahun Pelajaran {cardSettings.academicYear}</p>
                  </div>
                  {cardSettings.logoUrl && <div className="size-10" />}
                </header>

                <dl className="mt-3 space-y-1.5">
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Nama :</dt>
                    <dd className="kartu-nama line-clamp-2 font-medium">{siswa.name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Kelas :</dt>
                    <dd className="font-medium">{namaKelas}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Ruang Ujian :</dt>
                    <dd className="font-medium">{siswa.roomName ?? "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Username :</dt>
                    <dd className="font-mono text-xs font-bold">{siswa.nis}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-20 shrink-0 text-muted-foreground">Password :</dt>
                    <dd className="kartu-password font-mono text-sm font-bold tracking-[0.15em]">
                      {siswa.kartuPassword ?? "—"}
                    </dd>
                  </div>
                </dl>

                <footer className="mt-auto border-t border-border pt-2 text-[9px]">
                  <div className="ml-auto w-fit text-center">
                    <p className="text-muted-foreground">Kepala Sekolah,</p>
                    <div className="relative mt-4 inline-block px-3 py-3">
                      <div className="text-left">
                        <p className="font-semibold">{cardSettings.principalName || "—"}</p>
                        <p className="text-[8px] text-muted-foreground">NIP. {cardSettings.principalNip || "—"}</p>
                      </div>
                      {cardSettings.signatureUrl && <img src={cardSettings.signatureUrl} alt="TTD" className="absolute inset-0 m-auto h-16 w-full object-contain opacity-90" />}
                    </div>
                  </div>
                </footer>
              </article>
            ))}
          </section>
        </>
      )}

      {kelas && peserta.length === 0 && (
        <p className="rounded-sm border bg-muted/40 p-4 text-sm text-muted-foreground print:hidden">
          Belum ada peserta di kelas ini.
        </p>
      )}

      {!kelas && opsiKelas.length > 0 && (
        <p className="rounded-sm border bg-muted/40 p-4 text-sm text-muted-foreground print:hidden">
          Pilih kelas terlebih dahulu untuk melihat kartu ujian.
        </p>
      )}

      <div className="kartu-footer-cetak hidden print:block print:text-[9px] print:text-muted-foreground">
        Dicetak dari CBT {cardSettings.schoolName}
      </div>

      <Button variant="ghost" className="w-fit gap-1.5 print:hidden" render={<Link href="/dashboard/peserta" />}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali
      </Button>
    </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
