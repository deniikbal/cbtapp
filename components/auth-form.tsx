"use client"

import * as React from "react"
import { Eye, EyeOff, GraduationCap, Loader2, ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { APP_NAME, APP_TAGLINE } from "@/lib/brand"
import { authClient } from "@/lib/auth-client"

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [showPassword, setShowPassword] = React.useState(false)
  const [message, setMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    startTransition(async () => {
      try {
        const result =
          mode === "login"
            ? await authClient.signIn.email({ email, password })
            : await authClient.signUp.email({ name, email, password })

        if (result.error) {
          setMessage(result.error.message || "Autentikasi gagal")
          return
        }

        router.push("/dashboard")
        router.refresh()
      } catch {
        setMessage("Tidak dapat terhubung ke server autentikasi. Periksa koneksi atau URL aplikasi.")
      }
    })
  }

  return (
    <div className="grid w-full max-w-5xl overflow-hidden rounded-2xl border bg-background shadow-xl shadow-slate-200/80 dark:shadow-black/20 md:grid-cols-[0.9fr_1.6fr]">
      <aside className="relative hidden min-h-[438px] border-r bg-white p-7 md:flex md:flex-col dark:bg-background">
        <div
          className="absolute inset-0 opacity-70"
          style={{
            backgroundImage: "radial-gradient(circle, hsl(var(--muted-foreground) / 0.18) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
          }}
        />
        <div className="relative flex items-center gap-4">
          <div className="flex size-12 items-center justify-center rounded-full bg-background text-emerald-500 shadow-md ring-1 ring-border">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h1 className="text-base font-bold leading-tight">{APP_NAME}</h1>
            <p className="text-sm text-muted-foreground">Sistem Assesmen Siswa</p>
          </div>
        </div>

        <div className="relative mt-9 inline-flex w-fit items-center gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium text-emerald-500 shadow-sm">
          <ShieldCheck className="size-4" />
          Aplikasi Assesmen
        </div>

        <div className="relative mt-6 border-l-2 border-emerald-200 pl-4">
          <h2 className="text-xl font-bold tracking-tight">Dashboard assesmen</h2>
          <p className="mt-3 max-w-[250px] leading-relaxed text-muted-foreground">
            Kelola peserta, mapel, jadwal, dan akses assesmen sekolah dalam satu sistem.
          </p>
        </div>

        <div className="relative mt-auto flex items-center justify-between rounded-lg border bg-background px-4 py-3 text-sm shadow-sm">
          <span>Versi</span>
          <span className="font-mono font-bold tracking-[0.2em]">1.0.0</span>
        </div>
      </aside>

      <section className="bg-zinc-50/80 px-6 py-8 md:px-24 md:py-9 dark:bg-muted/30">
        <div className="mx-auto max-w-md">
          <div className="md:hidden mb-8 flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-full bg-background text-emerald-500 shadow-md ring-1 ring-border">
              <GraduationCap className="size-5" />
            </div>
            <div>
              <h1 className="font-bold leading-tight">{APP_NAME}</h1>
              <p className="text-xs text-muted-foreground">{APP_TAGLINE}</p>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-bold tracking-[0.45em] text-emerald-300">MASUK SISTEM</p>
            <h2 className="text-2xl font-bold tracking-tight">
              {mode === "login" ? "Login ke dashboard" : "Daftar akun admin"}
            </h2>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {mode === "login"
                ? "Gunakan akun yang sudah terdaftar untuk melanjutkan."
                : "Buat akun admin baru untuk mengelola assesmen."}
            </p>
          </div>

          <div className="my-6 border-t" />

          <form onSubmit={onSubmit} className="space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <label className="text-sm font-medium" htmlFor="name">
                  Nama
                </label>
                <input
                  id="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  className="h-10 w-full rounded-md border-0 bg-emerald-50 px-3 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-emerald-300 dark:bg-emerald-950/20"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="admin@smansaba.sch.id"
                className="h-10 w-full rounded-md border-0 bg-emerald-50 px-3 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-emerald-300 dark:bg-emerald-950/20"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="h-10 w-full rounded-md border-0 bg-emerald-50 px-3 pr-10 text-sm outline-none ring-1 ring-transparent transition focus:bg-background focus:ring-emerald-300 dark:bg-emerald-950/20"
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground transition hover:text-foreground"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {message && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950/20 dark:text-red-400">{message}</p>}

            <Button
              type="submit"
              className="h-10 w-full bg-emerald-400 text-foreground shadow-none hover:bg-emerald-500"
              disabled={isPending}
            >
              {isPending && <Loader2 className="size-4 animate-spin" />}
              {isPending ? "Memproses..." : mode === "login" ? "Masuk" : "Daftar"}
            </Button>
          </form>

          <div className="mt-5 flex items-center justify-between gap-3 text-xs">
            <span>© 2026</span>
            {mode === "register" && (
              <button
                type="button"
                className="text-muted-foreground underline-offset-4 transition hover:text-foreground hover:underline"
                onClick={() => {
                  setMessage("")
                  setMode("login")
                }}
              >
                Sudah punya akun? Masuk
              </button>
            )}
            <span className="hidden text-muted-foreground sm:inline">Powered by {APP_NAME}</span>
          </div>
        </div>
      </section>
    </div>
  )
}
