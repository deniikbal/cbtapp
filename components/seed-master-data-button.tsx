"use client"

import { useTransition } from "react"
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
      onClick={() => startTransition(() => seedInitialMasterData())}
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <Database className="size-4" />}
      Buat Data Awal
    </Button>
  )
}
