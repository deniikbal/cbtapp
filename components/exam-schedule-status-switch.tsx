"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setExamScheduleStatus } from "@/app/dashboard/jadwal/actions"
import { Switch } from "@/components/ui/switch"

export function ExamScheduleStatusSwitch({ id, active }: { id: string; active: boolean }) {
  const [checked, setChecked] = useState(active)
  const [isPending, startTransition] = useTransition()

  function handleChange(nextChecked: boolean) {
    const previous = checked
    setChecked(nextChecked)

    startTransition(async () => {
      try {
        await setExamScheduleStatus(id, nextChecked)
        toast.success(nextChecked ? "Jadwal diaktifkan." : "Jadwal dinonaktifkan.")
      } catch (error) {
        setChecked(previous)
        toast.error(error instanceof Error ? error.message : "Gagal mengubah status jadwal.")
      }
    })
  }

  return (
    <div className="flex justify-end">
      <Switch checked={checked} onCheckedChange={handleChange} disabled={isPending} aria-label="Ubah status jadwal" />
    </div>
  )
}
