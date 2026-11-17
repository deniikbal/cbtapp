"use client"

import { useState, useTransition } from "react"
import { Loader2, ScanLine } from "lucide-react"
import { toast } from "sonner"

import { cocokkanMutasiTeks } from "@/app/dashboard/guru/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"

export function CocokMutasiCard() {
  const [teks, setTeks] = useState("")
  const [hasil, setHasil] = useState<{ cocok: { nama: string; nominal: string }[]; tidakDikenal: string[] } | null>(null)
  const [pending, startTransition] = useTransition()

  function jalan() {
    startTransition(async () => {
      const res = await cocokkanMutasiTeks(teks)
      if (!res.ok) {
        toast.error(res.message)
        return
      }
      setHasil({ cocok: res.cocok ?? [], tidakDikenal: res.tidakDikenal ?? [] })
      toast.success(res.message)
      if ((res.cocok ?? []).length > 0) setTeks("")
    })
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-col gap-1.5">
          <CardTitle>Cocokkan mutasi pembayaran</CardTitle>
          <CardDescription>
            QRIS statis tidak punya webhook. Tempel teks notifikasi mutasi dari email/aplikasi GoPay, nominal unik
            dicocokkan otomatis lalu akses guru diaktifkan.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="teks-mutasi">Teks notifikasi mutasi</Label>
          <textarea
            id="teks-mutasi"
            value={teks}
            onChange={(event) => setTeks(event.target.value)}
            rows={5}
            placeholder={"Contoh:\nQRIS masuk Rp5.007 dari GOPAY\nPembayaran Rp 5.142,00 berhasil"}
            className="w-full resize-y rounded-lg border bg-transparent px-3 py-2 font-mono text-xs shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
          />
        </div>
        <Button onClick={jalan} disabled={pending || teks.trim() === ""} className="gap-2">
          {pending ? <Loader2 className="size-4 animate-spin" /> : <ScanLine className="size-4" />}
          Cocokkan &amp; aktifkan
        </Button>

        {hasil && (
          <div className="space-y-2 rounded-lg border bg-muted/30 p-3 text-sm">
            {hasil.cocok.length === 0 && hasil.tidakDikenal.length === 0 ? (
              <p className="text-muted-foreground">Tidak ada nominal yang terbaca pada teks tersebut.</p>
            ) : (
              <>
                {hasil.cocok.map((baris) => (
                  <div key={baris.nama} className="flex items-center justify-between gap-2">
                    <span className="font-medium">{baris.nama}</span>
                    <Badge variant="secondary" className="bg-emerald-100 text-emerald-700">
                      aktif · {baris.nominal}
                    </Badge>
                  </div>
                ))}
                {hasil.tidakDikenal.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Nominal tanpa tagihan cocok: {hasil.tidakDikenal.join(", ")}
                  </p>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}