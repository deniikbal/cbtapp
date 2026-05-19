import { Download, GraduationCap, ShieldCheck, Smartphone } from "lucide-react"
import Image from "next/image"

import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { getExamBrowserSettings } from "@/lib/exam-browser"

export default async function BlockedPage() {
  const settings = await getExamBrowserSettings()
  const downloadUrl = settings.downloadUrl || "https://play.google.com/store/search?q=ExamBro&c=apps"

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f8fbff] px-4 py-4 text-[#0b1b4d] sm:py-5">
      <div className="pointer-events-none absolute -top-16 -left-16 size-44 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 size-56 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-0 right-0 size-28 rounded-bl-full bg-blue-500/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 size-28 rounded-tr-full bg-blue-500/10" />

      <div className="relative mx-auto flex w-full max-w-sm flex-col gap-3 sm:max-w-md">
        <header className="flex items-center gap-3 px-1">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold tracking-tight text-[#10245f]">{APP_NAME}</h1>
              <p className="text-xs font-medium text-[#596587]">{APP_TAGLINE}</p>
            </div>
          </div>

        </header>

        <section className="rounded-3xl border border-white/80 bg-white/90 p-4 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-5">
          <div className="mx-auto max-w-[260px] overflow-hidden rounded-2xl bg-gradient-to-br from-blue-50 to-white">
            <Image
              src="/hero.png"
              alt="Ilustrasi siswa menggunakan ExamBro"
              width={1456}
              height={1088}
              priority
              className="h-auto w-full"
            />
          </div>

          <div className="mt-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="h-1 w-4 rounded-full bg-emerald-400" />
              <h2 className="text-2xl font-extrabold tracking-tight text-[#10245f] sm:text-3xl">
                Akses Dibatasi
              </h2>
              <span className="h-1 w-4 rounded-full bg-emerald-400" />
            </div>
            <div className="mx-auto mt-1 h-1.5 w-24 rounded-full border-t-3 border-amber-400" />
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[#3f4a70]">
              Halaman assesmen siswa hanya bisa dibuka melalui aplikasi ExamBro yang ditentukan sekolah.
            </p>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-3 shadow-lg shadow-emerald-950/5">
            <div className="flex items-center gap-4">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Smartphone className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-base font-bold text-[#10245f]">Gunakan ExamBro Android</h3>
                <p className="mt-0.5 text-xs leading-relaxed text-[#596587]">{settings.blockedMessage}</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-col gap-2">
            <Button
              nativeButton={false}
              size="lg"
              className="h-auto rounded-md bg-gradient-to-r from-emerald-500 to-green-500 px-4 py-3 text-sm font-bold shadow-xl shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-600"
              render={<a href={downloadUrl} target="_blank" rel="noreferrer" />}
            >
              <Download className="size-4" />
              Buka Play Store
            </Button>
          </div>

          <div className="mx-auto mt-4 flex max-w-xs items-center gap-2 rounded-2xl bg-slate-100/80 px-3 py-2.5 text-xs font-medium text-[#3f4a70]">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-500 text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck className="size-4" />
            </div>
            <p>Untuk keamanan dan kejujuran assesmen, gunakan aplikasi resmi ExamBro. 💙</p>
          </div>
        </section>
      </div>
    </main>
  )
}
