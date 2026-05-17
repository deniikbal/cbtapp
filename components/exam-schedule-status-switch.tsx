"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"

import { setExamSchedulesStatus } from "@/app/dashboard/jadwal/actions"
import { Switch } from "@/components/ui/switch"

export function ExamScheduleStatusSwitch({
  id,
  ids,
  active,
}: {
  id?: string
  ids?: string[]
  active: boolean
}) {
  const [checked, setChecked] = useState(active)
  const [isPending, startTransition] = useTransition()
  const targetIds = ids ?? (id ? [id] : [])

  function handleChange(nextChecked: boolean) {
    const previous = checked
    setChecked(nextChecked)

    startTransition(async () => {
      try {
        await setExamSchedulesStatus(targetIds, nextChecked)
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
