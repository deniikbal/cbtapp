import Link from "next/link"
import { eq } from "drizzle-orm"
import { headers } from "next/headers"
import { redirect } from "next/navigation"

import { ImporSoalPage } from "@/components/impor-soal-page"
import { UserNav } from "@/components/user-nav"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { Card, CardContent } from "@/components/ui/card"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { auth } from "@/lib/auth"
import { db } from "@/lib/db"
import { questionBanks, subjects } from "@/lib/db/schema"

export const dynamic = "force-dynamic"

export default async function ImporSoalAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ bank?: string }>
}) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) redirect("/login")

  const { bank: bankId } = await searchParams
  const [bank] = bankId
    ? await db
        .select({ id: questionBanks.id, code: questionBanks.code, title: questionBanks.title, formId: questionBanks.formId, subjectName: subjects.name })
        .from(questionBanks)
        .leftJoin(subjects, eq(questionBanks.subjectId, subjects.id))
        .where(eq(questionBanks.id, bankId))
        .limit(1)
    : []

  return (
    <SidebarProvider>
      <DashboardSidebar active="/dashboard/bank-soal" />
      <SidebarInset className="min-w-0 overflow-x-hidden bg-muted/30">
        <header className="sticky top-0 z-10 border-b bg-background px-4 py-3 md:px-6 lg:px-8">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div>
                <p className="text-sm font-medium">Impor Soal</p>
                <p className="text-xs text-muted-foreground">Isi soal pilihan ganda ke Google Form</p>
              </div>
            </div>
            <UserNav name={session.user.name} email={session.user.email} />
          </div>
        </header>
        <main className="mx-auto flex w-full min-w-0 max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
          {bank && bank.formId ? (
            <ImporSoalPage
              bankId={bank.id}
              kode={bank.code}
              judul={bank.title}
              mapel={bank.subjectName ?? "-"}
              formId={bank.formId}
              backHref="/dashboard/bank-soal"
            />
          ) : (
            <Card className="rounded-sm py-0">
              <CardContent className="px-4 py-10 text-center text-sm text-muted-foreground">
                {bank
                  ? "Bank soal ini belum punya Google Form. Buat form dulu di halaman Bank Soal."
                  : "Bank soal tidak ditemukan. Kembali ke halaman Bank Soal lalu pilih bank yang benar."}
                <div className="mt-3">
                  <Link href="/dashboard/bank-soal" className="text-sm font-medium text-primary underline-offset-4 hover:underline">
                    Kembali ke Bank Soal
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
