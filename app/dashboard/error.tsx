"use client"

import { useEffect } from "react"

import { Button } from "@/components/ui/button"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div
      className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-4 text-center"
      role="alert"
    >
      <h2 className="text-lg font-medium">Data dashboard belum bisa dimuat</h2>
      <p className="max-w-md text-sm text-muted-foreground">
        Terjadi kendala saat mengambil data. Periksa koneksi lalu coba lagi.
      </p>
      <Button onClick={reset} className="h-11 px-4">
        Coba lagi
      </Button>
    </div>
  )
}
