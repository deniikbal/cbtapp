"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Loader2, Plus } from "lucide-react"

import { createExamSchedule } from "@/app/dashboard/jadwal/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

export type ScheduleBankOption = { id: string; code: string; title: string; subjectCode: string }
export type ScheduleClassroomOption = { id: string; name: string; majorCode: string }

export function ExamScheduleCreateDialog({ banks, classrooms }: { banks: ScheduleBankOption[]; classrooms: ScheduleClassroomOption[] }) {
  const [open, setOpen] = useState(false)
  const [selectedBankId, setSelectedBankId] = useState("")
  const [selectedClassroomIds, setSelectedClassroomIds] = useState<string[]>([])
  const [classroomSelectOpen, setClassroomSelectOpen] = useState(false)
  const [classroomSearch, setClassroomSearch] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const disabled = banks.length === 0 || classrooms.length === 0
  const allSelected = classrooms.length > 0 && selectedClassroomIds.length === classrooms.length
  const selectedBank = banks.find((bank) => bank.id === selectedBankId)
  const filteredClassroomGroups = groupClassroomsByMajor(
    classrooms.filter((classroom) =>
      [classroom.name, classroom.majorCode]
        .join(" ")
        .toLowerCase()
        .includes(classroomSearch.toLowerCase().trim())
    )
  )

  function toggleClassroom(id: string) {
    setSelectedClassroomIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id]
    )
  }

  function toggleAllClassrooms() {
    setSelectedClassroomIds(allSelected ? [] : classrooms.map((classroom) => classroom.id))
  }

  function toggleMajorClassrooms(majorCode: string) {
    const groupIds = classrooms
      .filter((classroom) => classroom.majorCode === majorCode)
      .map((classroom) => classroom.id)
    const groupSelected = groupIds.every((id) => selectedClassroomIds.includes(id))

    setSelectedClassroomIds((current) =>
      groupSelected
        ? current.filter((id) => !groupIds.includes(id))
        : Array.from(new Set([...current, ...groupIds]))
    )
  }

  function handleSubmit(formData: FormData) {
    setError(null)

    if (selectedClassroomIds.length === 0) {
      const message = "Pilih minimal satu kelas."
      setError(message)
      toast.error(message)
      return
    }

    startTransition(async () => {
      try {
        const result = await createExamSchedule(formData)
        toast.success(
          result.skipped > 0
            ? `${result.created} jadwal berhasil ditambahkan, ${result.skipped} duplikat dilewati.`
            : `${result.created} jadwal berhasil ditambahkan.`
        )
        setSelectedBankId("")
        setSelectedClassroomIds([])
        setOpen(false)
      } catch (error) {
        const message = error instanceof Error ? error.message : "Gagal menyimpan jadwal."
        setError(message)
        toast.error(message)
      }
    })
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setSelectedBankId("")
          setSelectedClassroomIds([])
          setClassroomSelectOpen(false)
          setClassroomSearch("")
          setError(null)
        }
      }}
    >
      <DialogTrigger render={<Button className="gap-2" disabled={disabled} />}>
        <Plus className="size-4" />Tambah Jadwal
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Tambah Jadwal</DialogTitle>
          <DialogDescription>Pilih satu bank soal dan beberapa kelas sekaligus. Sistem akan membuat jadwal per kelas otomatis.</DialogDescription>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="questionBankId">Bank Soal</Label>
            <Select
              name="questionBankId"
              value={selectedBankId}
              onValueChange={(value: string | null) => setSelectedBankId(value ?? "")}
              required
            >
              <SelectTrigger id="questionBankId" className="w-full"><SelectValue placeholder="Pilih bank soal">{selectedBank ? `${selectedBank.code} — ${selectedBank.title}` : "Pilih bank soal"}</SelectValue></SelectTrigger>
              <SelectContent>{banks.map((bank) => <SelectItem key={bank.id} value={bank.id}>{bank.code} — {bank.title}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Kelas</Label>
            {selectedClassroomIds.map((id) => (
              <input key={id} type="hidden" name="classroomIds" value={id} />
            ))}
            <div className="relative">
              <Button type="button" variant="outline" className="w-full justify-between font-normal" onClick={() => setClassroomSelectOpen((open) => !open)}>
                <span>{selectedClassroomIds.length > 0 ? `${selectedClassroomIds.length} kelas dipilih` : "Pilih kelas"}</span>
                <span className="text-xs text-muted-foreground">Dropdown</span>
              </Button>
              {classroomSelectOpen && (
                <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
                  <div className="mb-2 flex items-center justify-between gap-2 px-1">
                    <span className="text-xs text-muted-foreground">{selectedClassroomIds.length} dari {classrooms.length} kelas</span>
                    <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={toggleAllClassrooms}>
                      {allSelected ? "Hapus semua" : "Pilih semua"}
                    </Button>
                  </div>
                  <Input
                    value={classroomSearch}
                    onChange={(event) => setClassroomSearch(event.target.value)}
                    placeholder="Cari kelas..."
                    className="mb-2 h-8"
                  />
                  <div className="h-56 overflow-y-scroll rounded-lg border [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
                    {filteredClassroomGroups.length === 0 ? (
                      <div className="px-3 py-6 text-center text-sm text-muted-foreground">Kelas tidak ditemukan.</div>
                    ) : (
                      filteredClassroomGroups.map((group) => (
                        <div key={group.majorCode} className="border-b last:border-b-0">
                          <div className="flex items-center justify-between gap-2 bg-muted/50 px-3 py-1.5">
                            <span className="text-xs font-medium text-muted-foreground">{group.majorCode}</span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2 text-xs"
                              onClick={() => toggleMajorClassrooms(group.majorCode)}
                            >
                              {group.classrooms.every((classroom) => selectedClassroomIds.includes(classroom.id)) ? "Hapus" : "Pilih semua"}
                            </Button>
                          </div>
                          {group.classrooms.map((classroom) => {
                            const checked = selectedClassroomIds.includes(classroom.id)

                            return (
                              <label
                                key={classroom.id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60",
                                  checked && "bg-primary/10"
                                )}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={() => toggleClassroom(classroom.id)}
                                  className="size-3.5 shrink-0 accent-primary"
                                />
                                <span className="min-w-0 truncate">{classroom.name}</span>
                              </label>
                            )
                          })}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2"><Label htmlFor="examDate">Tanggal</Label><Input id="examDate" name="examDate" type="date" required /></div>
            <div className="space-y-2"><Label htmlFor="startTime">Jam Mulai</Label><Input id="startTime" name="startTime" type="time" required /></div>
            <div className="space-y-2"><Label htmlFor="durationMinutes">Durasi</Label><Input id="durationMinutes" name="durationMinutes" type="number" min="1" placeholder="90" required /></div>
          </div>
          <div className="space-y-2"><Label htmlFor="active">Status</Label><Select name="active" defaultValue="true"><SelectTrigger id="active" className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Aktif</SelectItem><SelectItem value="false">Tidak aktif</SelectItem></SelectContent></Select></div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter><Button type="button" variant="outline" disabled={isPending} onClick={() => setOpen(false)}>Batal</Button><Button type="submit" disabled={isPending}>{isPending && <Loader2 className="size-4 animate-spin" />}{isPending ? "Menyimpan..." : "Simpan Jadwal"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function groupClassroomsByMajor(classrooms: ScheduleClassroomOption[]) {
  return Array.from(
    classrooms.reduce((map, classroom) => {
      const group = map.get(classroom.majorCode) ?? []
      group.push(classroom)
      map.set(classroom.majorCode, group)
      return map
    }, new Map<string, ScheduleClassroomOption[]>())
  ).map(([majorCode, items]) => ({ majorCode, classrooms: items }))
}
