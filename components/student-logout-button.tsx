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
      className="m3-btn m3-btn--garis shrink-0 gap-1.5"
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
