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
      className="gap-2"
      onClick={async () => {
        await logoutStudent()
        router.replace("/")
        router.refresh()
      }}
    >
      <LogOut className="size-4" />
      <span className="hidden xs:inline">Logout</span>
    </Button>
  )
}
