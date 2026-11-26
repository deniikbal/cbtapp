"use client"

import { useEffect, useState } from "react"

/**
 * Hitung mundur di kartu jadwal ujian siswa.
 * - Belum mulai: sisa waktu menuju jam mulai.
 * - Sedang berjalan: sisa waktu sampai durasi habis.
 * Jam dihitung dengan offset WIB (+07:00) supaya tidak bergantung zona waktu perangkat.
 */
export function HitungMundur({
  examDate,
  startTime,
  durationMinutes,
}: {
  examDate: string
  startTime: string
  durationMinutes: number
}) {
  const [sisa, setSisa] = useState<number | null>(null)

  useEffect(() => {
    const mulai = new Date(`${examDate}T${startTime.slice(0, 5)}:00+07:00`).getTime()
    const selesai = mulai + durationMinutes * 60_000
    const hitung = () => setSisa((Date.now() < mulai ? mulai : selesai) - Date.now())
    hitung()
    const timer = setInterval(hitung, 1000)
    return () => clearInterval(timer)
  }, [examDate, startTime, durationMinutes])

  // Angka baru muncul setelah komponen hidup di browser (server tidak tahu jam perangkat).
  if (sisa === null) return <span className="m3-sub">menghitung…</span>
  if (sisa <= 0) return <span className="m3-sub">waktu habis</span>

  const total = Math.floor(sisa / 1000)
  const jam = Math.floor(total / 3600)
  const menit = Math.floor((total % 3600) / 60)
  const detik = total % 60
  const teks = [jam > 0 ? `${jam}j` : null, `${String(menit).padStart(2, "0")}m`, `${String(detik).padStart(2, "0")}d`]
    .filter(Boolean)
    .join(" ")
  const berjalan = Date.now() >= new Date(`${examDate}T${startTime.slice(0, 5)}:00+07:00`).getTime()
  const mendesak = sisa < 5 * 60_000

  return (
    <p className={mendesak ? "m3-sub" : "m3-sub"} style={mendesak ? { color: "var(--m3-error, #b3261e)", fontWeight: 600 } : undefined}>
      {berjalan ? "Sisa waktu" : "Mulai dalam"} <span className="tabular-nums font-semibold">{teks}</span>
    </p>
  )
}
