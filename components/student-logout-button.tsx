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
      aria-label="Keluar"
      title="Keluar"
      className="m3-btn m3-btn--keluar shrink-0"
      onClick={async () => {
        await logoutStudent()
        router.replace("/")
        router.refresh()
      }}
    >
      <LogOut className="size-5" aria-hidden="true" />
    </Button>
  )
}
