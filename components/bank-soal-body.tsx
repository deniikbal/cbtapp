"use client"

import { useState } from "react"
import { BookOpen, BookOpenCheck, FileCheck2, FileX2, Filter } from "lucide-react"

import {
  QuestionBankManagementCard,
  type QuestionBankManagementRow,
  type QuestionBankManagementSubject,
} from "@/components/question-bank-management-card"
import { StatCard } from "@/components/stat-card"
import type { TeacherOption } from "@/components/teacher-combobox"
import { cn } from "@/lib/utils"

export type BankSoalFilter = "ALL" | "TERISI" | "KOSONG" | "ACTIVE" | "INACTIVE"

/** Jumlah soal pada form yang sudah di-sync (butir pertanyaan, sama dengan hitungan sinkron). */
export function jumlahSoalForm(formItems: unknown): number {
  if (!Array.isArray(formItems)) return 0
  return formItems.filter((item) => typeof item === "object" && item !== null && "questionItem" in item).length
}

/**
 * Kartu statistik berfungsi sebagai filter tabel. Klik kartu = filter aktif,
 * klik lagi = kembali ke semua. Kartu "Mapel" hanya informasi (tidak memfilter).
 */
export function BankSoalBody({
  rows,
  subjects,
  teachers,
  majors = [],
}: {
  rows: QuestionBankManagementRow[]
  subjects: QuestionBankManagementSubject[]
  teachers: TeacherOption[]
  majors?: { id: string; name: string }[]
}) {
  const [filter, setFilter] = useState<BankSoalFilter>("ALL")

  const terisi = rows.filter((row) => jumlahSoalForm(row.formItems) > 0).length
  const aktif = rows.filter((row) => row.active).length
  const mapel = new Set(rows.map((row) => row.subjectId)).size

  const kartu = [
    { key: "TERISI" as const, label: "Sudah Terisi", value: terisi, description: `${rows.length} bank soal`, icon: FileCheck2 },
    { key: "KOSONG" as const, label: "Belum Terisi", value: rows.length - terisi, description: "Form tanpa soal", icon: FileX2 },
    { key: "ACTIVE" as const, label: "Aktif", value: aktif, description: "Bisa dijadwalkan", icon: BookOpenCheck },
    { key: "INACTIVE" as const, label: "Tidak Aktif", value: rows.length - aktif, description: "Tidak dipakai", icon: Filter },
  ]

  return (
    <>
      <section className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-5">
        {kartu.map(({ key, label, value, description, icon }) => {
          const dipilih = filter === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(dipilih ? "ALL" : key)}
              aria-pressed={dipilih}
              title={dipilih ? "Klik untuk tampilkan semua" : `Saring: ${label}`}
              className={cn(
                "rounded-sm text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring",
                dipilih ? "ring-2 ring-primary" : "hover:opacity-90",
              )}
            >
              <StatCard label={label} value={value} description={description} icon={icon} />
            </button>
          )
        })}
        <div className="col-span-2 lg:col-span-1">
          <StatCard label="Mapel" value={mapel} description="Mapel terpakai" icon={BookOpen} />
        </div>
      </section>

      <QuestionBankManagementCard
        rows={rows}
        subjects={subjects}
        teachers={teachers}
        majors={majors}
        filter={filter}
        onFilterChange={setFilter}
      />
    </>
  )
}
