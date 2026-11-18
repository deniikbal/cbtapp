"use client"

import { RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [diperbarui, setDiperbarui] = useState<string | null>(null)

  useEffect(() => {
    let aktif = true
    const jam = () => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())
    const perbarui = async () => {
      router.refresh()
      if (aktif) setDiperbarui(jam())
    }
    perbarui()
    const timer = setInterval(perbarui, intervalMs)
    return () => {
      aktif = false
      clearInterval(timer)
    }
  }, [router, intervalMs])

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground" role="status">
      <RefreshCw className="size-3.5" aria-hidden="true" />
      Data sync diperbarui otomatis tiap menit{diperbarui ? ` • terakhir ${diperbarui}` : ""}
    </p>
  )
}
