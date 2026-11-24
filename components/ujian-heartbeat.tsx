"use client"

import { useEffect } from "react"

/**
 * Penanda siswa masih di halaman ujian (dipanggil saat halaman dibuka lalu tiap 60 detik).
 * Google Form tidak bisa memberi progres, jadi minimal pengawas tahu siapa yang sudah masuk.
 */
export function UjianHeartbeat({ scheduleId }: { scheduleId: string }) {
  useEffect(() => {
    const kirim = () => {
      void fetch("/api/ujian/heartbeat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scheduleId }),
        keepalive: true,
      }).catch(() => {})
    }
    kirim()
    const timer = setInterval(kirim, 60_000)
    return () => clearInterval(timer)
  }, [scheduleId])

  return null
}
