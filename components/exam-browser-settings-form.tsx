"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Copy, Loader2, RefreshCw, Settings, Share2 } from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"

import { updateExamBrowserSettings, generateExamConfigCode, bagikanSemuaFormKeEditor } from "@/app/dashboard/pengaturan/actions"
import { Button } from "@/components/ui/button"
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
  const [isSharing, startSharing] = useTransition()
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
      toast.success(`Kode baru: ${newCode} — bagikan ke siswa.`)
      router.refresh()
    })
  }

  function handleShare() {
    startSharing(async () => {
      try {
        const result = await bagikanSemuaFormKeEditor()
        if (result.ok) toast.success(result.message)
        else toast.error(result.message)
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Gagal membagikan form.")
      }
    })
  }

  function handleCopy() {
    navigator.clipboard.writeText(code)
    toast.success("Kode disalin!")
  }

  return (
    <form
      key={`${settings.forceExamBrowser}-${settings.allowedUserAgentPattern}-${settings.blockedMessage}-${settings.downloadUrl}-${settings.configCode}-${settings.formEditorEmails}`}
      action={handleSubmit}
      className="space-y-5"
    >
      {/* ─── Access Code Section ─── */}
      <div className="rounded-sm border bg-muted/30 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <Label className="text-base font-semibold">Kode Akses ExamBro</Label>
            <p className="text-sm text-muted-foreground mt-0.5">
              Siswa masukkan 4 angka ini di app ExamBro (Mode Peserta → Access Code) untuk mengambil konfigurasi otomatis.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 rounded-sm border bg-background px-4 py-2">
            <span className="font-mono text-2xl font-bold tracking-[0.3em]">{code || "----"}</span>
          </div>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleCopy} disabled={!code}>
            <Copy className="size-3.5" /> Salin
          </Button>
          <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
            Generate Kode Baru
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Klik &quot;Generate Kode Baru&quot; untuk membuat kode acak. Kode lama langsung tidak berlaku. Bagikan kode ke siswa via WA, papan tulis, atau lisan.
        </p>
      </div>

      {/* ─── Force Exam Browser ─── */}
      <div className="flex items-start gap-3 rounded-sm border bg-muted/30 p-4">
        <input id="forceExamBrowser" name="forceExamBrowser" type="checkbox" defaultChecked={settings.forceExamBrowser} disabled={isPending} className="mt-1 size-4 rounded border-border" />
        <div className="space-y-1">
          <Label htmlFor="forceExamBrowser">Wajib menggunakan ExamBro</Label>
          <p className="text-sm text-muted-foreground">Jika aktif, Chrome/browser biasa akan diarahkan ke halaman blokir.</p>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="allowedUserAgentPattern">Pola User-Agent yang diizinkan</Label>
        <Textarea id="allowedUserAgentPattern" name="allowedUserAgentPattern" defaultValue={settings.allowedUserAgentPattern} placeholder={"Contoh: exambro\nexam browser"} rows={3} disabled={isPending} />
        <p className="text-xs text-muted-foreground">Pisahkan dengan baris baru atau koma. Gunakan keyword unik.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="blockedMessage">Pesan saat diblokir</Label>
        <Textarea id="blockedMessage" name="blockedMessage" defaultValue={settings.blockedMessage} rows={2} disabled={isPending} />
      </div>

      <div className="space-y-2 rounded-sm border bg-muted/30 p-4">
        <div className="flex items-start gap-3">
          <input id="formPublicEdit" name="formPublicEdit" type="checkbox" defaultChecked={settings.formPublicEdit} disabled={isPending} className="mt-1 size-4 rounded border-border" />
          <div className="space-y-1">
            <Label htmlFor="formPublicEdit">Siapa saja dengan link bisa edit form</Label>
            <p className="text-sm text-muted-foreground">Setiap form baru langsung terbuka untuk diedit siapa pun yang pegang link edit. Lebih praktis, tapi link edit harus dijaga — kalau bocor, soal bisa diubah orang lain.</p>
          </div>
        </div>
        <Label htmlFor="formEditorEmails">Email editor Google Form</Label>
        <Textarea id="formEditorEmails" name="formEditorEmails" defaultValue={settings.formEditorEmails} placeholder={"guru1@guru.sma.belajar.id\nguru2@guru.sma.belajar.id"} rows={2} disabled={isPending} />
        <p className="text-xs text-muted-foreground">
          Dipakai kalau kotak di atas tidak dicentang: email ini diberi akses EDITOR ke setiap Google Form yang dibuat otomatis dari bank soal. Pisahkan dengan baris baru atau koma.
        </p>
        <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={isSharing || isPending} onClick={handleShare}>
          {isSharing ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
          Bagikan akses ke semua form yang sudah ada
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor="downloadUrl">Link Download ExamBro (APK)</Label>
        <Input id="downloadUrl" name="downloadUrl" defaultValue={settings.downloadUrl} placeholder="https://sman1bantarujeg.sch.id/ExamBro-SMANSABA-v4.0.apk" disabled={isPending} />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button nativeButton={false} variant="outline" className="gap-2" disabled={isPending} render={<Link href="/cek-browser" />}>Cek User-Agent</Button>
        <Button type="submit" className="gap-2" disabled={isPending}>{isPending ? <Loader2 className="size-4 animate-spin" /> : <Settings className="size-4" />}{isPending ? "Menyimpan..." : "Simpan Pengaturan"}</Button>
      </div>
    </form>
  )
}
