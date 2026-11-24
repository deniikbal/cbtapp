"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { ActivityIcon, RefreshCwIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 pb-16">
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <CardTitle className="flex items-center gap-2">
                <UsersIcon className="size-4 text-muted-foreground" />
                Monitor Pengawas
              </CardTitle>
              <CardDescription>Pilih ruangan untuk memantau pengerjaan siswa.</CardDescription>
            </div>
            <Badge variant="outline" className="font-mono text-xs">
              {new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).format(new Date(data?.diperbarui ?? Date.now()))}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end">
          <div className="flex w-full flex-col gap-2">
            <span className="text-sm font-medium">Ruangan</span>
            <Select value={roomId} onValueChange={pilihRuangan}>
              <SelectTrigger className="w-full">
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
          <Button variant="outline" disabled={!roomId || memuat} onClick={() => void muat(roomId)}>
            <RefreshCwIcon className={cn("size-4", memuat && "animate-spin")} />
            Muat ulang
          </Button>
        </CardContent>
      </Card>

      {galat && <Card><CardContent className="pt-6 text-sm text-destructive">{galat}</CardContent></Card>}

      {!roomId && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            Belum ada ruangan dipilih. Pilih ruangan di atas untuk menampilkan data pengawasan.
          </CardContent>
        </Card>
      )}

      {roomId && data && (
        <>
          <Card>
            <CardHeader className="border-b">
              <CardTitle>{data.ruangan.name}</CardTitle>
              <CardDescription>
                {jadwalAktif ? `${jadwalAktif.judul} · ${jadwalAktif.totalSoal} soal` : "Belum ada jadwal aktif hari ini"}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3 pt-6 sm:grid-cols-4">
              <Ringkas label="Peserta" nilai={`${data.ringkas.total}`} />
              <Ringkas label="Masuk" nilai={`${data.ringkas.masuk}/${data.ringkas.total}`} />
              <Ringkas label="Mengerjakan" nilai={`${data.ringkas.mengerjakan}`} />
              <Ringkas label="Sisa waktu" nilai={jadwalAktif ? sisa(jadwalAktif.selesai) : "-"} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Peserta</CardTitle>
              <CardDescription>Diperbarui otomatis tiap 3 detik.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col divide-y pt-2">
              {data.siswa.length === 0 && <p className="py-4 text-sm text-muted-foreground">Tidak ada peserta aktif di ruangan ini.</p>}
              {data.siswa.map((s) => (
                <div key={s.id} className="flex flex-col gap-1.5 py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{s.nama}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.kelas} · <span className="font-mono">{s.nis}</span>
                      </p>
                    </div>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 rounded-sm font-normal",
                        s.status === "SELESAI" && "bg-lime-500/10 text-lime-700 dark:text-lime-300",
                        s.status === "MENGERJAKAN" && "bg-amber-500/10 text-amber-700 dark:text-amber-300",
                        s.status === "BELUM" && "bg-muted text-muted-foreground"
                      )}
                    >
                      {s.status === "BELUM" ? "Belum masuk" : s.status === "SELESAI" ? "Selesai" : "Mengerjakan"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-primary"
                        style={{ width: `${s.totalSoal ? Math.round((s.terjawab / s.totalSoal) * 100) : 0}%` }}
                      />
                    </div>
                    <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                      {s.terjawab}/{s.totalSoal || "-"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Mulai {jamMenit(s.mulai)} · terakhir aktif {jamMenit(s.terakhir)}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <ActivityIcon className="size-4 text-muted-foreground" />
                Kejadian terbaru
              </CardTitle>
            </CardHeader>
            <CardContent className="max-h-80 overflow-y-auto pt-3">
              {data.kejadian.length === 0 && <p className="text-sm text-muted-foreground">Belum ada kejadian.</p>}
              <ul className="flex flex-col gap-2">
                {data.kejadian.map((k) => (
                  <li key={k.id} className="flex gap-2 text-sm">
                    <span className="shrink-0 font-mono text-xs text-muted-foreground">{jamMenit(k.waktu)}</span>
                    <span className="min-w-0">{k.pesan}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

function Ringkas({ label, nilai }: { label: string; nilai: string }) {
  return (
    <div className="rounded-sm border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{nilai}</p>
    </div>
  )
}
