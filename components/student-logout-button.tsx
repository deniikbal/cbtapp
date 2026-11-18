"use client"

import { LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

import { logoutStudent } from "@/app/siswa/dashboard/actions"
import { Button } from "@/components/ui/button"

export function StudentLogoutButton() {
  const router = useRouter()

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-11 shrink-0 gap-1.5 border-brand-foreground/60 bg-transparent text-xs text-brand-foreground hover:bg-brand-foreground/15 hover:text-brand-foreground sm:h-8"
      onClick={async () => {
        await logoutStudent()
        router.replace("/")
        router.refresh()
      }}
    >
      <LogOut className="size-4" aria-hidden="true" />
      <span>Keluar</span>
    </Button>
  )
}
