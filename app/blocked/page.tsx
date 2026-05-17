import { ChevronRight, CircleHelp, Download, Globe2, GraduationCap, ShieldCheck, Smartphone, Sparkles } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { getExamBrowserSettings } from "@/lib/exam-browser"

export default async function BlockedPage() {
  const settings = await getExamBrowserSettings()

  return (
    <main className="relative min-h-svh overflow-hidden bg-[#f8fbff] px-4 py-5 text-[#0b1b4d] sm:py-8">
      <div className="pointer-events-none absolute -top-16 -left-16 size-44 rounded-full bg-blue-200/40 blur-3xl" />
      <div className="pointer-events-none absolute -right-20 bottom-16 size-56 rounded-full bg-blue-200/50 blur-3xl" />
      <div className="pointer-events-none absolute top-0 right-0 size-28 rounded-bl-full bg-blue-500/10" />
      <div className="pointer-events-none absolute bottom-0 left-0 size-28 rounded-tr-full bg-blue-500/10" />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-5 sm:max-w-lg">
        <header className="flex items-center justify-between gap-4 px-2">
          <div className="flex items-center gap-3">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-500/25">
              <GraduationCap className="size-7" />
            </div>
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-[#10245f]">{APP_NAME}</h1>
              <p className="text-sm font-medium text-[#596587]">{APP_TAGLINE}</p>
            </div>
          </div>
          <Button
            nativeButton={false}
            variant="outline"
            size="icon"
            className="size-12 rounded-full border-0 bg-white text-[#10245f] shadow-lg shadow-slate-200/80"
            render={<Link href="/cek-browser" aria-label="Bantuan cek browser" />}
          >
            <CircleHelp className="size-6" />
          </Button>
        </header>

        <section className="rounded-[2rem] border border-white/80 bg-white/90 p-5 shadow-2xl shadow-blue-950/10 backdrop-blur sm:p-7">
          <div className="overflow-hidden rounded-[1.5rem] bg-gradient-to-br from-blue-50 to-white">
            <Image
              src="/hero.png"
              alt="Ilustrasi siswa menggunakan ExamBro"
              width={1456}
              height={1088}
              priority
              className="h-auto w-full"
            />
          </div>

          <div className="mt-6 text-center">
            <div className="flex items-center justify-center gap-3">
              <span className="h-1 w-4 rounded-full bg-emerald-400" />
              <h2 className="text-4xl font-extrabold tracking-tight text-[#10245f] sm:text-5xl">
                Akses Dibatasi
              </h2>
              <span className="h-1 w-4 rounded-full bg-emerald-400" />
            </div>
            <div className="mx-auto mt-2 h-2 w-32 rounded-full border-t-4 border-amber-400" />
            <p className="mx-auto mt-5 max-w-sm text-lg leading-relaxed text-[#3f4a70]">
              Halaman assesmen siswa hanya bisa dibuka melalui aplikasi ExamBro yang ditentukan sekolah.
            </p>
          </div>

          <div className="mt-7 rounded-3xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-white p-4 shadow-lg shadow-emerald-950/5">
            <div className="flex items-center gap-4">
              <div className="flex size-16 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
                <Smartphone className="size-8" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-bold text-[#10245f]">Gunakan ExamBro Android</h3>
                <p className="mt-1 text-sm leading-relaxed text-[#596587]">{settings.blockedMessage}</p>
              </div>
              <ChevronRight className="size-7 shrink-0 text-emerald-500" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            {settings.downloadUrl && (
              <Button
                nativeButton={false}
                size="lg"
                className="h-16 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-500 text-lg font-bold shadow-xl shadow-emerald-500/25 hover:from-emerald-600 hover:to-green-600"
                render={<a href={settings.downloadUrl} target="_blank" rel="noreferrer" />}
              >
                <Download className="size-6" />
                Download ExamBro
                <Sparkles className="ml-auto size-5 text-amber-200" />
              </Button>
            )}
            <Button
              nativeButton={false}
              size="lg"
              variant="outline"
              className="h-16 rounded-2xl border-2 border-emerald-500 bg-white text-lg font-bold text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
              render={<Link href="/cek-browser" />}
            >
              <Globe2 className="size-6" />
              Cek Browser
            </Button>
          </div>

          <div className="mx-auto mt-7 flex max-w-sm items-center gap-3 rounded-3xl bg-slate-100/80 px-5 py-4 text-sm font-medium text-[#3f4a70]">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-500 text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck className="size-6" />
            </div>
            <p>Untuk keamanan dan kejujuran assesmen, gunakan aplikasi resmi ExamBro. 💙</p>
          </div>
        </section>
      </div>
    </main>
  )
}
