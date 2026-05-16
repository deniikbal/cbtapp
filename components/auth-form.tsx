"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

export function AuthForm() {
  const router = useRouter()
  const [mode, setMode] = React.useState<"login" | "register">("login")
  const [name, setName] = React.useState("")
  const [email, setEmail] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [message, setMessage] = React.useState("")
  const [isPending, startTransition] = React.useTransition()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage("")

    startTransition(async () => {
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
    })
  }

  return (
    <div className="w-full max-w-sm rounded-2xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-zinc-950">
      <div className="mb-6 space-y-1">
        <h1 className="text-2xl font-semibold">
          {mode === "login" ? "Login" : "Daftar"}
        </h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {mode === "login"
            ? "Masuk ke akun CBT App Anda."
            : "Buat akun baru dan simpan ke Neon Postgres."}
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {mode === "register" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Nama
            </label>
            <input
              id="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              className="h-10 w-full rounded-md border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:focus:ring-white"
              required
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-10 w-full rounded-md border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:focus:ring-white"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-10 w-full rounded-md border border-black/10 bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-black dark:border-white/10 dark:focus:ring-white"
            minLength={8}
            required
          />
        </div>

        {message ? <p className="text-sm text-red-600">{message}</p> : null}

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending
            ? "Memproses..."
            : mode === "login"
              ? "Login"
              : "Daftar"}
        </Button>
      </form>

      <button
        type="button"
        className="mt-4 text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
        onClick={() => {
          setMessage("")
          setMode(mode === "login" ? "register" : "login")
        }}
      >
        {mode === "login"
          ? "Belum punya akun? Daftar"
          : "Sudah punya akun? Login"}
      </button>
    </div>
  )
}
