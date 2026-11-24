import { redirect } from "next/navigation"
import { asc } from "drizzle-orm"

import { PengawasMonitor } from "@/components/pengawas-monitor"
import { db } from "@/lib/db"
import { examRooms } from "@/lib/db/schema"
import { aktorPengawas } from "@/lib/pengawas-auth"

export const dynamic = "force-dynamic"

export default async function PengawasPage() {
  const aktor = await aktorPengawas()
  if (!aktor) redirect("/proktor")

  const ruangan = await db.select({ id: examRooms.id, name: examRooms.name }).from(examRooms).orderBy(asc(examRooms.name))

  return (
    <main className="min-h-svh bg-muted/30">
      <header className="border-b bg-background px-4 py-3">
        <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Pengawas Ujian</p>
            <p className="text-xs text-muted-foreground">{aktor.nama}</p>
          </div>
          <span className="rounded-sm border px-2 py-1 text-xs text-muted-foreground">
            {aktor.jenis === "proktor" ? "Proktor" : "Admin"}
          </span>
        </div>
      </header>
      <PengawasMonitor ruangan={ruangan} />
    </main>
  )
}
