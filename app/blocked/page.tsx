import { AlertTriangle, Download, Smartphone } from "lucide-react"
import Link from "next/link"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getExamBrowserSettings } from "@/lib/exam-browser"

export default async function BlockedPage() {
  const settings = await getExamBrowserSettings()

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-xl">
        <CardHeader className="border-b text-center">
          <div className="mx-auto mb-3 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <AlertTriangle className="size-7" />
          </div>
          <CardTitle>Akses Dibatasi</CardTitle>
          <CardDescription>Halaman ujian siswa hanya bisa dibuka melalui aplikasi ExamBro yang ditentukan sekolah.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          <Alert>
            <Smartphone className="size-4" />
            <AlertTitle>Gunakan ExamBro Android</AlertTitle>
            <AlertDescription>{settings.blockedMessage}</AlertDescription>
          </Alert>
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
            {settings.downloadUrl && (
              <Button className="gap-2" render={<a href={settings.downloadUrl} target="_blank" rel="noreferrer" />}>
                <Download className="size-4" />
                Download ExamBro
              </Button>
            )}
            <Button variant="outline" render={<Link href="/cek-browser" />}>Cek Browser</Button>
          </div>
        </CardContent>
      </Card>
    </main>
  )
}
