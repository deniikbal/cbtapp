"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIcon, RefreshCwIcon, UsersIcon } from "lucide-react"

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

type Jadwal = { scheduleId: string; judul: string; mulai: string; selesai: string; sisaDetik: number; berjalan: boolean; totalSoal: number }
type Siswa = {
  id: string
  nama: string
  nis: string
  kelas: string
  totalSoal: number
  terjawab: number
  status: "BELUM" | "MENGERJAKAN" | "SELESAI"
  mulai: string | null
  terakhir: string | null
  jadwalId: string | null
}
type Kejadian = { id: number; jenis: string; pesan: string; waktu: string }
type Monitor = {
  ruangan: { id: string; name: string }
  jadwal: Jadwal[]
  ringkas: { total: number; masuk: number; mengerjakan: number; selesai: number }
  siswa: Siswa[]
  kejadian: Kejadian[]
  diperbarui: string
}

const KUNCI_RUANGAN = "pengawas_ruangan"

function jam(detik: number) {
  const j = Math.floor(detik / 3600)
  const m = Math.floor((detik % 3600) / 60)
  const d = detik % 60
  return `${j}:${String(m).padStart(2, "0")}:${String(d).padStart(2, "0")}`
}

function jamMenit(iso: string | null) {
  if (!iso) return "-"
  return new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit" }).format(new Date(iso))
}

function sisa(iso: string) {
  const detik = Math.max(0, Math.round((new Date(iso).getTime() - Date.now()) / 1000))
  return jam(detik)
}

export function PengawasMonitor({ ruangan }: { ruangan: { id: string; name: string }[] }) {
  const [roomId, setRoomId] = useState<string>("")
  const [data, setData] = useState<Monitor | null>(null)
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    const simpan = window.localStorage.getItem(KUNCI_RUANGAN)
    if (simpan && ruangan.some((r) => r.id === simpan)) setRoomId(simpan)
  }, [ruangan])

  const muat = useCallback(async (id: string) => {
    if (!id) return
    setMemuat(true)
    try {
      const res = await fetch(`/api/pengawas/monitor?roomId=${encodeURIComponent(id)}`, { cache: "no-store" })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Gagal memuat monitor")
      setData(await res.json())
      setGalat(null)
    } catch (err) {
      setGalat(err instanceof Error ? err.message : "Gagal memuat monitor")
    } finally {
      setMemuat(false)
    }
  }, [])

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (!roomId) {
      setData(null)
      return
    }
    void muat(roomId)
    timerRef.current = setInterval(() => void muat(roomId), 3000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [roomId, muat])

  const pilihRuangan = (id: string | null) => {
    if (!id) return
    window.localStorage.setItem(KUNCI_RUANGAN, id)
    setRoomId(id)
  }

  const jadwalAktif = data?.jadwal.find((j) => j.berjalan) ?? data?.jadwal[0] ?? null

  return (
    <main className="m3-main">
      <div className="m3-card">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="m3-judul flex items-center gap-2">
              <UsersIcon className="size-5 shrink-0" aria-hidden="true" />
              Monitor pengawas
            </p>
            <p className="m3-sub">Pilih ruangan untuk memantau pengerjaan siswa.</p>
          </div>
          <span className="m3-chip m3-chip--mono shrink-0">
            {new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(data?.diperbarui ?? Date.now()))}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex w-full flex-col gap-1">
            <span className="m3-info-label">Ruangan</span>
            <Select value={roomId} onValueChange={pilihRuangan}>
              <SelectTrigger className="h-12 w-full rounded-full border-[color:var(--m3-outline)] bg-[color:var(--m3-surface-container-low)] px-4">
                <SelectValue>{ruangan.find((r) => r.id === roomId)?.name ?? "Pilih ruangan"}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {ruangan.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <button type="button" className="m3-btn m3-btn--tonal" disabled={!roomId || memuat} onClick={() => void muat(roomId)}>
            <RefreshCwIcon className={cn("size-4", memuat && "animate-spin")} aria-hidden="true" />
            Muat ulang
          </button>
        </div>
      </div>

      {galat && (
        <div className="m3-card" style={{ color: "var(--m3-on-error-container)", background: "var(--m3-error-container)" }}>
          <p className="m3-seksi">{galat}</p>
        </div>
      )}

      {!roomId && (
        <div className="m3-card">
          <p className="m3-sub">Belum ada ruangan dipilih. Pilih ruangan di atas untuk menampilkan data pengawasan.</p>
        </div>
      )}

      {roomId && data && (
        <>
          <div className="m3-card">
            <div>
              <p className="m3-seksi">{data.ruangan.name}</p>
              <p className="m3-sub">
                {jadwalAktif ? `${jadwalAktif.judul} · ${jadwalAktif.totalSoal} soal` : "Belum ada jadwal aktif hari ini"}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Ringkas label="Peserta" nilai={`${data.ringkas.total}`} variant="utama" />
              <Ringkas label="Masuk" nilai={`${data.ringkas.masuk}/${data.ringkas.total}`} variant="aksen" />
              <Ringkas label="Mengerjakan" nilai={`${data.ringkas.mengerjakan}`} variant="tonal" />
              <Ringkas label="Sisa waktu" nilai={jadwalAktif ? sisa(jadwalAktif.selesai) : "-"} />
            </div>
          </div>

          <div className="m3-card">
            <div className="flex items-center justify-between gap-2">
              <p className="m3-seksi">Peserta</p>
              <span className="m3-chip">tiap 3 detik</span>
            </div>
            {data.siswa.length === 0 ? (
              <p className="m3-sub">Tidak ada peserta aktif di ruangan ini.</p>
            ) : (
              <div className="flex flex-col">
                {data.siswa.map((s) => (
                  <div key={s.id} className="m3-baris">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="m3-seksi truncate">{s.nama}</p>
                        <p className="m3-sub">
                          {s.kelas} · <span className="font-mono">{s.nis}</span>
                        </p>
                      </div>
                      <StatusChip status={s.status} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="m3-progress w-full">
                        <span style={{ width: `${s.totalSoal ? Math.round((s.terjawab / s.totalSoal) * 100) : 0}%` }} />
                      </div>
                      <span className="m3-info-label shrink-0 tabular-nums">
                        {s.terjawab}/{s.totalSoal || "-"}
                      </span>
                    </div>
                    <p className="m3-info-label">
                      Mulai {jamMenit(s.mulai)} · terakhir aktif {jamMenit(s.terakhir)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="m3-card">
            <p className="m3-seksi flex items-center gap-2">
              <ActivityIcon className="size-5 shrink-0" aria-hidden="true" />
              Kejadian terbaru
            </p>
            {data.kejadian.length === 0 ? (
              <p className="m3-sub">Belum ada kejadian.</p>
            ) : (
              <ul className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {data.kejadian.map((k) => (
                  <li key={k.id} className="flex gap-2">
                    <span className="m3-info-label shrink-0 font-mono">{jamMenit(k.waktu)}</span>
                    <span className="m3-info-value min-w-0">{k.pesan}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </main>
  )
}

function StatusChip({ status }: { status: Siswa["status"] }) {
  if (status === "SELESAI") return <span className="m3-chip m3-chip--aktif shrink-0">Selesai</span>
  if (status === "MENGERJAKAN") return <span className="m3-chip m3-chip--aksen shrink-0">Mengerjakan</span>
  return <span className="m3-chip shrink-0">Belum masuk</span>
}

function Ringkas({ label, nilai, variant = "netral" }: { label: string; nilai: string; variant?: "netral" | "utama" | "aksen" | "tonal" }) {
  return (
    <div className={variant === "netral" ? "m3-metric" : `m3-metric m3-metric--${variant}`}>
      <div className="min-w-0">
        <p className="m3-metric-label truncate">{label}</p>
        <p className="m3-metric-value">{nilai}</p>
      </div>
    </div>
  )
}
