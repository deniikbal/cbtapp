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
    <div className="m3-pengawas min-h-svh" style={{ background: "var(--m3-surface)" }}>
      <header className="m3-bar">
        <div className="m3-bar-inner" style={{ maxWidth: 768 }}>
          <div className="m3-bar-text">
            <p className="m3-bar-title">Pengawas ujian</p>
            <p className="m3-bar-sub truncate">{aktor.nama}</p>
          </div>
          <span className="m3-chip m3-chip--aktif">{aktor.jenis === "proktor" ? "Proktor" : "Admin"}</span>
        </div>
      </header>
      <PengawasMonitor ruangan={ruangan} />
    </div>
  )
}
