import Link from "next/link"
import { cookies } from "next/headers"
import { eq } from "drizzle-orm"
import { redirect } from "next/navigation"
import { LogOut } from "lucide-react"

import { logoutGuru } from "@/app/guru/login/actions"
import { ImporSoalPage } from "@/components/impor-soal-page"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { db } from "@/lib/db"
import { questionBanks, subjects, teachers } from "@/lib/db/schema"
import { ambilForm, daftarSoalDariItems } from "@/lib/google-forms"

async function muatSoalForm(formId: string): Promise<ReturnType<typeof daftarSoalDariItems>> {
  try {
    const { items } = await ambilForm(formId)
    return daftarSoalDariItems(items)
  } catch {
    return []
  }
}

export const dynamic = "force-dynamic"

export default async function ImporSoalGuruPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string }>
}) {
  const cookieStore = await cookies()
  const teacherId = cookieStore.get("teacher_id")?.value
  if (!teacherId) redirect("/guru")

  const guru = await db.query.teachers.findFirst({ where: eq(teachers.id, teacherId) })
  if (!guru || !guru.active) redirect("/guru")

  const { bank: bankId } = await searchParams
  const [bank] = bankId
    ? await db
        .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, formId: questionBanks.formId, subjectName: subjects.name, teacherId: questionBanks.teacherId, teacherIds: questionBanks.teacherIds })
        .from(questionBanks)
        .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .where(eq(questionBanks.id, bankId))
        .limit(1)
    : []

  const milikSaya = bank && (bank.teacherId === guru.id || bank.teacherIds.includes(guru.id))

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="bg-brand text-brand-foreground">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-2.5 md:px-6 lg:px-8">
          <div className="leading-tight">
            <p className="text-[11px]">Area Guru</p>
            <p className="text-sm font-semibold">{guru.name}</p>
            <p className="text-[11px]">NIP {guru.nip}</p>
          </div>
          <form action={logoutGuru}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="h-11 rounded-sm border-brand-foreground/60 bg-transparent text-xs text-brand-foreground hover:bg-brand-foreground/15 hover:text-brand-foreground sm:h-7"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Keluar
            </Button>
          </form>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
        {bank && milikSaya && bank.formId ? (
          <ImporSoalPage
            soalFormAwal={await muatSoalForm(bank.formId)}
            bankId={bank.id}
            kode={bank.code}
            judul={bank.title}
            mapel={bank.subjectName ?? "-"}
            formId={bank.formId}
            backHref="/guru/dashboard"
          />
        ) : (
          <Card className="rounded-sm py-0">
            <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground">
              {bank
                ? milikSaya
                  ? "Bank soal ini belum punya Google Form. Hubungi panitia untuk membuat form."
                  : "Bank soal ini bukan milik Anda."
                : "Bank soal tidak ditemukan. Kembali ke dashboard lalu pilih bank yang benar."}
              <div className="mt-3">
                <Link href="/guru/dashboard" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                  Kembali ke Dashboard
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
