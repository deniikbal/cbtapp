"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { Database, Loader2 } from "lucide-react"

import { seedInitialMasterData } from "@/app/dashboard/peserta/actions"
import { Button } from "@/components/ui/button"

export function SeedMasterDataButton() {
  const [isPending, startTransition] = useTransition()

  return (
    <Button
      variant="outline"
      className="gap-2"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          try {
            await seedInitialMasterData()
            toast.success("Data awal berhasil dibuat.")
          } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal membuat data awal.")
          }
        })
      }
    >
      {isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Database className="size-4" aria-hidden="true" />}
      Buat Data Awal
    </Button>
  )
}
