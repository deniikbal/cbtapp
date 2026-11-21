"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Copy, KeyRound, Loader2, RefreshCw, Save, ShieldCheck, Smartphone } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { updateExamBrowserSettings, generateExamConfigCode } from "@/app/dashboard/pengaturan/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ExamBrowserSettings } from "@/lib/exam-browser"

type ExamBrowserSettingsFormProps = {
  settings: ExamBrowserSettings
}

export function ExamBrowserSettingsForm({ settings }: ExamBrowserSettingsFormProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [isGenerating, startGenerate] = useTransition()
  const [code, setCode] = useState(settings.configCode || "")

  function handleSubmit(formData: FormData) {
    setError(null)
    formData.set("configCode", code)
    startTransition(async () => {
      try {
        await updateExamBrowserSettings(formData)
        toast.success("Pengaturan berhasil disimpan.")
        router.refresh()
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan pengaturan."
        setError(message)
        toast.error(message)
      }
    })
  }

  function handleGenerate() {
    startGenerate(async () => {
      const newCode = await generateExamConfigCode()
      setCode(newCode)
      toast.success(`Kode baru: ${newCode}, bagikan ke siswa.`)
      router.refresh()
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(code)
    toast.success("Kode disalin!")
  }

  return (
    <form
      key={`${settings.forceExamBrowser}-${settings.allowedUserAgentPattern}-${settings.blockedMessage}-${settings.downloadUrl}-${settings.configCode}-${settings.configExamUrl}-${settings.configUserAgent}-${settings.configExitPin}-${settings.configSchoolName}`}
      action={handleSubmit}
      className="space-y-4"
    >
      {/* ─── Kartu 1: Kode Akses ExamBro ─── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Kode Akses ExamBro</CardTitle>
          </div>
          <CardDescription>Empat angka yang dimasukkan siswa di app ExamBro (Mode Peserta → Access Code) untuk menarik konfigurasi di bawah otomatis.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-sm border bg-background px-4 py-2">
              <span className="font-mono text-2xl font-bold tracking-[0.3em]">{code || "----"}</span>
            </div>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopy} disabled={!code}>
              <Copy className="size-3.5" aria-hidden="true" /> Salin
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-3.5" aria-hidden="true" />}
              Generate Kode Baru
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">Kode lama langsung tidak berlaku saat kode baru dibuat. Bagikan lewat WA, papan tulis, atau lisan.</p>
        </CardContent>
      </Card>

      {/* ─── Kartu 2: Konfigurasi Aplikasi ExamBro ─── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Konfigurasi Aplikasi ExamBro</CardTitle>
          </div>
          <CardDescription>Isi konfigurasi ini sama dengan layar pengaturan di dalam aplikasi ExamBro. Nilainya dikirim otomatis ke siswa yang memasukkan kode akses.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5 pt-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="configExamUrl">Link ujian (URL yang dibuka aplikasi)</Label>
            <Input id="configExamUrl" name="configExamUrl" type="url" defaultValue={settings.configExamUrl} placeholder="https://asas.sman1bantarujeg.sch.id" disabled={isPending} />
            <p className="text-xs text-muted-foreground">Alamat yang langsung dibuka di dalam aplikasi setelah konfigurasi terpasang.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="configUserAgent">UA Agent</Label>
            <Input id="configUserAgent" name="configUserAgent" defaultValue={settings.configUserAgent} placeholder="smansaba" disabled={isPending} />
            <p className="text-xs text-muted-foreground">Penanda yang ditempel ke User-Agent WebView aplikasi. Server memakai penanda ini untuk mengenali ExamBro.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="configExitPin">PIN keluar aplikasi</Label>
            <Input id="configExitPin" name="configExitPin" inputMode="numeric" maxLength={8} defaultValue={settings.configExitPin} placeholder="1234" disabled={isPending} className="font-mono tracking-[0.2em]" />
            <p className="text-xs text-muted-foreground">Diminta saat siswa menutup aplikasi, supaya tidak bisa keluar sendiri di tengah ujian.</p>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="configSchoolName">Nama sekolah</Label>
            <Input id="configSchoolName" name="configSchoolName" defaultValue={settings.configSchoolName} placeholder="SMAN 1 Bantarujeg" disabled={isPending} />
            <p className="text-xs text-muted-foreground">Tampil di layar konfigurasi aplikasi.</p>
          </div>
        </CardContent>
      </Card>

      {/* ─── Kartu 3: Proteksi Halaman Siswa ─── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
            <CardTitle>Proteksi Halaman Siswa</CardTitle>
          </div>
          <CardDescription>Berlaku untuk halaman login siswa (/) dan /siswa/dashboard. Halaman admin dan guru tidak diblokir.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 pt-6">
          <div className="flex items-start gap-3 rounded-sm border bg-muted/30 p-4">
            <input id="forceExamBrowser" name="forceExamBrowser" type="checkbox" defaultChecked={settings.forceExamBrowser} disabled={isPending} className="mt-1 size-4 rounded border-border" />
            <div className="space-y-1">
              <Label htmlFor="forceExamBrowser">Wajib menggunakan ExamBro</Label>
              <p className="text-sm text-muted-foreground">Jika aktif, Chrome dan browser biasa diarahkan ke halaman blokir.</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="allowedUserAgentPattern">Pola User-Agent yang diizinkan</Label>
            <Textarea id="allowedUserAgentPattern" name="allowedUserAgentPattern" defaultValue={settings.allowedUserAgentPattern} placeholder={"Contoh: smansaba\nexambro"} rows={3} disabled={isPending} />
            <p className="text-xs text-muted-foreground">Pisahkan dengan baris baru atau koma. Isi keyword unik yang sama dengan UA Agent di atas.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="blockedMessage">Pesan saat diblokir</Label>
            <Textarea id="blockedMessage" name="blockedMessage" defaultValue={settings.blockedMessage} rows={2} disabled={isPending} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="downloadUrl">Link Download ExamBro (APK)</Label>
            <Input id="downloadUrl" name="downloadUrl" defaultValue={settings.downloadUrl} placeholder="https://sman1bantarujeg.sch.id/ExamBro-SMANSABA-v4.6.apk" disabled={isPending} />
            <p className="text-xs text-muted-foreground">Dipakai tombol unduh di halaman blokir.</p>
          </div>
        </CardContent>
      </Card>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button nativeButton={false} variant="outline" className="gap-2" disabled={isPending} render={<Link href="/cek-browser" />}>Cek User-Agent</Button>
        <Button type="submit" className="gap-2" disabled={isPending}>
          {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {isPending ? "Menyimpan..." : "Simpan Pengaturan"}
        </Button>
      </div>
    </form>
  )
}
