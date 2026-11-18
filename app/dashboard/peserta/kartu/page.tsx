import { asc, eq } from "drizzle-orm"
import { headers } from "next/headers"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { KartuUjianControls } from "@/components/kartu-ujian-controls"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { classrooms, majors, students } from "@/lib/db/schema"

const NAMA_SEKOLAH = "SMA Negeri 1 Bantarujeg"
const JUDUL_UJIAN = "Kartu Peserta Ujian"

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
  let peserta: { id: string; name: string; nis: string; kartuPassword: string | null }[] = []
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
        })
        .from(students)
        .where(eq(students.classroomId, kelas))
        .orderBy(asc(students.name))
    }
  } catch (error) {
    galat = error instanceof Error ? error.message : "Gagal mengambil data kartu ujian."
  }

  const tanpaPassword = peserta.filter((siswa) => !siswa.kartuPassword).length

  return (
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
                className="kartu-item break-inside-avoid rounded-sm border border-border border-l-[3px] border-l-brand bg-white p-3 text-[11px] leading-tight"
              >
                <header className="flex items-start justify-between gap-2 border-b border-dashed border-border pb-1.5">
                  <div>
                    <p className="text-[9px] font-medium tracking-wide text-muted-foreground uppercase">
                      {NAMA_SEKOLAH}
                    </p>
                    <p className="text-[12px] font-semibold text-brand">{JUDUL_UJIAN}</p>
                  </div>
                  <span className="rounded-sm bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                    {namaKelas}
                  </span>
                </header>

                <dl className="mt-2 space-y-1">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">Nama</dt>
                    <dd className="line-clamp-2 font-medium text-foreground">{siswa.name}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">Kelas</dt>
                    <dd className="font-medium text-foreground">{namaKelas}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">Username</dt>
                    <dd className="font-mono text-xs font-medium text-foreground">{siswa.nis}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 text-muted-foreground">Password</dt>
                    <dd className="font-mono text-sm font-semibold tracking-[0.15em] text-foreground">
                      {siswa.kartuPassword ?? "—"}
                    </dd>
                  </div>
                </dl>

                <p className="mt-2 border-t border-dashed border-border pt-1.5 text-[9px] text-muted-foreground">
                  Kartu ini bersifat pribadi. Jangan bagikan password ke siswa lain.
                </p>
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

      <div className="hidden print:block print:text-[9px] print:text-muted-foreground">
        Dicetak dari CBT {NAMA_SEKOLAH}
      </div>

      <Button variant="ghost" className="w-fit gap-1.5 print:hidden" render={<Link href="/dashboard/peserta" />}>
        <ArrowLeft className="size-4" aria-hidden="true" />
        Kembali
      </Button>
    </main>
  )
}
