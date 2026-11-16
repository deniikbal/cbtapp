"use client"

import { useState } from "react"

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"

export type TeacherOption = { id: string; name: string }

// Dropdown guru dengan pencarian; nilai terkirim ke server action lewat input name.
export function TeacherCombobox({
  teachers,
  defaultValue = "",
  id,
}: {
  teachers: TeacherOption[]
  defaultValue?: string
  id?: string
}) {
  const items = teachers.map((teacher) => ({ value: teacher.id, label: teacher.name }))
  const [selected, setSelected] = useState<{ value: string; label: string } | null>(
    () => items.find((item) => item.value === defaultValue) ?? null,
  )

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
      <input type="hidden" name="teacherId" value={selected?.value ?? ""} />
    </>
  )
}
