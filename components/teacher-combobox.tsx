"use client"

import { useEffect, useRef, useState } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export type TeacherOption = { id: string; name: string }

// Dropdown guru dengan pencarian; nilai terkirim ke server action lewat input name.
// Mode multi: pilih beberapa guru pengampu (hidden inputs name="teacherIds").
export function TeacherCombobox({
  teachers,
  defaultValue = "",
  defaultValues = [],
  multiple = false,
  id,
  name,
}: {
  teachers: TeacherOption[]
  defaultValue?: string
  defaultValues?: string[]
  multiple?: boolean
  id?: string
  /** Nama input tersembunyi; default teacherIds (multi) / teacherId (single). */
  name?: string
}) {
  const items = teachers.map((teacher) => ({ value: teacher.id, label: teacher.name }))

  const [selected, setSelected] = useState<{ value: string; label: string } | null>(
    () => items.find((item) => item.value === defaultValue) ?? null,
  )

  const [selectedMany, setSelectedMany] = useState<TeacherOption[]>(() =>
    teachers.filter((teacher) => defaultValues.includes(teacher.id)),
  )
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const wrapRef = useRef<HTMLDivElement>(null)

  // Dropdown multi sengaja tetap terbuka saat memilih; tutup lewat klik luar atau Escape.
  useEffect(() => {
    if (!open) return
    function onPointerDown(event: PointerEvent) {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) setOpen(false)
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [open])
  const filtered = teachers.filter((item) => item.name.toLowerCase().includes(search.toLowerCase()))

  if (multiple) {
    const toggle = (item: TeacherOption) =>
      setSelectedMany((prev) =>
        prev.some((t) => t.id === item.id) ? prev.filter((t) => t.id !== item.id) : [...prev, item],
      )

    return (
      <div className="relative" ref={wrapRef}>
        {selectedMany.map((teacher) => (
          <input key={teacher.id} type="hidden" name={name ?? "teacherIds"} value={teacher.id} />
        ))}
        <Button
          type="button"
          id={id}
          variant="outline"
          className="w-full justify-between font-normal"
          onClick={() => setOpen((next) => !next)}
        >
          <span className="truncate">
            {selectedMany.length > 0 ? selectedMany.map((t) => t.name).join(", ") : "Pilih guru"}
          </span>
          <span className="text-xs text-muted-foreground">{selectedMany.length} dipilih</span>
        </Button>
        {open && (
          <div className="absolute top-full left-0 z-50 mt-2 w-full rounded-lg border bg-popover p-2 text-popover-foreground shadow-md">
            <div className="mb-2 flex items-center justify-between gap-2 px-1">
              <span className="text-xs text-muted-foreground">
                {selectedMany.length} dari {teachers.length} guru
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => setSelectedMany(selectedMany.length === teachers.length ? [] : [...teachers])}
              >
                {selectedMany.length === items.length ? "Hapus semua" : "Pilih semua"}
              </Button>
            </div>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari guru..." className="mb-2 h-8" />
            <div className="h-56 overflow-y-scroll rounded-lg border [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-border">
              {filtered.length === 0 ? (
                <div className="px-3 py-6 text-center text-sm text-muted-foreground">Guru tidak ditemukan.</div>
              ) : (
                filtered.map((item) => {
                  const checked = selectedMany.some((t) => t.id === item.id)
                  return (
                    <label
                      key={item.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-muted/60",
                        checked && "bg-primary/10",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggle(item)}
                        className="size-3.5 shrink-0 accent-primary"
                      />
                      <span className="min-w-0 truncate">{item.name}</span>
                    </label>
                  )
                })
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <>
      <Combobox
        items={items}
        value={selected}
        onValueChange={(next: { value: string; label: string } | null) => setSelected(next ?? null)}
      >
        <ComboboxInput id={id} placeholder="Cari nama guru..." showClear />
        <ComboboxContent>
          <ComboboxEmpty>Guru tidak ditemukan.</ComboboxEmpty>
          <ComboboxList>
            {(item: { value: string; label: string }) => (
              <ComboboxItem key={item.value} value={item}>
                <span className="truncate">{item.label}</span>
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <input type="hidden" name={name ?? "teacherId"} value={selected?.value ?? ""} />
    </>
  )
}
