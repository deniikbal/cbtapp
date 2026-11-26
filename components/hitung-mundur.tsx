"use client"

import { useEffect, useState } from "react"

/**
 * Hitung mundur di kartu jadwal ujian siswa.
 * - Belum mulai: sisa waktu menuju jam mulai.
 * - Sedang berjalan: sisa waktu sampai durasi habis.
 * Jam dihitung dengan offset WIB (+07:00) supaya tidak bergantung zona waktu perangkat.
 * Tampil sebagai chip solid (latar warna, teks kontras) di baris atas kartu.
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

  const dasar = {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 10px",
    borderRadius: 999,
    fontSize: 13,
    lineHeight: "16px",
    fontWeight: 600,
    whiteSpace: "nowrap",
  } as const

  if (sisa === null) {
    return (
      <span style={{ ...dasar, background: "var(--m3-surface-container-high)", color: "var(--m3-on-surface-variant)" }}>
        menghitung…
      </span>
    )
  }
  if (sisa <= 0) {
    return (
      <span style={{ ...dasar, background: "var(--m3-error-container)", color: "var(--m3-on-error-container)" }}>waktu habis</span>
    )
  }

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
    <span
      style={
        mendesak
          ? { ...dasar, background: "var(--m3-error)", color: "oklch(0.99 0 0)" }
          : { ...dasar, background: "var(--m3-primary)", color: "var(--m3-on-primary)" }
      }
    >
      {berjalan ? "Sisa" : "Mulai dalam"}
      <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 800 }}>{teks}</span>
    </span>
  )
}
